import React, { useState } from 'react'
import { formatTime } from '../../utils/timeFormat'
import URLPreview from '../comment/URLPreview'

export interface StoryMatch {
  story_id: string
  is_new: boolean
  match_score: number
  matched_story_title: string
}

export interface PreviewMeta {
  title?: string
  description?: string
  thumbnail_url?: string
  site_name?: string
}

export interface EventSubmission {
  id: string
  user_id: string
  user_name: string
  user_picture?: string
  content: string
  urls?: string
  status: 'pending' | 'extracting' | 'completed' | 'failed' | 'blocked'
  task_id?: string
  story_match?: StoryMatch
  preview_meta?: PreviewMeta
  created_at: string
}

interface PendingSubmissionProps {
  submission: EventSubmission
}

function PendingSubmission({ submission }: PendingSubmissionProps) {
  const [expanded, setExpanded] = useState(false)
  const timeInfo = formatTime(submission.created_at)
  const urlList = submission.urls ? submission.urls.split(',').filter(u => u.trim()) : []

  // Get status info
  const getStatusInfo = () => {
    switch (submission.status) {
      case 'pending':
        return { icon: '⏱️', text: 'queued', color: 'text-slate-600', borderColor: 'border-slate-300' }
      case 'extracting':
        return { icon: '🔍', text: 'processing', color: 'text-blue-600', borderColor: 'border-blue-300' }
      case 'failed':
        return { icon: '❌', text: 'failed', color: 'text-red-600', borderColor: 'border-red-300' }
      case 'blocked':
        return { icon: '⚠️', text: 'blocked', color: 'text-amber-600', borderColor: 'border-amber-300' }
      case 'completed':
        if (submission.story_match) {
          const isNew = submission.story_match.is_new
          const matchScore = Math.round(submission.story_match.match_score * 100)
          return {
            icon: '✓',
            text: isNew ? 'created new story' : `merged (${matchScore}% match)`,
            color: 'text-green-600',
            borderColor: 'border-green-300',
            storyLink: {
              id: submission.story_match.story_id,
              title: submission.story_match.matched_story_title
            }
          }
        }
        return { icon: '✓', text: 'completed', color: 'text-green-600', borderColor: 'border-green-300' }
      default:
        return { icon: '⏳', text: 'processing', color: 'text-slate-600', borderColor: 'border-slate-300' }
    }
  }

  const statusInfo = getStatusInfo()
  const urlDomain = urlList.length > 0 ? new URL(urlList[0]).hostname : null

  // Collapsed view (default)
  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        className={`py-2 px-3 bg-slate-50 border-l-2 ${statusInfo.borderColor} text-xs text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors flex items-center gap-2`}
      >
        {/* Small avatar */}
        {submission.user_picture ? (
          <img
            src={submission.user_picture}
            alt={submission.user_name}
            className="w-6 h-6 rounded-full flex-shrink-0"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {submission.user_name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <span className="font-medium text-slate-600">{submission.user_name}</span>
          {' '}<span className={statusInfo.color}>({statusInfo.icon} {statusInfo.text})</span>
          {' '}at {timeInfo.absolute}
          {urlDomain && (
            <>
              {' '}• <span className="text-slate-600">{urlDomain}</span>
            </>
          )}
          {statusInfo.storyLink && (
            <>
              {' '}→ <a
                href={`/story/${statusInfo.storyLink.id}`}
                className="text-indigo-600 hover:text-indigo-800 underline"
                onClick={(e) => e.stopPropagation()}
              >
                {statusInfo.storyLink.title}
              </a>
            </>
          )}
        </div>

        <span className="text-slate-400 flex-shrink-0">▼</span>
      </div>
    )
  }

  // Expanded view (like classic_app)
  return (
    <div className={`rounded-lg border-2 ${statusInfo.borderColor} p-4 bg-slate-50 transition-all`}>
      {/* Header with collapse button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {submission.user_picture ? (
            <img
              src={submission.user_picture}
              alt={submission.user_name}
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {submission.user_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-semibold text-slate-900">{submission.user_name}</div>
            <div className="text-xs text-slate-500">{timeInfo.absolute}</div>
          </div>
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="text-slate-400 hover:text-slate-600 text-lg font-bold"
        >
          ×
        </button>
      </div>

      {/* Status Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.color} bg-white border ${statusInfo.borderColor} text-sm font-medium mb-3`}>
        <span>{statusInfo.icon}</span>
        <span>{statusInfo.text}</span>
      </div>

      {/* Content */}
      {submission.content && (
        <p className="text-slate-700 text-sm leading-relaxed mb-3 whitespace-pre-wrap">
          {submission.content}
        </p>
      )}

      {/* URL Previews */}
      {urlList.length > 0 && (
        <div className="space-y-2 mt-3">
          {urlList.map((url, idx) => (
            <div key={idx}>
              {submission.preview_meta ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex gap-3 border border-slate-200 rounded-lg overflow-hidden bg-white hover:border-indigo-300 hover:shadow-md transition-all p-3"
                >
                  {submission.preview_meta.thumbnail_url && (
                    <img
                      src={submission.preview_meta.thumbnail_url}
                      alt={submission.preview_meta.title || url}
                      className="w-20 h-20 rounded object-cover flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    {submission.preview_meta.site_name && (
                      <div className="text-xs text-slate-500 mb-1">{submission.preview_meta.site_name}</div>
                    )}
                    <div className="font-semibold text-slate-900 text-sm line-clamp-2 mb-1">
                      {submission.preview_meta.title || url}
                    </div>
                    {submission.preview_meta.description && (
                      <div className="text-xs text-slate-600 line-clamp-2 mb-1">
                        {submission.preview_meta.description}
                      </div>
                    )}
                    <div className="text-xs text-indigo-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {new URL(url).hostname}
                    </div>
                  </div>
                </a>
              ) : (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 underline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {new URL(url).hostname}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Story Link */}
      {statusInfo.storyLink && (
        <a
          href={`/story/${statusInfo.storyLink.id}`}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors text-sm"
        >
          <span>View Story: {statusInfo.storyLink.title}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      )}
    </div>
  )
}

export default PendingSubmission
