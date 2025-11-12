import React, { useState } from 'react'

interface Comment {
  id: string
  user_id: string
  text: string
  timestamp: string
  reaction_type?: 'support' | 'refute' | 'question' | 'comment'
  parent_comment_id?: string
}

interface User {
  id: string
  username: string
  avatar: string
}

interface CommentThreadProps {
  comments: Comment[]
  users: User[]
  depth?: number
}

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const CommentItem: React.FC<{
  comment: Comment
  users: User[]
  allComments: Comment[]
  depth: number
}> = ({ comment, users, allComments, depth }) => {
  // Only render top-level comments at depth 0
  if (depth === 0 && comment.parent_comment_id) return null

  const user = users.find(u => u.id === comment.user_id)
  const replies = allComments.filter(c => c.parent_comment_id === comment.id)

  const [activeAction, setActiveAction] = useState<'support' | 'refute' | 'reply' | null>(null)
  const [actionText, setActionText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reactionIcon = {
    support: '👍',
    refute: '⚠️',
    question: '❓',
    comment: ''
  }[comment.reaction_type || 'comment']

  const handleActionClick = (action: 'support' | 'refute' | 'reply') => {
    setActiveAction(activeAction === action ? null : action)
    setActionText('')
  }

  const submitAction = async () => {
    if (!actionText.trim() || submitting) return

    setSubmitting(true)
    try {
      // Post comment reply to backend
      const response = await fetch('/jimmylai/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer_id: comment.id.startsWith('c-') ? comment.id.split('-')[1] : 'ans-4', // TODO: Get answer_id properly
          user_id: 'user-current', // TODO: Get from session
          text: actionText,
          parent_comment_id: comment.id,
          reaction_type: activeAction === 'support' ? 'support' : activeAction === 'refute' ? 'refute' : 'comment'
        })
      })

      if (!response.ok) throw new Error('Failed to post comment')

      const data = await response.json()
      console.log('Comment posted:', data)

      setActionText('')
      setActiveAction(null)

      // Reload to show new comment
      window.location.reload()
    } catch (err) {
      console.error('Action failed:', err)
      alert('Failed to post comment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`${depth > 0 ? 'ml-6 pl-3 border-l-2 border-slate-200' : ''}`}>
      <div className="flex items-start gap-2 mb-2">
        {user && <span className="text-lg flex-shrink-0">{user.avatar}</span>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-slate-900">{user?.username || 'Unknown'}</span>
            {reactionIcon && <span className="text-xs">{reactionIcon}</span>}
            <span className="text-xs text-slate-500">{formatTimestamp(comment.timestamp)}</span>
          </div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap mb-2">{comment.text}</div>

          {/* Action Bar */}
          <div className="border-y border-slate-200 my-2">
            <div className="flex items-center gap-2 py-2">
              <button
                onClick={() => handleActionClick('support')}
                className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  activeAction === 'support'
                    ? 'text-blue-700 bg-blue-100'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                👍 Support
              </button>
              <button
                onClick={() => handleActionClick('refute')}
                className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  activeAction === 'refute'
                    ? 'text-amber-700 bg-amber-100'
                    : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50'
                }`}
              >
                ⚠️ Refute
              </button>
              <button
                onClick={() => handleActionClick('reply')}
                className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  activeAction === 'reply'
                    ? 'text-purple-700 bg-purple-100'
                    : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50'
                }`}
              >
                💬 Reply
              </button>
            </div>

            {/* Action input area */}
            {activeAction && (
              <div className="pb-2">
                <textarea
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  placeholder={
                    activeAction === 'support'
                      ? 'Explain why this is valid...'
                      : activeAction === 'refute'
                      ? 'Point out the issue...'
                      : 'Your reply...'
                  }
                  className="w-full text-sm border border-slate-300 rounded p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={submitAction}
                    disabled={!actionText.trim() || submitting}
                    className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                      activeAction === 'support'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : activeAction === 'refute'
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {submitting ? 'Posting...' : 'Post (2¢)'}
                  </button>
                  <button
                    onClick={() => setActiveAction(null)}
                    className="text-xs px-3 py-1 text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recursive replies */}
          {replies.length > 0 && (
            <div className="mt-2 space-y-2">
              {replies.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  users={users}
                  allComments={allComments}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const CommentThread: React.FC<CommentThreadProps> = ({ comments, users, depth = 0 }) => {
  // Only show top-level comments (no parent)
  const topLevelComments = comments.filter(c => !c.parent_comment_id)

  if (topLevelComments.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic py-2">
        No comments yet. Be the first to discuss this evidence.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {topLevelComments.map(comment => (
        <CommentItem
          key={comment.id}
          comment={comment}
          users={users}
          allComments={comments}
          depth={0}
        />
      ))}
    </div>
  )
}

export default CommentThread
