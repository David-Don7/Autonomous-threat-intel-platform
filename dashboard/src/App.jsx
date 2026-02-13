import React, { useCallback, useEffect, useState } from 'react';
import AlertsPanel from './components/AlertsPanel.jsx';
import MapView from './components/MapView.jsx';
import RiskOverlay from './components/RiskOverlay.jsx';
import SystemHealth from './components/SystemHealth.jsx';
import UnitTable from './components/UnitTable.jsx';
import socket from './services/socket.js';

const API_BASE = 'http://localhost:8000/api';

export default function App() {
  const [units, setUnits] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [mlStatus, setMlStatus] = useState({});
  const [clock, setClock] = useState(nowUTC());
  const [cmdLog, setCmdLog] = useState([]);

  useEffect(() => {
    socket.connect();
    const unsub = socket.onMessage((payload) => {
      if (payload.type === 'connected') { setConnected(true); return; }
      if (payload.type === 'disconnected') { setConnected(false); return; }
      if (payload.units) setUnits(payload.units);
      if (payload.active_alerts) setAlerts(payload.active_alerts);
      if (payload.ml_status) setMlStatus(payload.ml_status);
    });
    const clockId = setInterval(() => setClock(nowUTC()), 1000);
    return () => { unsub(); socket.disconnect(); clearInterval(clockId); };
  }, []);

  const addCmdLog = useCallback((msg) => {
    setCmdLog(prev => [`[${nowUTC().slice(11, 19)}] ${msg}`, ...prev.slice(0, 29)]);
  }, []);

  const handleAssignDestination = useCallback(async (unitId, lat, lng) => {
    addCmdLog(`ASSIGN ${unitId} \u2192 ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    try {
      await fetch(`${API_BASE}/assign-destination`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: unitId,
          destination: { lat, lon: lng },
        }),
      });
      addCmdLog(`\u2713 ${unitId} destination confirmed`);
    } catch (e) {
      addCmdLog(`\u2717 FAIL: ${e.message}`);
    }
  }, [addCmdLog]);

  return (
    <div className="app-root">
      <header className="cmd-header">
        <div className="header-brand">
          <div className="header-icon">{'\u2B21'}</div>
          <div>
            <div className="header-title">THREATWATCH</div>
            <div className="header-sub">COMMAND CENTER &bull; AUTONOMOUS THREAT INTELLIGENCE</div>
          </div>
        </div>
        <div className="header-right">
          <div className={`conn-badge ${connected ? 'online' : 'offline'}`}>
            <span className={`conn-dot ${connected ? 'on' : 'off'}`} />
            {connected ? 'UPLINK ACTIVE' : 'NO UPLINK'}
          </div>
          <div className="header-stats">
            <span className="stat-item">{'\u25CF'} {units.length} UNITS</span>
            <span className="stat-item">{'\u25B2'} {units.filter(u => u.status === 'active').length} ACTIVE</span>
            <span className="stat-item">{alerts.length > 0 ? '\u26A0' : '\u2714'} {alerts.length} ALERTS</span>
          </div>
          <div className="header-clock">{clock}</div>
        </div>
      </header>

      <div className="main-body">
        <div className="map-section">
          <div className="map-wrapper">
            <div className="map-label">OPERATIONAL AREA</div>
            <MapView
              units={units}
              alerts={alerts}
              onAssignDestination={handleAssignDestination}
            />
          </div>

          {/* Command log */}
          {cmdLog.length > 0 && (
            <div className="cmd-log">
              <div className="cmd-log-label">{'\u25B8'} COMMAND LOG</div>
              <div className="cmd-log-entries">
                {cmdLog.map((entry, i) => (
                  <div key={i} className="cmd-log-entry">{entry}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="intel-sidebar">
          <SystemHealth units={units} connected={connected} mlStatus={mlStatus} />
          <UnitTable units={units} />
          <RiskOverlay units={units} />
          <AlertsPanel alerts={alerts} />
        </div>
      </div>
    </div>
  );
}

function nowUTC() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
}
