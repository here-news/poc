import React from 'react'
import { Link } from 'react-router-dom'
import { Submission } from '../hooks/useSubmissions'

interface SubmissionResultProps {
  submission: Submission
}

function SubmissionResult({ submission }: SubmissionResultProps) {
  const getStatusDisplay = () => {
    switch (submission.status) {
      case 'pending':
        return {
          icon: '⏱️',
          text: 'Queued...',
          color: 'text-slate-600',
          bg: 'bg-slate-50'
        }
      case 'extracting':
        return {
          icon: '🔍',
          text: 'Matching stories...',
          color: 'text-blue-600',
          bg: 'bg-blue-50'
        }
      case 'completed':
        if (submission.story_match) {
          if (submission.story_match.is_new) {
            return {
              icon: '✨',
              text: `No match found, new story emerging...`,
              color: 'text-green-600',
              bg: 'bg-green-50'
            }
          } else {
            const matchPercent = Math.round((submission.story_match.match_score || 0) * 100)
            return {
              icon: '🔗',
              text: `Found related story (${matchPercent}% match)`,
              color: 'text-purple-600',
              bg: 'bg-purple-50'
            }
          }
        } else {
          return {
            icon: '✅',
            text: 'Extraction completed',
            color: 'text-green-600',
            bg: 'bg-green-50'
          }
        }
      case 'blocked':
        return {
          icon: '⚠️',
          text: 'Unable to access (paywall or blocked)',
          color: 'text-amber-600',
          bg: 'bg-amber-50'
        }
      case 'failed':
        return {
          icon: '❌',
          text: 'Extraction failed',
          color: 'text-red-600',
          bg: 'bg-red-50'
        }
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div className={`rounded-lg border border-slate-200 p-4 ${statusDisplay.bg} transition-all overflow-hidden`}>
      {/* Status Header */}
      <div className="flex items-center gap-3 mb-2 min-w-0">
        <span className="text-2xl flex-shrink-0">{statusDisplay.icon}</span>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold ${statusDisplay.color}`}>
            {statusDisplay.text}
          </div>
          {submission.story_match && !submission.story_match.is_new && (
            <div className="text-sm font-medium text-slate-700 mt-1">
              <div className="truncate">Story: {submission.story_match.matched_story_title}</div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <span>👁️</span>
                <span>Visible on homepage</span>
              </div>
            </div>
          )}
          {submission.story_match && submission.story_match.is_new && (
            <div className="text-xs text-slate-500 mt-1">
              Story will appear on homepage shortly...
            </div>
          )}
        </div>
        {submission.status === 'extracting' && (
          <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
        )}
      </div>

      {/* Preview or URL */}
      {submission.preview ? (
        <div className="flex gap-3 mt-3 p-3 bg-white rounded-lg border border-slate-200">
          {submission.preview.thumbnail && (
            <img
              src={submission.preview.thumbnail}
              alt=""
              className="w-20 h-20 object-cover rounded flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-slate-900 text-sm line-clamp-2">
              {submission.preview.title}
            </div>
            <div className="text-xs text-slate-600 mt-1 line-clamp-2">
              {submission.preview.description}
            </div>
            <div className="text-xs text-slate-500 mt-1 truncate">
              {submission.preview.siteName || submission.preview.url}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-600 mt-2 break-all line-clamp-2">
          {submission.input}
        </div>
      )}

      {/* Story Match Info */}
      {submission.story_match && submission.status === 'completed' && !submission.story_match.is_new && (
        <div className="flex gap-3 mt-3 text-xs text-slate-600">
          <span>📊 Story thread</span>
          <span>✓ Article added</span>
          <span>👥 Join investigation</span>
        </div>
      )}
      {submission.story_match && submission.status === 'completed' && submission.story_match.is_new && (
        <div className="flex gap-3 mt-3 text-xs text-green-600">
          <span>✨ New story created</span>
          <span>📊 First artifact</span>
          <span>👥 Be the first contributor</span>
        </div>
      )}

      {/* Status Message */}
      {submission.error_message && (
        <div className="mt-2 text-sm text-slate-600 italic">
          {submission.error_message}
        </div>
      )}
      {submission.status === 'completed' && !submission.story_match && !submission.error_message && (
        <div className="mt-2 text-sm text-amber-600 italic">
          Story matching temporarily unavailable - article saved successfully
        </div>
      )}

      {/* View Story Button */}
      {submission.story_match && submission.story_match.story_id && (
        <Link
          to={`/story/${submission.story_match.story_id}`}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#008080] to-[#1a2f3a] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-teal-500/30 transition-all"
        >
          <span>View Story</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7-7 7" />
          </svg>
        </Link>
      )}

      {/* Timestamp */}
      <div className="mt-2 text-xs text-slate-400">
        {submission.created_at.toLocaleTimeString()}
      </div>
    </div>
  )
}

export default SubmissionResult
