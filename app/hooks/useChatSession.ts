import { useState, useCallback, useRef } from 'react'
import { ChatMessage, ParsedInput, StoryMatch, URLPreview } from '../types/chat'
import { parseInput } from '../utils/inputParser'
import { getPreviewFromTask } from '../utils/extractionAdapter'
import {
  generateTextOnlyChatFlow,
  generateUrlChatFlow
} from '../utils/mockData'

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

  const buildStoryMatchesMessage = useCallback((query: string, matches: StoryMatch[]): ChatMessage => ({
    id: `msg_${Date.now()}_matches`,
    role: 'system',
    timestamp: new Date(),
    content: {
      type: 'story_matches',
      data: {
        matches,
        query,
        totalFound: matches.length
      }
    }
  }), [])

  const buildActionPromptMessage = useCallback((matches: StoryMatch[], query: string): ChatMessage => ({
    id: `msg_${Date.now()}_actions`,
    role: 'system',
    timestamp: new Date(),
    content: {
      type: 'action_prompt',
      data: {
        prompt: {
          type: 'join_or_create',
          message: matches.length
            ? `Found ${matches.length} related ${matches.length === 1 ? 'thread' : 'threads'} for “${query}”.` 
            : `No matching threads yet for “${query}”. Start a new investigation?`,
          actions: matches.length
            ? [
                {
                  id: 'add_to_existing',
                  label: 'Add to Existing Thread',
                  variant: 'secondary'
                },
                {
                  id: 'create_new',
                  label: 'Start New Investigation',
                  variant: 'primary',
                  route: '/build/new'
                }
              ]
            : [
                {
                  id: 'create_new',
                  label: 'Create New Thread',
                  variant: 'primary',
                  route: '/build/new'
                },
                {
                  id: 'refine_search',
                  label: 'Refine Search',
                  variant: 'secondary'
                }
              ]
        }
      }
    }
  }), [])

  const mapSearchResultToMatch = useCallback((result: any): StoryMatch => {
    const scoreCandidate = typeof result.match_score === 'number'
      ? result.match_score
      : typeof result.confidence === 'number'
        ? result.confidence
        : undefined

    const normalizedScore = typeof scoreCandidate === 'number'
      ? Math.min(1, Math.max(0, scoreCandidate))
      : undefined

    return {
      id: result.id,
      title: result.title,
      description: result.description,
      healthIndicator: (result.health_indicator || 'healthy') as StoryMatch['healthIndicator'],
      lastUpdated: result.last_updated_human || 'recently',
      matchScore: normalizedScore,
      contributorCount: result.people_count,
      claimCount: result.claim_count
    }
  }, [])

  const fetchStoryMatches = useCallback(async (query: string, fallbackType: 'text' | 'url', parsed: ParsedInput) => {
    const trimmedQuery = query.trim() || parsed.text.trim() || parsed.originalInput.trim()
    if (!trimmedQuery) {
      const fallbackUrl = parsed.urls[0] || parsed.originalInput || 'https://example.com'
      const fallbackFlow = fallbackType === 'text'
        ? generateTextOnlyChatFlow(parsed.text)
        : generateUrlChatFlow(fallbackUrl)

      pushSystemMessages(fallbackFlow.slice(1))
      setIsTyping(false)
      return
    }

    try {
      setTypingMessage('Searching related threads...')
      const response = await fetch('/api/stories/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: trimmedQuery, limit: 5 })
      })

      const data = await response.json()
      const matches: StoryMatch[] = (data.matches || []).map(mapSearchResultToMatch)

      if (matches.length === 0) {
        pushSystemMessages([
          buildStoryMatchesMessage(trimmedQuery, matches),
          buildActionPromptMessage(matches, trimmedQuery)
        ])
      } else {
        pushSystemMessages([
          buildStoryMatchesMessage(trimmedQuery, matches),
          buildActionPromptMessage(matches, trimmedQuery)
        ])
      }
    } catch (error) {
      console.error('Story search error:', error)
      const fallbackUrl = parsed.urls[0] || trimmedQuery || parsed.originalInput || 'https://example.com'
      const fallback = fallbackType === 'text'
        ? generateTextOnlyChatFlow(parsed.text)
        : generateUrlChatFlow(fallbackUrl)
      pushSystemMessages(fallback.slice(1))
    } finally {
      setIsTyping(false)
    }
  }, [buildActionPromptMessage, buildStoryMatchesMessage, mapSearchResultToMatch, pushSystemMessages])

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
      // Call /api/seed endpoint
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

            // Check for preview_meta (iFramely stage)
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

              if (!activeTaskMatchesRef.current[seedResponse.task_id]) {
                activeTaskMatchesRef.current[seedResponse.task_id] = true
                await fetchStoryMatches(
                  preview?.title || preview?.description || seedResponse.urls?.[0] || parsed.text,
                  'url',
                  parsed
                )
              }
            }

            // Full extraction complete - stop polling
            if (taskData.status === 'completed' || taskData.status === 'failed') {
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
                pollingIntervalRef.current = null
              }

              if (!activeTaskMatchesRef.current[seedResponse.task_id]) {
                activeTaskMatchesRef.current[seedResponse.task_id] = true
                await fetchStoryMatches(
                  taskData.result?.title || parsed.text || seedResponse.urls?.[0],
                  'url',
                  parsed
                )
              }
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
        // Text-only seed (no URL)
        await fetchStoryMatches(parsed.text || parsed.originalInput, 'text', parsed)
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
  }, [fetchStoryMatches, userId, pushSystemMessages])

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
    alert(`Would join story: ${storyId}`)
  }, [])

  const handleViewStory = useCallback((storyId: string) => {
    console.log('View story:', storyId)
    alert(`Would view story: ${storyId}`)
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
