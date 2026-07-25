import type { Action, Vote, Session, Phase } from '../types.js';

export const MOCK_SESSIONS: Record<string, Session> = {
  'default': {
    id: 'default',
    shareCode: 'DEFAULT',
    title: 'Sprint 42 — Retrospective',
    phase: 'what_went_well',
    createdAt: Date.now() - 86400000,
    completedAt: null,
  },
};

const TEAM_MEMBERS = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];

const MOCK_ACTIONS: Action[] = [
  { id: 'a1', sessionId: 'default', type: 'continue', author: 'Alice', text: 'Daily standups kept everyone aligned this sprint', createdAt: Date.now() - 72000000 },
  { id: 'a2', sessionId: 'default', type: 'continue', author: 'Bob', text: 'Code review process caught several bugs early', createdAt: Date.now() - 71000000 },
  { id: 'a3', sessionId: 'default', type: 'continue', author: 'Charlie', text: 'Pair programming on the auth module worked well', createdAt: Date.now() - 70000000 },
  { id: 'a4', sessionId: 'default', type: 'stop', author: 'Diana', text: 'Deploy process was manual and error-prone', createdAt: Date.now() - 69000000 },
  { id: 'a5', sessionId: 'default', type: 'stop', author: 'Eve', text: 'Unclear requirements from product caused rework', createdAt: Date.now() - 68000000 },
  { id: 'a6', sessionId: 'default', type: 'stop', author: 'Alice', text: 'Testing environment was unstable for 2 days', createdAt: Date.now() - 67000000 },
  { id: 'a7', sessionId: 'default', type: 'start', author: 'Bob', text: 'Automate deployment pipeline with CI/CD', createdAt: Date.now() - 66000000 },
  { id: 'a8', sessionId: 'default', type: 'start', author: 'Charlie', text: 'Write acceptance criteria before starting stories', createdAt: Date.now() - 65000000 },
  { id: 'a9', sessionId: 'default', type: 'start', author: 'Diana', text: 'Set up a dedicated staging environment', createdAt: Date.now() - 64000000 },
];

const MOCK_VOTES: Vote[] = [
  { id: 'v1', sessionId: 'default', actionId: 'a1', voterName: 'Bob', createdAt: Date.now() - 3600000 },
  { id: 'v2', sessionId: 'default', actionId: 'a1', voterName: 'Charlie', createdAt: Date.now() - 3600000 },
  { id: 'v3', sessionId: 'default', actionId: 'a1', voterName: 'Diana', createdAt: Date.now() - 3500000 },
  { id: 'v4', sessionId: 'default', actionId: 'a7', voterName: 'Alice', createdAt: Date.now() - 7200000 },
  { id: 'v5', sessionId: 'default', actionId: 'a7', voterName: 'Eve', createdAt: Date.now() - 7100000 },
  { id: 'v6', sessionId: 'default', actionId: 'a8', voterName: 'Bob', createdAt: Date.now() - 7000000 },
  { id: 'v7', sessionId: 'default', actionId: 'a8', voterName: 'Charlie', createdAt: Date.now() - 6900000 },
  { id: 'v8', sessionId: 'default', actionId: 'a2', voterName: 'Eve', createdAt: Date.now() - 3400000 },
  { id: 'v9', sessionId: 'default', actionId: 'a4', voterName: 'Bob', createdAt: Date.now() - 3300000 },
  { id: 'v10', sessionId: 'default', actionId: 'a4', voterName: 'Charlie', createdAt: Date.now() - 3200000 },
  { id: 'v11', sessionId: 'default', actionId: 'a5', voterName: 'Alice', createdAt: Date.now() - 3100000 },
  { id: 'v12', sessionId: 'default', actionId: 'a5', voterName: 'Diana', createdAt: Date.now() - 3000000 },
];

export function getMockSessionState(sessionId?: string): { session: Session; actions: Action[]; votes: Vote[]; voteMap: Map<string, { voteCount: number; voters: string[] }> } {
  const session = MOCK_SESSIONS['default']!;
  const actions = MOCK_ACTIONS.filter(a => a.sessionId === sessionId || a.sessionId === 'default');
  const votes = MOCK_VOTES.filter(v => v.sessionId === sessionId || v.sessionId === 'default');
  const voteMap = new Map<string, { voteCount: number; voters: string[] }>();
  actions.forEach(action => {
    const votesForAction = votes.filter(v => v.actionId === action.id);
    voteMap.set(action.id, { voteCount: votesForAction.length, voters: votesForAction.map(v => v.voterName) });
  });
  return { session, actions, votes, voteMap };
}

export const MOCK_TEAM_NAMES = [...TEAM_MEMBERS];

export function getActionVotes(actionId: string): { voteCount: number; voters: string[] } {
  const votesForAction = MOCK_VOTES.filter(v => v.actionId === actionId);
  return { voteCount: votesForAction.length, voters: votesForAction.map(v => v.voterName) };
}

export type { Phase };