import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import StoryGraph from './components/StoryGraph'
import EvidenceManager from './components/EvidenceManager'
import { useWebSocket } from './hooks/useWebSocket'

interface Claim {
  id: string
  text: string
  modality: string
  confidence?: number
  event_time?: string
  created_at?: string
  source: {
    url: string
    title: string
    site?: string
    domain: string
    published_at?: string
    image_url?: string
    author?: string
    description?: string
    gist?: string
  }
}

interface Source {
  url: string
  title: string
  domain: string
  site?: string
  published_at?: string
  image_url?: string
  author?: string
  description?: string
  gist?: string
}

interface Story {
  id: string
  topic: string
  gist?: string
  coherence_score?: number
  created_at?: string
  updated_at?: string
}

interface BuilderData {
  story: Story
  claims: Claim[]
  sources: Source[]
  claim_entities: any[]
  page_entities: any[]
  threads: Record<string, Claim[]>
}

type ThreadType = 'evidence' | 'structure' | 'graph' | 'revisions'

interface SearchResult {
  id: string
  title: string
  description: string
  category?: string
  artifact_count?: number
}

const modalityConfig: Record<string, { icon: string; label: string; color: string }> = {
  observation: { icon: '✓', label: 'Observation', color: '#3b82f6' },
  reported_speech: { icon: '📰', label: 'Reported Speech', color: '#8b5cf6' },
  opinion: { icon: '💭', label: 'Opinion', color: '#f59e0b' },
  allegation: { icon: '⚠️', label: 'Allegation', color: '#ef4444' },
  fact: { icon: '✓', label: 'Observation', color: '#3b82f6' },
  official_fact: { icon: '✓', label: 'Observation', color: '#3b82f6' },
  reported: { icon: '📰', label: 'Reported Speech', color: '#8b5cf6' },
  reported_claim: { icon: '📰', label: 'Reported Speech', color: '#8b5cf6' }
}

