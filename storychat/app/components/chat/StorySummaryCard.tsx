import React from 'react'

interface StorySummaryCardProps {
  title: string
  description?: string
  gist?: string
  coherence_score?: number
  artifact_count?: number
  people_count?: number
  revision?: string
  version?: string
  updated_at?: string
  cover_image?: string
  onViewFullStory: () => void
}

function StorySummaryCard({
  title,
  description,
  gist,
  coherence_score,
  artifact_count,
  people_count,
  revision,
  version,
  updated_at,
  cover_image,
  onViewFullStory
}: StorySummaryCardProps) {
  const summaryText = description || gist || 'No summary available'

  const formatRelativeTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
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

  return (
    <div className="relative border-2 border-blue-200 rounded-xl overflow-hidden mb-4 flex-shrink-0">
      {/* Background image with overlay */}
      {cover_image && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${cover_image})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/95 via-white/95 to-purple-50/95" />
        </>
      )}

      {/* Content */}
      <div className={`relative p-4 ${!cover_image ? 'bg-gradient-to-br from-blue-50 via-white to-purple-50' : ''}`}>
        {/* Story badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
              Story v.{revision || version || '1'}
            </div>
            {coherence_score !== undefined && (
              <div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                {Math.round(coherence_score * 100)}% coherence
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">{title}</h3>

        {/* Summary */}
        <p className="text-sm text-slate-700 mb-3 leading-relaxed">{summaryText}</p>

      {/* Metadata */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-600 mb-3">
        {updated_at && (
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Updated {formatRelativeTime(updated_at)}</span>
          </div>
        )}
        {artifact_count !== undefined && (
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{artifact_count} sources</span>
          </div>
        )}
        {people_count !== undefined && (
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{people_count} people</span>
          </div>
        )}
        </div>

        {/* View full story button */}
        <button
          onClick={onViewFullStory}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View Full Story v.{revision || version || '1'}
        </button>
      </div>
    </div>
  )
}

export default StorySummaryCard
