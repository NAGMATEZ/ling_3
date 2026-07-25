import type { WSMessage, Action, Session, Phase, SessionState } from '../types.js';
import { MOCK_SESSIONS, MOCK_ACTIONS, MOCK_VOTES, getMockSessionState, MOCK_TEAM_NAMES } from './data.js';

const MOCK_USERS = ['Alice', 'Bob', 'Charlie', 'Diana'];
const PHASES: Phase[] = ['what_went_well', 'didnt_go_well', 'action_items', 'complete'];

interface MockState {
  sessions: Record<string, Session>;
  actions: Action[];
  votes: Record<string, Record<string, string[]>>;
}

export class MockWebSocket {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((e: Event) => void) | null = null;

  private state: MockState;
  private userName: string;
  private sessionId: string;
  private messageQueue: WSMessage[] = [];
  private intervals: ReturnType<typeof setInterval>[] = [];
  private simulateOtherUsers = true;

  constructor(userName: string = 'You', sessionId?: string) {
    this.userName = userName;
    this.sessionId = sessionId || 'default';

    this.state = this.loadState();

    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
      this.startSimulation();
    }, 300);
  }

  private loadState(): MockState {
    if (MOCK_SESSIONS[this.sessionId]) {
      const mockResult = getMockSessionState(this.sessionId);
      const actions = mockResult.actions.map(a => ({ ...a }));
      const votes: Record<string, Record<string, string[]>> = {};
      actions.forEach(a => {
        const info = mockResult.voteMap.get(a.id);
        if (info) {
          votes[a.id] = {};
          info.voters.forEach(v => { votes[a.id]![v] = v; });
        }
      });
      return {
        sessions: { ...MOCK_SESSIONS },
        actions,
        votes,
      };
    }
    const session: Session = {
      id: this.sessionId,
      shareCode: 'MOCK',
      title: `Session ${this.sessionId}`,
      phase: 'what_went_well',
      createdAt: Date.now(),
      completedAt: null,
    };
    MOCK_SESSIONS[this.sessionId] = session;
    return {
      sessions: { ...MOCK_SESSIONS },
      actions: [],
      votes: {},
    };
  }

  send(data: string) {
    try {
      const msg = JSON.parse(data);
      this.handleMessage(msg);
    } catch {
      // ignore malformed messages
    }
  }

  private handleMessage(msg: any) {
    switch (msg.type) {
      case 'join':
        this.handleJoin(msg);
        break;
      case 'action_added':
        this.handleActionAdded(msg);
        break;
      case 'vote_added':
        this.handleVoteAdded(msg);
        break;
      case 'vote_removed':
        this.handleVoteRemoved(msg);
        break;
      case 'phase_change':
        this.handlePhaseChange(msg);
        break;
    }
  }

  private handleJoin(msg: any) {
    this.userName = msg.payload?.userName || this.userName;
    this.sessionId = msg.payload?.sessionId || this.sessionId;
    this.simulateOtherUsers = true;

    const state = this.getState();
    this.broadcast({ type: 'user_joined', payload: { userName: this.userName, sessionId: this.sessionId } });

    setTimeout(() => {
      this.sendToListener({
        type: 'session_state',
        payload: { session: state.session, actions: state.actions, votes: state.votesFlat },
      });
    }, 100);
  }

  private handleActionAdded(msg: any) {
    const action: Action = {
      id: 'mock_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      sessionId: this.sessionId,
      type: msg.payload.action.type,
      author: this.userName,
      text: msg.payload.action.text,
      createdAt: Date.now(),
    };
    this.state.actions.push(action);
    this.broadcast({ type: 'action_added', payload: { action, sessionId: this.sessionId } });
  }

  private handleVoteAdded(msg: any) {
    const { actionId, voterName } = msg.payload;
    if (!this.state.votes[actionId]) this.state.votes[actionId] = {};
    this.state.votes[actionId][voterName] = voterName;
    const voteInfo = this.getVoteInfo(actionId);
    this.broadcast({ type: 'vote_added', payload: { actionId, voterName, voteCount: voteInfo.voteCount, voters: voteInfo.voters, sessionId: this.sessionId } });
  }

  private handleVoteRemoved(msg: any) {
    const { actionId, voterName } = msg.payload;
    if (this.state.votes[actionId]) {
      delete this.state.votes[actionId][voterName];
    }
    const voteInfo = this.getVoteInfo(actionId);
    this.broadcast({ type: 'vote_removed', payload: { actionId, voterName, voteCount: voteInfo.voteCount, voters: voteInfo.voters, sessionId: this.sessionId } });
  }

  private handlePhaseChange(msg: any) {
    const session = this.state.sessions[this.sessionId];
    if (session) {
      session.phase = msg.payload.phase;
      this.broadcast({ type: 'phase_change', payload: { phase: msg.payload.phase, sessionId: this.sessionId } });
    }
  }

  private getVoteInfo(actionId: string): { voteCount: number; voters: string[] } {
    const actionVotes = this.state.votes[actionId] || {};
    const voters = Object.values(actionVotes);
    return { voteCount: voters.length, voters };
  }

  private getActionVotes(actionId: string) {
    const actionVotes = this.state.votes[actionId] || {};
    const voterList = Object.values(actionVotes);
    return {
      voteCount: voterList.length,
      voters: voterList,
      hasVoted: voterList.includes(this.userName),
    };
  }

  private getState(): { session: Session; actions: Action[]; votesFlat: any[] } {
    const session = this.state.sessions[this.sessionId] || MOCK_SESSIONS['default']!;
    const actions = this.state.actions.filter(a => a.sessionId === this.sessionId);
    const votesFlat: any[] = [];
    actions.forEach(action => {
      const info = this.getVoteInfo(action.id);
      info.voters.forEach((voter: string) => {
        votesFlat.push({ actionId: action.id, voterName: voter });
      });
    });
    return { session, actions, votesFlat };
  }

  private broadcast(message: WSMessage) {
    setTimeout(() => {
      this.sendToListener(message);
    }, 50 + Math.random() * 100);
  }

  private sendToListener(msg: WSMessage) {
    const data = JSON.stringify(msg);
    this.onmessage?.({ data });
  }

  private startSimulation() {
    const addSimulationAction = () => {
      if (!this.simulateOtherUsers || Math.random() > 0.5) return;
      const member = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
      const templatesByType: Record<string, string[]> = {
        continue: ['Great progress on the API docs', 'Nice work on the search feature', 'Good refactoring of auth module'],
        stop: ['Still dealing with flaky tests', 'Code review turnaround is too slow', 'Tech debt in payments is growing'],
        start: ['Add automated E2E tests', 'Improve logging in service layer', 'Set up performance benchmarking'],
      };
      const phase = this.state.sessions[this.sessionId]?.phase || 'what_went_well';
      let type: 'start' | 'stop' | 'continue' = 'continue';
      if (phase === 'didnt_go_well') type = 'stop';
      else if (phase === 'action_items') type = 'start';
      else type = ['continue', 'stop', 'start'][Math.floor(Math.random() * 3)] as any;

      const templates = templatesByType[type];
      const text = templates[Math.floor(Math.random() * templates.length)];

      const action: Action = {
        id: 'sim_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        sessionId: this.sessionId,
        type,
        author: member,
        text,
        createdAt: Date.now(),
      };
      this.state.actions.push(action);
      this.sendToListener({ type: 'action_added', payload: { action, sessionId: this.sessionId } });

      setTimeout(() => {
        const info = this.getVoteInfo(action.id);
        if (info.voteCount === 0 && Math.random() > 0.4) {
          const voter = MOCK_TEAM_NAMES[Math.floor(Math.random() * MOCK_TEAM_NAMES.length)];
          if (!this.state.votes[action.id]) this.state.votes[action.id] = {};
          this.state.votes[action.id][voter] = voter;
          const newInfo = this.getVoteInfo(action.id);
          this.sendToListener({ type: 'vote_added', payload: { actionId: action.id, voterName: voter, voteCount: newInfo.voteCount, voters: newInfo.voters, sessionId: this.sessionId } });
        }
      }, 500 + Math.random() * 1500);
    };

    const interval = setInterval(addSimulationAction, 4000 + Math.random() * 6000);
    this.intervals.push(interval);
  }

  close() {
    this.readyState = 3;
    this.simulateOtherUsers = false;
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    this.onclose?.();
  }
}