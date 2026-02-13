import React from 'react';

export default function RiskOverlay({ units = [] }) {
  const ranked = [...units]
    .filter(u => u.risk_score > 0)
    .sort((a, b) => b.risk_score - a.risk_score);

  return (
    <div className="card">
      <div className="card-label">RISK ASSESSMENT</div>
      {ranked.length === 0 ? (
        <div className="empty-state">NO RISK DATA</div>
      ) : (
        ranked.map(u => {
          const pct = (u.risk_score * 100).toFixed(0);
          const color = riskColor(u.risk_score);
          const label = riskLabel(u.risk_score);
          return (
            <div key={u.unit_id} className="risk-item">
              <span className="risk-callsign">{u.unit_id}</span>
              <div className="risk-bar-wrapper">
                <div className="risk-bar-inner" style={{ width: `${pct}%`, background: color }} />
              </div>
              <span className="risk-score-val" style={{ color }}>{u.risk_score.toFixed(2)}</span>
              <span className="risk-level-tag" style={{ background: color + '22', color }}>
                {label}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

function riskColor(s) {
  if (s >= 0.75) return '#ff1744';
  if (s >= 0.55) return '#ff6d00';
  if (s >= 0.3)  return '#ffd600';
  return '#4caf50';
}

function riskLabel(s) {
  if (s >= 0.75) return 'CRIT';
  if (s >= 0.55) return 'HIGH';
  if (s >= 0.3)  return 'ELEV';
  return 'LOW';
}
