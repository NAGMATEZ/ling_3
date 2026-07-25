The Sprint Retrospective Tool is a complete full-stack application with the following architecture:

**Backend (Node.js/Express + WebSocket + SQLite3)**:
- `backend/src/index.ts`: Express REST API + WebSocket server on port 3001
- `backend/src/db.ts`: SQLite database with tables for sessions, actions, votes, and retro_history history
- `backend/src/types.ts`: TypeScript interfaces for all data models and WebSocket messages
- `backend/package.json`: Dependencies including express, ws, better-sqlite3, cors, uuid

**Frontend (React + TypeScript + Vite)**:
- `frontend/src/App.tsx`: Main application with session creation, live retro board, and history viewing
- `frontend/src/context/RetrospectiveContext.tsx`: React context with useReducer for all state management
- `frontend/src/hooks/useWebSocket.ts`: Custom hook that attempts real WebSocket connection and falls back to MockWebSocket after a 3-second timeout
- `frontend/src/mock/mockWebSocket.ts`: Full mock WebSocket with in-memory state, simulated team members (Alice, Bob, Charlie, Diana) who periodically add actions and votes
- `frontend/src/mock/data.ts`: Mock data for default session with pre-seeded actions and votes

**Key Features Implemented**:
1. **Action logging** (Start/Stop/Continue) with author attribution and timestamps
2. **Voting system** — users can vote/unvote on actions, votes persist per session, vote counts update in real-time
3. **Real-time sync via WebSocket** with automatic fallback to mock when no backend server is running
4. **SQLite persistence** — all actions, votes, and sessions are stored in a local DB file
5. **Past retrospectives history** — completed sessions are archived with statistics (total actions, votes, type breakdowns)
6. **Fully functional mock mode** — the app works completely standalone with realistic simulated collaboration (other "users" adding actions and voting automatically)
7. **Shareable URL** — `?session=SHARE_CODE` parameter allows reopening sessions; a `ShareLink` component copies the URL to clipboard
8. **Facilitator mode** — controls phase progression: What Went Well → What Didn't Go Well → Action Items → Complete, with keyboard-visible control buttons and phase-based action type filtering

**Setup & Running**:
1. `cd backend && npm install && npm run dev` (starts backend on port 3001)
2. `cd frontend && npm install && npm run dev` (starts frontend on port 5173)
3. If backend isn't running, the frontend automatically uses the mock WebSocket with simulated real-time behavior
4. A complete mock database is loaded from `frontend/src/mock/data.ts` for standalone usage