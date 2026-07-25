import React, { useEffect, useState } from 'react';
import { RetrospectiveProvider, useRetrospective } from './context/RetrospectiveContext.js';
import type { Phase } from './types.js';
import PhaseIndicator from './components/PhaseIndicator.js';
import ActionLog from './components/ActionLog.js';
import VotingPanel from './components/VotingPanel.js';
import ActionItems from './components/ActionItems.js';
import HistoryPanel from './components/HistoryPanel.js';
import FacilitatorControls from './components/FacilitatorControls.js';
import ShareLink from './components/ShareLink.js';
import './style.css';

function AppContent() {
  const { state, createSession, joinSession, loadHistoricalSession, refreshHistory } = useRetrospective();
  const [userName, setUserName] = useState(() => {
    const saved = localStorage.getItem('retro_user_name');
    return saved || '';
  });
  const [showNamePrompt, setShowNamePrompt] = useState(!userName);

  useEffect(() => {
    if (userName) localStorage.setItem('retro_user_name', userName);
  }, [userName]);

  useEffect(() => {
    if (state.session && !state.loading && !state.error) {
      refreshHistory();
    }
  }, [state.session]);

  if (showNamePrompt && !state.loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <h1>🔄 Retro Board</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Enter your name to join the session</p>
          <div className="form-group">
            <input
              placeholder="Your name"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && userName.trim() && setShowNamePrompt(false)}
              autoFocus
            />
          </div>
          <button style={{ width: '100%' }} disabled={!userName.trim()} onClick={() => setShowNamePrompt(false)}>
            Join Session
          </button>
        </div>
      </div>
    );
  }

  if (state.loading && !state.session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading session...</p>
      </div>
    );
  }

  if (state.error && !state.session && !state.loading) {
    // Allow creation of new session
  }

  return (
    <div className="flex-col" style={{ gap: 16 }}>
      <header className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>🔄 Sprint Retrospective</h1>
          {state.session && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {state.session.title} — Phase: {state.session.phase.replace('_', ' ')}
            </span>
          )}
        </div>
        <div className="flex-row">
          <span style={{ fontSize: '0.8rem', color: state.connected ? 'var(--green)' : 'var(--yellow)', fontWeight: 500 }}>
            {state.connected ? '● Live' : '● Mock'}
          </span>
          <ShareLink session={state.session} />
        </div>
      </header>

      {state.session ? (
        <>
          <FacilitatorControls />
          <PhaseIndicator />

          <div className="grid">
            <ActionLog />
            <div className="flex-col" style={{ gap: 16 }}>
              <VotingPanel />
              <ActionItems />
            </div>
          </div>
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <h2>Welcome to the Sprint Retrospective Tool</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Create a new session or join an existing one with a share code.</p>
          <div className="flex-col" style={{ maxWidth: 400, margin: '0 auto' }}>
            <div className="form-group">
              <label>Session Title</label>
              <input id="sessionTitle" placeholder="e.g., Sprint 42 Retrospective" />
            </div>
            <button onClick={async () => {
              const title = (document.getElementById('sessionTitle') as HTMLInputElement).value.trim();
              if (!title) return;
              const id = await createSession(title, userName);
              joinSession(id, userName);
            }}>
              Create Session
            </button>
          </div>
        </div>
      )}

      <HistoryPanel onLoadHistorical={loadHistoricalSession} refreshHistory={refreshHistory} />
    </div>
  );
}

export default function App() {
  return (
    <RetrospectiveProvider>
      <AppContent />
    </RetrospectiveProvider>
  );
}