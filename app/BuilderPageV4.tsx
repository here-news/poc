import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import StoryGraph from './components/StoryGraph'

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

  // Add evidence state - support multiple simultaneous tasks
  const [addEvidenceUrl, setAddEvidenceUrl] = useState('')
  const [processingTasks, setProcessingTasks] = useState<Array<{
    taskId: string
    url: string
    status: 'processing' | 'completed' | 'error'
    stage?: string
    preview?: any
    claimsCount?: number
    errorMessage?: string
  }>>([])

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

  // Store polling interval ref for cleanup
  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Cleanup polling on unmount or thread change
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [activeThread])

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
        const response = await fetch('/api/stories/search', {
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
      const response = await fetch(`/api/builder/story/${storyId}`)

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

  const formatRelativeTime = (timestamp?: string): string => {
    if (!timestamp) return 'Recently'
    try {
      const then = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - then.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)
      if (diffDays > 0) return `${diffDays}d ago`
      if (diffHours > 0) return `${diffHours}h ago`
      if (diffMins > 0) return `${diffMins}m ago`
      return 'just now'
    } catch {
      return 'Recently'
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

  // Add evidence handlers
  const handleAddEvidence = async () => {
    if (!addEvidenceUrl.trim() || !id) return

    setAddEvidenceStatus('submitting')
    setAddEvidenceMessage('Checking if page exists...')

    try {
      const response = await fetch(`/api/story/${id}/add-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: addEvidenceUrl.trim() })
      })

      const result = await response.json()

      if (!response.ok) {
        setAddEvidenceStatus('error')
        const errorMsg = result.error || result.detail || result.message || `Failed to add evidence (${response.status})`
        setAddEvidenceMessage(errorMsg)
        console.error('Add evidence error:', result)
        return
      }

      if (result.task_id) {
        // Task created, start polling
        setAddEvidenceTaskId(result.task_id)
        setAddEvidenceStatus('polling')
        setAddEvidenceMessage('Extracting claims from page...')
        startPolling(result.task_id)
      } else {
        // Unexpected response - show what we got
        setAddEvidenceStatus('error')
        const errorMsg = result.error || result.message || 'Unexpected response from server'
        setAddEvidenceMessage(errorMsg)
        console.error('Unexpected result:', result)
      }
    } catch (err) {
      console.error('Error adding evidence:', err)
      setAddEvidenceStatus('error')
      if (err instanceof Error) {
        setAddEvidenceMessage(`Network error: ${err.message}`)
      } else {
        setAddEvidenceMessage('Network error. Please check your connection.')
      }
    }
  }

  const handleResetAddEvidence = () => {
    setAddEvidenceStatus('idle')
    setAddEvidenceMessage('')
    setAddEvidenceResult(null)
    setAddEvidenceTaskId(null)
    setAddEvidencePreview(null)
  }

  const startPolling = (taskId: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/task/${taskId}`)
        const task = await response.json()

        if (!response.ok) {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
          setAddEvidenceStatus('error')
          setAddEvidenceMessage('Failed to check extraction status')
          return
        }

        // Update progress message
        if (task.current_stage) {
          setAddEvidenceMessage(`${task.current_stage}...`)
        }

        // Capture preview if available (iFramely data)
        if (task.preview_meta && !addEvidencePreview) {
          setAddEvidencePreview({
            title: task.preview_meta.title,
            description: task.preview_meta.description,
            image: task.preview_meta.thumbnail_url,
            domain: task.preview_meta.site_name || new URL(task.url).hostname
          })
        }

        if (task.status === 'completed') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)

          console.log('Task completed:', task)  // Debug: see full task object

          // Check if extraction actually succeeded
          const claimsCount = task.semantic_data?.claims?.length || 0
          const isReadable = task.result?.is_readable !== false
          const hasContent = task.token_costs?.total > 0

          // If extraction failed (no claims, not readable, or no tokens used)
          if (claimsCount === 0 && (!isReadable || !hasContent)) {
            setAddEvidenceStatus('error')
            const reason = task.result?.block_detection
              ? 'Article content is protected or blocked by the website'
              : 'Unable to extract article content'
            setAddEvidenceMessage(`Extraction completed but failed: ${reason}`)
            return
          }

          // Success case
          setAddEvidenceStatus('success')

          // Show different message based on whether claims are available yet
          if (claimsCount > 0) {
            setAddEvidenceMessage(`✓ Successfully linked! Extracted ${claimsCount} claims.`)
          } else {
            setAddEvidenceMessage(`✓ Successfully linked article to story!`)
          }

          setAddEvidenceResult({
            page_title: task.result?.title || task.preview_meta?.title || 'Article',
            claims_extracted: claimsCount,
            similarity_score: task.story_match?.match_score
          })

          // Refresh builder data after 3 seconds to show new source
          setTimeout(() => {
            if (id) {
              console.log('Refreshing builder data to show new evidence...')
              fetchBuilderData(id)
            }
            // Reset form state after another second
            setTimeout(() => {
              setAddEvidenceUrl('')
              setAddEvidenceStatus('idle')
              setAddEvidenceMessage('')
              setAddEvidenceResult(null)
              setAddEvidenceTaskId(null)
              setAddEvidencePreview(null)
            }, 1000)
          }, 3000)
        } else if (task.status === 'failed') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
          setAddEvidenceStatus('error')
          setAddEvidenceMessage(task.error || 'Extraction failed')
        }
      } catch (err) {
        console.error('Polling error:', err)
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
        setAddEvidenceStatus('error')
        setAddEvidenceMessage('Lost connection while checking status')
      }
    }, 3000) // Poll every 3 seconds
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
            <h1 className="text-lg font-bold text-slate-900 mb-1.5">{story.topic}</h1>
            {story.gist && (
              <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">{story.gist}</p>
              </div>
            )}
          </div>

          {/* Coherence Bar */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-4">
              <div className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold ${statusInfo.color} border`}>
                <div className="text-base mb-0.5">{statusInfo.icon}</div>
                <div>{statusInfo.label}</div>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Story Maturity</span>
                    <span className="text-xs text-slate-500">({claims.length} claims, {sources.length} sources)</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{coherencePercent}%</span>
                </div>
                <div className="relative h-3 bg-white rounded-full overflow-hidden border border-slate-200">
                  <div
                    className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                      coherencePercent >= targetCoherence ? 'bg-green-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${coherencePercent}%` }}
                  />
                  <div className="absolute top-0 h-full w-0.5 bg-teal-600 z-10" style={{ left: `${targetCoherence}%` }} />
                </div>
              </div>

              <div className="flex-shrink-0 text-xs text-slate-600 pl-4 border-l border-slate-300">
                <div className="font-semibold text-teal-600 mb-1">Target: {targetCoherence}%</div>
                <div className="text-slate-500">+{Math.ceil((targetCoherence - coherencePercent) / 10)} perspectives</div>
              </div>
            </div>
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

                {/* Add Evidence Section - MOVED TO TOP */}
                <div className="border-2 border-dashed border-teal-300 bg-teal-50/30 rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <p className="text-sm font-semibold text-teal-900">Add new evidence source</p>
                  </div>

                  <input
                    type="text"
                    value={addEvidenceUrl}
                    onChange={(e) => setAddEvidenceUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && addEvidenceStatus === 'idle') {
                        handleAddEvidence()
                      }
                    }}
                    placeholder="Paste article URL (e.g., https://example.com/article)..."
                    className="w-full px-4 py-2.5 border border-teal-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={addEvidenceStatus !== 'idle'}
                  />

                  {/* Status message */}
                  {addEvidenceMessage && (
                    <div className={`mb-3 px-4 py-2 rounded-lg text-sm ${
                      addEvidenceStatus === 'success' ? 'bg-green-100 text-green-800' :
                      addEvidenceStatus === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {addEvidenceStatus === 'polling' && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span>{addEvidenceMessage}</span>
                          </div>
                          {addEvidenceTaskId && (
                            <div className="text-xs text-blue-600 font-mono mt-1">
                              Task: {addEvidenceTaskId}
                            </div>
                          )}
                        </div>
                      )}
                      {(addEvidenceStatus === 'success' || addEvidenceStatus === 'error' || addEvidenceStatus === 'submitting') && (
                        <div>
                          <span>{addEvidenceMessage}</span>
                          {addEvidenceTaskId && addEvidenceStatus === 'error' && (
                            <div className="text-xs text-red-600 font-mono mt-1">
                              Task: {addEvidenceTaskId}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* URL Preview - show during extraction */}
                  {addEvidencePreview && addEvidenceStatus === 'polling' && (
                    <div className="mb-3 p-3 bg-white rounded-lg border border-blue-200">
                      <div className="flex gap-3">
                        {addEvidencePreview.image && (
                          <img
                            src={addEvidencePreview.image}
                            alt={addEvidencePreview.title}
                            className="w-20 h-20 object-cover rounded flex-shrink-0"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-blue-600 font-semibold mb-0.5">{addEvidencePreview.domain}</div>
                          <div className="text-sm font-medium text-slate-900 line-clamp-2 mb-1">
                            {addEvidencePreview.title}
                          </div>
                          {addEvidencePreview.description && (
                            <div className="text-xs text-slate-600 line-clamp-2">
                              {addEvidencePreview.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Result preview - show on success */}
                  {addEvidenceResult && addEvidenceStatus === 'success' && (
                    <div className="mb-3 p-4 bg-white rounded-lg border border-green-200">
                      <div className="text-xs text-green-700 font-semibold mb-2">Linked Successfully</div>
                      {addEvidenceResult.page_title && (
                        <div className="text-sm text-slate-900 font-medium mb-1">{addEvidenceResult.page_title}</div>
                      )}
                      {addEvidenceResult.claims_extracted && (
                        <div className="text-xs text-slate-600">
                          {addEvidenceResult.claims_extracted} claims extracted
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleAddEvidence}
                      disabled={!addEvidenceUrl.trim() || addEvidenceStatus !== 'idle'}
                      className={`px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm ${
                        !addEvidenceUrl.trim() || addEvidenceStatus !== 'idle'
                          ? 'bg-slate-400 cursor-not-allowed'
                          : 'bg-teal-600 hover:bg-teal-700'
                      }`}
                    >
                      {addEvidenceStatus === 'idle' ? '🔍 Extract Claims' :
                       addEvidenceStatus === 'submitting' ? 'Checking...' :
                       addEvidenceStatus === 'polling' ? 'Extracting...' :
                       addEvidenceStatus === 'success' ? '✓ Added!' :
                       '✗ Failed'}
                    </button>

                    {addEvidenceStatus === 'error' && (
                      <button
                        onClick={handleResetAddEvidence}
                        className="px-4 py-2 text-slate-700 text-sm font-semibold rounded-lg transition-colors border border-slate-300 hover:bg-slate-50"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                </div>

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
                      <div key={source.url} className="border border-slate-200 rounded-lg overflow-hidden">
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
                              <span>📅 {formatRelativeTime(source.published_at)}</span>
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
                                          {claim.event_time && (
                                            <span className="text-xs text-slate-400">📅 {formatRelativeTime(claim.event_time)}</span>
                                          )}
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
