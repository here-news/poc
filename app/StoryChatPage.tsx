import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ensureUserId } from './userSession'

interface Story {
  id: string
  title: string
  description?: string
  gist?: string
  coherence_score?: number
  last_updated?: string
  cover_image?: string
  artifact_count?: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'just now'
  } catch {
    return ''
  }
}

function StoryChatPage() {
  const { storyId } = useParams<{ storyId?: string }>()
  const navigate = useNavigate()
  const [userId, setUserId] = useState('')
  const [stories, setStories] = useState<Story[]>([])
  const [loadingStories, setLoadingStories] = useState(true)
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [claims, setClaims] = useState<Claim[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [expandedClaims, setExpandedClaims] = useState<Map<string, number>>(new Map())
  const [showMobileList, setShowMobileList] = useState(true) // Mobile: show list or chat
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize user
  useEffect(() => {
    const uid = ensureUserId()
    setUserId(uid)
  }, [])

  // Fetch stories with chat enabled (coherence > 0.5)
  useEffect(() => {
    const fetchStories = async () => {
      try {
        const response = await fetch('/api/stories?limit=50&min_coherence=0.5')
        const data = await response.json()
        if (data.stories) {
          setStories(data.stories)

          // If storyId provided, select it; otherwise select first story
          if (storyId) {
            const story = data.stories.find((s: Story) => s.id === storyId)
            if (story) {
              setSelectedStory(story)
              loadStoryData(story.id)
            }
          } else if (data.stories.length > 0) {
            // Auto-select first story and update URL
            setSelectedStory(data.stories[0])
            navigate(`/storychat/${data.stories[0].id}`, { replace: true })
            loadStoryData(data.stories[0].id)
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

  // Load story-specific data (claims)
  const loadStoryData = async (id: string) => {
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

  // Initialize chat when story selected
  useEffect(() => {
    if (selectedStory) {
      setMessages([
        {
          role: 'assistant',
          content: `I can help you understand this story: "${selectedStory.title}". Ask me anything about the claims, sources, or related information.`
        }
      ])
      setExpandedClaims(new Map())
    }
  }, [selectedStory])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle story selection
  const handleSelectStory = (story: Story) => {
    setSelectedStory(story)
    navigate(`/storychat/${story.id}`)
    loadStoryData(story.id)
    setShowMobileList(false) // On mobile, switch to chat view
  }

  // Handle send message
  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading || !selectedStory) return

    // Add user message
    const userMessage = { role: 'user' as const, content: trimmed }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Build conversation history (exclude the initial welcome message)
      const conversationHistory = messages.slice(1).map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const response = await fetch(`/api/story/${selectedStory.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          conversation_history: conversationHistory
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.response) {
        setMessages((prev) => [
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
      console.error('Error chatting with story:', error)
      setMessages((prev) => [
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

  if (stories.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No stories available for chat yet.</p>
          <Link to="/" className="text-blue-600 hover:text-blue-700 underline">
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Mobile Header - Always visible on mobile, shows selected story */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
        {showMobileList ? (
          <>
            <Link to="/" className="text-slate-600 hover:text-slate-900">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-slate-900">Story Chats</h1>
              <p className="text-xs text-slate-500">{stories.length} stories</p>
            </div>
          </>
        ) : selectedStory ? (
          <>
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
              <p className="text-xs text-slate-500 truncate">Chat about this story</p>
            </div>
            <Link
              to={`/story/${selectedStory.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
              title="View full story"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </Link>
          </>
        ) : null}
      </div>

      {/* Stories List (Left Sidebar) */}
      <div
        className={`${
          showMobileList ? 'flex' : 'hidden'
        } md:flex flex-col w-full md:w-80 lg:w-96 bg-white border-r border-slate-200`}
      >
        {/* Header - Desktop only */}
        <div className="hidden md:flex items-center justify-between px-4 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-600 hover:text-slate-900">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-slate-900">Story Chats</h1>
          </div>
          <div className="text-xs text-slate-500">{stories.length} stories</div>
        </div>

        {/* Stories List */}
        <div className="flex-1 overflow-y-auto">
          {stories.map((story) => (
            <button
              key={story.id}
              onClick={() => handleSelectStory(story)}
              className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                selectedStory?.id === story.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Story thumbnail or icon */}
                {story.cover_image ? (
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
                  <h3 className="font-semibold text-sm text-slate-900 truncate mb-1">
                    {story.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {story.description || story.gist || 'No description'}
                  </p>
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
                </div>
              </div>
            </button>
          ))}
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
            {/* Chat Header - Desktop only (mobile header is at top of screen) */}
            <div className="hidden md:flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-slate-900 truncate">{selectedStory.title}</h2>
                <p className="text-xs text-slate-500 truncate">
                  Ask questions about this story
                </p>
              </div>
              <Link
                to={`/story/${selectedStory.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700"
                title="View full story"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.role === 'assistant' ? renderMessageContent(msg.content, idx) : msg.content}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
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
                  placeholder="Ask about this story..."
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
              <p className="text-sm">Select a story to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StoryChatPage
