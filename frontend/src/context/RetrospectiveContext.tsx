import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import type { Action, Vote, Phase, Session, SessionState, WSMessage, HistoryEntry, VoteInfo } from '../types.js';
import { MOCK_SESSIONS } from '../mock/data.js';

interface State {
  session: Session | null;
  actions: Action[];
  votes: Map<string, VoteInfo>;
  connected: boolean;
  userName: string;
  history: HistoryEntry[];
  loading: boolean;
  error: string | null;
}

type ActionType =
  | { type: 'SET_SESSION'; payload: Session }
  | { type: 'SET_ACTIONS'; payload: Action[] }
  | { type: 'SET_VOTES'; payload: { actionId: string; voteCount: number; voters: string[] }[] }
  | { type: 'ADD_ACTION'; payload: Action }
  | { type: 'ADD_VOTE'; payload: { actionId: string; voterName: string; voteCount: number; voters: string[] } }
  | { type: 'REMOVE_VOTE'; payload: { actionId: string; voterName: string; voteCount: number; voters: string[] } }
  | { type: 'SET_PHASE'; payload: Phase }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_USER_NAME'; payload: string }
  | { type: 'SET_HISTORY'; payload: HistoryEntry[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

function votesReducer(state: State, action: ActionType): State {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, session: action.payload, error: null };
    case 'SET_ACTIONS':
      return { ...state, actions: action.payload };
    case 'SET_VOTES': {
      const newVotes = new Map(state.votes);
      action.payload.forEach(v => newVotes.set(v.actionId, { voteCount: v.voteCount, voters: v.voters }));
      return { ...state, votes: newVotes };
    }
    case 'ADD_ACTION':
      return { ...state, actions: [...state.actions, action.payload] };
    case 'ADD_VOTE': {
      const newVotes = new Map(state.votes);
      newVotes.set(action.payload.actionId, { voteCount: action.payload.voteCount, voters: action.payload.voters });
      return { ...state, votes: newVotes };
    }
    case 'REMOVE_VOTE': {
      const newVotes = new Map(state.votes);
      newVotes.set(action.payload.actionId, { voteCount: action.payload.voteCount, voters: action.payload.voters });
      return { ...state, votes: newVotes };
    }
    case 'SET_PHASE':
      if (state.session) return { ...state, session: { ...state.session, phase: action.payload } };
      return state;
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };
    case 'SET_USER_NAME':
      return { ...state, userName: action.payload };
    case 'SET_HISTORY':
      return { ...state, history: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

interface RetrospectiveContextType {
  state: State;
  joinSession: (sessionId: string, userName: string) => void;
  createSession: (title: string, userName: string) => Promise<string>;
  addAction: (type: 'start' | 'stop' | 'continue', text: string, userName: string) => void;
  toggleVote: (actionId: string, voterName: string) => void;
  changePhase: (phase: Phase) => void;
  completeSession: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  loadHistoricalSession: (shareCode: string) => Promise<void>;
}

const RetrospectiveContext = createContext<RetrospectiveContextType | null>(null);

export function RetrospectiveProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(votesReducer, {
    session: null,
    actions: [],
    votes: new Map(),
    connected: false,
    userName: '',
    history: [],
    loading: false,
    error: null,
  });

  const { send, join, connected } = useWebSocket();
  const initializedRef = useRef(false);

  // Process WebSocket messages
  useEffect(() => {
    if (!state.lastMessage) return;
    const msg = state.lastMessage;

    switch (msg.type) {
      case 'session_state':
        dispatch({ type: 'SET_ACTIONS', payload: msg.payload.actions });
        const voteMap: { actionId: string; voteCount: number; voters: string[] }[] = [];
        const votesByAction = new Map<string, { voteCount: number; voters: string[] }>();
        msg.payload.actions.forEach(a => {
          const votes = msg.payload.votes.filter((v: any) => v.actionId === a.id);
          const info = { voteCount: votes.length, voters: votes.map((v: any) => v.voterName) };
          votesByAction.set(a.id, info);
          voteMap.push({ actionId: a.id, voteCount: info.voteCount, voters: info.voters });
        });
        dispatch({ type: 'SET_VOTES', payload: voteMap });
        dispatch({ type: 'SET_SESSION', payload: msg.payload.session });
        break;
      case 'action_added':
        dispatch({ type: 'ADD_ACTION', payload: msg.payload.action });
        break;
      case 'vote_added':
        dispatch({ type: 'ADD_VOTE', payload: msg.payload });
        break;
      case 'vote_removed':
        dispatch({ type: 'REMOVE_VOTE', payload: msg.payload });
        break;
      case 'phase_change':
        dispatch({ type: 'SET_PHASE', payload: msg.payload.phase });
        break;
      default:
        break;
    }
  }, [state.lastMessage]);

  useEffect(() => {
    if (!initializedRef.current) {
      // Check URL for share code
      const params = new URLSearchParams(window.location.search);
      const shareCode = params.get('session');
      if (shareCode) {
        initializedRef.current = true;
        (async () => {
          dispatch({ type: 'SET_LOADING', payload: true });
          try {
            const res = await fetch(`/api/sessions/${shareCode}`);
            if (res.ok) {
              const data = await res.json();
              dispatch({ type: 'SET_SESSION', payload: data.session });
              dispatch({ type: 'SET_ACTIONS', payload: data.actions });
              const voteArr = data.actions.map(a => {
                const vs = data.votes.filter((v: any) => v.actionId === a.id);
                return { actionId: a.id, voteCount: vs.length, voters: vs.map((v: any) => v.voterName) };
              });
              dispatch({ type: 'SET_VOTES', payload: voteArr });
            } else {
              dispatch({ type: 'SET_ERROR', payload: 'Session not found. Creating a new one instead.' });
              shareCode && dispatch({ type: 'SET_LOADING', payload: false });
            }
          } catch {
            dispatch({ type: 'SET_ERROR', payload: null });
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        })();
      }
    }
  }, []);

  const joinSession = useCallback((sessionId: string, userName: string) => {
    dispatch({ type: 'SET_USER_NAME', payload: userName });
    join(sessionId, userName);
  }, [join]);

  const createSession = useCallback(async (title: string, userName: string): Promise<string> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to create session');
      const data = await res.json();
      dispatch({ type: 'SET_USER_NAME', payload: userName });
      dispatch({ type: 'SET_SESSION', payload: { id: data.id, shareCode: data.shareCode, title, phase: 'what_went_well' as Phase, createdAt: Date.now(), completedAt: null } });
      dispatch({ type: 'SET_ACTIONS', payload: [] });
      dispatch({ type: 'SET_VOTES', payload: [] });
      dispatch({ type: 'SET_LOADING', payload: false });
      return data.id;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create session. Mock mode active.' });
      dispatch({ type: 'SET_LOADING', payload: false });
      const mockId = 'default';
      dispatch({ type: 'SET_SESSION', payload: MOCK_SESSIONS[mockId]! });
      dispatch({ type: 'SET_USER_NAME', payload: userName });
      return mockId;
    }
  }, []);

  const addAction = useCallback((type: 'start' | 'stop' | 'continue', text: string, userName: string) => {
    const action = {
      id: 'temp_' + Date.now(),
      sessionId: state.session!.id,
      type,
      author: userName || state.userName || 'You',
      text,
      createdAt: Date.now(),
    };
    send({ type: 'action_added', payload: { sessionId: state.session!.id, action } });
  }, [state.session, state.userName, send]);

  const toggleVote = useCallback((actionId: string, voterName: string) => {
    const current = state.votes.get(actionId);
    const hasVoted = current?.voters.includes(voterName) ?? false;
    send({
      type: hasVoted ? 'vote_removed' : 'vote_added',
      payload: {
        sessionId: state.session!.id,
        actionId,
        voterName,
      },
    });
  }, [state.votes, state.session, send]);

  const changePhase = useCallback((phase: Phase) => {
    if (!state.session) return;
    send({ type: 'phase_change', payload: { phase, sessionId: state.session.id } });
  }, [state.session, send]);

  const completeSession = useCallback(async () => {
    if (!state.session) return;
    try {
      await fetch(`/api/sessions/${state.session.id}/complete`, { method: 'POST' });
      dispatch({ type: 'SET_PHASE', payload: 'complete' });
    } catch {
      dispatch({ type: 'SET_PHASE', payload: 'complete' });
    }
  }, [state.session]);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        dispatch({ type: 'SET_HISTORY', payload: data });
      }
    } catch {
      // silent fail for history refresh
    }
  }, []);

  const loadHistoricalSession = useCallback(async (shareCode: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch(`/api/sessions/${shareCode}`);
      if (res.ok) {
        const data = await res.json();
        dispatch({ type: 'SET_SESSION', payload: data.session });
        dispatch({ type: 'SET_ACTIONS', payload: data.actions });
        const voteArr = data.actions.map((a: Action) => {
          const vs = data.votes.filter((v: any) => v.actionId === a.id);
          return { actionId: a.id, voteCount: vs.length, voters: vs.map((v: any) => v.voterName) };
        });
        dispatch({ type: 'SET_VOTES', payload: voteArr });
      }
    } catch {}
    dispatch({ type: 'SET_LOADING', payload: false });
  }, []);

  return React.createElement(RetrospectiveContext.Provider, {
    value: { state, joinSession, createSession, addAction, toggleVote, changePhase, completeSession, refreshHistory, loadHistoricalSession },
  }, children);
}

export function useRetrospective() {
  const ctx = useContext(RetrospectiveContext);
  if (!ctx) throw new Error('useRetrospective must be used within RetrospectiveProvider');
  return ctx;
}