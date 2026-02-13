import React, { useState } from 'react';

export default function AlertsPanel({ alerts = [] }) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? alerts
    : alerts.filter(a => a.severity === filter);

  const counts = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    elevated: alerts.filter(a => a.severity === 'elevated').length,
    low: alerts.filter(a => a.severity === 'low').length,
  };

  return (
    <div className="card">
      <div className="card-label">
        INTELLIGENCE FEED
        <span className="badge-count">{alerts.length}</span>
      </div>

      {/* Severity filter chips */}
      <div className="alert-filters">
        <button
          className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >ALL</button>
        {counts.critical > 0 && (
          <button
            className={`filter-chip sev-critical ${filter === 'critical' ? 'active' : ''}`}
            onClick={() => setFilter('critical')}
          >CRIT ({counts.critical})</button>
        )}
        {counts.high > 0 && (
          <button
            className={`filter-chip sev-high ${filter === 'high' ? 'active' : ''}`}
            onClick={() => setFilter('high')}
          >HIGH ({counts.high})</button>
        )}
        {counts.elevated > 0 && (
          <button
            className={`filter-chip sev-elevated ${filter === 'elevated' ? 'active' : ''}`}
            onClick={() => setFilter('elevated')}
          >ELEV ({counts.elevated})</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          {alerts.length === 0 ? 'NO ACTIVE THREATS \u2014 SECTOR CLEAR' : 'NO MATCHING ALERTS'}
        </div>
      ) : (
        <div className="alert-scroll">
          {filtered.map((a, i) => (
            <div key={a.alert_id || i} className={`alert-card sev-${a.severity}`}>
              <div className="alert-header">
                <span className={`alert-sev ${a.severity}`}>
                  {a.severity.toUpperCase()}
                </span>
                <span className="alert-time">{fmtTime(a.created_at)}</span>
              </div>
              <div className="alert-msg">{a.message}</div>
              <div className="alert-units">{'\u2B21'} {a.affected_units?.join(', ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtTime(iso) {
  if (!iso) return '';
  try { return new Date(iso).toISOString().slice(11, 19) + ' UTC'; }
  catch { return String(iso); }
}
