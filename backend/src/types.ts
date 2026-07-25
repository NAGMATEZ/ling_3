export interface Session {
  id: string;
  shareCode: string;
  title: string;
  phase: 'what_went_well' | 'didnt_go_well' | 'action_items' | 'complete';
  createdAt: number;
  completedAt: number | null;
}

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

export interface RetroHistoryEntry {
  id: string;
  sessionId: string;
  title: string;
  completedAt: number;
  totalActions: number;
  totalVotes: number;
  startCount: number;
  stopCount: number;
  continueCount: number;
}

// WebSocket message types
export interface WSMessage {
  type: string;
  payload: any;
  sessionId?: string;
}

export interface JoinMessage {
  type: 'join';
  payload: { sessionId: string; userName: string };
}

export interface ActionAddedMessage {
  type: 'action_added';
  payload: { action: Action; sessionId: string };
}

export interface VoteAddedMessage {
  type: 'vote_added';
  payload: { actionId: string; voterName: string; voteCount: number; voters: string[]; sessionId: string };
}

export interface PhaseChangeMessage {
  type: 'phase_change';
  payload: { phase: Session['phase']; sessionId: string };
}

export interface SessionStateMessage {
  type: 'session_state';
  payload: { session: Session; actions: Action[]; votes: Vote[] };
}

export interface UserJoinedMessage {
  type: 'user_joined';
  payload: { userName: string; sessionId: string };
}

export type AnyWSMessage = JoinMessage | ActionAddedMessage | VoteAddedMessage | PhaseChangeMessage | SessionStateMessage | UserJoinedMessage;