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
  const [orgsExpanded, setOrgsExpanded] = useState(false)

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
        const storyData = {
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
        }

        setStory(storyData)
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

        <main className="mt-8 grid lg:grid-cols-[1fr_360px] gap-8">
          {/* Main Story Content */}
          <div className="space-y-6">
            {/* Title & Summary - Merged */}
            <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 border-2 border-blue-200 rounded-2xl overflow-hidden shadow-md">
              <div className="p-10">
                {/* Category & Meta Info */}
                <div className="flex items-center justify-between mb-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/80 text-blue-700 border border-blue-200 shadow-sm">
                    {story.category || 'Story'}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span>📅</span>
                      <span className="font-medium">{story.last_updated_human}</span>
                    </span>
                    <span>•</span>
                    <span>{story.artifact_count} sources</span>
                    <span>•</span>
                    <span>{story.claim_count} claims</span>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-5xl font-bold mb-8 leading-tight text-slate-900 tracking-tight">{story.title}</h1>

                {/* Summary with Quote Styling */}
                <div className="relative">
                  <div className="absolute -left-4 top-0 text-7xl text-blue-200 font-serif leading-none select-none">"</div>
                  <p className="relative text-xl leading-relaxed text-slate-800 font-medium pl-8">
                    {stripMarkup(story.description)}
                  </p>
                </div>
              </div>
            </div>

            {/* Full Story Content */}
            {story.content && story.content.length > 100 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-10">
                  {/* Story Body with Enhanced Typography */}
                  <div className="prose prose-xl prose-slate max-w-none">
                    <div className="text-slate-800 leading-[1.9] text-[18px] whitespace-pre-line">
                      {/* Drop cap for first letter - using brand teal color */}
                      <style>{`
                        .story-content::first-letter {
                          font-size: 3.5em;
                          line-height: 0.9;
                          float: left;
                          margin: 0.1em 0.1em 0 0;
                          font-weight: bold;
                          color: #008080;
                        }
                      `}</style>
                      <div className="story-content">
                        {renderContentWithEntityLinks(story.content)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Related Stories Section */}
            {story.related_stories && story.related_stories.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Related Stories</h2>
                  <div className="space-y-2">
                    {story.related_stories.map((related) => (
                      <Link
                        key={related.id}
                        to={`/story/${related.id}`}
                        className="flex items-center justify-between p-4 bg-slate-50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border border-slate-200 hover:border-blue-300 rounded-lg transition-all duration-200 group"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                            {related.title}
                          </div>
                          {related.match_score && (
                            <div className="text-xs text-slate-500 mt-1">
                              {Math.round(related.match_score * 100)}% match
                            </div>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-8 h-fit">
            {/* People in Story */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs">👤</span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">People</h3>
              </div>
              {story.entities?.people && story.entities.people.length > 0 ? (
                <div className="space-y-2">
                  {story.entities.people.map((person: any, idx: number) => {
                    const isTopThree = idx < 3
                    const photoSize = isTopThree ? 'w-16 h-16' : 'w-10 h-10'
                    const iconSize = isTopThree ? 'text-2xl' : 'text-base'

                    return (
                      <Link
                        key={person.id}
                        to={`/people/${person.id}/${person.name.toLowerCase().replace(/\s+/g, '-')}`}
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group"
                      >
                        {person.thumbnail ? (
                          <img
                            src={person.thumbnail}
                            alt={person.name}
                            className={`${photoSize} rounded-full object-cover flex-shrink-0 border border-slate-200`}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <div className={`${photoSize} rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 ${person.thumbnail ? 'hidden' : ''}`}>
                          <span className={iconSize}>👤</span>
                        </div>
                        <span className={`${isTopThree ? 'text-base font-medium' : 'text-sm'} text-slate-900 group-hover:text-blue-600 flex-1`}>{person.name}</span>
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No people mentioned</p>
              )}
            </div>

            {/* Locations in Story */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs">📍</span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Locations</h3>
              </div>
              {story.entities?.locations && story.entities.locations.length > 0 ? (
                <div className="space-y-2">
                  {story.entities.locations.map((location: any) => (
                    <Link
                      key={location.id}
                      to={`/locations/${location.id}/${location.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group"
                    >
                      {location.thumbnail ? (
                        <img
                          src={location.thumbnail}
                          alt={location.name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-slate-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      <div className={`w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 ${location.thumbnail ? 'hidden' : ''}`}>
                        <span className="text-lg">📍</span>
                      </div>
                      <span className="text-sm text-slate-900 group-hover:text-blue-600 flex-1">{location.name}</span>
                      <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No locations mentioned</p>
              )}
            </div>

            {/* Organizations in Story - Collapsible */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <button
                onClick={() => setOrgsExpanded(!orgsExpanded)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs">🏢</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Organizations</h3>
                </div>
                <div className="flex items-center gap-2">
                  {story.entities?.organizations && story.entities.organizations.length > 0 && (
                    <span className="text-xs text-slate-500">({story.entities.organizations.length})</span>
                  )}
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${orgsExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {orgsExpanded && (
                <div className="mt-4">
                  {story.entities?.organizations && story.entities.organizations.length > 0 ? (
                    <div className="space-y-2">
                      {story.entities.organizations.map((org: any) => (
                        <Link
                          key={org.id}
                          to={`/organizations/${org.id}/${org.name.toLowerCase().replace(/\s+/g, '-')}`}
                          className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group"
                        >
                          {org.thumbnail ? (
                            <img
                              src={org.thumbnail}
                              alt={org.name}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-slate-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : org.domain ? (
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${org.domain}&sz=64`}
                              alt={org.name}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-slate-200 bg-white p-2"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          <div className={`w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 ${org.thumbnail || org.domain ? 'hidden' : ''}`}>
                            <span className="text-base">🏢</span>
                          </div>
                          <span className="text-sm text-slate-900 group-hover:text-blue-600 flex-1">{org.name}</span>
                          <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No organizations mentioned</p>
                  )}
                </div>
              )}
            </div>

            {/* Timeline Placeholder */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs">📅</span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Timeline</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Story timeline coming soon
              </p>
            </div>

            {/* Sources */}
            {story.artifacts && story.artifacts.length > 0 && (() => {
              const extractDomain = (url: string) => {
                try {
                  const urlObj = new URL(url)
                  return urlObj.hostname.replace(/^www\./, '')
                } catch {
                  return null
                }
              }

              const uniqueArtifacts = story.artifacts.reduce((acc, artifact) => {
                const existing = acc.find(a => a.url === artifact.url)
                const artifactWithDomain = {
                  ...artifact,
                  domain: artifact.domain || extractDomain(artifact.url)
                }
                if (!existing) {
                  acc.push(artifactWithDomain)
                }
                return acc
              }, [] as typeof story.artifacts)

              return (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs">📰</span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Sources ({uniqueArtifacts.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {uniqueArtifacts.map((artifact) => (
                      <a
                        key={artifact.url}
                        href={artifact.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group"
                      >
                        {artifact.domain && artifact.domain !== 'null' ? (
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${artifact.domain}&sz=32`}
                            alt={artifact.domain}
                            className="w-5 h-5 flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0 text-slate-400">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                            <polyline points="13 2 13 9 20 9"></polyline>
                          </svg>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-900 group-hover:text-blue-600 truncate">
                            {artifact.domain || 'Source'}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )
            })()}
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
