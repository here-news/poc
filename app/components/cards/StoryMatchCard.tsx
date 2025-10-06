import React from 'react'
import { StoryMatch } from '../../types/chat'

interface StoryMatchCardProps {
  story: StoryMatch
  onJoin?: (storyId: string) => void
  showScore?: boolean
}

function StoryMatchCard({ story, onJoin, showScore = true }: StoryMatchCardProps) {
  return (
    <div className="group rounded-lg border border-slate-200 bg-white/95 p-3 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
         onClick={() => onJoin?.(story.id)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
            {story.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
            <span>{story.lastUpdated}</span>
            {showScore && story.matchScore && story.matchScore >= 0.5 && (
              <>
                <span>•</span>
                <span className="text-blue-600 font-medium">
                  {Math.round(story.matchScore * 100)}% match
                </span>
              </>
            )}
          </div>
        </div>
        <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

export default StoryMatchCard
