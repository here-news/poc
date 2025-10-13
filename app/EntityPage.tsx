import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from './components/layout/Header'
import { ensureUserId } from './userSession'

interface EntityDetails {
  canonical_id: string
  canonical_name: string
  entity_type: 'Person' | 'Organization' | 'Location'
  wikidata_qid?: string
  wikidata_description?: string
  wikidata_thumbnail?: string
  confidence?: number
  mentions: string[]
  story_count?: number
}

interface RelatedStory {
  id: string
  title: string
  description?: string
  created_at: string
  artifact_count: number
}

const getEntityTypeConfig = (type: string) => {
  switch (type.toLowerCase()) {
    case 'person':
      return {
        icon: '👤',
        color: 'blue',
        label: 'Person',
        bgClass: 'bg-blue-50',
        borderClass: 'border-blue-200',
        textClass: 'text-blue-700'
      }
    case 'organization':
      return {
        icon: '🏢',
        color: 'orange',
        label: 'Organization',
        bgClass: 'bg-orange-50',
        borderClass: 'border-orange-200',
        textClass: 'text-orange-700'
      }
    case 'location':
      return {
        icon: '📍',
        color: 'green',
        label: 'Location',
        bgClass: 'bg-green-50',
        borderClass: 'border-green-200',
        textClass: 'text-green-700'
      }
    default:
      return {
        icon: '🔷',
        color: 'gray',
        label: 'Entity',
        bgClass: 'bg-gray-50',
        borderClass: 'border-gray-200',
        textClass: 'text-gray-700'
      }
  }
}

function EntityPage() {
  const { id, entityType } = useParams<{ id: string; entityType: string }>()
  const [userId, setUserId] = useState('')
  const [entity, setEntity] = useState<EntityDetails | null>(null)
  const [relatedStories, setRelatedStories] = useState<RelatedStory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const uid = ensureUserId()
    setUserId(uid)
  }, [])

  useEffect(() => {
    if (id) {
      fetchEntityDetails(id)
    }
  }, [id])

  const fetchEntityDetails = async (entityId: string) => {
    try {
      setLoading(true)

      // Fetch entity details
      const entityResponse = await fetch(`/api/entity/${entityId}`)
      if (!entityResponse.ok) {
        setError('Entity not found')
        return
      }
      const entityData = await entityResponse.json()
      setEntity(entityData)

      // Fetch related stories
      const storiesResponse = await fetch(`/api/entity/${entityId}/stories`)
      if (storiesResponse.ok) {
        const storiesData = await storiesResponse.json()
        setRelatedStories(storiesData.stories || [])
      }
    } catch (err) {
      console.error('Error fetching entity:', err)
      setError('Failed to load entity details')
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
            <p className="text-slate-600">Loading entity...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !entity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Header userId={userId} />
          <div className="mt-10 text-center">
            <p className="text-red-600">{error || 'Entity not found'}</p>
            <Link to="/" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const typeConfig = getEntityTypeConfig(entity.entity_type)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Header userId={userId} />

        <main className="mt-8">
          {/* Entity Header */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-8">
            <div className="p-10">
              {/* Thumbnail & Title */}
              <div className="flex items-start gap-6 mb-6">
                {entity.wikidata_thumbnail ? (
                  <div className="flex-shrink-0">
                    <img
                      src={entity.wikidata_thumbnail}
                      alt={entity.canonical_name}
                      className="w-32 h-32 object-cover rounded-lg border border-slate-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div className={`w-32 h-32 rounded-lg ${typeConfig.bgClass} border ${typeConfig.borderClass} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-5xl">{typeConfig.icon}</span>
                  </div>
                )}

                <div className="flex-1">
                  <div className={`inline-block px-3 py-1 ${typeConfig.bgClass} ${typeConfig.borderClass} border rounded-full text-xs font-semibold ${typeConfig.textClass} mb-3`}>
                    {typeConfig.label}
                  </div>
                  <h1 className="text-4xl font-bold mb-2 text-slate-900">{entity.canonical_name}</h1>
                  {entity.wikidata_description && (
                    <p className="text-lg text-slate-600 leading-relaxed">{entity.wikidata_description}</p>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-6 pt-6 border-t border-slate-200">
                <div>
                  <div className="text-sm text-slate-600 mb-1">Stories</div>
                  <div className="text-2xl font-bold text-slate-900">{relatedStories.length}</div>
                </div>
                {entity.confidence && (
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Confidence</div>
                    <div className="text-2xl font-bold text-slate-900">{Math.round(entity.confidence * 100)}%</div>
                  </div>
                )}
                {entity.wikidata_qid && (
                  <a
                    href={`https://www.wikidata.org/wiki/${entity.wikidata_qid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <span>🔗</span>
                    <span>View on Wikidata</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>

              {/* Also Known As */}
              {entity.mentions && entity.mentions.length > 1 && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Also Known As</h3>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set(entity.mentions)].filter(m => m !== entity.canonical_name).map((mention, idx) => (
                      <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                        {mention}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Related Stories */}
          {relatedStories.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-10">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  Related Stories ({relatedStories.length})
                </h2>
                <div className="space-y-4">
                  {relatedStories.map((story) => (
                    <Link
                      key={story.id}
                      to={`/story/${story.id}`}
                      className="block p-5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                            {story.title}
                          </h3>
                          {story.description && (
                            <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                              {story.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>{new Date(story.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{story.artifact_count} sources</span>
                          </div>
                        </div>
                        <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-10 text-center text-slate-500">
                No related stories found
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default EntityPage
