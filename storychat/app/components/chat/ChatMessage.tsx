import React from 'react'
import { ChatMessage as ChatMessageType } from '../../types/chat'
import PreviewCard from '../cards/PreviewCard'
import StoryMatchCard from '../cards/StoryMatchCard'
import ActionButtons from '../cards/ActionButtons'

interface ChatMessageProps {
  message: ChatMessageType
  onAction?: (actionId: string, route?: string) => void
  onJoinStory?: (storyId: string) => void
  onViewStory?: (storyId: string) => void
}

function ChatMessage({ message, onAction, onJoinStory, onViewStory }: ChatMessageProps) {
  const isUser = message.role === 'user'

  // User message (right-aligned)
  if (isUser) {
    const hasUrlPreviews = message.content.data.urlPreviews && message.content.data.urlPreviews.length > 0

    return (
      <div className="flex items-start gap-2 justify-end">
        <div className="max-w-[85%] space-y-2">
          <div className="inline-block rounded-xl rounded-tr-sm bg-blue-600 px-3 py-2 shadow-sm">
            <p className="text-sm text-white whitespace-pre-wrap break-words">
              {message.content.data.text}
            </p>
          </div>

          {/* Render URL previews inline below user message */}
          {hasUrlPreviews && (
            <div className="space-y-2">
              {message.content.data.urlPreviews.map((preview: any, idx: number) => (
                <PreviewCard key={idx} preview={preview} />
              ))}
            </div>
          )}

          <div className="text-xs text-slate-400 mt-0.5 text-right">
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </div>
    )
  }

  // System message (left-aligned) - render based on content type
  return (
    <div className="flex items-start gap-2">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>

      <div className="flex-1 max-w-[85%]">
        <div className="space-y-2">
          {renderSystemContent(message, onAction, onJoinStory, onViewStory)}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  )
}

function renderSystemContent(
  message: ChatMessageType,
  onAction?: (actionId: string, route?: string) => void,
  onJoinStory?: (storyId: string) => void,
  onViewStory?: (storyId: string) => void
) {
  const { type, data } = message.content

  switch (type) {
    case 'text':
      return (
        <div className="rounded-xl rounded-tl-sm bg-gradient-to-br from-slate-50 to-slate-100 px-3 py-2 shadow-sm">
          <p className="text-xs text-slate-700 whitespace-pre-wrap">
            {data.text}
          </p>
        </div>
      )

    case 'url_preview':
      return <PreviewCard preview={data.preview} />

    case 'story_matches':
      const topMatches = data.matches.slice(0, 3) // Show only top 3
      const hasMore = data.matches.length > 3

      return (
        <>
          {topMatches.length > 0 ? (
            <>
              <div className="space-y-2">
                {topMatches.map((story: any) => (
                  <StoryMatchCard
                    key={story.id}
                    story={story}
                    onJoin={onJoinStory}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="text-center">
                  <button className="text-xs text-slate-500 hover:text-blue-600 transition-colors">
                    +{data.matches.length - 3} more threads
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl rounded-tl-sm bg-gradient-to-br from-slate-50 to-slate-100 px-3 py-2 shadow-sm">
              <p className="text-xs text-slate-700">
                No existing threads found for this topic.
              </p>
            </div>
          )}
        </>
      )

    case 'action_prompt':
      return <ActionButtons prompt={data.prompt} onAction={onAction} />

    case 'typing_indicator':
      // This case is handled separately in MessageList
      return null

    default:
      return (
        <div className="rounded-2xl rounded-tl-sm bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-3 shadow-sm">
          <p className="text-sm text-slate-500 italic">
            Unknown message type
          </p>
        </div>
      )
  }
}

function formatTimestamp(timestamp: Date): string {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  if (seconds > 5) return `${seconds}s ago`
  return 'just now'
}

export default ChatMessage
