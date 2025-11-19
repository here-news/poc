import React, { useState, useRef, KeyboardEvent, useEffect } from 'react'

interface Comment {
  id: string
  user_id: string
  user_name: string
  user_picture?: string
  user_email: string
  text: string
  story_id: string
  parent_comment_id?: string
  reaction_type?: string
  created_at: string
  updated_at?: string
}

interface CommentThreadProps {
  storyId: string
}

function CommentThread({ storyId }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadComments()
  }, [storyId])

  const loadComments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/comments/story/${storyId}`)
      if (response.ok) {
        const data = await response.json()
        setComments(data || [])
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    const trimmed = input.trim()
    if (!trimmed || submitting) return

    try {
      setSubmitting(true)
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          story_id: storyId,
          text: trimmed
        })
      })

      if (response.ok) {
        setInput('')
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
        await loadComments()
      } else {
        alert('Failed to post comment')
      }
    } catch (error) {
      console.error('Error posting comment:', error)
      alert('Error posting comment')
    } finally {
      setSubmitting(false)
    }
  }

  // IME-SAFE: Use onKeyDown, check e.key === 'Enter'
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)

    // Auto-resize
    const textarea = e.target
    textarea.style.height = 'auto'
    const newHeight = Math.max(Math.min(textarea.scrollHeight, 200), 80)
    textarea.style.height = `${newHeight}px`
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Comments</h2>

      {/* Comment Input */}
      <div className="mb-8">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Share your thoughts... (supports Chinese, Japanese, Korean)"
          disabled={submitting}
          rows={3}
          className="w-full resize-none px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 text-sm leading-relaxed"
          style={{ minHeight: '80px', maxHeight: '200px' }}
        />
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-slate-500">
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded">Enter</kbd> to post,
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded ml-1">Shift+Enter</kbd> for new line
          </p>
          <button
            onClick={handleSubmit}
            disabled={submitting || !input.trim()}
            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-slate-400">No comments yet. Be the first to comment!</div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-4">
              {comment.user_picture ? (
                <img
                  src={comment.user_picture}
                  alt={comment.user_name}
                  className="w-10 h-10 rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {comment.user_name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-900">{comment.user_name}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {comment.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CommentThread
