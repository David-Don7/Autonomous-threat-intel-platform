import React from 'react';

const SEV_COLORS = {
  low: '#22c55e',
  elevated: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

export default function AlertsPanel({ alerts = [] }) {
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        Alerts{' '}
        <span style={styles.badge}>{alerts.length}</span>
      </h3>
      <div style={styles.list}>
        {alerts.length === 0 && (
          <p style={styles.empty}>No active alerts.</p>
        )}
        {alerts.map((alert, i) => (
          <div key={alert.alert_id || i} style={styles.card}>
            <div style={styles.header}>
              <span
                style={{
                  ...styles.sevBadge,
                  backgroundColor: SEV_COLORS[alert.severity] || '#64748b',
                }}
              >
                {alert.severity?.toUpperCase()}
              </span>
              <span style={styles.time}>
                {alert.created_at
                  ? new Date(alert.created_at).toLocaleTimeString()
                  : ''}
              </span>
            </div>
            <p style={styles.message}>{alert.message}</p>
            {alert.affected_units?.length > 0 && (
              <p style={styles.units}>
                Units: {alert.affected_units.join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '12px 0' },
  title: { color: '#f1f5f9', fontSize: '16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' },
  badge: {
    backgroundColor: '#ef4444',
    color: '#fff',
    borderRadius: '10px',
    padding: '1px 8px',
    fontSize: '12px',
    fontWeight: 600,
  },
  list: { maxHeight: '300px', overflowY: 'auto' },
  card: {
    background: '#1e293b',
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '8px',
    borderLeft: '3px solid #ef4444',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  sevBadge: { color: '#fff', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 700 },
  time: { color: '#64748b', fontSize: '11px' },
  message: { color: '#e2e8f0', fontSize: '13px', margin: '4px 0' },
  units: { color: '#94a3b8', fontSize: '12px', margin: 0 },
  empty: { color: '#64748b', fontSize: '13px' },
};