function BuilderPageV4() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<BuilderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeThread, setActiveThread] = useState<ThreadType>('evidence')
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())
  const [claimVotes, setClaimVotes] = useState<Record<string, { up: number; down: number }>>({})
  const [chatMessage, setChatMessage] = useState('')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Mock data for features not yet in API
  const mockRevisions = [
    { version: 'v0.3', status: 'draft', changes: '+5 claims, +2 sources', time: '15m ago', coherence: 58 },
    { version: 'v0.2', status: 'published', claims: 27, sources: 12, time: '2h ago', coherence: 52 },
    { version: 'v0.1', status: 'published', claims: 18, sources: 8, time: '1d ago', coherence: 38 }
  ]

  const mockChatMessages = [
    { user: 'Marcus', message: 'Just added legal analysis. Claims #12-15 need review.', time: '2m', avatar: '👨‍💻' },
    { user: 'Sarah', message: '@Marcus Thanks! Approving claim #8 now.', time: '5m', avatar: '👩‍💼' },
    { user: 'Yuki', message: 'Should we split the timeline section?', time: '12m', avatar: '👩‍🔬' }
  ]

  const mockActiveBuilders = [
    { name: 'Marcus K.', action: 'Editing: Raw Claims', credits: 172, time: '2m', avatar: '👨‍💻' },
    { name: 'Sarah P.', action: 'Viewing: Evidence', credits: 50, time: '5m', avatar: '👩‍💼' },
    { name: 'Yuki T.', action: 'Viewing: Structure', credits: 59, time: '12m', avatar: '👩‍🔬' }
  ]

  // WebSocket connection for real-time updates
  // Extract base path for portability
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const basePath = window.location.pathname.match(/^\/[^\/]+/)?.[0] || ''
  const wsUrl = `${wsProtocol}//${window.location.host}${basePath}/ws`
  const { isConnected } = useWebSocket(wsUrl, {
    onMessage: (message) => {
      // Listen for task completion events
      if (message.type === 'task.completed') {
        console.log('📨 Task completed:', message.task_id)
        // Check if this task has a story match
        if (message.story_match?.story_id === id) {
          console.log('🔄 Task matched current story, refreshing...')
          // Refresh story data to show newly added source
          fetchBuilderData(id!)
        }
      }
    },
    onConnect: () => {
      console.log('✅ Builder WebSocket connected')
    },
    onDisconnect: () => {
      console.log('❌ Builder WebSocket disconnected')
    }
  })

  useEffect(() => {
    if (id) {
      fetchBuilderData(id)
    }
  }, [id])

  // Search functionality - keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on "/" key
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      // Blur search on "Escape" key
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur()
        setShowResults(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Search stories with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch('/storychat/api/stories/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery.trim(), limit: 5 })
        })

        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.matches || [])
          setShowResults(true)
        }
      } catch (err) {
        console.error('Search error:', err)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchResultClick = (storyId: string) => {
    navigate(`/builder/${storyId}`)
    setSearchQuery('')
    setShowResults(false)
    searchInputRef.current?.blur()
  }

  const fetchBuilderData = async (storyId: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/storychat/api/builder/story/${storyId}`)

      if (!response.ok) {
        throw new Error(`Failed to load story: ${response.statusText}`)
      }

      const builderData = await response.json()
      setData(builderData)

      // Initialize votes for all claims
      const votes: Record<string, { up: number; down: number }> = {}
      builderData.claims.forEach((claim: Claim) => {
        votes[claim.id] = { up: Math.floor(Math.random() * 15), down: Math.floor(Math.random() * 5) }
      })
      setClaimVotes(votes)

      // Expand first source by default
      if (builderData.sources.length > 0) {
        setExpandedSources(new Set([builderData.sources[0].url]))
      }
    } catch (err) {
      console.error('Error fetching builder data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load builder data')
    } finally {
      setLoading(false)
    }
  }

  const toggleSource = (sourceUrl: string) => {
    setExpandedSources((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sourceUrl)) {
        newSet.delete(sourceUrl)
      } else {
        newSet.add(sourceUrl)
      }
      return newSet
    })
  }

  const getModalityInfo = (modality: string) => {
    const normalized = modality?.toLowerCase() || 'unknown'
    return modalityConfig[normalized] || { icon: '❓', label: 'Unknown', color: '#6b7280' }
  }

  const getStatusInfo = (coherence: number) => {
    if (coherence < 0.4) return { icon: '🌱', label: 'Emerging', color: 'bg-green-100 text-green-700' }
    if (coherence < 0.7) return { icon: '🌿', label: 'Growing', color: 'bg-teal-100 text-teal-700' }
    return { icon: '🌳', label: 'Mature', color: 'bg-blue-100 text-blue-700' }
  }

  const formatDateTime = (timestamp?: string): {
    absolute: string;
    relative: string;
    reliable: boolean;
    fullDateTime: string;
  } => {
    if (!timestamp) {
      return {
        absolute: 'Date unknown',
        relative: 'unknown',
        reliable: false,
        fullDateTime: ''
      }
    }

    try {
      const then = new Date(timestamp)
      // Check if date is valid
      if (isNaN(then.getTime())) {
        return {
          absolute: 'Date unknown',
          relative: 'unknown',
          reliable: false,
          fullDateTime: ''
        }
      }

      const now = new Date()
      const diffMs = now.getTime() - then.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      // Format absolute date/time
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const thenDate = new Date(then)
      thenDate.setHours(0, 0, 0, 0)
      const daysDiff = Math.floor((today.getTime() - thenDate.getTime()) / (1000 * 60 * 60 * 24))

      let absoluteText = ''
      let reliable = true

      // Check if date is in the future (likely extraction error)
      if (diffMs < 0) {
        absoluteText = then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        reliable = false
      }
      // Check if date is too old (likely extraction error - over 2 years)
      else if (diffDays > 730) {
        absoluteText = then.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        reliable = false
      }
      // Today
      else if (daysDiff === 0) {
        absoluteText = then.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      }
      // Yesterday
      else if (daysDiff === 1) {
        absoluteText = 'Yesterday ' + then.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      }
      // Within last 7 days - show day name
      else if (daysDiff < 7) {
        absoluteText = then.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
      }
      // This year - show month and day
      else if (then.getFullYear() === now.getFullYear()) {
        absoluteText = then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
      // Previous years - show month, day, year
      else {
        absoluteText = then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }

      // Format relative time
      let relativeText = ''
      if (diffMs < 0) {
        relativeText = 'in the future'
      } else if (diffDays > 365) {
        const years = Math.floor(diffDays / 365)
        relativeText = `${years} year${years > 1 ? 's' : ''} ago`
      } else if (diffDays > 30) {
        const months = Math.floor(diffDays / 30)
        relativeText = `${months} month${months > 1 ? 's' : ''} ago`
      } else if (diffDays > 0) {
        relativeText = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
      } else if (diffHours > 0) {
        relativeText = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      } else if (diffMins > 0) {
        relativeText = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
      } else {
        relativeText = 'just now'
      }

      // Full datetime for tooltip
      const fullDateTime = then.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })

      return {
        absolute: absoluteText,
        relative: relativeText,
        reliable,
        fullDateTime
      }
    } catch {
      return {
        absolute: 'Date unknown',
        relative: 'unknown',
        reliable: false,
        fullDateTime: ''
      }
    }
  }

  const getClaimsForSource = (sourceUrl: string): Claim[] => {
    return data?.claims.filter((c) => c.source.url === sourceUrl) || []
  }

  const handleVote = (claimId: string, voteType: 'up' | 'down') => {
    setClaimVotes((prev) => ({
      ...prev,
      [claimId]: {
        up: voteType === 'up' ? prev[claimId].up + 1 : prev[claimId].up,
        down: voteType === 'down' ? prev[claimId].down + 1 : prev[claimId].down
      }
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-600">Loading builder...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Story not found'}</p>
          <Link to={`/story/${id}`} className="text-teal-600 hover:text-teal-700">
            ← Back to Story
          </Link>
        </div>
      </div>
    )
  }

  const { story, claims, sources, claim_entities, page_entities } = data
  const coherencePercent = Math.round((story.coherence_score || 0) * 100)
  const statusInfo = getStatusInfo(story.coherence_score || 0)
  const targetCoherence = 70

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-3">
          {/* Top Bar: Logo + Search + Actions */}
          <div className="flex items-center gap-3 mb-3">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
              <span className="bg-teal-600 text-white font-bold px-2 py-1 rounded text-sm">HERE</span>
              <span className="text-sm font-semibold text-slate-700">Builder</span>
            </Link>

            <div className="h-5 w-px bg-slate-300" />

            {/* Search Bar with Results Dropdown */}
            <div ref={searchContainerRef} className="flex-1 max-w-2xl relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stories or load different story..."
                className="w-full pl-10 pr-10 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                {isSearching ? (
                  <div className="animate-spin w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full" />
                ) : (
                  <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded">
                    /
                  </kbd>
                )}
              </div>

              {/* Search results dropdown */}
              {showResults && searchQuery.trim().length >= 2 && (
                <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                  {searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleSearchResultClick(result.id)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 text-sm line-clamp-1">
                                {result.title}
                              </div>
                              {result.description && (
                                <div className="text-xs text-slate-600 mt-1 line-clamp-2">
                                  {result.description}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                {result.category && (
                                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    {result.category}
                                  </span>
                                )}
                                {result.artifact_count !== undefined && (
                                  <span className="text-xs text-slate-500">
                                    {result.artifact_count} sources
                                  </span>
                                )}
                              </div>
                            </div>
                            <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-slate-500">
                      No stories found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              className="px-3 py-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors border border-teal-300 flex items-center gap-1.5 flex-shrink-0"
              title="Create new story"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Story
            </button>

            <Link
              to={`/story/${id}`}
              className="px-4 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            >
              Reader View →
            </Link>
          </div>

          {/* Story Title + Gist */}
          <div className="mb-2">
            <div className="flex items-start justify-between gap-4 mb-1.5">
              <h1 className="text-lg font-bold text-slate-900">{story.topic}</h1>

              {/* Compact Maturity Indicator */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusInfo.color} border`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{statusInfo.icon}</span>
                    <span>{statusInfo.label}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-700 leading-tight">Story Maturity</div>
                    <div className="text-xs text-slate-500 leading-tight">{claims.length} claims • {sources.length} sources</div>
                  </div>
                  <div className="relative w-24 h-2 bg-white rounded-full overflow-hidden border border-slate-200">
                    <div
                      className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                        coherencePercent >= targetCoherence ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${coherencePercent}%` }}
                    />
                    <div className="absolute top-0 h-full w-0.5 bg-teal-600 z-10" style={{ left: `${targetCoherence}%` }} />
                  </div>
                  <span className="text-sm font-bold text-slate-900 w-8 text-right">{coherencePercent}%</span>
                </div>
              </div>
            </div>

            {story.gist && (
              <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">{story.gist}</p>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Content: 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT - Thread Navigation */}
        <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-4">
            {/* Thread Buttons */}
            <div className="space-y-1 mb-6">
              <button
                onClick={() => setActiveThread('evidence')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeThread === 'evidence'
                    ? 'bg-teal-100 text-teal-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                📎 Evidence
                <span className="ml-2 text-xs opacity-75">({sources.length})</span>
              </button>

              <button
                onClick={() => setActiveThread('structure')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeThread === 'structure'
                    ? 'bg-teal-100 text-teal-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                📖 Story Structure
              </button>

              <button
                onClick={() => setActiveThread('graph')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeThread === 'graph'
                    ? 'bg-teal-100 text-teal-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                🌳 Graph View
              </button>

              <button
                onClick={() => setActiveThread('revisions')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeThread === 'revisions'
                    ? 'bg-teal-100 text-teal-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                📜 Revisions
                <span className="ml-2 text-xs opacity-75">(3)</span>
              </button>
            </div>

            {/* Active Builders - Ranked by Credits */}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                👥 Active Builders
              </h4>
              <div className="space-y-2">
                {mockActiveBuilders.map((builder, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-xs">
                      {builder.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{builder.name}</div>
                      <div className="text-xs text-slate-500">{builder.time} ago</div>
                    </div>
                    <div className="flex-shrink-0 text-xs font-bold text-amber-600">★{builder.credits}</div>
                  </div>
                ))}

                <div className="flex items-center gap-2 p-2 rounded-lg bg-teal-50 border border-teal-200">
                  <div className="flex-shrink-0 w-7 h-7 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    You
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800">You</div>
                    <div className="text-xs text-slate-600">Active now</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE - Thread Content */}
        <div className="flex-1 bg-white overflow-y-auto relative">
          {/* Graph View - Full Canvas (no padding) */}
          {activeThread === 'graph' ? (
            <>
              {/* React Flow Graph - Full Canvas */}
              <div className="absolute inset-0">
                <StoryGraph
                  story={story}
                  claims={claims}
                  sources={sources}
                  claim_entities={claim_entities || []}
                />
              </div>

              {/* Floating Stats Panel - Bottom Left (Top) */}
              <div className="absolute bottom-[180px] left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 p-3 z-10">
                <div className="text-xs font-semibold text-slate-700 mb-2">Stats</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">Sources:</span>
                    <span className="font-semibold text-blue-900">{sources.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">Claims:</span>
                    <span className="font-semibold text-purple-900">{claims.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">Entities:</span>
                    <span className="font-semibold text-green-900">
                      {new Set(claim_entities?.map(e => e.canonical_name) || []).size}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">Links:</span>
                    <span className="font-semibold text-amber-900">{claim_entities?.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* Floating Legend - Bottom Left */}
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 p-3 z-10">
                <div className="text-xs font-semibold text-slate-700 mb-2">Legend</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-teal-400 to-teal-600"></div>
                    <span className="text-slate-600">Story Core</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-slate-100 border-2 border-slate-400"></div>
                    <span className="text-slate-600">Claims (Top)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-white border-2 border-blue-300"></div>
                    <span className="text-slate-600">Sources (Bottom)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-purple-100 border-2 border-purple-300"></div>
                    <span className="text-slate-600">People (Left)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-100 border-2 border-green-300"></div>
                    <span className="text-slate-600">Orgs (Right)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-amber-100 border-2 border-amber-300"></div>
                    <span className="text-slate-600">Locations</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 max-w-5xl mx-auto">
              {/* Evidence Thread */}
              {activeThread === 'evidence' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Evidence Sources ({sources.length})</h2>

                {/* Evidence Manager Component */}
                <EvidenceManager
                  storyId={id!}
                  sources={sources}
                  onRefreshStory={async () => await fetchBuilderData(id!)}
                  expandedSources={expandedSources}
                  setExpandedSources={setExpandedSources}
                />

                <div className="space-y-3">
                  {/* Sort sources by newest first */}
                  {sources
                    .slice()
                    .sort((a, b) => {
                      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0
                      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0
                      return dateB - dateA // Newest first
                    })
                    .map((source) => {
                    const sourceClaims = getClaimsForSource(source.url)
                    const isExpanded = expandedSources.has(source.url)
                    // Use site name if available, otherwise domain
                    const mediaOutlet = source.site || source.domain

                    return (
                      <div key={source.url} data-source-url={source.url} className="border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleSource(source.url)}
                          className="w-full p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors"
                        >
                          {/* Thumbnail */}
                          {source.image_url && (
                            <img
                              src={source.image_url}
                              alt={source.title}
                              className="w-20 h-20 object-cover rounded-lg flex-shrink-0 border border-slate-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          )}

                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-teal-600">[{mediaOutlet}]</span>
                              <span className="text-sm font-medium text-slate-900 truncate">{source.title}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              {(() => {
                                const dateInfo = formatDateTime(source.published_at)
                                return (
                                  <span
                                    className={`cursor-help ${!dateInfo.reliable ? 'opacity-50' : ''}`}
                                    title={`${dateInfo.fullDateTime || dateInfo.absolute}\n${dateInfo.relative}`}
                                  >
                                    📅 {dateInfo.absolute}
                                    {!dateInfo.reliable && <span className="ml-1">⚠️</span>}
                                  </span>
                                )
                              })()}
                              <span>•</span>
                              <span>{sourceClaims.length} claims extracted</span>
                            </div>
                          </div>
                          <svg
                            className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-slate-200 bg-slate-50/50">
                            {sourceClaims.length > 0 ? (
                              <div className="pl-6 pr-3 py-2 space-y-2">
                                {sourceClaims.map((claim) => {
                                  const info = getModalityInfo(claim.modality)
                                  const votes = claimVotes[claim.id] || { up: 0, down: 0 }

                                  return (
                                    <div key={claim.id} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-slate-100 hover:border-slate-300 transition-colors">
                                      {/* Voting - Compact */}
                                      <div className="flex flex-col items-center gap-0.5 pt-1">
                                        <button
                                          onClick={() => handleVote(claim.id, 'up')}
                                          className="p-0.5 hover:bg-green-100 rounded transition-colors"
                                        >
                                          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M3 10l7-7 7 7h-4v7H7v-7H3z" />
                                          </svg>
                                        </button>
                                        <span className="text-xs font-semibold text-slate-700 min-w-[16px] text-center">{votes.up}</span>
                                        <button
                                          onClick={() => handleVote(claim.id, 'down')}
                                          className="p-0.5 hover:bg-red-100 rounded transition-colors"
                                        >
                                          <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M17 10l-7 7-7-7h4V3h6v7h4z" />
                                          </svg>
                                        </button>
                                        <span className="text-xs font-semibold text-slate-700 min-w-[16px] text-center">{votes.down}</span>
                                      </div>

                                      {/* Claim Content - Compact */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span
                                            className="px-1.5 py-0.5 text-xs font-semibold rounded text-white flex-shrink-0"
                                            style={{ backgroundColor: info.color }}
                                          >
                                            {info.icon} {info.label}
                                          </span>
                                          {claim.confidence && (
                                            <span className="text-xs text-slate-400">
                                              {Math.round(claim.confidence * 100)}%
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-slate-800 leading-relaxed mb-1.5">{claim.text}</p>
                                        <div className="flex items-center gap-2">
                                          {claim.event_time && (() => {
                                            const dateInfo = formatDateTime(claim.event_time)
                                            return (
                                              <span
                                                className={`text-xs text-slate-400 cursor-help ${!dateInfo.reliable ? 'opacity-50' : ''}`}
                                                title={`${dateInfo.fullDateTime || dateInfo.absolute}\n${dateInfo.relative}`}
                                              >
                                                📅 {dateInfo.absolute}
                                                {!dateInfo.reliable && <span className="ml-1">⚠️</span>}
                                              </span>
                                            )
                                          })()}
                                          <button className="text-xs text-green-600 hover:text-green-700 font-medium">✓ Approve</button>
                                          <button className="text-xs text-red-600 hover:text-red-700 font-medium">✗ Reject</button>
                                          <button className="text-xs text-slate-600 hover:text-slate-700 font-medium">💬 Discuss</button>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="pl-6 py-3 text-xs text-slate-500">
                                No claims extracted from this source
                              </div>
                            )}

                            <div className="px-3 py-2 border-t border-slate-200 bg-white flex gap-2 text-xs">
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-teal-600 hover:text-teal-700 font-medium"
                              >
                                🔗 View Original
                              </a>
                              <span className="text-slate-300">•</span>
                              <button className="text-slate-600 hover:text-slate-800">Remove Source</button>
                              <span className="text-slate-300">•</span>
                              <button className="text-slate-600 hover:text-slate-800">Re-extract Claims</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Story Structure Thread */}
            {activeThread === 'structure' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Story Structure</h2>
                <div className="text-center text-slate-500 py-12">
                  <div className="text-5xl mb-4">📖</div>
                  <p>Story structure editor coming soon</p>
                  <p className="text-sm mt-2">Organize approved claims into narrative sections</p>
                </div>
              </div>
            )}

            {/* Revisions Thread */}
            {activeThread === 'revisions' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Story Revisions</h2>
                <div className="space-y-4">
                  {mockRevisions.map((rev, idx) => (
                    <div
                      key={rev.version}
                      className={`border rounded-lg overflow-hidden ${
                        rev.status === 'draft' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {rev.status === 'draft' ? (
                                <span className="text-base">⚠️</span>
                              ) : (
                                <span className="text-base">✅</span>
                              )}
                              <span className="font-semibold text-slate-900">{rev.version}</span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  rev.status === 'draft'
                                    ? 'bg-amber-200 text-amber-800'
                                    : 'bg-green-200 text-green-800'
                                }`}
                              >
                                {rev.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{rev.time}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900">{rev.coherence}%</div>
                            <div className="text-xs text-slate-500">coherence</div>
                          </div>
                        </div>

                        {rev.status === 'draft' ? (
                          <div>
                            <div className="bg-white rounded p-3 mb-3 border border-amber-200">
                              <p className="text-sm text-slate-700 font-medium mb-2">📊 Uncommitted changes:</p>
                              <p className="text-sm text-slate-600">{rev.changes}</p>
                            </div>
                            <div className="flex gap-2">
                              <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg">
                                Commit as {rev.version}
                              </button>
                              <button className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg">
                                Discard Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-slate-600 mb-3">
                              📊 {rev.claims} claims, {rev.sources} sources
                            </p>
                            <div className="flex gap-2">
                              <button className="text-xs text-teal-600 hover:text-teal-700 font-medium">View</button>
                              <span className="text-slate-300">•</span>
                              <button className="text-xs text-slate-600 hover:text-slate-800">Restore</button>
                              {idx > 0 && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <button className="text-xs text-slate-600 hover:text-slate-800">Compare</button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          )}
        </div>

        {/* RIGHT - Community Chat & Revisions */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
          {/* Chat Section */}
          <div className="flex-[2] flex flex-col border-b border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">💬 Builder Chat ({mockChatMessages.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {mockChatMessages.map((msg, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-sm">
                    {msg.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-slate-900">{msg.user}</span>
                      <span className="text-xs text-slate-400">{msg.time}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed mt-0.5">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-slate-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Type message..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <button className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg">
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Community Chat */}
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700">💬 Community Chat</h3>
              <p className="text-xs text-slate-500 mt-1">Collaborate with other builders</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-center text-slate-400 py-12">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm">Chat coming soon</p>
                <p className="text-xs mt-1">Discuss changes, ask questions, coordinate work</p>
              </div>
            </div>

            <div className="p-3 border-t border-slate-200">
              <input
                type="text"
                placeholder="Type a message..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BuilderPageV4
