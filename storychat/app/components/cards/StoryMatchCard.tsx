import React from 'react'
import { StoryMatch } from '../../types/chat'

interface StoryMatchCardProps {
  story: StoryMatch
  onJoin?: (storyId: string) => void
  showScore?: boolean
}

function StoryMatchCard({ story, onJoin, showScore = true }: StoryMatchCardProps) {
  // Format similarity score
  const matchPercentage = story.matchScore ? Math.round(story.matchScore * 100) : null
  const isHighConfidence = story.matchScore && story.matchScore >= 0.8

  // Health indicator colors
  const healthColors = {
    healthy: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    growing: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    stale: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    archived: 'bg-gray-500/10 text-gray-600 border-gray-500/20'
  }

  return (
    <div className="group rounded-lg border border-slate-200 bg-white/95 p-4 hover:border-blue-300 hover:shadow-sm transition-all">
      {/* Header with badges */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-slate-800 group-hover:text-blue-600 transition-colors">
            {story.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Health indicator badge */}
          {story.healthIndicator && (
            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${healthColors[story.healthIndicator]}`}>
              {story.healthIndicator}
            </span>
          )}

          {/* Similarity score badge */}
          {showScore && matchPercentage !== null && (
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded border ${
                isHighConfidence
                  ? 'bg-green-500/10 text-green-600 border-green-500/30'
                  : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
              }`}
              title={`Semantic similarity: ${matchPercentage}% - Articles are ${
                isHighConfidence ? 'highly' : 'moderately'
              } related based on content analysis`}
            >
              {matchPercentage}% match
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {story.description && (
        <p className="text-xs text-slate-600 mb-3 line-clamp-2">
          {story.description}
        </p>
      )}

      {/* Metadata row */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
        <div className="flex items-center gap-3">
          {story.contributorCount !== undefined && (
            <span>👥 {story.contributorCount} contributor{story.contributorCount !== 1 ? 's' : ''}</span>
          )}
          {story.claimCount !== undefined && (
            <span>📋 {story.claimCount} claim{story.claimCount !== 1 ? 's' : ''}</span>
          )}
          <span>🕐 {story.lastUpdated}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            window.location.href = `/story/${story.id}`
          }}
          className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-md
                     hover:border-slate-400 hover:bg-slate-50 transition-colors font-medium text-slate-700"
        >
          View Thread
        </button>
        {onJoin && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onJoin(story.id)
            }}
            className="flex-1 px-3 py-2 text-xs bg-blue-600/20 text-blue-600 border border-blue-500/30 rounded-md
                       hover:bg-blue-600/30 hover:border-blue-500/50 transition-colors font-medium"
          >
            Add to Thread
          </button>
        )}
      </div>
    </div>
  )
}

export default StoryMatchCard
