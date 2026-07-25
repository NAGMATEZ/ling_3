export interface Action {
  id: string;
  sessionId: string;
  type: 'start' | 'stop' | 'continue';
  author: string;
  text: string;
  createdAt: number;
}

export interface Vote {
  id: string;
  sessionId: string;
  actionId: string;
  voterName: string;
  createdAt: number;
}

export type Phase = 'what_went_well' | 'didnt_go_well' | 'action_items' | 'complete';

export interface Session {
  id: string;
  shareCode: string;
  title: string;
  phase: Phase;
  createdAt: number;
  completedAt: number | null;
}

export interface HistoryEntry {
  id: string;
  sessionId: string;
  title: string;
  completedAt: number;
  totalActions: number;
  totalVotes: number;
  startCount: number;
  stopCount: number;
  continueCount: number;
  shareCode: string;
}

export interface SessionState {
  session: Session;
  actions: Action[];
  votes: Vote[];
}

export interface VoteInfo {
  voteCount: number;
  voters: string[];
}

export type WSMessage =
  | { type: 'session_state'; payload: SessionState }
  | { type: 'action_added'; payload: { action: Action; sessionId: string } }
  | { type: 'vote_added'; payload: { actionId: string; voterName: string; voteCount: number; voters: string[]; sessionId: string } }
  | { type: 'vote_removed'; payload: { actionId: string; voterName: string; voteCount: number; voters: string[]; sessionId: string } }
  | { type: 'phase_change'; payload: { phase: Phase; sessionId: string } }
  | { type: 'user_joined'; payload: { userName: string; sessionId: string } }
  | { type: 'user_left'; payload: { userName: string; sessionId: string } }
  | { type: 'error'; payload: { message: string } };