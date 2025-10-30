import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface GrowingStory {
  id: string
  title: string
  coherence_score: number
  artifact_count: number
  claim_count: number
  last_updated_human?: string
  updated_at?: string
}

interface GrowingStoriesProps {
  maxCoherence?: number
}

function GrowingStories({ maxCoherence = 0.7 }: GrowingStoriesProps) {
  const [stories, setStories] = useState<GrowingStory[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(true) // Start expanded by default

  useEffect(() => {
    console.log('[GrowingStories] Component mounted or maxCoherence changed:', maxCoherence)
    fetchGrowingStories()
    // Refresh every 60 seconds
    const interval = setInterval(fetchGrowingStories, 60000)
    return () => clearInterval(interval)
  }, [maxCoherence])

  const fetchGrowingStories = async () => {
    try {
      console.log('[GrowingStories] Fetching stories below threshold:', maxCoherence)
      // Fetch stories BELOW the main pane threshold (complementary filtering)
      // If main pane shows 40%+, sidebar shows 0-40%
      // API already sorts by last_activity DESC, so newest stories come first
      const response = await fetch(`/api/stories?limit=5&min_coherence=0&max_coherence=${maxCoherence}`)
      const data = await response.json()

      if (data.stories) {
        console.log('[GrowingStories] Fetched', data.stories.length, 'stories')
        setStories(data.stories.map((s: any) => ({
          id: s.id,
          title: s.title,
          coherence_score: s.coherence_score || 0,
          artifact_count: s.artifact_count || 0,
          claim_count: s.claim_count || 0,
          last_updated_human: s.last_updated_human,
          updated_at: s.updated_at
        })))
      } else {
        console.log('[GrowingStories] No stories in response')
      }
    } catch (err) {
      console.error('[GrowingStories] Error fetching:', err)
    } finally {
      setLoading(false)
    }
  }

  const getMaturityStage = (coherence: number) => {
    if (coherence < 0.4) return { emoji: '🌱', label: 'Emerging', color: 'text-green-700' }
    if (coherence < 0.7) return { emoji: '🌿', label: 'Growing', color: 'text-teal-700' }
    return { emoji: '🌳', label: 'Mature', color: 'text-blue-700' }
  }

  return (
    <div className="border-t-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-emerald-100/50 transition-colors"
        aria-label="Toggle low maturity threads"
      >
        <div className="flex items-center gap-2 flex-1">
          <span className="text-lg">🌱🌿</span>
          <div className="text-left flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-emerald-800">
                New Low Maturity Threads
              </h3>
              {!loading && stories.length > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                  NEW
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-600">
              {stories.length} {stories.length === 1 ? 'thread needs' : 'recent threads need'} your input
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-emerald-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Story List */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {loading ? (
            <div className="text-center py-4">
              <div className="inline-block w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-2" />
              <p className="text-xs text-slate-500">Loading threads...</p>
            </div>
          ) : stories.length === 0 ? (
            <div className="text-center py-4 px-3">
              <span className="text-2xl mb-2 block">🌳</span>
              <p className="text-xs text-slate-600 font-medium mb-1">All threads are mature!</p>
              <p className="text-xs text-slate-500">No low-maturity threads need help right now</p>
            </div>
          ) : (
            stories.map((story) => {
            const coherencePercent = Math.round(story.coherence_score * 100)
            const stage = getMaturityStage(story.coherence_score)
            return (
              <Link
                key={story.id}
                to={`/builder/${story.id}`}
                className="block p-3 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-lg flex-shrink-0">{stage.emoji}</span>
                    <h4 className="text-sm font-medium text-slate-800 group-hover:text-emerald-700 line-clamp-2">
                      {story.title}
                    </h4>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className={`text-xs font-bold ${stage.color}`}>
                      {coherencePercent}%
                    </div>
                    <div className="text-[10px] text-slate-500">{stage.label}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      stage.label === 'Emerging'
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                        : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                    }`}
                    style={{ width: `${coherencePercent}%` }}
                  />
                </div>

                {/* Stats & Timestamp */}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    {story.claim_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    {story.artifact_count}
                  </span>
                  {story.last_updated_human && (
                    <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                      🕐 {story.last_updated_human}
                    </span>
                  )}
                  <span className="text-emerald-600 font-medium ml-auto">
                    Help build →
                  </span>
                </div>
              </Link>
            )
          })
          )}
        </div>
      )}
    </div>
  )
}

export default GrowingStories
