import React, { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';
const MAX_TRAIL = 60;

function riskColor(score) {
  if (score >= 0.75) return '#ff1744';
  if (score >= 0.55) return '#ff6d00';
  if (score >= 0.3)  return '#ffd600';
  return '#4caf50';
}

function riskLabel(score) {
  if (score >= 0.75) return 'CRITICAL';
  if (score >= 0.55) return 'HIGH';
  if (score >= 0.3)  return 'ELEVATED';
  return 'NORMAL';
}

function statusIcon(status) {
  switch (status) {
    case 'active': return '\u25B2';
    case 'paused': return '\u25A0';
    case 'idle':   return '\u25CF';
    default:       return '\u25CB';
  }
}

function makeIcon(unit) {
  const color = riskColor(unit.risk_score);
  const icon = statusIcon(unit.status);
  const size = unit.risk_score >= 0.55 ? 22 : 16;
  const pulse = unit.risk_score >= 0.75 ? 'animation:markerPulse 1.5s ease-in-out infinite;' : '';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      display:flex;align-items:center;justify-content:center;
      font-size:${size - 4}px;color:#fff;
      background:${color};
      border:2px solid rgba(255,255,255,0.7);
      border-radius:${unit.status === 'active' ? '3px' : '50%'};
      cursor:pointer;
      box-shadow:0 0 8px ${color}80, 0 0 20px ${color}40;
      transition:all 0.5s ease;
      ${pulse}
    ">${icon}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

function popupHTML(u) {
  const color = riskColor(u.risk_score);
  const label = riskLabel(u.risk_score);
  const destInfo = u.destination
    ? `<span style="color:#6b7a5e">DEST&nbsp;&nbsp;</span> <span style="color:#42a5f5">${u.destination.lat.toFixed(4)}, ${u.destination.lon.toFixed(4)}</span><br/>`
    : '';
  return `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.8;min-width:170px">
    <div style="font-size:13px;font-weight:700;color:#a8c99a;margin-bottom:4px;border-bottom:1px solid #243118;padding-bottom:4px">\u2B21 ${u.unit_id}</div>
    <span style="color:#6b7a5e">STATUS</span> <span style="color:#c8d4bc">${u.status.toUpperCase()}</span><br/>
    <span style="color:#6b7a5e">POS&nbsp;&nbsp;&nbsp;</span> <span style="color:#c8d4bc">${u.lat.toFixed(5)}, ${u.lon.toFixed(5)}</span><br/>
    <span style="color:#6b7a5e">SPEED&nbsp;</span> <span style="color:#c8d4bc">${u.speed_mps.toFixed(1)} m/s</span><br/>
    <span style="color:#6b7a5e">HDG&nbsp;&nbsp;&nbsp;</span> <span style="color:#c8d4bc">${u.direction_deg.toFixed(0)}\u00B0</span><br/>
    ${destInfo}
    <span style="color:#6b7a5e">ANOMALY</span> <span style="color:#c8d4bc">${u.anomaly_score.toFixed(3)}</span><br/>
    <span style="color:#6b7a5e">THREAT</span> <span style="color:${color};font-weight:700">${u.risk_score.toFixed(3)} ${label}</span>
    <div style="margin-top:6px;border-top:1px solid #243118;padding-top:6px">
      <span style="color:#42a5f5;cursor:pointer;font-weight:600" onclick="window.__selectUnit && window.__selectUnit('${u.unit_id}')">\u25B8 SELECT FOR COMMAND</span>
    </div>
  </div>`;
}

export default function MapView({ units = [], alerts = [], onAssignDestination }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const trailsRef = useRef({});
  const risksRef = useRef(null);
  const destMarkersRef = useRef([]);
  const fittedRef = useRef(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [commandMode, setCommandMode] = useState(false);

  useEffect(() => {
    window.__selectUnit = (id) => {
      setSelectedUnit(id);
      setCommandMode(true);
    };
    return () => { delete window.__selectUnit; };
  }, []);

  /* Init map */
  useEffect(() => {
    if (mapRef.current) return;
    const m = L.map(containerRef.current, {
      center: [37.7749, -122.4194],
      zoom: 12,
      zoomControl: false,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(m);
    L.control.zoom({ position: 'topright' }).addTo(m);
    risksRef.current = L.layerGroup().addTo(m);
    mapRef.current = m;
    setTimeout(() => m.invalidateSize(), 250);
    return () => { m.remove(); mapRef.current = null; };
  }, []);

  /* Map click → assign destination */
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    const handleClick = (e) => {
      if (!commandMode || !selectedUnit) return;

      // Remove old dest markers
      destMarkersRef.current.forEach(x => x.remove());
      destMarkersRef.current = [];

      const destIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:12px;height:12px;
          background:#42a5f5;
          border:2px solid #fff;
          border-radius:50%;
          box-shadow:0 0 12px #42a5f580;
          animation:markerPulse 1s ease-in-out infinite;
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const destMk = L.marker(e.latlng, { icon: destIcon })
        .addTo(m)
        .bindPopup(`<div style="font-family:'JetBrains Mono',monospace;font-size:11px">
          <div style="color:#42a5f5;font-weight:700">DESTINATION</div>
          <div style="color:#c8d4bc">${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}</div>
          <div style="color:#6b7a5e;margin-top:4px">for ${selectedUnit}</div>
        </div>`, { maxWidth: 200 })
        .openPopup();
      destMarkersRef.current.push(destMk);

      // Route line
      const unitData = units.find(u => u.unit_id === selectedUnit);
      if (unitData) {
        const line = L.polyline(
          [[unitData.lat, unitData.lon], [e.latlng.lat, e.latlng.lng]],
          { color: '#42a5f5', weight: 2, dashArray: '8, 6', opacity: 0.7 }
        ).addTo(m);
        destMarkersRef.current.push(line);
      }

      if (onAssignDestination) {
        onAssignDestination(selectedUnit, e.latlng.lat, e.latlng.lng);
      }
      setCommandMode(false);
    };

    m.on('click', handleClick);
    return () => m.off('click', handleClick);
  }, [commandMode, selectedUnit, units, onAssignDestination]);

  /* Cursor for command mode */
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.style.cursor = commandMode ? 'crosshair' : '';
  }, [commandMode]);

  /* Sync markers + trails + risk zones */
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const seen = new Set();

    units.forEach(u => {
      seen.add(u.unit_id);
      const color = riskColor(u.risk_score);
      const icon = makeIcon(u);

      if (markersRef.current[u.unit_id]) {
        const mk = markersRef.current[u.unit_id];
        const target = L.latLng(u.lat, u.lon);
        if (mk.getLatLng().distanceTo(target) > 0.5) {
          animateMarker(mk, target);
        }
        mk.setIcon(icon);
        if (mk.getPopup()) mk.getPopup().setContent(popupHTML(u));
      } else {
        const mk = L.marker([u.lat, u.lon], { icon })
          .bindPopup(popupHTML(u), { maxWidth: 260 })
          .addTo(m);
        markersRef.current[u.unit_id] = mk;
      }

      // Trail
      if (!trailsRef.current[u.unit_id]) {
        trailsRef.current[u.unit_id] = {
          positions: [],
          polyline: L.polyline([], {
            color, weight: 1.5, opacity: 0.4, dashArray: '4, 4',
          }).addTo(m),
        };
      }
      const trail = trailsRef.current[u.unit_id];
      const pos = L.latLng(u.lat, u.lon);
      const lastPos = trail.positions[trail.positions.length - 1];
      if (!lastPos || lastPos.distanceTo(pos) > 1) {
        trail.positions.push(pos);
        if (trail.positions.length > MAX_TRAIL) trail.positions.shift();
        trail.polyline.setLatLngs(trail.positions);
        trail.polyline.setStyle({ color });
      }
    });

    // Remove stale
    Object.keys(markersRef.current).forEach(id => {
      if (!seen.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
        if (trailsRef.current[id]) {
          trailsRef.current[id].polyline.remove();
          delete trailsRef.current[id];
        }
      }
    });

    // Risk zones
    risksRef.current.clearLayers();
    units.filter(u => u.risk_score > 0.15).forEach(u => {
      L.circle([u.lat, u.lon], {
        radius: 80 + u.risk_score * 500,
        color: riskColor(u.risk_score),
        fillColor: riskColor(u.risk_score),
        fillOpacity: 0.10,
        weight: 1,
        opacity: 0.35,
      }).addTo(risksRef.current);
    });

    // Threat corridors between nearby high-risk units
    const highUnits = units.filter(u => u.risk_score > 0.55);
    for (let i = 0; i < highUnits.length; i++) {
      for (let j = i + 1; j < highUnits.length; j++) {
        const a = highUnits[i], b = highUnits[j];
        const dist = L.latLng(a.lat, a.lon).distanceTo(L.latLng(b.lat, b.lon));
        if (dist < 3000) {
          L.circle([(a.lat + b.lat) / 2, (a.lon + b.lon) / 2], {
            radius: dist / 2 + 200,
            color: '#ff1744',
            fillColor: '#ff1744',
            fillOpacity: 0.06,
            weight: 1,
            opacity: 0.25,
            dashArray: '6, 4',
          }).addTo(risksRef.current);
        }
      }
    }

    // Auto-fit once
    if (units.length > 0 && !fittedRef.current) {
      const markers = Object.values(markersRef.current);
      if (markers.length > 0) {
        m.fitBounds(L.featureGroup(markers).getBounds().pad(0.4), { maxZoom: 14 });
        fittedRef.current = true;
      }
    }
  }, [units]);

  const cancelCommand = useCallback(() => {
    setCommandMode(false);
    setSelectedUnit(null);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} className="leaflet-container" />

      {/* Command mode banner */}
      {commandMode && (
        <div className="cmd-overlay">
          <div className="cmd-overlay-inner">
            <span className="cmd-overlay-icon">{'\u2316'}</span>
            <span>CLICK MAP TO SET DESTINATION FOR <strong>{selectedUnit}</strong></span>
            <button className="cmd-cancel-btn" onClick={cancelCommand}>CANCEL</button>
          </div>
        </div>
      )}

      {/* Unit quick-select chips */}
      {units.length > 0 && !commandMode && (
        <div className="unit-select-bar">
          {units.map(u => (
            <button
              key={u.unit_id}
              className={`unit-chip ${selectedUnit === u.unit_id ? 'selected' : ''}`}
              style={{ borderColor: riskColor(u.risk_score) }}
              onClick={() => {
                setSelectedUnit(u.unit_id);
                const mk = markersRef.current[u.unit_id];
                if (mk && mapRef.current) {
                  mapRef.current.panTo(mk.getLatLng(), { animate: true });
                  mk.openPopup();
                }
              }}
            >
              <span className="chip-dot" style={{ background: riskColor(u.risk_score) }} />
              {u.unit_id}
            </button>
          ))}
          {selectedUnit && (
            <button className="cmd-assign-btn" onClick={() => setCommandMode(true)}>
              {'\u25B8'} ASSIGN DEST
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function animateMarker(marker, target, duration = 800) {
  const start = marker.getLatLng();
  const startTime = performance.now();
  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const ease = t * (2 - t);
    marker.setLatLng([
      start.lat + (target.lat - start.lat) * ease,
      start.lng + (target.lng - start.lng) * ease,
    ]);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
