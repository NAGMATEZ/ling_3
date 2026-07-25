import React from 'react';
import { useRetrospective } from '../context/RetrospectiveContext.js';

export default function ActionItems() {
  const { state, userAction } = useRetrospective();
  // We just use state — the ActionLog component handles new items
  const session = state.session;
  if (!session || session.phase !== 'action_items') return null;

  const actions = state.actions.filter(a => a.sessionId === session.id);
  const { completeSession } = useRetrospective();

  const startActions = actions.filter(a => a.type === 'start');
  const sorted = [...startActions].sort((a, b) => {
    const va = state.votes.get(a.id)?.voteCount || 0;
    const vb = state.votes.get(b.id)?.voteCount || 0;
    return vb - va;
  });

  return (
    <div className="card flex-col">
      <h3>🎯 Top Action Items</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
        Ranked by votes — highest priority first
      </p>
      {sorted.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
          No start actions yet. Add action items during this phase.
        </p>
      ) : (
        sorted.map((action, idx) => {
          const info = state.votes.get(action.id) || { voteCount: 0, voters: [] as string[] };
          return (
            <div key={action.id} className="action-item">
              <span style={{ fontWeight: 700, color: 'var(--accent)', minWidth: 24 }}>#{idx + 1}</span>
              <div style={{ flex: 1 }}>
                <div className="action-text">{action.text}</div>
                <div className="action-meta">
                  {info.voteCount} vote{info.voteCount !== 1 ? 's' : ''} · by {action.author}
                </div>
              </div>
              <span className="badge badge-start">{action.type}</span>
            </div>
          );
        })
      )}
      {session.phase === 'action_items' && (
        <button
          onClick={async () => {
            if (confirm('Mark this retrospective as complete? This will save the session to history.')) {
              await completeSession();
            }
          }}
          style={{ background: 'var(--purple)', color: 'white', marginTop: 8 }}
        >
          ✅ Complete Retro
        </button>
      )}
    </div>
  );
}