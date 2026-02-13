import React from 'react';

export default function SystemHealth({ units = [], connected = false, mlStatus = {} }) {
  const activeCount = units.filter((u) => u.status === 'active').length;
  const avgRisk =
    units.length > 0
      ? units.reduce((sum, u) => sum + u.risk_score, 0) / units.length
      : 0;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>System Health</h3>
      <div style={styles.grid}>
        <Stat label="WS Connection" value={connected ? 'Online' : 'Offline'} color={connected ? '#22c55e' : '#ef4444'} />
        <Stat label="Total Units" value={units.length} />
        <Stat label="Active Units" value={activeCount} color="#3b82f6" />
        <Stat label="Avg Risk" value={`${(avgRisk * 100).toFixed(1)}%`} color={riskColor(avgRisk)} />
        <Stat label="ML Model" value={mlStatus.trained ? 'Trained' : 'Collecting'} color={mlStatus.trained ? '#22c55e' : '#eab308'} />
      </div>
    </div>
  );
}

function Stat({ label, value, color = '#e2e8f0' }) {
  return (
    <div style={styles.stat}>
      <span style={styles.statLabel}>{label}</span>
      <span style={{ ...styles.statValue, color }}>{value}</span>
    </div>
  );
}

function riskColor(score) {
  if (score >= 0.75) return '#ef4444';
  if (score >= 0.55) return '#f97316';
  if (score >= 0.3) return '#eab308';
  return '#22c55e';
}

const styles = {
  container: { padding: '12px 0' },
  title: { color: '#f1f5f9', fontSize: '16px', marginBottom: '8px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  stat: {
    background: '#1e293b',
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  statLabel: { color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statValue: { fontSize: '18px', fontWeight: 700 },
};
