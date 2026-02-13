import React from 'react';

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

export default function UnitTable({ units = [] }) {
  if (units.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={{ color: '#94a3b8' }}>No units registered yet.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Unit Status ({units.length})</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Unit</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Speed</th>
            <th style={styles.th}>Heading</th>
            <th style={styles.th}>Anomaly</th>
            <th style={styles.th}>Risk</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => {
            const level = riskLevel(unit.risk_score);
            return (
              <tr key={unit.unit_id} style={styles.row}>
                <td style={styles.td}>
                  <span style={{ ...styles.dot, backgroundColor: RISK_COLORS[level] }} />
                  {unit.unit_id}
                </td>
                <td style={{ ...styles.td, color: unit.status === 'active' ? '#22c55e' : '#94a3b8' }}>
                  {unit.status}
                </td>
                <td style={styles.td}>{unit.speed_mps.toFixed(1)} m/s</td>
                <td style={styles.td}>{unit.direction_deg.toFixed(0)}°</td>
                <td style={styles.td}>{unit.anomaly_score.toFixed(3)}</td>
                <td style={{ ...styles.td, color: RISK_COLORS[level], fontWeight: 600 }}>
                  {unit.risk_score.toFixed(3)} ({level})
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  container: { padding: '12px 0' },
  title: { color: '#f1f5f9', fontSize: '16px', marginBottom: '8px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: {
    textAlign: 'left',
    color: '#64748b',
    padding: '6px 8px',
    borderBottom: '1px solid #1e293b',
    fontWeight: 500,
  },
  td: { color: '#cbd5e1', padding: '6px 8px', borderBottom: '1px solid #1e293b' },
  row: { transition: 'background 0.2s' },
  dot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '6px',
  },
  empty: { padding: '24px', textAlign: 'center' },
};
