import { useState, useCallback, useRef } from 'react'
import { ChatMessage, ParsedInput, URLPreview } from '../types/chat'
import { parseInput } from '../utils/inputParser'
import { getPreviewFromTask, checkCachedUrl } from '../utils/extractionAdapter'

interface UseChatSessionReturn {
  messages: ChatMessage[]
  isTyping: boolean
  typingMessage: string
  submitMessage: (input: string) => void
  handleAction: (actionId: string, route?: string) => void
  handleJoinStory: (storyId: string) => void
  handleViewStory: (storyId: string) => void
  clearChat: () => void
}

/**
 * Hook for managing chat session state and mock responses
 *
 * In production, this would:
 * - Call /api/seed endpoint
 * - Poll for real-time updates
 * - Handle WebSocket/SSE connections
 *
 * For MVP/mockup, it simulates the flow with delays
 */
export function useChatSession(userId: string): UseChatSessionReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [typingMessage, setTypingMessage] = useState('Analyzing...')
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const activeTaskMatchesRef = useRef<Record<string, boolean>>({})

  const pushSystemMessages = useCallback((messagesToAdd: ChatMessage[]) => {
    setMessages((prev) => [...prev, ...messagesToAdd])
  }, [])

  const submitMessage = useCallback(async (input: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    // Parse input
    const parsed: ParsedInput = parseInput(input)

    // Create user message (preview will be added via polling if URL detected)
    const userMessageId = `msg_${Date.now()}`
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      timestamp: new Date(),
      content: {
        type: 'text',
        data: {
          text: input,
          urlPreviews: undefined  // Will be populated via polling
        }
      }
    }

    setMessages((prev) => [...prev, userMessage])
    setIsTyping(true)
    setTypingMessage('Analyzing...')

    try {
      // OPTIMIZATION: Check cache first if URL detected
      if (parsed.urls && parsed.urls.length > 0) {
        const url = parsed.urls[0]
        setTypingMessage('Checking cache...')

        const cached = await checkCachedUrl(url)

        if (cached) {
          console.log('💾 Cache hit - using existing task:', cached.task_id)

          // Update user message with cached preview immediately
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === userMessageId
                ? {
                    ...msg,
                    content: {
                      ...msg.content,
                      data: {
                        ...msg.content.data,
                        urlPreviews: [cached.preview]
                      }
                    }
                  }
                : msg
            )
          )

          // Show cache hit message
          const cacheMessage: ChatMessage = {
            id: `msg_${Date.now()}_cached`,
            role: 'system',
            timestamp: new Date(),
            content: {
              type: 'text',
              data: {
                text: '✅ Using cached extraction. Story matching will be available soon.'
              }
            }
          }
          pushSystemMessages([cacheMessage])
          setIsTyping(false)

          return  // Done - no need to create new task
        }

        console.log('❌ Cache miss - creating new extraction task')
      }

      // Call /api/seed endpoint (creates new task if needed)
      const response = await fetch('/api/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          content: input,
          user_id: userId
        })
      })

      const seedResponse = await response.json()

      // If URL detected and task_id returned, poll for preview
      if (seedResponse.task_id) {
        setTypingMessage('Fetching preview...')

        let previewReceived = false
        let pollAttempts = 0
        const maxAttempts = 30  // 30 seconds max
        activeTaskMatchesRef.current[seedResponse.task_id] = false

        pollingIntervalRef.current = setInterval(async () => {
          pollAttempts++

          try {
            const taskResponse = await fetch(`/api/task/${seedResponse.task_id}`)
            const taskData = await taskResponse.json()

            console.log(`[Poll ${pollAttempts}] Task status:`, taskData.status, 'has story_match:', !!taskData.story_match)

            // Check for preview_meta (iFramely stage - fast ~200ms)
            if (taskData.preview_meta && !previewReceived) {
              previewReceived = true

              const preview = getPreviewFromTask(taskData)

              if (preview) {
                // Update user message with preview
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === userMessageId
                      ? {
                          ...msg,
                          content: {
                            ...msg.content,
                            data: {
                              ...msg.content.data,
                              urlPreviews: [preview]
                            }
                          }
                        }
                      : msg
                  )
                )
              }

              // Preview received - story matching will happen when extraction completes
              setTypingMessage('Extracting content...')
            }

            // Check for story match when extraction completes
            if (taskData.status === 'completed' && taskData.story_match) {
              const storyMatch = taskData.story_match

              // Clear polling
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
                pollingIntervalRef.current = null
              }

              // Handle story match result
              // Backend has already decided and linked the article
              // Just show result and navigate - no user choice needed

              let successMessage: ChatMessage

              if (storyMatch.is_new) {
                // New story created
                successMessage = {
                  id: `msg_${Date.now()}_story_created`,
                  role: 'system',
                  timestamp: new Date(),
                  content: {
                    type: 'text',
                    data: {
                      text: `✨ Created new investigation: **${storyMatch.matched_story_title || 'Untitled Story'}**`
                    }
                  }
                }
              } else {
                // Added to existing story
                const matchPercent = Math.round((storyMatch.match_score || 0) * 100)
                successMessage = {
                  id: `msg_${Date.now()}_story_matched`,
                  role: 'system',
                  timestamp: new Date(),
                  content: {
                    type: 'text',
                    data: {
                      text: `🔗 Added to existing investigation (${matchPercent}% match): **${storyMatch.matched_story_title || 'Story'}**`
                    }
                  }
                }
              }

              pushSystemMessages([successMessage])
              setIsTyping(false)

              // Auto-navigate to story page after 2s
              setTimeout(() => {
                window.location.href = `/story/${storyMatch.story_id}`
              }, 2000)

              return // Exit polling
            }

            // Fallback: completed but no story_match (old extraction or error)
            if (taskData.status === 'completed' && !taskData.story_match) {
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
                pollingIntervalRef.current = null
              }

              console.warn('Extraction completed but no story_match available')
              console.log('Task response:', JSON.stringify(taskData, null, 2))

              // Just show extraction complete message - no manual search
              const completionMessage: ChatMessage = {
                id: `msg_${Date.now()}_extraction_complete`,
                role: 'system',
                timestamp: new Date(),
                content: {
                  type: 'text',
                  data: {
                    text: `✅ Article extracted successfully. Story matching will be available soon.`
                  }
                }
              }
              pushSystemMessages([completionMessage])
              setIsTyping(false)
            }

            // Handle failures
            if (taskData.status === 'failed' || taskData.status === 'blocked') {
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
                pollingIntervalRef.current = null
              }

              const errorMessage: ChatMessage = {
                id: `msg_${Date.now()}`,
                role: 'system',
                timestamp: new Date(),
                content: {
                  type: 'text',
                  data: {
                    text: taskData.status === 'blocked'
                      ? '⚠️ Unable to access this article (paywall or blocked)'
                      : '❌ Extraction failed. Please try a different article.'
                  }
                }
              }
              pushSystemMessages([errorMessage])
              setIsTyping(false)
            }

            // Timeout after max attempts
            if (pollAttempts >= maxAttempts) {
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
                pollingIntervalRef.current = null
              }
              setIsTyping(false)
            }
          } catch (error) {
            console.error('Polling error:', error)
          }
        }, 1000)  // Poll every second
      } else {
        // Text-only seed (no URL) - just acknowledge
        const textMessage: ChatMessage = {
          id: `msg_${Date.now()}_text`,
          role: 'system',
          timestamp: new Date(),
          content: {
            type: 'text',
            data: {
              text: '💬 Message received. Try submitting a news article URL for analysis.'
            }
          }
        }
        pushSystemMessages([textMessage])
        setIsTyping(false)
      }
    } catch (error) {
      console.error('Seed submission error:', error)
      setIsTyping(false)

      // Add error message
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'system',
        timestamp: new Date(),
        content: {
          type: 'text',
          data: { text: 'Sorry, something went wrong. Please try again.' }
        }
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }, [userId, pushSystemMessages])

  const handleAction = useCallback((actionId: string, route?: string) => {
    console.log('Action clicked:', actionId, route)

    if (route) {
      // In production: navigate to route
      alert(`Would navigate to: ${route}`)
    } else {
      // Handle non-navigation actions
      if (actionId === 'refine_search') {
        const systemMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'system',
          timestamp: new Date(),
          content: {
            type: 'text',
            data: { text: 'Can you provide more details about what you\'re looking for?' }
          }
        }
        setMessages((prev) => [...prev, systemMessage])
      }
    }
  }, [])

  const handleJoinStory = useCallback((storyId: string) => {
    console.log('Join story:', storyId)
    window.location.href = `/story/${storyId}`
  }, [])

  const handleViewStory = useCallback((storyId: string) => {
    console.log('View story:', storyId)
    window.location.href = `/story/${storyId}`
  }, [])

  const clearChat = useCallback(() => {
    setMessages([])
    setIsTyping(false)
  }, [])

  return {
    messages,
    isTyping,
    typingMessage,
    submitMessage,
    handleAction,
    handleJoinStory,
    handleViewStory,
    clearChat
  }
}
