import React, { useEffect, useRef } from 'react'
import { ChatMessage as ChatMessageType } from '../../types/chat'
import ChatMessage from './ChatMessage'
import TypingIndicator from './TypingIndicator'

interface MessageListProps {
  messages: ChatMessageType[]
  isTyping?: boolean
  typingMessage?: string
  onAction?: (actionId: string, route?: string) => void
  onJoinStory?: (storyId: string) => void
  onViewStory?: (storyId: string) => void
}

function MessageList({
  messages,
  isTyping = false,
  typingMessage,
  onAction,
  onJoinStory,
  onViewStory
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && !isTyping ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            Seed a Thread
          </h3>
          <p className="text-sm text-slate-500 max-w-sm">
            Share a link or describe what you're seeing. I'll help you find related threads or start a new investigation.
          </p>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onAction={onAction}
              onJoinStory={onJoinStory}
              onViewStory={onViewStory}
            />
          ))}

          {isTyping && <TypingIndicator message={typingMessage} />}

          <div ref={bottomRef} />
        </>
      )}
    </div>
  )
}

export default MessageList
