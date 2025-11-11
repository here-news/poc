import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { ensureUserId } from './userSession'
import StoryOverlay from './components/overlay/StoryOverlay'
import StorySummaryCard from './components/chat/StorySummaryCard'
import NewsCurationWelcome from './components/chat/NewsCurationWelcome'
import LinkPreviewCard from './components/chat/LinkPreviewCard'
import { TopStoriesCuration } from './components/TopStoriesCuration'
import { PhiAvatar } from './components/PhiAvatar'
import { useWebSocket } from './hooks/useWebSocket'
import { getStoryUrlFromData } from './utils/storyUrl'
import { StoryContentRenderer } from './components/story/StoryContentRenderer'
import { ChatMessageWithEntities } from './components/chat/ChatMessageWithEntities'
import { StoryMessageWithEntities } from './components/chat/StoryMessageWithEntities'

interface Story {
  id: string
  title: string
  description?: string
  gist?: string
  coherence_score?: number
  updated_at?: string
  cover_image?: string
  artifact_count?: number
  people_count?: number
  revision?: string
  version?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  linkPreview?: {
    url: string
    title?: string
    description?: string
    image?: string
    domain?: string
    taskId?: string
    status?: 'fetching' | 'processing' | 'completed' | 'matched' | 'failed'
    storyId?: string
    storyTitle?: string
  }
}

interface Claim {
  text: string
  confidence?: number
  created_at?: string
  source_url?: string
}

// Helper function to format relative time
function formatRelativeTime(timestamp: string | undefined): string {
  if (!timestamp) return ''

  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 7) {
      const weeks = Math.floor(diffDays / 7)
      return `${weeks}w ago`
    }
    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'just now'
  } catch {
    return ''
  }
}

// Special "story" for global HERE.news chat with Phi
const GLOBAL_CHAT_ID = '0'
const GLOBAL_CHAT: Story = {
  id: GLOBAL_CHAT_ID,
  title: 'Phi (φ) • Interplanet News Oracle',
  description: 'Explore and explain what\'s happening across our universe • Share article URLs to build stories ✨',
  gist: 'Global news intelligence and contribution',
  coherence_score: 1.0,
  artifact_count: 0,
  people_count: 0,
}

