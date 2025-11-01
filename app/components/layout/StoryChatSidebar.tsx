import React, { useState, useRef, useEffect } from 'react'

interface StoryChatSidebarProps {
  storyId: string
  storyTitle: string
  isOpen: boolean
  onToggle: () => void
  claims?: Array<{ text: string; confidence?: number }>
}

function StoryChatSidebar({ storyId, storyTitle, isOpen, onToggle, claims = [] }: StoryChatSidebarProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: `I can help you understand this story: "${storyTitle}". Ask me anything about the claims, sources, or related information.`
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedClaims, setExpandedClaims] = useState<Map<string, number>>(new Map()) // Map of messageIdx-claimNum to expanded state
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

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

      const response = await fetch(`/api/story/${storyId}/chat`, {
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

  // Parse message content to render claim references as clickable elements with inline expansion
  const renderMessageContent = (content: string, messageIdx: number) => {
    // Match patterns like "Claim 5" or "Claims 3 and 7" or "Claims 3, 7, and 12"
    const claimPattern = /\b[Cc]laim[s]?\s+((?:\d+(?:\s+and\s+\d+|,\s*\d+)*(?:\s+and\s+\d+)?)|(?:\d+))/g
    const parts: (string | JSX.Element)[] = []
    let lastIndex = 0
    let match

    while ((match = claimPattern.exec(content)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index))
      }

      // Extract claim numbers
      const numbersText = match[1]
      const numbers = numbersText.match(/\d+/g)?.map(n => parseInt(n)) || []

      // Add clickable claim reference with inline expansion
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
          {isExpanded && numbers[0] <= claims.length && (
            <span className="block mt-2 p-3 bg-blue-50 border-l-4 border-blue-400 rounded text-xs text-slate-700 leading-relaxed">
              <span className="font-semibold text-blue-700">Claim {numbers[0]}: </span>
              {claims[numbers[0] - 1]?.text}
            </span>
          )}
        </span>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex))
    }

    return parts.length > 0 ? parts : content
  }

  return (
    <>
      {/* Floating Chat Button (when collapsed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all z-40 flex items-center justify-center"
          aria-label="Open chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}

      {/* Sidebar (when expanded) */}
      <div
        className={`fixed top-0 right-0 h-screen w-96 bg-white border-l border-slate-200 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <h3 className="font-semibold text-slate-900">Story Chat</h3>
          </div>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-slate-200 rounded transition-colors"
            aria-label="Close chat"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100vh - 140px)' }}>
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
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200">
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
          <p className="text-xs text-slate-500 mt-1">Press Enter to send • Shift+Enter for new line</p>
        </div>
      </div>

      {/* Backdrop (when sidebar is open) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
    </>
  )
}

export default StoryChatSidebar
