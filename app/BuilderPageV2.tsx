import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

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

interface StoryListItem {
  id: string
  topic: string
  gist?: string
  coherence?: number
  status?: string
  pageCount: number
  claimCount: number
  createdAt?: string
  updatedAt?: string
}

interface Entity {
  claim_id?: string
  page_url?: string
  canonical_name: string
  wikidata_qid?: string
  wikidata_thumbnail?: string
  role?: string
  type: string
}

interface BuilderData {
  story: Story
  claims: Claim[]
  sources: Source[]
  claim_entities: Entity[]
  page_entities: Entity[]
  threads: Record<string, Claim[]>
}

interface ActiveBuilder {
  name: string
  action: string
  timeAgo: string
  credits: number
  avatar: string
}

interface Gap {
  priority: 'high' | 'medium' | 'low'
  description: string
  impact: string
  credits: string
}

const modalityConfig: Record<string, { icon: string; label: string; color: string }> = {
  observation: { icon: '✓', label: 'Observations', color: '#3b82f6' },
  reported_speech: { icon: '📰', label: 'Reported Speech', color: '#8b5cf6' },
  opinion: { icon: '💭', label: 'Opinions & Analysis', color: '#f59e0b' },
  allegation: { icon: '⚠️', label: 'Allegations', color: '#ef4444' },
  // Legacy mappings
  fact: { icon: '✓', label: 'Observations', color: '#3b82f6' },
  official_fact: { icon: '✓', label: 'Observations', color: '#3b82f6' },
  reported: { icon: '📰', label: 'Reported Speech', color: '#8b5cf6' },
  reported_claim: { icon: '📰', label: 'Reported Speech', color: '#8b5cf6' }
}