function StoryChatPage() {
  const { storyId } = useParams<{ storyId?: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [userId, setUserId] = useState('')
  const [stories, setStories] = useState<Story[]>([])
  const [loadingStories, setLoadingStories] = useState(true)
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [claims, setClaims] = useState<Claim[]>([])
  // Store messages per story_id for persistence across story switches
  const [messagesByStory, setMessagesByStory] = useState<Record<string, ChatMessage[]>>({})
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [expandedClaims, setExpandedClaims] = useState<Map<string, number>>(new Map())
  const [showMobileList, setShowMobileList] = useState(true)
  const [showStoryOverlay, setShowStoryOverlay] = useState(false)
  const [newsCuration, setNewsCuration] = useState<any>(null)
  const [loadingCuration, setLoadingCuration] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [unreadStories, setUnreadStories] = useState<Set<string>>(new Set())
  const [newStoryNotifications, setNewStoryNotifications] = useState<Story[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get messages for currently selected story
  const messages = selectedStory ? (messagesByStory[selectedStory.id] || []) : []

  // Helper to update messages for current story
  const updateMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    if (!selectedStory) return
    setMessagesByStory(prev => ({
      ...prev,
      [selectedStory.id]: updater(prev[selectedStory.id] || [])
    }))
  }

  // Helper to set messages for current story
  const setCurrentMessages = (newMessages: ChatMessage[]) => {
    if (!selectedStory) return
    setMessagesByStory(prev => ({
      ...prev,
      [selectedStory.id]: newMessages
    }))
  }

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('phi_chat_history')
      if (saved) {
        const parsed = JSON.parse(saved)
        setMessagesByStory(parsed)
      }
    } catch (error) {
      console.error('Error loading chat history from localStorage:', error)
    }
  }, [])

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('phi_chat_history', JSON.stringify(messagesByStory))
    } catch (error) {
      console.error('Error saving chat history to localStorage:', error)
    }
  }, [messagesByStory])

  // Initialize user
  useEffect(() => {
    const uid = ensureUserId()
    setUserId(uid)
  }, [])

  // WebSocket connection for real-time updates
  // Use wss:// for HTTPS, ws:// for HTTP
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${wsProtocol}//${window.location.host}/ws`
  const { sendMessage, isConnected, isConnecting, reconnect, disconnect } = useWebSocket(wsUrl, {
    onMessage: (message) => {
      switch (message.type) {
        case 'story.created':
        case 'story.updated':
          // Add/update story in list
          const newStory = message.story
          setStories((prev) => {
            const existing = prev.find((s) => s.id === newStory.id)
            if (existing) {
              // Update existing story
              return prev.map((s) => (s.id === newStory.id ? { ...s, ...newStory } : s))
            } else {
              // Add new story at the beginning
              return [newStory, ...prev]
            }
          })

          // Mark as unread if user is not viewing Phi or this story
          if (selectedStory?.id !== GLOBAL_CHAT_ID && selectedStory?.id !== newStory.id) {
            setUnreadStories((prev) => new Set(prev).add(newStory.id))
          }

          // Add notification for Phi channel
          if (message.type === 'story.created') {
            setNewStoryNotifications((prev) => [newStory, ...prev].slice(0, 3)) // Keep last 3
          }
          break

        case 'story.emerging':
          // Show emerging story notification in Phi
          const emergingStory = message.story
          if (selectedStory?.id === GLOBAL_CHAT_ID) {
            // Add an assistant message about the emerging story
            updateMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `🌱 **Emerging story detected**\n\n"${emergingStory.title}"\n\nCoherence: ${Math.round((emergingStory.coherence_score || 0) * 100)}% • This story needs more sources to mature. Share related articles to help it grow!`
              }
            ])
          }
          break

        case 'task.completed':
          // Update link preview status for user's submission
          const taskId = message.task_id
          const taskResult = message.result

          updateMessages((prev) => {
            const newMessages = [...prev]
            const messageIndex = newMessages.findIndex(
              (msg) => msg.linkPreview?.taskId === taskId
            )

            if (messageIndex !== -1) {
              const storyMatch = taskResult?.story_match || taskResult?.manual_link_result
              newMessages[messageIndex] = {
                ...newMessages[messageIndex],
                linkPreview: {
                  ...newMessages[messageIndex].linkPreview!,
                  status: storyMatch ? 'matched' : 'completed',
                  storyId: storyMatch?.story_id,
                  storyTitle: storyMatch?.story_title
                }
              }
            }

            return newMessages
          })
          break
      }
    },
    onConnect: () => {
      console.log('✅ Connected to HERE.news real-time updates')
    },
    onDisconnect: () => {
      console.log('❌ Disconnected from real-time updates')
    }
  })

  // Fetch news curation for global chat (with auto-refresh)
  useEffect(() => {
    const fetchNewsCuration = async () => {
      try {
        setLoadingCuration(true)
        const response = await fetch('/api/news-curation')
        const data = await response.json()
        if (data.success) {
          setNewsCuration(data)
        }
      } catch (error) {
        console.error('Error fetching news curation:', error)
      } finally {
        setLoadingCuration(false)
      }
    }

    fetchNewsCuration()

    // Refresh news curation every 5 minutes (cache TTL is 5 min)
    const curationInterval = setInterval(fetchNewsCuration, 5 * 60 * 1000)

    return () => clearInterval(curationInterval)
  }, [])

  // Fetch stories with chat enabled (coherence > 0.5)
  useEffect(() => {
    const fetchStories = async () => {
      try {
        const response = await fetch('/api/stories?limit=50&min_coherence=0.5')
        const data = await response.json()
        if (data.stories) {
          setStories(data.stories)

          // If storyId provided, select it
          if (storyId) {
            if (storyId === GLOBAL_CHAT_ID) {
              setSelectedStory(GLOBAL_CHAT)
            } else {
              const story = data.stories.find((s: Story) => s.id === storyId)
              if (story) {
                setSelectedStory(story)
                loadStoryData(story.id)
              } else {
                // Story not in filtered list (maybe low coherence), fetch it directly
                const storyResponse = await fetch(`/api/stories/${storyId}`)
                const storyData = await storyResponse.json()
                if (storyData.success && storyData.story) {
                  const directStory = storyData.story
                  // Add to stories list if not already there
                  setStories((prev) => {
                    if (!prev.find((s) => s.id === directStory.id)) {
                      return [directStory, ...prev]
                    }
                    return prev
                  })
                  setSelectedStory(directStory)
                  loadStoryData(directStory.id)
                }
              }
            }
          } else {
            // Auto-select global chat (don't change URL, stay on current route)
            setSelectedStory(GLOBAL_CHAT)
          }
        }
      } catch (error) {
        console.error('Error fetching stories:', error)
      } finally {
        setLoadingStories(false)
      }
    }

    fetchStories()
  }, [storyId, navigate])

  // Auto-open overlay if ?overlay=true in URL
  useEffect(() => {
    if (searchParams.get('overlay') === 'true' && selectedStory && selectedStory.id !== GLOBAL_CHAT_ID) {
      setShowStoryOverlay(true)
      // Remove the overlay param from URL to clean it up
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('overlay')
      setSearchParams(newParams, { replace: true })
    }
  }, [selectedStory, searchParams])

  // Load story-specific data (claims)
  const loadStoryData = async (id: string) => {
    if (id === GLOBAL_CHAT_ID) return

    try {
      const response = await fetch(`/api/story/${id}/claims`)
      const data = await response.json()
      if (data.success && Array.isArray(data.claims)) {
        setClaims(data.claims)
      }
    } catch (error) {
      console.error('Error fetching claims:', error)
    }
  }

  // Initialize chat when story selected (only if no existing messages)
  useEffect(() => {
    if (selectedStory) {
      // Check if messages already exist for this story
      const hasExistingMessages = messagesByStory[selectedStory.id] && messagesByStory[selectedStory.id].length > 0

      // Only set initial messages if this story has no chat history
      if (!hasExistingMessages) {
        if (selectedStory.id === GLOBAL_CHAT_ID) {
          // No initial message for global chat - tagline is in the header
          setCurrentMessages([])
          setClaims([])
        } else {
          setCurrentMessages([
            {
              role: 'assistant',
              content: `Ask me anything about this story.`
            }
          ])
        }
      }

      setExpandedClaims(new Map())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStory?.id])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle story selection
  const handleSelectStory = (story: Story) => {
    setSelectedStory(story)

    // Clear unread indicator for this story
    setUnreadStories((prev) => {
      const next = new Set(prev)
      next.delete(story.id)
      return next
    })

    // Clear new story notifications if viewing Phi
    if (story.id === GLOBAL_CHAT_ID) {
      setNewStoryNotifications([])
    }

    // Navigate to story using canonical URL
    if (story.id === GLOBAL_CHAT_ID) {
      // Phi channel uses /story/0
      navigate('/story/0', { replace: true })
    } else {
      // Use canonical story URL with slug
      const storyUrl = getStoryUrlFromData(story)
      navigate(storyUrl)
      loadStoryData(story.id)
    }

    setShowMobileList(false)
  }

  // URL detection helper
  const detectURL = (text: string): string | null => {
    const urlRegex = /(https?:\/\/[^\s]+)/gi
    const matches = text.match(urlRegex)
    return matches ? matches[0] : null
  }

  // Poll task status and update link preview
  const startTaskPolling = (taskId: string, url: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/task/${taskId}`)
        const data = await response.json()

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollInterval)

          // Update the link preview in messages
          updateMessages((prev) => {
            const newMessages = [...prev]
            const messageIndex = newMessages.findIndex(
              (msg) => msg.linkPreview?.taskId === taskId
            )

            if (messageIndex !== -1) {
              const storyMatch = data.story_match || data.manual_link_result
              newMessages[messageIndex] = {
                ...newMessages[messageIndex],
                linkPreview: {
                  ...newMessages[messageIndex].linkPreview!,
                  status: storyMatch ? 'matched' : 'completed',
                  storyId: storyMatch?.story_id,
                  storyTitle: storyMatch?.story_title
                }
              }
            }

            return newMessages
          })
        }
      } catch (error) {
        console.error('Error polling task status:', error)
        clearInterval(pollInterval)
      }
    }, 3000) // Poll every 3 seconds

    // Clear polling after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000)
  }

  // Handle send message
  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading || !selectedStory) return

    const userMessage = { role: 'user' as const, content: trimmed }
    updateMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const conversationHistory = messages.slice(1).map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      let endpoint: string
      let body: any

      // Check if message contains URL and it's in global chat
      const detectedURL = detectURL(trimmed)
      if (selectedStory.id === GLOBAL_CHAT_ID && detectedURL) {
        // Update the user's message to show fetching status inline
        updateMessages((prev) => {
          const newMessages = [...prev]
          const userMessageIndex = newMessages.length - 1
          newMessages[userMessageIndex] = {
            ...newMessages[userMessageIndex],
            linkPreview: {
              url: detectedURL,
              status: 'fetching'
            }
          }
          return newMessages
        })

        try {
          // Submit to extraction pipeline
          const extractResponse = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: detectedURL })
          })

          const extractData = await extractResponse.json()

          if (extractData.task_id) {
            // Update the user's message with full preview metadata
            const preview = extractData.preview_meta || {}
            updateMessages((prev) => {
              const newMessages = [...prev]
              const userMessageIndex = newMessages.length - 1
              newMessages[userMessageIndex] = {
                ...newMessages[userMessageIndex],
                linkPreview: {
                  url: detectedURL,
                  title: preview.title || preview.meta?.title,
                  description: preview.description || preview.meta?.description,
                  image: preview.thumbnail_url || preview.image?.url,
                  domain: preview.site || new URL(detectedURL).hostname,
                  taskId: extractData.task_id,
                  status: 'processing'
                }
              }
              return newMessages
            })

            // Start polling for task status
            startTaskPolling(extractData.task_id, detectedURL)
          }
        } catch (error) {
          console.error('Error submitting URL:', error)
          updateMessages((prev) => {
            const newMessages = [...prev]
            const userMessageIndex = newMessages.length - 1
            newMessages[userMessageIndex] = {
              ...newMessages[userMessageIndex],
              linkPreview: {
                url: detectedURL,
                status: 'failed'
              }
            }
            return newMessages
          })
        }

        setIsLoading(false)
        return
      }

      if (selectedStory.id === GLOBAL_CHAT_ID) {
        // Global chat
        endpoint = '/api/chat'
        body = {
          message: trimmed,
          conversation_history: conversationHistory
        }
      } else {
        // Story-specific chat
        endpoint = `/api/story/${selectedStory.id}/chat`
        body = {
          message: trimmed,
          conversation_history: conversationHistory
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.response) {
        updateMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.response
          }
        ])
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Error chatting:', error)
      updateMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your question. Please try again.'
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Parse message content to render claim references
  const renderMessageContent = (content: string, messageIdx: number) => {
    const claimPattern = /\b[Cc]laim[s]?\s+(\d+(?:(?:,\s*(?:and\s+)?|\s+and\s+)\d+)*)/g
    const parts: (string | JSX.Element)[] = []
    let lastIndex = 0
    let match

    while ((match = claimPattern.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index))
      }

      const numbersText = match[1]
      const numbers = numbersText.match(/\d+/g)?.map(n => parseInt(n)) || []
      const claimKey = `${messageIdx}-${numbers[0]}`
      const isExpanded = expandedClaims.has(claimKey)

      parts.push(
        <span key={`claim-${match.index}`} className="inline-block">
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold cursor-pointer hover:bg-blue-200 transition-colors"
            onClick={() => {
              setExpandedClaims(prev => {
                const newMap = new Map(prev)
                if (newMap.has(claimKey)) {
                  newMap.delete(claimKey)
                } else {
                  newMap.set(claimKey, numbers[0])
                }
                return newMap
              })
            }}
            title="Click to view claim text"
          >
            Claim{numbers.length > 1 ? 's' : ''} {numbers.join(', ')}
          </span>
          {isExpanded && (
            <span className="block mt-2 space-y-2">
              {numbers.filter(num => num <= claims.length).map(num => (
                <span key={num} className="block p-3 bg-blue-50 border-l-4 border-blue-400 rounded text-xs text-slate-700 leading-relaxed">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-semibold text-blue-700">Claim {num}:</span>
                    {claims[num - 1]?.created_at && (
                      <a
                        href={claims[num - 1]?.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-blue-600 text-[10px] flex-shrink-0 underline cursor-pointer transition-colors"
                        title="View source article"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {formatRelativeTime(claims[num - 1]?.created_at)}
                      </a>
                    )}
                  </div>
                  <div>{claims[num - 1]?.text}</div>
                </span>
              ))}
            </span>
          )}
        </span>
      )

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex))
    }

    return parts.length > 0 ? parts : content
  }

  if (loadingStories) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-600">Loading stories...</p>
        </div>
      </div>
    )
  }

  const allStories = [GLOBAL_CHAT, ...stories]

  // Filter stories based on search query
  const filteredStories = allStories.filter(story => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      story.title.toLowerCase().includes(query) ||
      (story.description && story.description.toLowerCase().includes(query)) ||
      (story.gist && story.gist.toLowerCase().includes(query))
    )
  })

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Mobile Header - Always visible on mobile */}
      <div className="md:hidden flex flex-col border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0 z-10">
        {showMobileList ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-slate-900">HERE.news</h1>
                <p className="text-xs text-slate-500">{filteredStories.length} of {allStories.length}</p>
              </div>
            </div>
            {/* Mobile Search Input */}
            <div className="px-4 pb-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stories..."
                  className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </>
        ) : selectedStory ? (
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => setShowMobileList(true)}
              className="text-slate-600 hover:text-slate-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-slate-900 truncate">{selectedStory.title}</h2>
              <p className="text-xs text-slate-500 truncate">
                {selectedStory.id === GLOBAL_CHAT_ID
                  ? selectedStory.description
                  : selectedStory.updated_at
                  ? `Updated ${formatRelativeTime(selectedStory.updated_at)}`
                  : `Chat about this story`
                }
              </p>
            </div>
            {selectedStory.id !== GLOBAL_CHAT_ID && (
              <button
                onClick={() => setShowStoryOverlay(true)}
                className="text-blue-600 hover:text-blue-700"
                title="View full story"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Stories List (Left Sidebar) */}
        <div
          className={`${
            showMobileList ? 'flex' : 'hidden'
          } md:flex flex-col w-full md:w-80 lg:w-96 bg-white border-r border-slate-200`}
        >
          {/* Header - Desktop only */}
          <div className="hidden md:flex flex-col px-4 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-bold text-slate-900">HERE.news</h1>
              <div className="text-xs text-slate-500">{filteredStories.length} of {allStories.length}</div>
            </div>
            {/* Search Input */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stories..."
                className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Stories List */}
          <div className="flex-1 overflow-y-auto">
            {filteredStories.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm">No stories found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              filteredStories.map((story) => (
              <button
                key={story.id}
                onClick={() => handleSelectStory(story)}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                  selectedStory?.id === story.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon or thumbnail */}
                  {story.id === GLOBAL_CHAT_ID ? (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  ) : story.cover_image ? (
                    <img
                      src={story.cover_image}
                      alt={story.title}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                        />
                      </svg>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-slate-900 truncate flex-1">
                        {story.title}
                      </h3>
                      {/* Red dot for unread stories */}
                      {unreadStories.has(story.id) && (
                        <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" title="New activity" />
                      )}
                      {/* Notification count for Phi */}
                      {story.id === GLOBAL_CHAT_ID && newStoryNotifications.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex-shrink-0">
                          {newStoryNotifications.length}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {story.description || story.gist || 'No description'}
                    </p>
                    {story.id !== GLOBAL_CHAT_ID && (
                      <div className="flex items-center gap-2 mt-2">
                        {story.coherence_score !== undefined && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-semibold">
                            {Math.round(story.coherence_score * 100)}%
                          </span>
                        )}
                        {story.artifact_count !== undefined && (
                          <span className="text-[10px] text-slate-400">
                            {story.artifact_count} sources
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )))}
          </div>
        </div>

        {/* Chat Area (Right Side) */}
        <div
          className={`${
            showMobileList ? 'hidden' : 'flex'
          } md:flex flex-col flex-1 bg-white`}
        >
          {selectedStory ? (
            <>
              {/* Chat Header - Desktop only */}
              <div className="hidden md:flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-slate-900 truncate">{selectedStory.title}</h2>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500">
                      {selectedStory.id === GLOBAL_CHAT_ID
                        ? selectedStory.description
                        : `Ask questions about this story`
                      }
                    </p>
                    {selectedStory.id !== GLOBAL_CHAT_ID && selectedStory.updated_at && (
                      <>
                        <span className="text-xs text-slate-400">•</span>
                        <p className="text-xs text-slate-500">
                          Updated {formatRelativeTime(selectedStory.updated_at)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                {selectedStory.id !== GLOBAL_CHAT_ID && (
                  <button
                    onClick={() => setShowStoryOverlay(true)}
                    className="text-blue-600 hover:text-blue-700"
                    title="View full story"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Story Summary Card - Only for story-specific chats */}
                {selectedStory.id !== GLOBAL_CHAT_ID && (
                  <StorySummaryCard
                    title={selectedStory.title}
                    description={selectedStory.description}
                    gist={selectedStory.gist}
                    coherence_score={selectedStory.coherence_score}
                    artifact_count={selectedStory.artifact_count}
                    people_count={selectedStory.people_count}
                    revision={selectedStory.revision}
                    version={selectedStory.version}
                    updated_at={selectedStory.updated_at}
                    cover_image={selectedStory.cover_image}
                    onViewFullStory={() => setShowStoryOverlay(true)}
                  />
                )}

                {/* For global chat: render curation components at top */}
                {selectedStory.id === GLOBAL_CHAT_ID && (
                  <>
                    {/* Trending entities */}
                    <NewsCurationWelcome
                      curation={newsCuration}
                      loading={loadingCuration}
                      onSelectStory={(storyId) => {
                        const story = stories.find(s => s.id === storyId)
                        if (story) {
                          handleSelectStory(story)
                        }
                      }}
                    />

                    {/* Top Stories Curation */}
                    <TopStoriesCuration />
                  </>
                )}

                {/* Regular messages */}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {/* Avatar for assistant messages */}
                    {msg.role === 'assistant' && <PhiAvatar size="sm" className="mt-1" />}

                    <div
                      className={`max-w-[80%] ${
                        msg.linkPreview ? '' : 'rounded-lg px-4 py-2'
                      } ${
                        msg.role === 'user'
                          ? msg.linkPreview ? '' : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : msg.linkPreview ? '' : 'bg-slate-100 text-slate-900'
                      }`}
                    >
                      {msg.linkPreview ? (
                        <div>
                          <p className={`text-sm leading-relaxed mb-2 px-4 py-2 rounded-lg ${
                            msg.role === 'user'
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                              : 'bg-slate-100 text-slate-900'
                          }`}>
                            {msg.content}
                          </p>
                          <LinkPreviewCard
                            {...msg.linkPreview}
                            onViewStory={
                              msg.linkPreview.storyId
                                ? () => {
                                    const story = stories.find((s) => s.id === msg.linkPreview!.storyId)
                                    if (story) handleSelectStory(story)
                                  }
                                : undefined
                            }
                          />
                        </div>
                      ) : (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.role === 'assistant' ? (
                            selectedStory.id === GLOBAL_CHAT_ID ? (
                              // Use ChatMessageWithEntities for global chat to support markdown links and entity markup
                              // This component will resolve [[Entity Name]] markup using /api/entity endpoint
                              <ChatMessageWithEntities
                                content={msg.content}
                                isDev={true}
                              />
                            ) : (
                              // Use StoryMessageWithEntities for story chat to support both claim references AND entity markup
                              <StoryMessageWithEntities
                                content={msg.content}
                                claims={claims}
                                messageIdx={idx}
                                expandedClaims={expandedClaims}
                                onToggleClaim={(claimKey, claimNum) => {
                                  setExpandedClaims(prev => {
                                    const newMap = new Map(prev)
                                    if (newMap.has(claimKey)) {
                                      newMap.delete(claimKey)
                                    } else {
                                      newMap.set(claimKey, claimNum)
                                    }
                                    return newMap
                                  })
                                }}
                                formatRelativeTime={formatRelativeTime}
                              />
                            )
                          ) : (
                            msg.content
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <PhiAvatar size="sm" className="mt-1" />
                    <div className="max-w-[80%] rounded-lg px-4 py-2 bg-slate-100 text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs text-slate-500">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 p-4 bg-white border-t border-slate-200">
                <div className="flex gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedStory.id === GLOBAL_CHAT_ID ? "Ask about any news..." : "Ask about this story..."}
                    rows={2}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none text-sm"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Press Enter to send • Shift+Enter for new line</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                <p className="text-sm">Select a chat to start</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Story Overlay Modal */}
      {selectedStory && selectedStory.id !== GLOBAL_CHAT_ID && (
        <StoryOverlay
          storyId={selectedStory.id}
          isOpen={showStoryOverlay}
          onClose={() => setShowStoryOverlay(false)}
        />
      )}
    </div>
  )
}

export default StoryChatPage
