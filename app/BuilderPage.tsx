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

const modalityConfig: Record<string, { icon: string; label: string; color: string }> = {
  observation: { icon: '✓', label: 'Observations', color: '#3b82f6' },
  reported_speech: { icon: '📰', label: 'Reported Speech', color: '#8b5cf6' },
  opinion: { icon: '💭', label: 'Opinions & Analysis', color: '#f59e0b' },
  allegation: { icon: '⚠️', label: 'Allegations', color: '#ef4444' },
  // Legacy mappings for backward compatibility
  fact: { icon: '✓', label: 'Observations', color: '#3b82f6' },
  official_fact: { icon: '✓', label: 'Observations', color: '#3b82f6' },
  reported: { icon: '📰', label: 'Reported Speech', color: '#8b5cf6' },
  reported_claim: { icon: '📰', label: 'Reported Speech', color: '#8b5cf6' }
}

function BuilderPage() {
  const { id } = useParams<{ id: string }>()
  const [availableStories, setAvailableStories] = useState<StoryListItem[]>([])
  const [selectedStoryId, setSelectedStoryId] = useState<string>(id || '')
  const [data, setData] = useState<BuilderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSourceUrl, setSelectedSourceUrl] = useState<string | null>(null)
  const [expandedModalities, setExpandedModalities] = useState<Set<string>>(
    new Set(['observation', 'reported_speech', 'opinion', 'allegation', 'fact', 'official_fact', 'reported', 'reported_claim'])
  )
  const [showAddEvidence, setShowAddEvidence] = useState(false)
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<'url' | 'text' | 'file'>('url')

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
    if (coherence < 0.4) return { icon: '🌱', label: 'Emerging', color: 'bg-green-500/20 text-green-300' }
    if (coherence < 0.7) return { icon: '🌿', label: 'Growing', color: 'bg-teal-500/20 text-teal-300' }
    return { icon: '🌳', label: 'Mature', color: 'bg-blue-500/20 text-blue-300' }
  }

  const formatRelativeTime = (timestamp?: string): string => {
    if (!timestamp) return 'Recently'

    try {
      const then = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - then.getTime()
      const diffSecs = Math.floor(diffMs / 1000)
      const diffMins = Math.floor(diffSecs / 60)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffDays > 30) return `${Math.floor(diffDays / 30)}mo ago`
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

  // Select evidence - this is the key interaction that drives the discussion view
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
  const targetTranche = Math.min(100, Math.ceil((coherencePercent + 10) / 20) * 20)

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="flex-shrink-0 bg-gradient-to-r from-[#008080] to-[#1a2f3a] text-white shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
              >
                <span className="bg-white text-[#008080] font-bold px-2 py-1 rounded text-sm">HERE</span>
                <span className="text-sm font-medium opacity-90">Builder</span>
              </Link>

              <div className="h-6 w-px bg-white/30" />

              {/* Story Selector */}
              <select
                value={selectedStoryId}
                onChange={(e) => setSelectedStoryId(e.target.value)}
                className="bg-white text-slate-900 px-3 py-2 rounded-lg text-sm font-medium min-w-[300px] max-w-[500px]"
              >
                {availableStories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.topic || s.gist || s.id} ({Math.round((s.coherence || 0) * 100)}%)
                  </option>
                ))}
              </select>

              {/* Status Badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.icon} {statusInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Coherence Bar */}
              <div className="text-right">
                <div className="w-48 bg-white/30 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full transition-all duration-500"
                    style={{ width: `${coherencePercent}%` }}
                  />
                </div>
                <span className="text-xs opacity-90 mt-1 inline-block">
                  {coherencePercent}% → {targetTranche}% (Next tranche)
                </span>
              </div>

              <Link
                to={`/story/${selectedStoryId}`}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
              >
                Reader View →
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 2-Pane Layout: LEFT (Structure + Revisions) | RIGHT (Discussion + Evidence) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE - Story Structure + Revision History */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
          {/* Structure Area (top 2/3) */}
          <div className="flex-[2] flex flex-col overflow-hidden border-b border-slate-200">
            <div className="flex-shrink-0 p-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <span>🌳</span> Story Structure
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {claims.length} claims • {Object.keys(threads).length} modalities
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Story Gist */}
              {story.gist && (
                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-slate-700 leading-relaxed">{story.gist}</p>
                </div>
              )}

              {/* Horizontal Modality Branches */}
              <div className="space-y-3">
                {Object.entries(threads).map(([modality, modalityClaims]) => {
                  const info = getModalityInfo(modality)
                  const isExpanded = expandedModalities.has(modality)

                  return (
                    <div key={modality} className="border rounded-lg overflow-hidden">
                      {/* Modality Header */}
                      <button
                        onClick={() => toggleModality(modality)}
                        className="w-full p-3 flex items-center justify-between transition-colors"
                        style={{
                          backgroundColor: `${info.color}15`,
                          borderBottom: isExpanded ? `2px solid ${info.color}` : 'none'
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{info.icon}</span>
                          <span className="text-xs font-semibold text-slate-800">{info.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{ color: info.color }}>
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

                      {/* Claim List */}
                      {isExpanded && (
                        <div className="bg-white">
                          {modalityClaims.slice(0, 12).map((claim) => (
                            <div
                              key={claim.id}
                              className="p-2 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                              style={{
                                borderLeft: `3px solid ${info.color}`
                              }}
                            >
                              <p className="text-xs text-slate-700 line-clamp-3 mb-1">{claim.text}</p>
                              <p className="text-xs text-slate-400">{claim.source.domain}</p>
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

          {/* Revision History Area (bottom 1/3) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            <div className="flex-shrink-0 p-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <span>📜</span> Story Revisions
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Uncommitted Changes */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-amber-800">⚠️ Uncommitted Changes</span>
                  <span className="text-xs font-bold text-amber-600">0</span>
                </div>
                <button
                  disabled
                  className="w-full mt-2 px-3 py-2 bg-teal-600 text-white text-xs font-semibold rounded opacity-50 cursor-not-allowed"
                >
                  Vote to Commit
                </button>
              </div>

              {/* Revision Timeline */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Timeline</p>

                <div className="space-y-2">
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs flex-shrink-0">
                      ✨
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">v0.3 (Current Draft)</p>
                      <p className="text-xs text-slate-500">
                        {claims.length} claims • {sources.length} sources •{' '}
                        {formatRelativeTime(story.updated_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANE - Discussion + Evidence Carousel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Discussion Area (top 2/3) */}
          <div className="flex-[2] flex flex-col overflow-hidden border-b border-slate-200">
            <div className="flex-shrink-0 p-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <span>💬</span> Discussion
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {selectedSourceUrl
                  ? `${selectedSourceClaims.length} claims extracted`
                  : 'Select evidence to view'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {selectedSource ? (
                <div className="space-y-4">
                  {/* Evidence Header with Source Metadata */}
                  <div className="bg-white border-2 border-teal-200 rounded-xl overflow-hidden">
                    <div className="flex gap-4 p-4">
                      {/* Thumbnail */}
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

                      {/* Metadata */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                          {selectedSource.title}
                        </h3>
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

                    {/* Page Entities */}
                    {selectedSourceEntities.length > 0 && (
                      <div className="border-t border-slate-100 bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-600 mb-2">
                          Mentioned in this article
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedSourceEntities.slice(0, 12).map((entity, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-1 rounded-full text-xs ${
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

                  {/* Claims from this Source */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Claims Extracted
                    </h4>

                    {selectedSourceClaims.length > 0 ? (
                      selectedSourceClaims.map((claim) => {
                        const info = getModalityInfo(claim.modality)
                        return (
                          <div
                            key={claim.id}
                            className="bg-slate-50 rounded-lg p-3 border-l-4"
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
                                <span className="text-xs text-slate-500">
                                  {Math.round(claim.confidence * 100)}%
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-800 leading-relaxed">{claim.text}</p>
                            {claim.event_time && (
                              <p className="text-xs text-slate-400 mt-2">
                                🕐 {formatRelativeTime(claim.event_time)}
                              </p>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center text-slate-400 py-8">
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
                    <p className="text-sm">Select evidence from the carousel below</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Evidence Carousel (bottom 1/3) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            <div className="flex-shrink-0 p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <span>📎</span> Evidence ({sources.length})
              </h2>
              <button
                onClick={() => setShowAddEvidence(true)}
                className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded transition-colors"
              >
                + Add
              </button>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
              <div className="flex gap-3 h-full" style={{ minWidth: 'min-content' }}>
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
                        className="w-full h-24 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                    <div className="p-3">
                      <p className="text-xs font-medium text-slate-800 line-clamp-2 mb-1">
                        {source.title}
                      </p>
                      <p className="text-xs text-slate-500">{source.domain}</p>
                      {source.published_at && (
                        <p className="text-xs text-slate-400 mt-1">
                          {formatRelativeTime(source.published_at)}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Evidence Modal */}
      {showAddEvidence && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl m-4">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Add Evidence</h3>
              <button
                onClick={() => setShowAddEvidence(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-slate-200">
                {(['url', 'text', 'file'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveEvidenceTab(tab)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeEvidenceTab === tab
                        ? 'border-teal-600 text-teal-600'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'url' ? '🌐 URL' : tab === 'text' ? '📝 Text' : '📄 File'}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeEvidenceTab === 'url' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Article URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/article"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Enter a URL to a news article, blog post, or document
                    </p>
                  </div>
                  <button className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors">
                    Extract & Add Claims
                  </button>
                </div>
              )}

              {activeEvidenceTab === 'text' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Article Text
                    </label>
                    <textarea
                      rows={8}
                      placeholder="Paste article content or write claims manually..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Source URL (optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <button className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors">
                    Extract & Add Claims
                  </button>
                </div>
              )}

              {activeEvidenceTab === 'file' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-teal-500 transition-colors cursor-pointer">
                    <div className="text-4xl mb-2">📄</div>
                    <p className="text-sm text-slate-600 mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-400">PDF, DOC, TXT, or images (max 10MB)</p>
                  </div>
                  <button
                    disabled
                    className="w-full px-4 py-2 bg-slate-300 text-slate-500 font-semibold rounded-lg cursor-not-allowed"
                  >
                    Upload & Extract Claims
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BuilderPage
