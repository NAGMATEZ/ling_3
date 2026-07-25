import React from 'react';
import { useRetrospective } from '../context/RetrospectiveContext.js';
import type { Phase } from '../types.js';

const PHASES: { key: Phase; label: string; color: string }[] = [
  { key: 'what_went_well', label: '🎉 What Went Well', color: 'var(--green)' },
  { key: 'didnt_go_well', label: '⚠️ What Didn\'t Go Well', color: 'var(--red)' },
  { key: 'action_items', label: '🎯 Action Items', color: 'var(--accent)' },
  { key: 'complete', label: '✅ Complete', color: 'var(--purple)' },
];

export default function FacilitatorControls() {
  const { state, changePhase } = useRetrospective();
  const session = state.session;
  if (!session || session.phase === 'complete') return null;

  const currentIndex = PHASES.findIndex(p => p.key === session.phase);

  return (
    <div className="card flex-col" style={{ gap: 8 }}>
      <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>🛠️ Facilitator Controls</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current: {PHASES[currentIndex]?.label}</span>
      </div>
      <div className="flex-row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {PHASES.map((phase, idx) => (
          <React.Fragment key={phase.key}>
            {idx > 0 && idx <= currentIndex && (
              <button
                className="vote-btn"
                style={{ background: PHASES[idx - 1].color, color: '#fff', borderColor: PHASES[idx - 1].color, fontSize: '0.8rem', padding: '4px 10px' }}
                onClick={() => changePhase(phase.key)}
              >
                → {phase.label}
              </button>
            )}
            {idx === 0 && (
              <button
                className="vote-btn"
                style={{ background: phase.color, color: '#fff', borderColor: phase.color, fontSize: '0.8rem', padding: '4px 10px' }}
                onClick={() => changePhase(phase.key)}
              >
                {phase.label}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}