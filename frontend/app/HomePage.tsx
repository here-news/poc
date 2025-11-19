import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from './components/layout/Header'
import NewsCard from './components/cards/NewsCard'
import StoryCardSkeleton from './components/cards/StoryCardSkeleton'
import { Story, FeedResponse } from './types/story'

function HomePage() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [newStoriesCount, setNewStoriesCount] = useState(0)

  // Filters
  const [minCoherence, setMinCoherence] = useState(0.0)
  const [debouncedCoherence, setDebouncedCoherence] = useState(0.0)

  const navigate = useNavigate()
  const pageSize = 12
  const scrollThreshold = 1000
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const coherenceDebounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadPreferences()
    loadFeed(true)
    startBackgroundRefresh()
    window.addEventListener('scroll', handleScroll)

    return () => {
      stopBackgroundRefresh()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    if (debouncedCoherence !== minCoherence) {
      loadFeed(true)
    }
  }, [debouncedCoherence])

  const loadPreferences = () => {
    const saved = localStorage.getItem('story_min_coherence')
    if (saved) {
      const coherence = parseFloat(saved)
      setMinCoherence(coherence)
      setDebouncedCoherence(coherence)
    }
  }

  const savePreferences = (coherence: number) => {
    localStorage.setItem('story_min_coherence', coherence.toString())
  }

  const handleCoherenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    setMinCoherence(value)

    if (coherenceDebounceRef.current) {
      clearTimeout(coherenceDebounceRef.current)
    }

    coherenceDebounceRef.current = setTimeout(() => {
      setDebouncedCoherence(value)
      savePreferences(value)
    }, 500)
  }

  const loadFeed = async (initial = false) => {
    try {
      if (initial) {
        setLoading(true)
        setStories([])
      }

      const params = new URLSearchParams({
        limit: pageSize.toString(),
        min_coherence: debouncedCoherence.toString()
      })

      const response = await fetch(`/api/coherence/feed?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data: FeedResponse = await response.json()
      setStories(data.stories || [])
      setHasMore((data.stories || []).length === pageSize)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: stories.length.toString(),
        min_coherence: debouncedCoherence.toString()
      })

      const response = await fetch(`/api/coherence/feed?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data: FeedResponse = await response.json()
      const newStories = data.stories || []
      setStories([...stories, ...newStories])
      setHasMore(newStories.length === pageSize)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more stories')
    } finally {
      setLoadingMore(false)
    }
  }

  const handleScroll = () => {
    const scrollHeight = document.documentElement.scrollHeight
    const scrollTop = document.documentElement.scrollTop
    const clientHeight = document.documentElement.clientHeight
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    if (distanceFromBottom < scrollThreshold) {
      loadMore()
    }
  }

  const startBackgroundRefresh = () => {
    refreshIntervalRef.current = setInterval(() => {
      checkNewStories()
    }, 30000) // 30 seconds
  }

  const stopBackgroundRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
    }
  }

  const checkNewStories = async () => {
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        min_coherence: debouncedCoherence.toString()
      })

      const response = await fetch(`/api/coherence/feed?${params}`)
      if (!response.ok) return

      const data: FeedResponse = await response.json()
      const newStories = data.stories || []

      if (newStories.length > 0 && stories.length > 0) {
        const firstNewId = newStories[0].story_id
        const hasNew = !stories.some(s => s.story_id === firstNewId)

        if (hasNew) {
          const newCount = newStories.findIndex(s =>
            stories.some(existing => existing.story_id === s.story_id)
          )
          setNewStoriesCount(newCount === -1 ? newStories.length : newCount)

          // Auto-hide after 5 seconds
          setTimeout(() => {
            setNewStoriesCount(0)
          }, 5000)
        }
      }
    } catch (err) {
      console.error('Background refresh failed:', err)
    }
  }

  const refreshFeed = () => {
    setNewStoriesCount(0)
    loadFeed(true)
  }

  const handleStoryClick = (storyId: string) => {
    navigate(`/story/${storyId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <Header />

      {/* New Stories Banner */}
      {newStoriesCount > 0 && (
        <div
          onClick={refreshFeed}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg shadow-lg cursor-pointer z-50 animate-slideDown"
        >
          {newStoriesCount} new {newStoriesCount === 1 ? 'story' : 'stories'} available - Click to refresh
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Coherence Filter */}
          <div className="mb-6 pb-6 border-b border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Minimum Coherence: {(minCoherence * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={minCoherence}
              onChange={handleCoherenceChange}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              Error: {error}
            </div>
          )}

          {loading ? (
            <div className="grid gap-6">
              {Array(pageSize).fill(0).map((_, i) => (
                <StoryCardSkeleton key={i} />
              ))}
            </div>
          ) : stories.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-lg text-slate-600">No stories found</div>
            </div>
          ) : (
            <>
              <div className="grid gap-6">
                {stories.map((story) => (
                  <NewsCard
                    key={story.story_id}
                    story={story}
                    onClick={() => story.story_id && handleStoryClick(story.story_id)}
                  />
                ))}
              </div>

              {loadingMore && (
                <div className="mt-6 grid gap-6">
                  {Array(3).fill(0).map((_, i) => (
                    <StoryCardSkeleton key={i} />
                  ))}
                </div>
              )}

              {!hasMore && stories.length > 0 && (
                <div className="text-center py-8 text-slate-400 text-sm italic">
                  No more stories
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomePage
