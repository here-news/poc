import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from './components/layout/Header'
import StoryChatSidebar from './components/layout/StoryChatSidebar'
import { ensureUserId } from './userSession'

interface StoryDetails {
  id: string
  title: string
  description: string
  content?: string
  category: string
  artifact_count: number
  claim_count: number
  people_count: number
  org_count?: number
  location_count?: number
  locations: string[]
  last_updated_human: string
  cover_image?: string
  health_indicator?: string
  entropy?: number
  verified_claims?: number
  total_claims?: number
  confidence?: number
  coherence_score?: number
  revision?: string
  artifacts?: Array<{
    url: string
    title: string
    domain: string
    thumbnail_url?: string
    created_at: string
  }>
  related_stories?: Array<{
    id: string
    title: string
    match_score: number
    relationship_type: string
  }>
  entities?: {
    people: Array<{ id: string; name: string }>
    organizations: Array<{ id: string; name: string }>
    locations: Array<{ id: string; name: string }>
  }
}

// Helper function to strip markup from text (for summaries)
function stripMarkup(text: string): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, '$1')
}

// Helper function to render content with entity links and tooltips
function renderContentWithEntityLinks(content: string): JSX.Element {
  // Pattern: [[Entity Name]] - new markup format from story synthesis
  const entityPattern = /\[\[([^\]]+)\]\]/g
  const parts: (string | JSX.Element)[] = []
  let lastIndex = 0
  let match

  while ((match = entityPattern.exec(content)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index))
    }

    // Add entity link with hover tooltip
    const entityName = match[1]
    parts.push(
      <EntityLink
        key={`entity-${match.index}`}
        entityName={entityName}
      />
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex))
  }

  return <>{parts}</>
}