function BuilderPageV2() {
  const { id } = useParams<{ id: string }>()
  const [availableStories, setAvailableStories] = useState<StoryListItem[]>([])
  const [selectedStoryId, setSelectedStoryId] = useState<string>(id || '')
  const [data, setData] = useState<BuilderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSourceUrl, setSelectedSourceUrl] = useState<string | null>(null)
  const [expandedModalities, setExpandedModalities] = useState<Set<string>>(
    new Set(['observation', 'reported_speech', 'opinion', 'allegation'])
  )
  const [showAddEvidence, setShowAddEvidence] = useState(false)
  const [quickInputValue, setQuickInputValue] = useState('')
  const [showGapAnalysis, setShowGapAnalysis] = useState(true)

  // Mock active builders (in production, this would come from websocket/API)
  const [activeBuilders, setActiveBuilders] = useState<ActiveBuilder[]>([
    { name: 'Marcus K.', action: 'Added root cause analysis', timeAgo: '2m ago', credits: 172, avatar: '👨‍💻' },
    { name: 'Sarah P.', action: 'Added official statement', timeAgo: '15m ago', credits: 50, avatar: '👩‍💼' },
    { name: 'Yuki T.', action: 'Technical context added', timeAgo: '1h ago', credits: 59, avatar: '👩‍🔬' }
  ])

  useEffect(() => {
    loadAvailableStories()
  }, [])

  useEffect(() => {
    if (selectedStoryId) {
      fetchBuilderData(selectedStoryId)
    }
  }, [selectedStoryId])

  useEffect(() => {
    if (id) {
      setSelectedStoryId(id)
    }
  }, [id])

  const loadAvailableStories = async () => {
    try {
      const response = await fetch('/api/builder/stories')
      if (response.ok) {
        const stories = await response.json()
        setAvailableStories(stories)
      }
    } catch (err) {
      console.error('Error loading stories:', err)
    }
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

      // Auto-select first source
      if (builderData.sources && builderData.sources.length > 0) {
        setSelectedSourceUrl(builderData.sources[0].url)
      }
    } catch (err) {
      console.error('Error fetching builder data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load builder data')
    } finally {
      setLoading(false)
    }
  }

  const toggleModality = (modality: string) => {
    setExpandedModalities((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(modality)) {
        newSet.delete(modality)
      } else {
        newSet.add(modality)
      }
      return newSet
    })
  }

  const getModalityInfo = (modality: string) => {
    const normalized = modality?.toLowerCase() || 'unknown'
    return (
      modalityConfig[normalized] || {
        icon: '❓',
        label: 'Unknown',
        color: '#6b7280'
      }
    )
  }

  const getStatusInfo = (coherence: number) => {
    if (coherence < 0.4) return { icon: '🌱', label: 'Emerging', color: 'bg-green-100 text-green-700 border-green-200' }
    if (coherence < 0.7) return { icon: '🌿', label: 'Growing', color: 'bg-teal-100 text-teal-700 border-teal-200' }
    return { icon: '🌳', label: 'Mature', color: 'bg-blue-100 text-blue-700 border-blue-200' }
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
      return 'Just now'
    } catch {
      return 'Recently'
    }
  }

  const getPageEntities = (pageUrl: string): Entity[] => {
    return data?.page_entities?.filter((e) => e.page_url === pageUrl) || []
  }

  const selectEvidence = (sourceUrl: string) => {
    setSelectedSourceUrl(sourceUrl)
  }

  // Calculate gaps (mock - in production this would be from API)
  const calculateGaps = (): Gap[] => {
    if (!data) return []

    const gaps: Gap[] = []
    const coherence = data.story.coherence_score || 0

    if (coherence < 0.7) {
      if (data.sources.length < 5) {
        gaps.push({
          priority: 'high',
          description: 'Only ' + data.sources.length + ' sources - need more evidence diversity',
          impact: '+0.12-0.18',
          credits: '35-50'
        })
      }

      const modalityTypes = Object.keys(data.threads)
      if (modalityTypes.length < 3) {
        gaps.push({
          priority: 'high',
          description: 'Missing claim modalities - need balanced perspective',
          impact: '+0.10-0.15',
          credits: '28-42'
        })
      }

      if (data.claim_entities.length < 5) {
        gaps.push({
          priority: 'medium',
          description: 'Few entities identified - add expert analysis',
          impact: '+0.08-0.12',
          credits: '22-35'
        })
      }
    }

    return gaps
  }

  const selectedSource = data?.sources.find((s) => s.url === selectedSourceUrl)
  const selectedSourceClaims = data?.claims.filter((c) => c.source.url === selectedSourceUrl) || []
  const selectedSourceEntities = selectedSourceUrl ? getPageEntities(selectedSourceUrl) : []
  const gaps = calculateGaps()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-600">Loading builder workspace...</p>
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

  const { story, claims, sources, threads } = data
  const coherencePercent = Math.round((story.coherence_score || 0) * 100)
  const statusInfo = getStatusInfo(story.coherence_score || 0)
  const targetCoherence = 70
  const needsImprovement = coherencePercent < targetCoherence

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header with Quick Input */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <span className="bg-teal-600 text-white font-bold px-2 py-1 rounded text-sm">HERE</span>
                <span className="text-sm font-semibold text-slate-700">Builder</span>
              </Link>

              <div className="h-6 w-px bg-slate-300" />

              <select
                value={selectedStoryId}
                onChange={(e) => setSelectedStoryId(e.target.value)}
                className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 hover:border-slate-400 transition-colors"
              >
                {availableStories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.topic || s.gist || s.id} ({Math.round((s.coherence || 0) * 100)}%)
                  </option>
                ))}
              </select>

              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.color}`}>
                {statusInfo.icon} {statusInfo.label}
              </span>
            </div>

            <Link
              to={`/story/${selectedStoryId}`}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors"
            >
              Reader View →
            </Link>
          </div>

          {/* Quick Evidence Input Bar */}
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                  ➕
                </div>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={quickInputValue}
                  onChange={(e) => setQuickInputValue(e.target.value)}
                  placeholder="Paste article URL or write analysis to contribute..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowAddEvidence(true)}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                Add Evidence
              </button>
            </div>
            {needsImprovement && (
              <p className="mt-2 text-xs text-slate-600">
                💡 <span className="font-semibold">Impact preview:</span> Your contribution could increase coherence by{' '}
                <span className="text-teal-700 font-semibold">+8-15%</span> and earn{' '}
                <span className="text-teal-700 font-semibold">25-40 credits</span>
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Main Content: 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR - Gap Analysis + Active Builders */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
          {/* Coherence Progress */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Story Maturity</h3>
              <span className="text-xl font-bold" style={{ color: coherencePercent >= 70 ? '#10b981' : '#f59e0b' }}>
                {coherencePercent}%
              </span>
            </div>
            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                  coherencePercent >= 70 ? 'bg-green-500' : 'bg-amber-500'
                }`}
                style={{ width: `${coherencePercent}%` }}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-teal-600"
                style={{ left: `${targetCoherence}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-500">Draft</span>
              <span className="text-xs font-semibold text-teal-600">
                {targetCoherence}% publishable
              </span>
              <span className="text-xs text-slate-500">100%</span>
            </div>
          </div>

          {/* Gap Analysis */}
          {showGapAnalysis && gaps.length > 0 && (
            <div className="flex-shrink-0 border-b border-slate-200">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                    <span>📊</span> Story Gaps
                  </h3>
                  <button
                    onClick={() => setShowGapAnalysis(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-2">
                  {gaps.map((gap, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-xs ${
                        gap.priority === 'high'
                          ? 'bg-red-50 border-red-200'
                          : gap.priority === 'medium'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <span className="flex-shrink-0 text-sm">
                          {gap.priority === 'high' ? '🔴' : gap.priority === 'medium' ? '🟡' : '🟢'}
                        </span>
                        <p className="text-slate-700 font-medium leading-tight">{gap.description}</p>
                      </div>
                      <div className="ml-6 flex items-center gap-3 text-xs text-slate-500">
                        <span>Impact: <span className="font-semibold text-teal-600">{gap.impact}</span></span>
                        <span>•</span>
                        <span>Credits: <span className="font-semibold text-teal-600">{gap.credits}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Builders */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>👥</span> Active Builders ({activeBuilders.length + 1})
              </h3>
              <div className="space-y-3">
                {activeBuilders.map((builder, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-white text-lg">
                      {builder.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{builder.name}</p>
                      <p className="text-xs text-slate-600 line-clamp-1">{builder.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">{builder.timeAgo}</span>
                        <span className="text-xs text-amber-600 font-semibold">★ {builder.credits}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Current user */}
                <div className="flex items-start gap-3 p-2 rounded-lg bg-teal-50 border border-teal-200">
                  <div className="flex-shrink-0 w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                    You
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">You</p>
                    <p className="text-xs text-slate-600">Viewing story</p>
                    <p className="text-xs text-teal-600 font-semibold mt-1">Ready to contribute?</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER - Story Structure */}
        <div className="w-96 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 p-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <span>🌳</span> Story Structure
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {claims.length} claims • {sources.length} sources
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {story.gist && (
              <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-200">
                <p className="text-xs text-slate-700 leading-relaxed">{story.gist}</p>
              </div>
            )}

            {/* Modality Branches */}
            <div className="space-y-3">
              {Object.entries(threads).map(([modality, modalityClaims]) => {
                const info = getModalityInfo(modality)
                const isExpanded = expandedModalities.has(modality)

                return (
                  <div key={modality} className="border rounded-lg overflow-hidden shadow-sm">
                    <button
                      onClick={() => toggleModality(modality)}
                      className="w-full p-3 flex items-center justify-between transition-colors hover:bg-slate-50"
                      style={{
                        backgroundColor: isExpanded ? `${info.color}10` : 'white',
                        borderBottom: isExpanded ? `2px solid ${info.color}` : 'none'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{info.icon}</span>
                        <span className="text-xs font-semibold text-slate-800">{info.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: info.color }}>
                          {modalityClaims.length}
                        </span>
                        <svg
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="bg-white">
                        {modalityClaims.slice(0, 10).map((claim) => (
                          <div
                            key={claim.id}
                            className="p-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors cursor-pointer"
                            style={{ borderLeft: `3px solid ${info.color}` }}
                            onClick={() => selectEvidence(claim.source.url)}
                          >
                            <p className="text-xs text-slate-700 line-clamp-2 mb-1">{claim.text}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span>{claim.source.domain}</span>
                              {claim.event_time && (
                                <>
                                  <span>•</span>
                                  <span>{formatRelativeTime(claim.event_time)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT - Evidence Discussion */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <div className="flex-shrink-0 p-4 bg-white border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <span>💬</span> Evidence Discussion
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {selectedSourceUrl ? `${selectedSourceClaims.length} claims from this source` : 'Select a source below'}
            </p>
          </div>

          {/* Discussion Content */}
          <div className="flex-[2] overflow-y-auto p-4">
            {selectedSource ? (
              <div className="space-y-4">
                {/* Source Header */}
                <div className="bg-white border-2 border-teal-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="flex gap-4 p-4">
                    <div className="flex-shrink-0 w-24 h-24 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                      {selectedSource.image_url ? (
                        <img
                          src={selectedSource.image_url}
                          alt={selectedSource.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.parentElement!.innerHTML = '<span class="text-3xl">📰</span>'
                          }}
                        />
                      ) : (
                        <span className="text-3xl">📰</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">{selectedSource.title}</h3>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-2">
                        <span className="flex items-center gap-1">
                          <span>🌐</span>
                          {selectedSource.domain}
                        </span>
                        {selectedSource.published_at && (
                          <span className="flex items-center gap-1">
                            <span>📅</span>
                            {formatRelativeTime(selectedSource.published_at)}
                          </span>
                        )}
                        {selectedSource.author && (
                          <span className="flex items-center gap-1">
                            <span>✍️</span>
                            {selectedSource.author}
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-semibold text-teal-600">
                          <span>📊</span>
                          {selectedSourceClaims.length} claims
                        </span>
                      </div>
                      <a
                        href={selectedSource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-teal-600 hover:text-teal-800 inline-flex items-center gap-1"
                      >
                        🔗 View original article →
                      </a>
                    </div>
                  </div>

                  {selectedSourceEntities.length > 0 && (
                    <div className="border-t border-slate-100 bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Mentioned in this article</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSourceEntities.slice(0, 12).map((entity, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              entity.type === 'Person'
                                ? 'bg-blue-100 text-blue-700'
                                : entity.type === 'Organization'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {entity.canonical_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Claims from Source */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Claims Extracted</h4>

                  {selectedSourceClaims.length > 0 ? (
                    selectedSourceClaims.map((claim) => {
                      const info = getModalityInfo(claim.modality)
                      return (
                        <div
                          key={claim.id}
                          className="bg-white rounded-lg p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow"
                          style={{ borderLeftColor: info.color }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span
                              className="px-2 py-1 text-xs font-semibold rounded text-white"
                              style={{ backgroundColor: info.color }}
                            >
                              {info.icon} {info.label}
                            </span>
                            {claim.confidence && (
                              <span className="text-xs text-slate-500">{Math.round(claim.confidence * 100)}%</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-800 leading-relaxed mb-2">{claim.text}</p>
                          {claim.event_time && (
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <span>🕐</span>
                              {formatRelativeTime(claim.event_time)}
                            </p>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center text-slate-400 py-8 bg-white rounded-lg border-2 border-dashed border-slate-200">
                      <div className="text-3xl mb-2">💭</div>
                      <p className="text-sm">No claims extracted from this source yet</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <div className="text-5xl mb-3">💬</div>
                  <p className="text-sm">Click on a claim or select evidence below</p>
                </div>
              </div>
            )}
          </div>

          {/* Evidence Carousel */}
          <div className="flex-shrink-0 h-48 bg-white border-t border-slate-200">
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  📎 Evidence Sources ({sources.length})
                </h3>
                <button
                  onClick={() => setShowAddEvidence(true)}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded transition-colors"
                >
                  + Add
                </button>
              </div>

              <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="flex gap-3 h-full pb-2">
                  {sources.map((source, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectEvidence(source.url)}
                      className={`flex-shrink-0 w-48 text-left rounded-lg border-2 transition-all overflow-hidden ${
                        selectedSourceUrl === source.url
                          ? 'border-teal-500 shadow-lg ring-2 ring-teal-200'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                      }`}
                    >
                      {source.image_url && (
                        <img
                          src={source.image_url}
                          alt={source.title}
                          className="w-full h-20 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                      <div className="p-2">
                        <p className="text-xs font-medium text-slate-800 line-clamp-2 mb-1">{source.title}</p>
                        <p className="text-xs text-slate-500">{source.domain}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Evidence Modal */}
      {showAddEvidence && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Add Evidence to Story</h3>
              <button
                onClick={() => setShowAddEvidence(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Article URL or Analysis</label>
                  <input
                    type="text"
                    value={quickInputValue}
                    onChange={(e) => setQuickInputValue(e.target.value)}
                    placeholder="https://example.com/article or write your analysis..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-teal-900 mb-2">💡 Contribution Impact Preview</p>
                  <ul className="text-xs text-slate-700 space-y-1">
                    <li>• Estimated coherence increase: <span className="font-semibold text-teal-700">+8-15%</span></li>
                    <li>• Estimated credits: <span className="font-semibold text-teal-700">25-40 credits</span></li>
                    <li>• Addresses gap: <span className="font-semibold">Source diversity</span></li>
                  </ul>
                </div>

                <button className="w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors shadow-sm">
                  Submit Evidence
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BuilderPageV2
