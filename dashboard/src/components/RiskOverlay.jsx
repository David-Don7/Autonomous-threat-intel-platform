import React from 'react';

export default function RiskOverlay({ units = [] }) {
  const riskUnits = units.filter((u) => u.risk_score > 0.3);
  if (riskUnits.length === 0) return null;

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Risk Zones</h4>
      {riskUnits.map((u) => (
        <div key={u.unit_id} style={styles.zone}>
          <span style={{ ...styles.indicator, backgroundColor: riskColor(u.risk_score) }} />
          <span style={styles.label}>
            {u.unit_id} — {u.lat.toFixed(4)}, {u.lon.toFixed(4)}
          </span>
          <span style={{ ...styles.score, color: riskColor(u.risk_score) }}>
            {(u.risk_score * 100).toFixed(0)}%
          </span>
        </div>
      ))}
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
  container: {
    background: '#0f172a',
    borderRadius: '8px',
    padding: '10px 12px',
    marginTop: '8px',
  },
  title: { color: '#f1f5f9', fontSize: '14px', marginBottom: '6px' },
  zone: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
    fontSize: '12px',
  },
  indicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  label: { color: '#94a3b8', flex: 1 },
  score: { fontWeight: 700, fontSize: '13px' },
};