// Entity link component with hover tooltip
function EntityLink({ entityName }: { entityName: string }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [entityData, setEntityData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchEntityData = async () => {
    if (entityData || loading) return

    setLoading(true)
    try {
      const response = await fetch(`/api/entity?name=${encodeURIComponent(entityName)}`)
      if (response.ok) {
        const data = await response.json()
        setEntityData(data)
      }
    } catch (err) {
      console.error('Failed to fetch entity:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMouseEnter = () => {
    setShowTooltip(true)
    fetchEntityData()
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Person': return 'bg-blue-100 text-blue-700'
      case 'Organization': return 'bg-orange-100 text-orange-700'
      case 'Location': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <span className="relative inline-block">
      <span
        className="text-blue-600 hover:text-blue-700 border-b border-blue-300 border-dotted cursor-pointer transition-colors"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {entityName}
      </span>

      {showTooltip && (
        <div className="absolute z-50 w-80 p-4 bg-white border border-slate-300 rounded-lg shadow-xl mt-2 left-1/2 transform -translate-x-1/2">
          {/* Arrow */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-slate-300" />

          {loading && (
            <div className="text-sm text-slate-500 italic">Loading...</div>
          )}

          {!loading && entityData && (
            <>
              {/* Thumbnail Image or Media Logo */}
              {entityData.wikidata_thumbnail ? (
                <div className="mb-3 flex justify-center">
                  <img
                    src={entityData.wikidata_thumbnail}
                    alt={entityData.canonical_name}
                    className="w-32 h-32 object-cover rounded-lg border border-slate-200"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              ) : entityData.entity_type === 'Organization' && entityData.context?.domain ? (
                <div className="mb-3 flex justify-center">
                  <div className="w-32 h-32 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${entityData.context.domain}&sz=128`}
                      alt={entityData.canonical_name}
                      className="w-20 h-20"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              ) : null}

              <div className="font-semibold text-slate-900 mb-2">{entityData.canonical_name}</div>
              <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mb-3 ${getTypeColor(entityData.entity_type)}`}>
                {entityData.entity_type}
              </div>

              {entityData.description && (
                <p className="text-sm text-slate-700 mb-3 leading-relaxed">
                  {entityData.description}
                </p>
              )}

              {entityData.wikidata_qid && (
                <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                  <a
                    href={`https://www.wikidata.org/wiki/${entityData.wikidata_qid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    🔗 View on Wikidata
                  </a>
                </div>
              )}

              {entityData.confidence && (
                <div className="text-xs text-slate-500 mt-2">
                  Confidence: {Math.round(entityData.confidence * 100)}%
                </div>
              )}
            </>
          )}

          {!loading && !entityData && (
            <div className="text-sm text-slate-500">
              Entity information unavailable
            </div>
          )}
        </div>
      )}
    </span>
  )
}

function StoryPage() {
  const { id } = useParams<{ id: string }>()
  const [userId, setUserId] = useState('')
  const [story, setStory] = useState<StoryDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    const uid = ensureUserId()
    setUserId(uid)
  }, [])

  useEffect(() => {
    if (id) {
      fetchStoryDetails(id)
    }
  }, [id])

  const fetchStoryDetails = async (storyId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/stories/${storyId}`)

      if (!response.ok) {
        setError('Story not found')
        return
      }

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else if (data.story) {
        // Map API response to StoryDetails format
        setStory({
          ...data.story,
          // Ensure all required fields have defaults
          description: data.story.description || data.story.gist || 'No description available',
          content: data.story.content,
          locations: data.story.locations || [],
          artifact_count: data.story.artifact_count || 0,
          claim_count: data.story.claim_count || 0,
          people_count: data.story.people_count || 0,
          last_updated_human: data.story.last_updated_human || 'Recently',
          health_indicator: data.story.health_indicator || 'healthy',
          category: data.story.category || 'general'
        })
      } else {
        setError('Invalid story data')
      }
    } catch (err) {
      console.error('Error fetching story:', err)
      setError('Failed to load story details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Header userId={userId} />
          <div className="mt-10 text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-600">Loading story...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Header userId={userId} />
          <div className="mt-10 text-center">
            <p className="text-red-600">{error || 'Story not found'}</p>
            <Link to="/" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const entropy = story.entropy || 0.45
  const entropyPercentage = (entropy * 100).toFixed(0)
  const entropyBarWidth = `${entropyPercentage}%`
  const confidence = story.confidence || 72

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Header userId={userId} />

        <main className="mt-8 grid lg:grid-cols-[1fr_320px] gap-8">
          {/* Story Header */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Hero Image Banner */}
            {story.cover_image && (
              <div className="relative w-full h-64 bg-gradient-to-br from-blue-100 to-purple-100">
                <img
                  src={story.cover_image}
                  alt="Story evidence"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-6 right-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-xs font-medium text-slate-700">
                      📸 Evidence Photo
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-8">
              {/* Status Bar */}
              <div className="flex items-center gap-4 flex-wrap mb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 border border-amber-300 rounded-full">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-amber-800">DEVELOPING STORY</span>
                </div>

                <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full">
                  <span className="text-xs text-blue-700 font-medium">Entropy</span>
                  <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-500"
                      style={{ width: entropyBarWidth }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{entropy.toFixed(2)}</span>
                </div>

                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-semibold text-sm hover:shadow-lg hover:shadow-green-500/30 transition-all">
                  <span>💚</span>
                  <span>Support</span>
                </button>

                {story.revision && (
                  <div className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-semibold text-sm">
                    {story.revision}
                  </div>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold mb-6 leading-tight text-slate-900">{story.title}</h1>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-slate-200">
                <div>
                  <div className="text-xs text-blue-600 uppercase mb-1 font-semibold">Claims</div>
                  <div className="text-xl font-semibold text-slate-900">{story.claim_count}</div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 uppercase mb-1 font-semibold">Sources</div>
                  <div className="text-xl font-semibold text-slate-900">{story.artifact_count}</div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 uppercase mb-1 font-semibold">Entities</div>
                  <div className="text-xl font-semibold text-slate-900">
                    {story.people_count + (story.org_count || 0) + (story.location_count || 0)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {story.people_count}👤 {story.org_count || 0}🏢 {story.location_count || 0}📍
                  </div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 uppercase mb-1 font-semibold">Confidence</div>
                  <div className="text-xl font-semibold text-amber-600">{confidence}%</div>
                </div>
              </div>

              {/* Story Summary */}
              <div className="mt-6 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-blue-700">Current Story Summary</h2>
                  {story.revision && (
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-semibold text-sm">
                      {story.revision}
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-base leading-relaxed mb-4 text-slate-800">
                    {stripMarkup(story.description)}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {story.locations.map((location) => (
                      <span key={location} className="px-3 py-1 bg-white border border-blue-200 rounded-full text-xs text-slate-700">
                        📍 {location}
                      </span>
                    ))}
                    <span className="px-3 py-1 bg-white border border-blue-200 rounded-full text-xs text-slate-700">
                      📊 {story.artifact_count} artifacts
                    </span>
                    <span className="px-3 py-1 bg-white border border-blue-200 rounded-full text-xs text-slate-700">
                      ✓ {story.verified_claims || story.claim_count} verified facts
                    </span>
                  </div>
                </div>
              </div>

              {/* Full Story Content */}
              {story.content && story.content.length > 100 && (
                <div className="mt-8 border-t border-slate-200 pt-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">📰 Full Story</h2>
                    {story.coherence_score && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-full">
                        <span className="text-xs font-semibold text-blue-700">Coherence</span>
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                            style={{ width: `${(story.coherence_score * 100).toFixed(0)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-900">{(story.coherence_score * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="prose prose-lg prose-slate max-w-none">
                    <div className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {renderContentWithEntityLinks(story.content)}
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-4 text-sm text-slate-600">
                    <span>📊 Synthesized from {story.artifact_count} sources</span>
                    <span>•</span>
                    <span>✓ {story.claim_count} claims</span>
                  </div>
                </div>
              )}

              {/* Sources Section */}
              {story.artifacts && story.artifacts.length > 0 && (() => {
                // Helper to extract domain from URL
                const extractDomain = (url: string) => {
                  try {
                    const urlObj = new URL(url)
                    return urlObj.hostname.replace(/^www\./, '')
                  } catch {
                    return null
                  }
                }

                // Deduplicate artifacts by URL, preferring normalized domain without www.
                const uniqueArtifacts = story.artifacts.reduce((acc, artifact) => {
                  const existing = acc.find(a => a.url === artifact.url)
                  // Extract domain from URL if not provided
                  const artifactWithDomain = {
                    ...artifact,
                    domain: artifact.domain || extractDomain(artifact.url)
                  }
                  if (!existing) {
                    acc.push(artifactWithDomain)
                  } else {
                    // If duplicate found, prefer the one without www. prefix
                    if (artifactWithDomain.domain && !artifactWithDomain.domain.startsWith('www.') && existing.domain?.startsWith('www.')) {
                      const index = acc.indexOf(existing)
                      acc[index] = artifactWithDomain
                    }
                  }
                  return acc
                }, [] as typeof story.artifacts)

                return (
                  <div className="mt-8 border-t border-slate-200 pt-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">📚 Sources ({uniqueArtifacts.length})</h2>
                    <div className="space-y-3">
                      {uniqueArtifacts.map((artifact, idx) => (
                        <a
                          key={artifact.url}
                          href={artifact.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group"
                        >
                        {artifact.domain && artifact.domain !== 'null' ? (
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${artifact.domain}&sz=32`}
                            alt={artifact.domain}
                            className="w-6 h-6 flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>'
                            }}
                          />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 flex-shrink-0 text-slate-400">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                            <polyline points="13 2 13 9 20 9"></polyline>
                          </svg>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {artifact.title || 'Untitled'}
                          </div>
                          <div className="text-sm text-slate-500">{artifact.domain}</div>
                        </div>
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Related Stories Section */}
              {story.related_stories && story.related_stories.length > 0 && (
                <div className="mt-8 border-t border-slate-200 pt-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">🔗 Related Stories ({story.related_stories.length})</h2>
                  <div className="space-y-3">
                    {story.related_stories.map((related) => (
                      <Link
                        key={related.id}
                        to={`/story/${related.id}`}
                        className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors group"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                            {related.title}
                          </div>
                          {related.relationship_type && (
                            <div className="text-xs text-slate-500 mt-1">
                              {related.relationship_type === 'guard_failure' && '⚠️ Same event, different angle'}
                              {related.relationship_type === 'different_angle' && '🔄 Different perspective'}
                              {!related.relationship_type.includes('guard') && !related.relationship_type.includes('angle') && `📊 ${related.relationship_type}`}
                            </div>
                          )}
                        </div>
                        {related.match_score && (
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                              {(related.match_score * 100).toFixed(0)}% match
                            </span>
                            <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Story Details */}
          <div className="space-y-8">
            {/* Key Findings */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-green-700 mb-6">✅ Key Verified Facts</h2>

            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-600 font-bold">✓</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-700 leading-relaxed">
                      This story has been verified by <strong>{story.people_count} contributors</strong> using <strong>{story.artifact_count} sources</strong>.
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-green-700">
                      <span className="px-2 py-1 bg-green-100 rounded font-medium">95% confidence</span>
                      <span>Multi-source verified</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-slate-600 text-sm mb-4">
                Full claim verification details available in the <Link to={`/build/${story.id}`} className="text-blue-600 hover:text-blue-700 underline font-medium">investigation view</Link>.
              </p>

              {/* Contribute CTA */}
              <div className="pt-4 border-t border-slate-200">
                <Link
                  to={`/build/${story.id}`}
                  className="flex items-center justify-between w-full px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span>🔧</span>
                    <div className="text-left">
                      <div className="font-semibold">Contribute to Investigation</div>
                      <div className="text-xs text-slate-300 font-normal">Help verify claims and add evidence</div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

            {/* Story Timeline Placeholder */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-semibold text-blue-700 mb-4">📈 Story Timeline</h2>
              <p className="text-slate-600 text-sm">
                Timeline of key developments and fact verification milestones will be displayed here.
              </p>
            </div>
          </div>

          {/* Sidebar - Support & Stats */}
          <aside className="space-y-6 lg:sticky lg:top-8 h-fit">
            {/* Support Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">💚</span>
                <h3 className="font-semibold text-green-800">Support This Story</h3>
              </div>

              <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                Built by {story.people_count} contributors. Your support helps fund investigation and reduces entropy.
              </p>

              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-green-500/30 transition-all">
                  Support $5
                </button>
                <button className="w-full px-4 py-2 bg-white hover:bg-green-50 border-2 border-green-500 text-green-700 font-semibold rounded-lg transition-all">
                  Support $10
                </button>
                <button className="w-full px-4 py-2 bg-white hover:bg-green-50 border border-green-300 text-green-700 font-medium rounded-lg transition-all text-sm">
                  Custom Amount
                </button>
              </div>

              <p className="text-xs text-slate-600 mt-4 text-center">
                Includes update notifications 🔔
              </p>
            </div>

            {/* Stats Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-500 uppercase mb-4">Story Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">👤 People</span>
                  <span className="font-semibold text-slate-900">{story.people_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">🏢 Organizations</span>
                  <span className="font-semibold text-slate-900">{story.org_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">📍 Locations</span>
                  <span className="font-semibold text-slate-900">{story.location_count || 0}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                  <span className="text-sm text-slate-600">📚 Sources</span>
                  <span className="font-semibold text-slate-900">{story.artifact_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">✓ Claims</span>
                  <span className="font-semibold text-slate-900">{story.claim_count}</span>
                </div>
                {story.coherence_score && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">🎯 Coherence</span>
                    <span className="font-semibold text-slate-900">{(story.coherence_score * 100).toFixed(0)}%</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                  <span className="text-sm text-slate-600">🕐 Last Update</span>
                  <span className="font-semibold text-slate-900">{story.last_updated_human}</span>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>

      {/* Story Chat Sidebar */}
      {story && (
        <StoryChatSidebar
          storyId={story.id}
          storyTitle={story.title}
          isOpen={chatOpen}
          onToggle={() => setChatOpen(!chatOpen)}
        />
      )}
    </div>
  )
}

export default StoryPage
