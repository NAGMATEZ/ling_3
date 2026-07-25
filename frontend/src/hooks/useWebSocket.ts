import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSMessage, SessionState } from '../types.js';
import { MockWebSocket } from '../mock/mockWebSocket.js';

interface UseWebSocketReturn {
  connected: boolean;
  send: (msg: any) => void;
  lastMessage: WSMessage | null;
  join: (sessionId: string, userName: string) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | MockWebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const useMockRef = useRef(false);

  const connect = useCallback((sessionId: string, userName: string) => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

    setConnected(false);
    setLastMessage(null);

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

    try {
      const realWs = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        realWs.close();
        fallbackToMock(sessionId, userName);
      }, 3000);

      realWs.onopen = () => {
        clearTimeout(timeout);
        useMockRef.current = false;
        setConnected(true);
        realWs.send(JSON.stringify({ type: 'join', payload: { sessionId, userName } }));
      };

      realWs.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WSMessage;
          setLastMessage(msg);
        } catch {}
      };

      realWs.onclose = () => {
        setConnected(false);
        if (!useMockRef.current) {
          fallbackToMock(sessionId, userName);
        }
      };

      realWs.onerror = () => {
        clearTimeout(timeout);
        realWs.close();
        if (!useMockRef.current) {
          fallbackToMock(sessionId, userName);
        }
      };

      wsRef.current = realWs;
    } catch {
      fallbackToMock(sessionId, userName);
    }
  }, []);

  const fallbackToMock = useCallback((sessionId: string, userName: string) => {
    useMockRef.current = true;
    const mock = new MockWebSocket(userName, sessionId);
    mock.onopen = () => setConnected(true);
    mock.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WSMessage;
        setLastMessage(msg);
      } catch {}
    };
    mock.onclose = () => setConnected(false);
    mock.onerror = () => setConnected(false);
    wsRef.current = mock;
  }, []);

  const send = useCallback((msg: any) => {
    if (wsRef.current && connected) {
      const data = JSON.stringify(msg);
      if (wsRef.current instanceof MockWebSocket) {
        (wsRef.current as MockWebSocket).send(data);
      } else {
        ((wsRef.current as WebSocket).readyState === WebSocket.OPEN) && wsRef.current.send(data);
      }
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  return { connected, send, lastMessage, join: connect };
}