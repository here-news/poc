/**
 * useQuestWebSocket Hook
 *
 * Real-time WebSocket connection to quest updates
 * Automatically handles connection, reconnection, and event handling
 *
 * Usage:
 * ```tsx
 * const { isConnected, lastUpdate } = useQuestWebSocket(questId, {
 *   onEvidenceSubmitted: (data) => console.log('New evidence:', data),
 *   onProbabilityUpdate: (data) => setHypotheses(data.hypotheses),
 *   onCommentAdded: (data) => console.log('New comment:', data),
 *   onBountyAdded: (data) => setBounty(data.new_total),
 *   onQuestConverged: (data) => console.log('Converged!', data)
 * });
 * ```
 */

import { useEffect, useRef, useState } from 'react';

export interface QuestWebSocketMessage {
  type: 'evidence_submitted' | 'probability_update' | 'comment_added' | 'bounty_added' | 'quest_converged' | 'pong';
  quest_id: string;
  data: any;
  timestamp: string;
}

export interface QuestWebSocketHandlers {
  onEvidenceSubmitted?: (data: any) => void;
  onProbabilityUpdate?: (data: any) => void;
  onCommentAdded?: (data: any) => void;
  onBountyAdded?: (data: any) => void;
  onQuestConverged?: (data: any) => void;
}

export function useQuestWebSocket(questId: string | undefined, handlers: QuestWebSocketHandlers) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<QuestWebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    if (!questId) return;

    // WebSocket URL (ws:// for local, wss:// for production)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws/quests/${questId}`;

    console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);

    const connect = () => {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Send ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);

        // Store interval ID to clean up later
        (ws as any)._pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        try {
          const message: QuestWebSocketMessage = JSON.parse(event.data);
          console.log('📡 WebSocket message:', message.type, message.data);

          setLastUpdate(message);

          // Route to specific handlers
          switch (message.type) {
            case 'evidence_submitted':
              handlers.onEvidenceSubmitted?.(message.data);
              break;
            case 'probability_update':
              handlers.onProbabilityUpdate?.(message.data);
              break;
            case 'comment_added':
              handlers.onCommentAdded?.(message.data);
              break;
            case 'bounty_added':
              handlers.onBountyAdded?.(message.data);
              break;
            case 'quest_converged':
              handlers.onQuestConverged?.(message.data);
              break;
            case 'pong':
              // Heartbeat response, ignore
              break;
            default:
              console.warn('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
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
        // Clear ping interval
        if ((wsRef.current as any)._pingInterval) {
          clearInterval((wsRef.current as any)._pingInterval);
        }
        wsRef.current.close();
      }
    };
  }, [questId, handlers]);

  return {
    isConnected,
    lastUpdate
  };
}
