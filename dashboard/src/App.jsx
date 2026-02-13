import React, { useEffect, useState } from 'react';
import AlertsPanel from './components/AlertsPanel.jsx';
import MapView from './components/MapView.jsx';
import RiskOverlay from './components/RiskOverlay.jsx';
import SystemHealth from './components/SystemHealth.jsx';
import UnitTable from './components/UnitTable.jsx';
import socket from './services/socket.js';

export default function App() {
  const [units, setUnits] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [mlStatus, setMlStatus] = useState({});

  useEffect(() => {
    socket.connect();

    const unsub = socket.onMessage((payload) => {
      if (payload.type === 'connected') {
        setConnected(true);
        return;
      }
      if (payload.type === 'disconnected') {
        setConnected(false);
        return;
      }

      // State updates from backend
      if (payload.units) {
        setUnits(payload.units);
      }
      if (payload.active_alerts) {
        setAlerts(payload.active_alerts);
      }
      if (payload.ml_status) {
        setMlStatus(payload.ml_status);
      }
    });

    return () => {
      unsub();
      socket.disconnect();
    };
  }, []);

  return (
    <div style={styles.layout}>
      {/* Left panel – map */}
      <div style={styles.mapPanel}>
        <h1 style={styles.heading}>Commander Dashboard</h1>
        <MapView units={units} alerts={alerts} />
      </div>

      {/* Right panel – intel sidebar */}
      <div style={styles.sidebar}>
        <SystemHealth units={units} connected={connected} mlStatus={mlStatus} />
        <UnitTable units={units} />
        <RiskOverlay units={units} />
        <AlertsPanel alerts={alerts} />
      </div>
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex',
    height: '100vh',
    background: '#0f172a',
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: 'hidden',
  },
  mapPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    gap: '12px',
    minWidth: 0,
  },
  heading: {
    color: '#f8fafc',
    fontSize: '22px',
    margin: 0,
    flexShrink: 0,
  },
  sidebar: {
    width: '380px',
    background: '#0b1120',
    borderLeft: '1px solid #1e293b',
    padding: '16px',
    overflowY: 'auto',
    flexShrink: 0,
  },
};
