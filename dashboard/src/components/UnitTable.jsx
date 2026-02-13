import React, { useState } from 'react';

export default function UnitTable({ units = [], onSelectUnit }) {
  const [sortKey, setSortKey] = useState('unit_id');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sorted = [...units].sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return sortAsc ? -1 : 1;
    if (va > vb) return sortAsc ? 1 : -1;
    return 0;
  });

  const arrow = (key) => sortKey === key ? (sortAsc ? ' \u25B4' : ' \u25BE') : '';

  return (
    <div className="card">
      <div className="card-label">UNIT ROSTER <span className="badge-count">{units.length}</span></div>
      {units.length === 0 ? (
        <div className="empty-state">AWAITING FIELD ASSET REGISTRATION</div>
      ) : (
        <div className="table-scroll">
          <table className="roster-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('unit_id')} className="sortable">CALLSIGN{arrow('unit_id')}</th>
                <th onClick={() => handleSort('status')} className="sortable">STATUS{arrow('status')}</th>
                <th onClick={() => handleSort('speed_mps')} className="sortable">SPD{arrow('speed_mps')}</th>
                <th onClick={() => handleSort('direction_deg')} className="sortable">HDG{arrow('direction_deg')}</th>
                <th onClick={() => handleSort('risk_score')} className="sortable">RISK{arrow('risk_score')}</th>
                <th>LAST UPD</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(u => (
                <tr
                  key={u.unit_id}
                  className={`roster-row ${u.risk_score >= 0.75 ? 'row-critical' : u.risk_score >= 0.55 ? 'row-high' : ''}`}
                  onClick={() => onSelectUnit && onSelectUnit(u.unit_id)}
                >
                  <td>{u.unit_id}</td>
                  <td>
                    <span className={`status-tag ${u.status}`}>
                      {u.status.toUpperCase()}
                    </span>
                  </td>
                  <td>{u.speed_mps.toFixed(1)}</td>
                  <td>{u.direction_deg.toFixed(0)}&deg;</td>
                  <td style={{ color: riskColor(u.risk_score), fontWeight: 700 }}>
                    {u.risk_score.toFixed(2)}
                  </td>
                  <td className="last-update-cell">{fmtTime(u.last_update)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function riskColor(s) {
  if (s >= 0.75) return '#ff1744';
  if (s >= 0.55) return '#ff6d00';
  if (s >= 0.3) return '#ffd600';
  return '#4caf50';
}

function fmtTime(iso) {
  if (!iso) return '\u2014';
  try { return new Date(iso).toISOString().slice(11, 19); }
  catch { return '\u2014'; }
}
