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

const modalityConfig: Record<string, { icon: string; label: string; color: string }> = {
  observation: { icon: '✓', label: 'Observations', color: '#3b82f6' },
  reported_speech: { icon: '📰', label: 'Reported Speech', color: '#8b5cf6' },
  opinion: { icon: '💭', label: 'Opinions', color: '#f59e0b' },
  allegation: { icon: '⚠️', label: 'Allegations', color: '#ef4444' },
  fact: { icon: '✓', label: 'Observations', color: '#3b82f6' },
  official_fact: { icon: '✓', label: 'Observations', color: '#3b82f6' },
  reported: { icon: '📰', label: 'Reported Speech', color: '#8b5cf6' },
  reported_claim: { icon: '📰', label: 'Reported Speech', color: '#8b5cf6' }
}

function BuilderPageV3() {
  const { id } = useParams<{ id: string }>()
  const [availableStories, setAvailableStories] = useState<StoryListItem[]>([])
  const [selectedStoryId, setSelectedStoryId] = useState<string>(id || '')
  const [data, setData] = useState<BuilderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSourceUrl, setSelectedSourceUrl] = useState<string | null>(null)
  const [expandedModalities, setExpandedModalities] = useState<Set<string>>(new Set())
  const [quickInputValue, setQuickInputValue] = useState('')

  // Mock active builders
  const [activeBuilders] = useState<ActiveBuilder[]>([
    { name: 'Marcus K.', action: 'Root cause analysis', timeAgo: '2m', credits: 172, avatar: '👨‍💻' },
    { name: 'Sarah P.', action: 'Official statement', timeAgo: '15m', credits: 50, avatar: '👩‍💼' },
    { name: 'Yuki T.', action: 'Technical context', timeAgo: '1h', credits: 59, avatar: '👩‍🔬' }
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
      const response = await fetch('/storychat/api/builder/stories')
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
      const response = await fetch(`/storychat/api/builder/story/${storyId}`)

      if (!response.ok) {
        throw new Error(`Failed to load story: ${response.statusText}`)
      }

      const builderData = await response.json()
      setData(builderData)

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
      if (diffDays > 0) return `${diffDays}d`
      if (diffHours > 0) return `${diffHours}h`
      if (diffMins > 0) return `${diffMins}m`
      return 'now'
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

  const selectedSource = data?.sources.find((s) => s.url === selectedSourceUrl)
  const selectedSourceClaims = data?.claims.filter((c) => c.source.url === selectedSourceUrl) || []
  const selectedSourceEntities = selectedSourceUrl ? getPageEntities(selectedSourceUrl) : []

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

  const { story, claims, sources, threads } = data
  const coherencePercent = Math.round((story.coherence_score || 0) * 100)
  const statusInfo = getStatusInfo(story.coherence_score || 0)
  const targetCoherence = 70
  const gapCount = coherencePercent < targetCoherence ? Math.ceil((targetCoherence - coherencePercent) / 10) : 0

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Compact Header with Coherence + Gaps Inline */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-3">
          {/* Top Row: Branding + Story Selector + Status */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <span className="bg-teal-600 text-white font-bold px-2 py-1 rounded text-sm">HERE</span>
                <span className="text-sm font-semibold text-slate-700">Builder</span>
              </Link>

              <div className="h-5 w-px bg-slate-300" />

              <select
                value={selectedStoryId}
                onChange={(e) => setSelectedStoryId(e.target.value)}
                className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300"
              >
                {availableStories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.topic || s.gist || s.id}
                  </option>
                ))}
              </select>

              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                {statusInfo.icon} {statusInfo.label}
              </span>
            </div>

            <Link
              to={`/story/${selectedStoryId}`}
              className="px-4 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Reader View →
            </Link>
          </div>

          {/* Coherence Bar with Inline Gaps */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-700">Coherence</span>
                  <span className="text-sm font-bold text-slate-900">{coherencePercent}%</span>
                </div>
                <div className="relative h-2 bg-white rounded-full overflow-hidden border border-slate-200">
                  <div
                    className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                      coherencePercent >= targetCoherence ? 'bg-green-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${coherencePercent}%` }}
                  />
                  <div
                    className="absolute top-0 h-full w-0.5 bg-teal-600"
                    style={{ left: `${targetCoherence}%` }}
                  />
                </div>
              </div>

              <div className="text-xs text-slate-600 pl-4 border-l border-slate-300">
                <span className="font-semibold">→ {targetCoherence}% Target</span>
                {gapCount > 0 && (
                  <div className="mt-0.5 text-slate-500">
                    Missing: +{gapCount} perspectives, +{Math.max(2, 5 - sources.length)} sources
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout: LEFT (Evidence) + RIGHT (Collaboration) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT MAIN AREA - Evidence First */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Evidence Carousel - Always at Top */}
          <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span>📎</span> Evidence Sources ({sources.length})
                </h3>
              </div>

              <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4">
                <div className="flex gap-3 pb-2">
                  {sources.map((source, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectEvidence(source.url)}
                      className={`flex-shrink-0 w-56 text-left rounded-lg border-2 transition-all overflow-hidden ${
                        selectedSourceUrl === source.url
                          ? 'border-teal-500 shadow-lg ring-2 ring-teal-200'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                      }`}
                    >
                      {source.image_url && (
                        <img
                          src={source.image_url}
                          alt={source.title}
                          className="w-full h-24 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                      <div className="p-3">
                        <p className="text-xs font-medium text-slate-800 line-clamp-2 mb-1">{source.title}</p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{source.domain}</span>
                          {source.published_at && (
                            <span className="text-slate-400">{formatRelativeTime(source.published_at)}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Discussion Area - Main Focus */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedSource ? (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Source Header */}
                <div className="bg-white border-2 border-teal-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="flex gap-4 p-5">
                    <div className="flex-shrink-0 w-20 h-20 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
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
                      <h3 className="font-semibold text-slate-900 mb-2">{selectedSource.title}</h3>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <span>🌐</span> {selectedSource.domain}
                        </span>
                        {selectedSource.published_at && (
                          <span className="flex items-center gap-1">
                            <span>📅</span> {formatRelativeTime(selectedSource.published_at)} ago
                          </span>
                        )}
                        {selectedSource.author && (
                          <span className="flex items-center gap-1">
                            <span>✍️</span> {selectedSource.author}
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-semibold text-teal-600">
                          <span>📊</span> {selectedSourceClaims.length} claims
                        </span>
                      </div>
                      <a
                        href={selectedSource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-teal-600 hover:text-teal-800 inline-flex items-center gap-1 mt-2"
                      >
                        🔗 View original →
                      </a>
                    </div>
                  </div>

                  {selectedSourceEntities.length > 0 && (
                    <div className="border-t border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Entities mentioned</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSourceEntities.slice(0, 10).map((entity, idx) => (
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

                {/* Claims */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <span>💬</span> Claims Extracted ({selectedSourceClaims.length})
                  </h4>

                  {selectedSourceClaims.length > 0 ? (
                    <div className="space-y-3">
                      {selectedSourceClaims.map((claim) => {
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
                            <p className="text-sm text-slate-800 leading-relaxed">{claim.text}</p>
                            {claim.event_time && (
                              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                <span>🕐</span> {formatRelativeTime(claim.event_time)} ago
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                      <div className="text-4xl mb-2">💭</div>
                      <p className="text-sm">No claims extracted yet</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <div className="text-6xl mb-4">📎</div>
                  <p className="text-lg font-medium text-slate-600 mb-2">Select Evidence to Review</p>
                  <p className="text-sm text-slate-500">Click on a source card above to see claims</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR - Collaboration */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
          {/* Building Together Section */}
          <div className="flex-shrink-0 border-b border-slate-200">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <span>👥</span> Building Together ({activeBuilders.length + 1})
              </h3>

              <div className="space-y-2 mb-4">
                {activeBuilders.map((builder, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-sm">
                      {builder.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-slate-800">{builder.name}</span>
                        <span className="text-xs text-slate-400">• {builder.timeAgo}</span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-1">{builder.action}</p>
                    </div>
                    <span className="text-xs font-semibold text-amber-600">★{builder.credits}</span>
                  </div>
                ))}
              </div>

              {/* Your Card with Input */}
              <div className="bg-teal-50 border-2 border-teal-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    You
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">You</p>
                    <p className="text-xs text-slate-600">Ready to contribute</p>
                  </div>
                </div>

                <textarea
                  value={quickInputValue}
                  onChange={(e) => setQuickInputValue(e.target.value)}
                  placeholder="Add URL or write analysis..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                />

                <button className="w-full mt-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors">
                  Add Evidence
                </button>

                <p className="mt-2 text-xs text-slate-600">
                  Impact: <span className="font-semibold text-teal-700">+8-15%</span> • Credits:{' '}
                  <span className="font-semibold text-teal-700">25-40</span>
                </p>
              </div>
            </div>
          </div>

          {/* Story Structure - Collapsed */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span>🌳</span> Story Structure
                </h3>
                <button
                  onClick={() => {
                    const allModalities = Object.keys(threads)
                    if (expandedModalities.size === allModalities.length) {
                      setExpandedModalities(new Set())
                    } else {
                      setExpandedModalities(new Set(allModalities))
                    }
                  }}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  {expandedModalities.size === Object.keys(threads).length ? 'Collapse All' : 'Expand All'}
                </button>
              </div>

              <div className="space-y-2">
                {Object.entries(threads).map(([modality, modalityClaims]) => {
                  const info = getModalityInfo(modality)
                  const isExpanded = expandedModalities.has(modality)

                  return (
                    <div key={modality} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleModality(modality)}
                        className="w-full p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{info.icon}</span>
                          <span className="text-xs font-semibold text-slate-700">{info.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{ color: info.color }}>
                            {modalityClaims.length}
                          </span>
                          <svg
                            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50">
                          {modalityClaims.slice(0, 5).map((claim) => (
                            <button
                              key={claim.id}
                              onClick={() => selectEvidence(claim.source.url)}
                              className="w-full text-left p-2 border-b border-slate-100 last:border-b-0 hover:bg-white transition-colors"
                            >
                              <p className="text-xs text-slate-700 line-clamp-2 mb-1">{claim.text}</p>
                              <p className="text-xs text-slate-400">{claim.source.domain}</p>
                            </button>
                          ))}
                          {modalityClaims.length > 5 && (
                            <div className="p-2 text-center text-xs text-slate-500">
                              +{modalityClaims.length - 5} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BuilderPageV3
