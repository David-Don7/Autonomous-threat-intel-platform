import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

// Set your Mapbox token via env var VITE_MAPBOX_TOKEN (see .env.example)
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

const RISK_COLORS = {
  low: '#22c55e',
  elevated: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

function riskLevel(score) {
  if (score >= 0.75) return 'critical';
  if (score >= 0.55) return 'high';
  if (score >= 0.3) return 'elevated';
  return 'low';
}

export default function MapView({ units = [], alerts = [] }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({});
  const [mapReady, setMapReady] = useState(false);

  // Initialise map
  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-122.4194, 37.7749],
      zoom: 12,
      pitch: 30,
    });
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.on('load', () => setMapReady(true));
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add risk zone layer once map is loaded
  useEffect(() => {
    if (!mapReady || !map.current) return;
    if (!map.current.getSource('risk-zones')) {
      map.current.addSource('risk-zones', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.current.addLayer({
        id: 'risk-heatmap',
        type: 'circle',
        source: 'risk-zones',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'risk'], 0, 10, 1, 60],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'risk'],
            0, '#22c55e',
            0.3, '#eab308',
            0.55, '#f97316',
            0.75, '#ef4444',
          ],
          'circle-opacity': 0.35,
          'circle-blur': 0.6,
        },
      });
    }
  }, [mapReady]);

  // Update markers + risk zones whenever units change
  useEffect(() => {
    if (!mapReady || !map.current) return;

    const activeIds = new Set();

    units.forEach((unit) => {
      activeIds.add(unit.unit_id);
      const level = riskLevel(unit.risk_score);
      const color = RISK_COLORS[level];

      if (markersRef.current[unit.unit_id]) {
        // Update existing marker position
        markersRef.current[unit.unit_id].marker.setLngLat([unit.lon, unit.lat]);
        markersRef.current[unit.unit_id].el.style.backgroundColor = color;
        markersRef.current[unit.unit_id].el.title =
          `${unit.unit_id} | ${unit.status} | risk: ${unit.risk_score.toFixed(2)}`;
      } else {
        // Create new marker
        const el = document.createElement('div');
        el.className = 'unit-marker';
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = color;
        el.style.border = '2px solid #fff';
        el.style.cursor = 'pointer';
        el.style.transition = 'background-color 0.3s';
        el.title = `${unit.unit_id} | ${unit.status} | risk: ${unit.risk_score.toFixed(2)}`;

        const popup = new mapboxgl.Popup({ offset: 12, closeButton: false }).setHTML(
          `<div style="font-family:monospace;font-size:12px;color:#0f172a">
            <strong>${unit.unit_id}</strong><br/>
            Status: ${unit.status}<br/>
            Speed: ${unit.speed_mps.toFixed(1)} m/s<br/>
            Heading: ${unit.direction_deg.toFixed(0)}°<br/>
            Anomaly: ${unit.anomaly_score.toFixed(3)}<br/>
            Risk: ${unit.risk_score.toFixed(3)} (${level})
          </div>`
        );

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([unit.lon, unit.lat])
          .setPopup(popup)
          .addTo(map.current);

        markersRef.current[unit.unit_id] = { marker, el };
      }
    });

    // Remove stale markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!activeIds.has(id)) {
        markersRef.current[id].marker.remove();
        delete markersRef.current[id];
      }
    });

    // Update risk zone source
    const src = map.current.getSource('risk-zones');
    if (src) {
      src.setData({
        type: 'FeatureCollection',
        features: units
          .filter((u) => u.risk_score > 0.2)
          .map((u) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [u.lon, u.lat] },
            properties: { risk: u.risk_score },
          })),
      });
    }
  }, [units, mapReady]);

  // Fit bounds if we have units
  useEffect(() => {
    if (!mapReady || !map.current || units.length === 0) return;
    if (units.length === 1) {
      map.current.flyTo({ center: [units[0].lon, units[0].lat], zoom: 14, speed: 0.8 });
    }
  }, [units.length > 0 && mapReady]);

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    />
  );
}
