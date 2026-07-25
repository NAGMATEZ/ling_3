import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'retros.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      share_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      phase TEXT NOT NULL DEFAULT 'what_went_well',
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('start', 'stop', 'continue')),
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      action_id TEXT NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
      voter_name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(session_id, action_id, voter_name)
    );

    CREATE TABLE IF NOT EXISTS retro_history (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed_at INTEGER NOT NULL,
      total_actions INTEGER DEFAULT 0,
      total_votes INTEGER DEFAULT 0,
      start_count INTEGER DEFAULT 0,
      stop_count INTEGER DEFAULT 0,
      continue_count INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_actions_session ON actions(session_id);
    CREATE INDEX IF NOT EXISTS idx_votes_session ON votes(session_id);
    CREATE INDEX IF NOT EXISTS idx_votes_action ON votes(action_id);
    CREATE INDEX IF NOT EXISTS idx_history_completed ON retro_history(completed_at DESC);
  `);
}

export function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  const existing = db.prepare('SELECT id FROM sessions WHERE share_code = ?').get(code) as any;
  if (existing) return generateShareCode();
  return code;
}

export function createSession(title: string): { id: string; shareCode: string } {
  const id = uuid();
  const shareCode = generateShareCode();
  const now = Date.now();
  db.prepare('INSERT INTO sessions (id, share_code, title, phase, created_at) VALUES (?, ?, ?, ?, ?)').run(id, shareCode, title, 'what_went_well', now);
  return { id, shareCode };
}

export function getSessionById(id: string): any {
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
}

export function getSessionByShareCode(code: string): any {
  return db.prepare('SELECT * FROM sessions WHERE share_code = ?').get(code);
}

export function getSessionByShareCodeJoin(code: string): any {
  return db.prepare(`
    SELECT s.*, 
      (SELECT COUNT(*) FROM actions a WHERE a.session_id = s.id) as action_count,
      (SELECT COUNT(*) FROM votes v WHERE v.session_id = s.id) as vote_count
    FROM sessions s WHERE s.share_code = ?
  `).get(code);
}

export function updateSessionPhase(id: string, phase: string): void {
  db.prepare('UPDATE sessions SET phase = ? WHERE id = ?').run(phase, id);
}

export function addAction(sessionId: string, type: string, author: string, text: string): any {
  const id = uuid();
  const now = Date.now();
  db.prepare('INSERT INTO actions (id, session_id, type, author, text, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, sessionId, type, author, text, now);
  return getActionById(id);
}

export function getActionById(id: string): any {
  return db.prepare('SELECT * FROM actions WHERE id = ?').get(id);
}

export function getActionsBySession(sessionId: string): any[] {
  return db.prepare('SELECT * FROM actions WHERE session_id = ? ORDER BY created_at ASC').all(sessionId);
}

export function addVote(sessionId: string, actionId: string, voterName: string): { voteCount: number; voters: string[] } | null {
  const existing = db.prepare('SELECT id FROM votes WHERE session_id = ? AND action_id = ? AND voter_name = ?').get(sessionId, actionId, voterName);
  if (existing) {
    return getVoteInfo(sessionId, actionId);
  }
  const id = uuid();
  const now = Date.now();
  db.prepare('INSERT INTO votes (id, session_id, action_id, voter_name, created_at) VALUES (?, ?, ?, ?, ?)').run(id, sessionId, actionId, voterName, now);
  return getVoteInfo(sessionId, actionId);
}

export function removeVote(sessionId: string, actionId: string, voterName: string): { voteCount: number; voters: string[] } | null {
  db.prepare('DELETE FROM votes WHERE session_id = ? AND action_id = ? AND voter_name = ?').run(sessionId, actionId, voterName);
  return getVoteInfo(sessionId, actionId);
}

function getVoteInfo(sessionId: string, actionId: string): { voteCount: number; voters: string[] } {
  const rows = db.prepare('SELECT voter_name FROM votes WHERE session_id = ? AND action_id = ?').all(sessionId, actionId) as any[];
  return { voteCount: rows.length, voters: rows.map(r => r.voter_name) };
}

export function getVotesByAction(actionId: string): any[] {
  return db.prepare('SELECT * FROM votes WHERE action_id = ? ORDER BY created_at ASC').all(actionId);
}

export function getVotesBySession(sessionId: string): any[] {
  return db.prepare('SELECT * FROM votes WHERE session_id = ? ORDER BY created_at ASC').all(sessionId);
}

export function completeSession(sessionId: string): any {
  const session = getSessionById(sessionId);
  if (!session) return null;
  const actions = getActionsBySession(sessionId);
  const votes = getVotesBySession(sessionId);
  const startCount = actions.filter((a: any) => a.type === 'start').length;
  const stopCount = actions.filter((a: any) => a.type === 'stop').length;
  const continueCount = actions.filter((a: any) => a.type === 'continue').length;
  const completedAt = Date.now();
  db.prepare('UPDATE sessions SET phase = ?, completed_at = ? WHERE id = ?').run('complete', completedAt, sessionId);
  db.prepare('INSERT OR REPLACE INTO retro_history (id, session_id, title, completed_at, total_actions, total_votes, start_count, stop_count, continue_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(uuid(), sessionId, session.title, completedAt, actions.length, votes.length, startCount, stopCount, continueCount);
  return { sessionId, title: session.title, completedAt, totalActions: actions.length, totalVotes: votes.length, startCount, stopCount, continueCount };
}

export function getHistory(): any[] {
  return db.prepare(`
    SELECT h.*, s.share_code FROM retro_history h
    JOIN sessions s ON h.session_id = s.id
    ORDER BY h.completed_at DESC
    LIMIT 50
  `).all();
}

export function getConnectedSessions(): any[] {
  return db.prepare('SELECT * FROM sessions WHERE phase != ? ORDER BY created_at DESC').all('complete');
}