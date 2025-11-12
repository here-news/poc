/**
 * useGlobalWebSocket Hook
 *
 * Connects to global WebSocket feed for all quest activity
 * Used on homepage to show live updates across all quests
 *
 * Usage:
 * ```tsx
 * const { isConnected, recentActivity } = useGlobalWebSocket({
 *   onActivity: (activity) => console.log('New activity:', activity)
 * })
 * ```
 */

import { useEffect, useRef, useState } from 'react';

export interface GlobalActivity {
  type: 'evidence_submitted' | 'quest_converged' | 'hypothesis_fork';
  quest_id: string;
  quest_title: string;
  data: any;
  timestamp: string;
}

export interface GlobalWebSocketHandlers {
  onActivity?: (activity: GlobalActivity) => void;
}

export function useGlobalWebSocket(handlers: GlobalWebSocketHandlers) {
  const [isConnected, setIsConnected] = useState(false);
  const [recentActivity, setRecentActivity] = useState<GlobalActivity[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const reconnectAttempts = useRef(0);
  const handlersRef = useRef(handlers);

  // Update handlers ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    // WebSocket URL for global feed
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws/global`;

    console.log(`🌐 Connecting to global WebSocket: ${wsUrl}`);

    const connect = () => {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ Global WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Send ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);

        (ws as any)._pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'pong') return;

          console.log('📡 Global activity:', message.type, message);

          // Add to recent activity (keep last 50)
          const activity: GlobalActivity = {
            type: message.type,
            quest_id: message.quest_id,
            quest_title: message.quest_title || 'Unknown Quest',
            data: message.data,
            timestamp: message.timestamp || new Date().toISOString()
          };

          setRecentActivity(prev => [activity, ...prev].slice(0, 50));
          handlersRef.current.onActivity?.(activity);
        } catch (error) {
          console.error('Error parsing global WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Global WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('❌ Global WebSocket disconnected');
        setIsConnected(false);

        // Clear ping interval
        if ((ws as any)._pingInterval) {
          clearInterval((ws as any)._pingInterval);
        }

        // Attempt to reconnect with exponential backoff
        const maxAttempts = 10;
        const backoffMs = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);

        if (reconnectAttempts.current < maxAttempts) {
          console.log(`🔄 Reconnecting in ${backoffMs}ms (attempt ${reconnectAttempts.current + 1}/${maxAttempts})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, backoffMs);
        } else {
          console.error('❌ Max reconnection attempts reached');
        }
      };

      wsRef.current = ws;
    };

    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        if ((wsRef.current as any)._pingInterval) {
          clearInterval((wsRef.current as any)._pingInterval);
        }
        wsRef.current.close();
      }
    };
  }, []); // Empty dependency array - connect once on mount

  return {
    isConnected,
    recentActivity
  };
}
