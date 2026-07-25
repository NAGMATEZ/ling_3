import React from 'react';
import { useRetrospective } from '../context/RetrospectiveContext.js';

export default function VotingPanel() {
  const { state, toggleVote } = useRetrospective();
  const session = state.session;
  const currentUser = state.userName || 'You';
  const actions = state.actions.filter(a => a.sessionId === session?.id);

  if (session?.phase === 'complete') return null;

  const getVoteInfo = (actionId: string) => state.votes.get(actionId) || { voteCount: 0, voters: [] as string[] };

  const totalVotes = actions.reduce((sum, a) => sum + getVoteInfo(a.id).voteCount, 0);
  const maxVotes = Math.max(...actions.map(a => getVoteInfo(a.id).voteCount), 1);

  return (
    <div className="card flex-col">
      <h3>🗳️ Voting</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
        Click on actions to vote ({currentUser})
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }} className="stat" style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <div className="stat">
          <span className="stat-value">{actions.length}</span>
          <span className="stat-label">Items</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totalVotes}</span>
          <span className="stat-label">Votes</span>
        </div>
      </div>

      <div style={{ maxHeight: 350, overflowY: 'auto' }}>
        {actions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No actions to vote on yet.</p>
        ) : (
          [...actions].sort((a, b) => {
            const va = getVoteInfo(a.id).voteCount;
            const vb = getVoteInfo(b.id).voteCount;
            return vb - va;
          }).map(action => {
            const info = getVoteInfo(action.id);
            const hasVoted = info.voters.includes(currentUser);
            const pct = (info.voteCount / maxVotes) * 100;
            return (
              <div key={action.id} className="action-item" style={{ flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                  <span className={`badge badge-${action.type}`}>{action.type}</span>
                  <span style={{ flex: 1, fontSize: '0.85rem' }}>{action.text}</span>
                  <button
                    className={`vote-btn ${hasVoted ? 'voted' : ''}`}
                    onClick={() => toggleVote(action.id, currentUser)}
                    title={hasVoted ? 'Remove your vote' : 'Vote for this action'}
                  >
                    ▲ <span className="vote-count">{info.voteCount}</span>
                  </button>
                </div>
                {info.voteCount > 0 && (
                  <div style={{ width: '100%', background: 'var(--surface-light)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: hasVoted ? 'var(--accent)' : 'var(--yellow)',
                      borderRadius: 4,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                )}
                {info.voters.length > 0 && info.voters.length <= 5 && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Voted by: {info.voters.join(', ')}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}