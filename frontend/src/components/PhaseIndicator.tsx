import React from 'react';
import { useRetrospective } from '../context/RetrospectiveContext.js';
import type { Phase } from '../types.js';

const PHASE_LABELS: Record<Phase, string> = {
  what_went_well: 'What Went Well',
  didnt_go_well: 'What Didn\'t Go Well',
  action_items: 'Action Items',
  complete: 'Complete',
};

const PHASE_ORDER: Phase[] = ['what_went_well', 'didnt_go_well', 'action_items', 'complete'];

const PHASE_COLORS: Record<Phase, string> = {
  what_went_well: 'var(--green)',
  didnt_go_well: 'var(--red)',
  action_items: 'var(--accent)',
  complete: 'var(--purple)',
};

export default function PhaseIndicator() {
  const { state } = useRetrospective();
  const currentPhase = state.session?.phase || 'what_went_well';
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  return (
    <div className="phase-tabs">
      {PHASE_ORDER.map((phase, idx) => (
        <React.Fragment key={phase}>
          {idx > 0 && <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '4px 2px' }} />}
          <button
            className={`phase-tab ${phase === currentPhase ? 'active' : ''}`}
            style={phase === currentPhase ? { background: PHASE_COLORS[phase], color: '#fff' } : undefined}
          >
            {idx <= currentIndex ? '✓ ' : ''}{PHASE_LABELS[phase]}
          </button>
        </React.Fragment>
      ))}
      {state.connected && (
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--green)', alignSelf: 'center' }}>● Synced</span>
      )}
    </div>
  );
}