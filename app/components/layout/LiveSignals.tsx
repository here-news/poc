import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

interface StorySummary {
  id: string
  title: string
  description: string
  category: 'local' | 'global' | string
  artifact_count: number
  claim_count: number
  people_count: number
  locations: string[]
  last_updated_human: string
  cover_image?: string
  health_indicator?: string
}

const categoryConfig: Record<string, { label: string; color: string; accent: string }> = {
  local: {
    label: 'US Focus',
    color: 'bg-emerald-100 text-emerald-700',
    accent: 'text-emerald-500'
  },
  global: {
    label: 'Global Signal',
    color: 'bg-blue-100 text-blue-700',
    accent: 'text-blue-500'
  }
}

const healthConfig: Record<string, { label: string; color: string }> = {
  healthy: { label: 'Active', color: 'bg-emerald-100 text-emerald-600' },
  growing: { label: 'Growing', color: 'bg-blue-100 text-blue-600' },
  stale: { label: 'Cooling', color: 'bg-amber-100 text-amber-600' },
  archived: { label: 'Archived', color: 'bg-slate-100 text-slate-500' },
  unknown: { label: 'New', color: 'bg-slate-100 text-slate-500' }
}

function LiveSignals() {
  const [stories, setStories] = useState<StorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [newStoriesCount, setNewStoriesCount] = useState(0)

  // Pin states (mockup) - using story IDs as keys
  const [pinnedStories, setPinnedStories] = useState<Set<string>>(new Set())

  const togglePin = (storyId: string, event: React.MouseEvent) => {
    event.preventDefault() // Prevent navigation to story
    event.stopPropagation()
    setPinnedStories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(storyId)) {
        newSet.delete(storyId)
      } else {
        newSet.add(storyId)
      }
      return newSet
    })
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    console.log('[LiveSignals] Component mounted, starting auto-refresh')
    fetchStories() // Initial fetch

    const interval = setInterval(() => {
      console.log('[LiveSignals] Auto-refresh triggered (30s interval)')
      fetchStories(true) // Background refresh
    }, 30000) // 30 seconds

    return () => {
      console.log('[LiveSignals] Component unmounted, clearing interval')
      clearInterval(interval)
    }
  }, [])

  const fetchStories = async (isBackground = false) => {
    try {
      // Only show loading spinner on initial load, not background refreshes
      if (!isBackground) {
        setLoading(true)
      } else {
        setIsRefreshing(true)
      }

      const response = await fetch('/api/stories?limit=12')
      const data = await response.json()

      if (data.error) {
        setError(data.error)
        if (!isBackground) setStories([])
      } else {
        const summaries: StorySummary[] = (data.stories || []).map((story: any) => ({
          id: story.id,
          title: story.title,
          description: story.description,
          category: story.category || 'global',
          artifact_count: story.artifact_count || 0,
          claim_count: story.claim_count || 0,
          people_count: story.people_count || 0,
          locations: story.locations || [],
          last_updated_human: story.last_updated_human || 'recently',
          cover_image: story.cover_image,
          health_indicator: story.health_indicator
        }))

        // Detect new stories (check if any IDs are different)
        if (isBackground && stories.length > 0) {
          const existingIds = new Set(stories.map(s => s.id))
          const newStories = summaries.filter(s => !existingIds.has(s.id))
          if (newStories.length > 0) {
            setNewStoriesCount(newStories.length)
            // Clear notification after 5 seconds
            setTimeout(() => setNewStoriesCount(0), 5000)
          }
        }

        setStories(summaries)
        setLastRefresh(new Date())
        setError(null)
      }
    } catch (err) {
      console.error('Error fetching stories:', err)
      if (!isBackground) {
        setError('Failed to load stories')
        setStories([])
      }
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Recent Threads</h2>
            <p className="text-sm text-slate-500">
              Active story threads from the community
              {isRefreshing && (
                <span className="ml-2 inline-flex items-center gap-1 text-blue-600">
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </span>
              )}
            </p>
          </div>

          {/* Manual Refresh Button + New Stories Badge */}
          <div className="flex items-center gap-2">
            {newStoriesCount > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full animate-pulse">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                {newStoriesCount} new {newStoriesCount === 1 ? 'story' : 'stories'}
              </span>
            )}
            <button
              onClick={() => fetchStories(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh stories"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-slate-500">
              <div className="inline-block w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2" />
              <p className="text-sm">Loading threads...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No threads available</p>
            </div>
          ) : stories.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No threads yet. Seed the first one!</p>
            </div>
          ) : (
            stories.map((story) => {
              const category = categoryConfig[story.category] || categoryConfig.global
              const health = healthConfig[story.health_indicator || 'unknown'] || healthConfig.unknown

              const isPinned = pinnedStories.has(story.id)

              return (
                <Link
                  key={story.id}
                  to={`/story/${story.id}`}
                  className="block group rounded-2xl border border-slate-200 bg-white/90 p-5 transition shadow-sm hover:shadow-md hover:border-blue-300 relative"
                >
                  {/* Pin Button - Top Left */}
                  <button
                    onClick={(e) => togglePin(story.id, e)}
                    className={`absolute top-3 left-3 p-1.5 rounded-lg border-2 transition-all shadow-sm z-10 ${
                      isPinned
                        ? 'bg-yellow-400 border-yellow-500 text-yellow-900 shadow-yellow-200'
                        : 'bg-white/90 border-slate-300 text-slate-400 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-600'
                    }`}
                    title={isPinned ? 'Pinned - Watching for 24h' : 'Click to pin (1p to keep 24h watching)'}
                  >
                    <svg className={`w-4 h-4 transition-transform ${isPinned ? 'rotate-45' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                    </svg>
                  </button>

                  <div className="flex items-start gap-4">
                    {/* Thumbnail Image */}
                    {story.cover_image && (
                      <div className="w-28 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                        <img
                          src={story.cover_image}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {story.title}
                        </h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${category.color}`}>
                          {category.label}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${health.color}`}>
                          {health.label}
                        </span>
                      </div>
                      {story.description && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                          {story.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                        <span className={category.accent}>
                          {story.artifact_count} artifact{story.artifact_count !== 1 ? 's' : ''}
                        </span>
                        <span>{story.claim_count} claim{story.claim_count !== 1 ? 's' : ''}</span>
                        <span>{story.people_count} contributor{story.people_count !== 1 ? 's' : ''}</span>
                      </div>
                      {story.locations.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 text-xs text-slate-400">
                          {story.locations.slice(0, 3).map((location) => (
                            <span key={location} className="px-2 py-0.5 bg-slate-100 rounded-full">
                              {location}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full whitespace-nowrap self-start">
                      {story.last_updated_human}
                    </span>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}

export default LiveSignals
