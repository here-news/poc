import React from 'react'
import { ChatMessage as ChatMessageType } from '../../types/chat'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import GrowingStories from './GrowingStories'

interface ChatWindowProps {
  messages: ChatMessageType[]
  isTyping?: boolean
  typingMessage?: string
  onSubmit: (input: string) => void
  onAction?: (actionId: string, route?: string) => void
  onJoinStory?: (storyId: string) => void
  onViewStory?: (storyId: string) => void
  disabled?: boolean
}

function ChatWindow({
  messages,
  isTyping,
  typingMessage,
  onSubmit,
  onAction,
  onJoinStory,
  onViewStory,
  disabled = false
}: ChatWindowProps) {
  return (
    <div className="flex flex-col h-full bg-white border border-white/60 rounded-3xl shadow-md overflow-hidden">
      <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 flex-shrink-0">
        <h2 className="text-xl font-semibold text-slate-800">Seed a Thread</h2>
        <p className="text-sm text-slate-500 mt-1">
          Drop a link or describe your signal
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <MessageList
          messages={messages}
          isTyping={isTyping}
          typingMessage={typingMessage}
          onAction={onAction}
          onJoinStory={onJoinStory}
          onViewStory={onViewStory}
        />
      </div>

      <div className="flex-shrink-0">
        <GrowingStories />
      </div>

      <div className="flex-shrink-0">
        <ChatInput
          onSubmit={onSubmit}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

export default ChatWindow
