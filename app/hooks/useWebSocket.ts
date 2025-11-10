import { useEffect, useRef, useCallback, useState } from 'react'

interface WebSocketMessage {
  type: string
  [key: string]: any
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  reconnect?: boolean
  maxReconnectAttempts?: number
  reconnectInterval?: number
}

/**
 * WebSocket hook with automatic reconnection and exponential backoff.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection health monitoring (ping/pong)
 * - Thread-safe message sending
 * - Graceful cleanup
 *
 * @param url WebSocket URL
 * @param options Configuration options
 * @returns sendMessage function and connection status
 */
export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnect = true,
    maxReconnectAttempts = 5,
    reconnectInterval = 2000 // Start at 2 seconds
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const intentionalCloseRef = useRef(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  // Calculate exponential backoff delay
  const getReconnectDelay = useCallback(() => {
    const baseDelay = reconnectInterval
    const attempt = reconnectAttemptsRef.current
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(baseDelay * Math.pow(2, attempt), 30000)
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000
    return delay + jitter
  }, [reconnectInterval])

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnecting) {
      return
    }

    setIsConnecting(true)

    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        console.log('✅ WebSocket connected')
        setIsConnected(true)
        setIsConnecting(false)
        reconnectAttemptsRef.current = 0 // Reset on successful connection
        wsRef.current = ws
        onConnect?.()
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage

          // Handle ping/pong for connection health
          if (message.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
            return
          }

          // Handle connection confirmation
          if (message.type === 'connected') {
            console.log('✅ WebSocket handshake complete:', message.user_id)
            return
          }

          // Pass message to handler
          onMessage?.(message)
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        setIsConnecting(false)
        onError?.(error)
      }

      ws.onclose = (event) => {
        console.log('❌ WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        setIsConnecting(false)
        wsRef.current = null
        onDisconnect?.()

        // Attempt reconnection if not intentionally closed
        if (!intentionalCloseRef.current && reconnect) {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = getReconnectDelay()
            console.log(`🔄 Reconnecting in ${Math.round(delay / 1000)}s... (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`)

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++
              connect()
            }, delay)
          } else {
            console.error('❌ Max reconnection attempts reached')
          }
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error)
      setIsConnecting(false)
    }
  }, [url, onConnect, onMessage, onDisconnect, onError, reconnect, maxReconnectAttempts, getReconnectDelay, isConnecting])

  // Send message with error handling
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
      } catch (error) {
        console.error('❌ Failed to send WebSocket message:', error)
      }
    } else {
      console.warn('⚠️ WebSocket not connected, message not sent:', message)
    }
  }, [])

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnected(false)
    setIsConnecting(false)
  }, [])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount/unmount

  return {
    sendMessage,
    isConnected,
    isConnecting,
    reconnect: connect,
    disconnect
  }
}
