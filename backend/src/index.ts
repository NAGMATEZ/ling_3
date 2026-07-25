import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { initDB, createSession, getSessionById, getSessionByShareCode, getActionsBySession, getVotesBySession, addAction, addVote, removeVote, updateSessionPhase, completeSession, getHistory, getConnectedSessions } from './db.js';
import { AnyWSMessage } from './types.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3001', 10);

initDB();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface ConnectedClient {
  ws: WebSocket;
  sessionId: string | null;
  userName: string;
}

const clients = new Set<ConnectedClient>();

function broadcast(sessionId: string, message: AnyWSMessage, exclude?: WebSocket) {
  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client.sessionId === sessionId && client.ws !== exclude && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

function sendToClient(ws: WebSocket, message: AnyWSMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

wss.on('connection', (ws: WebSocket, req) => {
  const client: ConnectedClient = { ws, sessionId: null, userName: 'Unknown' };

  ws.on('message', (raw: Buffer) => {
    try {
      const message = JSON.parse(raw.toString()) as AnyWSMessage;

      switch (message.type) {
        case 'join': {
          const { sessionId, userName } = message.payload;
          client.sessionId = sessionId;
          client.userName = userName;

          const session = getSessionById(sessionId);
          if (!session) {
            sendToClient(ws, { type: 'error', payload: { message: 'Session not found' } });
            return;
          }

          const actions = getActionsBySession(sessionId);
          const votes = getVotesBySession(sessionId);

          sendToClient(ws, {
            type: 'session_state',
            payload: { session, actions, votes }
          } as AnyWSMessage);

          broadcast(sessionId, { type: 'user_joined', payload: { userName, sessionId } });
          broadcast(sessionId, {
            type: 'session_state',
            payload: { session, actions, votes }
          } as AnyWSMessage);
          break;
        }

        case 'action_added': {
          const { sessionId, action } = message.payload;
          if (!client.sessionId) return;

          const newAction = addAction(sessionId, action.type, action.author, action.text);
          broadcast(sessionId, { type: 'action_added', payload: { action: newAction, sessionId } });
          break;
        }

        case 'vote_added': {
          const { sessionId, actionId, voterName } = message.payload;
          if (!client.sessionId) return;

          const result = addVote(sessionId, actionId, voterName);
          if (result) {
            broadcast(sessionId, { type: 'vote_added', payload: { actionId, voterName, voteCount: result.voteCount, voters: result.voters, sessionId } });
          }
          break;
        }

        case 'vote_removed': {
          const { sessionId, actionId, voterName } = message.payload;
          if (!client.sessionId) return;

          const result = removeVote(sessionId, actionId, voterName);
          if (result) {
            broadcast(sessionId, { type: 'vote_removed', payload: { actionId, voterName, voteCount: result.voteCount, voters: result.voters, sessionId } });
          }
          break;
        }

        case 'phase_change': {
          const { sessionId, phase } = message.payload;
          if (!client.sessionId) return;

          updateSessionPhase(sessionId, phase);
          broadcast(sessionId, { type: 'phase_change', payload: { phase, sessionId } });
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    if (client.sessionId) {
      broadcast(client.sessionId, { type: 'user_left', payload: { userName: client.userName, sessionId: client.sessionId } });
    }
    clients.delete(client);
  });

  ws.on('error', () => {
    clients.delete(client);
  });
});

// REST API routes
app.get('/api/sessions/:shareCode', (req, res) => {
  const session = getSessionByShareCodeJoin(req.params.shareCode);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const actions = getActionsBySession(session.id);
  const votes = getVotesBySession(session.id);
  res.json({ session, actions, votes });
});

app.get('/api/sessions', (_req, res) => {
  const sessions = getConnectedSessions();
  res.json(sessions);
});

app.post('/api/sessions', (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const result = createSession(title.trim());
  res.status(201).json(result);
});

app.post('/api/sessions/:id/phase', (req, res) => {
  const { phase } = req.body;
  const validPhases = ['what_went_well', 'didnt_go_well', 'action_items', 'complete'];
  if (!validPhases.includes(phase)) {
    return res.status(400).json({ error: 'Invalid phase' });
  }
  const session = getSessionById(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  updateSessionPhase(req.params.id, phase);
  broadcast(req.params.id, { type: 'phase_change', payload: { phase, sessionId: req.params.id } });
  res.json({ success: true });
});

app.post('/api/sessions/:id/complete', (req, res) => {
  const result = completeSession(req.params.id);
  if (!result) return res.status(404).json({ error: 'Session not found' });
  res.json(result);
});

app.get('/api/history', (_req, res) => {
  const history = getHistory();
  res.json(history);
});

// For Vercel serverless: export as a handler
export const handler = (req: any, res: any) => {
  // Pass through to express
  app(req, res);
};

// Only start server when running directly (not as a serverless function)
if (process.env.VERCEL !== '1') {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server on ws://localhost:${PORT}/ws`);
  });
}