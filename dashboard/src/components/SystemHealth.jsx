import React from 'react';

export default function SystemHealth({ units = [], connected, mlStatus = {} }) {
  const activeCount = units.filter(u => u.status === 'active').length;
  const idleCount = units.filter(u => u.status === 'idle').length;
  const pausedCount = units.filter(u => u.status === 'paused').length;
  const offlineCount = units.filter(u => u.status === 'offline').length;
  const avgRisk = units.length
    ? units.reduce((s, u) => s + u.risk_score, 0) / units.length
    : 0;
  const maxRisk = units.length
    ? Math.max(...units.map(u => u.risk_score))
    : 0;
  const riskPct = (avgRisk * 100).toFixed(0);
  const alertCount = units.filter(u => u.risk_score > 0.55).length;

  return (
    <div className="card">
      <div className="card-label">SYSTEM STATUS</div>
      <div className="health-grid">
        <div className="health-item">
          <span className={`health-led ${connected ? 'green' : 'red'}`} />
          <div>
            <div className="health-val">{connected ? 'ONLINE' : 'OFFLINE'}</div>
            <div className="health-lbl">UPLINK</div>
          </div>
        </div>
        <div className="health-item">
          <span className="health-led blue" />
          <div>
            <div className="health-val">{units.length}</div>
            <div className="health-lbl">DEPLOYED</div>
          </div>
        </div>
        <div className="health-item">
          <span className={`health-led ${activeCount > 0 ? 'green' : 'amber'}`} />
          <div>
            <div className="health-val">{activeCount}</div>
            <div className="health-lbl">ACTIVE</div>
          </div>
        </div>
        <div className="health-item">
          <span className={`health-led ${mlStatus.trained ? 'green' : 'amber'}`} />
          <div>
            <div className="health-val">{mlStatus.trained ? 'TRAINED' : 'LEARNING'}</div>
            <div className="health-lbl">ML MODEL</div>
          </div>
        </div>

        {/* Extended stats row */}
        <div className="health-item">
          <span className="health-led amber" />
          <div>
            <div className="health-val">{idleCount + pausedCount}</div>
            <div className="health-lbl">STANDBY</div>
          </div>
        </div>
        <div className="health-item">
          <span className={`health-led ${alertCount > 0 ? 'red' : 'green'}`} />
          <div>
            <div className="health-val">{alertCount}</div>
            <div className="health-lbl">THREATS</div>
          </div>
        </div>

        {/* Threat index bar */}
        <div className="health-item avg-risk-bar">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span className="health-lbl">THREAT INDEX</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 700,
                color: barColor(avgRisk),
              }}>{riskPct}%</span>
            </div>
            <div className="risk-bar-track">
              <div className="risk-bar-fill" style={{ width: `${riskPct}%`, background: barColor(avgRisk) }} />
            </div>
          </div>
        </div>

        {/* Max risk bar */}
        <div className="health-item avg-risk-bar">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span className="health-lbl">PEAK RISK</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 700,
                color: barColor(maxRisk),
              }}>{(maxRisk * 100).toFixed(0)}%</span>
            </div>
            <div className="risk-bar-track">
              <div className="risk-bar-fill" style={{ width: `${(maxRisk * 100).toFixed(0)}%`, background: barColor(maxRisk) }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function barColor(v) {
  if (v >= 0.75) return '#ff1744';
  if (v >= 0.55) return '#ff6d00';
  if (v >= 0.3)  return '#ffd600';
  return '#4caf50';
}
