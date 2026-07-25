import React, { useState } from 'react';
import { useRetrospective } from '../context/RetrospectiveContext.js';
import type { HistoryEntry } from '../types.js';

export default function HistoryPanel({ onLoadHistorical, refreshHistory }: { onLoadHistorical: (code: string) => Promise<void>; refreshHistory: () => Promise<void> }) {
  const { state } = useRetrospective();
  const [expanded, setExpanded] = useState(false);

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="card">
      <div className="flex-row" style={{ justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => { setExpanded(!expanded); refreshHistory(); }}>
        <h3>📋 Retrospective History ({state.history.length} completed)</h3>
        <button className="vote-btn">{expanded ? '▼ Collapse' : '▶ Expand'}</button>
      </div>
      {expanded && (
        <>
          {state.history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: 12, textAlign: 'center' }}>No completed retrospectives yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Title</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Actions</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Votes</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Start</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Stop</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Continue</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {state.history.map((entry: HistoryEntry) => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => onLoadHistorical(entry.shareCode)}>
                      <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{formatDate(entry.completedAt)}</td>
                      <td style={{ padding: '6px 8px' }}>{entry.title}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>{entry.totalActions}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>{entry.totalVotes}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}><span className="badge badge-start">{entry.startCount}</span></td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}><span className="badge badge-stop">{entry.stopCount}</span></td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}><span className="badge badge-continue">{entry.continueCount}</span></td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        code: {entry.shareCode}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}