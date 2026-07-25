import React, { useState } from 'react';
import { useRetrospective } from '../context/RetrospectiveContext.js';
import type { Phase } from '../types.js';

const TYPE_BADGES: Record<string, { cls: string; label: string }> = {
  start: { cls: 'badge-start', label: 'Start' },
  stop: { cls: 'badge-stop', label: 'Stop' },
  continue: { cls: 'badge-continue', label: 'Continue' },
};

const PHASE_ACTION_TYPES: Record<Phase, string[]> = {
  what_went_well: ['continue', 'start'],
  didnt_go_well: ['stop', 'start'],
  action_items: ['start', 'continue', 'stop'],
  complete: ['start', 'stop', 'continue'],
};

export default function ActionLog() {
  const { state, addAction } = useRetrospective();
  const [text, setText] = useState('');
  const [selectedType, setSelectedType] = useState<'start' | 'stop' | 'continue'>('continue');

  const session = state.session;
  const allowedTypes = session ? PHASE_ACTION_TYPES[session.phase] : ['start', 'stop', 'continue'];
  if (!allowedTypes.includes(selectedType)) setSelectedType(allowedTypes[0]);

  const currentUser = state.userName || 'You';
  const actions = state.actions.filter(a => a.sessionId === session?.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !session) return;
    addAction(selectedType, trimmed, currentUser);
    setText('');
  };

  return (
    <div className="card flex-col">
      <h3>📝 Log Action</h3>
      <div className="flex-row" style={{ gap: 6, marginBottom: 8 }}>
        {(['start', 'stop', 'continue'] as const).map(t => (
          <button
            key={t}
            className={`vote-btn ${selectedType === t ? 'voted' : ''} badge-${t}`}
            style={selectedType === t ? {} : { opacity: 0.6 }}
            onClick={() => setSelectedType(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex-col">
        <textarea
          placeholder="Describe your action item..."
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          disabled={session?.phase === 'complete'}
        />
        <button type="submit" disabled={!text.trim() || session?.phase === 'complete'} style={{ alignSelf: 'flex-end', marginTop: 4 }}>
          Add Action
        </button>
      </form>

      <h3 style={{ marginTop: 16 }}>Actions ({actions.length})</h3>
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {actions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No actions yet. Be the first!</p>
        ) : (
          [...actions].sort((a, b) => b.createdAt - a.createdAt).map(action => {
            const badge = TYPE_BADGES[action.type];
            return (
              <div key={action.id} className="action-item">
                <span className={`badge ${badge.cls}`}>{badge.label}</span>
                <div style={{ flex: 1 }}>
                  <div className="action-text">{action.text}</div>
                  <div className="action-meta">{action.author} · {new Date(action.createdAt).toLocaleTimeString()}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}