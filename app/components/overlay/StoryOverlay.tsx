import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StoryContentRenderer } from '../story/StoryContentRenderer'
import type { CitationMetadata, EntityMetadata } from '../../types/story'

interface StoryOverlayProps {
  storyId: string
  isOpen: boolean
  onClose: () => void
}

interface StoryDetails {
  id: string
  title: string
  content?: string
  category: string
  artifact_count: number
  claim_count: number
  people_count: number
  org_count?: number
  location_count?: number
  coherence_score?: number
  revision?: string
  version?: string
  artifacts?: Array<{
    id?: string
    page_id?: string
    url: string
    title: string
    domain?: string
    site?: string
    pub_time?: string
    published_at?: string
    pub_date?: string
    gist?: string
    snippet?: string
  }>
  people_entities?: Array<{
    id: string
    name: string
    thumbnail?: string
    qid?: string
    description?: string
  }>
  org_entities?: Array<{
    id: string
    name: string
    thumbnail?: string
    domain?: string
  }>
  location_entities?: Array<{
    id: string
    name: string
    thumbnail?: string
  }>
  entities?: {
    people: Array<{ id: string; name: string }>
    organizations: Array<{ id: string; name: string }>
    locations: Array<{ id: string; name: string }>
  }
}

function StoryOverlay({ storyId, isOpen, onClose }: StoryOverlayProps) {
  const [story, setStory] = useState<StoryDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [storyEntities, setStoryEntities] = useState<Record<string, any>>({})

  // Fetch story details when opened
  useEffect(() => {
    if (isOpen && storyId) {
      fetchStoryDetails()
    }
  }, [isOpen, storyId])

  // Build entities lookup
  useEffect(() => {
    if (story) {
      const entitiesObj: Record<string, any> = {}

      story.people_entities?.forEach((entity: any) => {
        const entityData = {
          name: entity.name,
          qid: entity.qid || '',
          description: entity.description || '',
          wikidata_thumbnail: entity.thumbnail || '',
          entity_type: 'person',
          claim_count: 0
        }
        entitiesObj[entity.id] = entityData
        entitiesObj[entity.name] = entityData
      })

      story.org_entities?.forEach((entity: any) => {
        const entityData = {
          name: entity.name,
          qid: entity.qid || '',
          description: entity.description || '',
          wikidata_thumbnail: entity.thumbnail || '',
          entity_type: 'organization',
          claim_count: 0
        }
        entitiesObj[entity.id] = entityData
        entitiesObj[entity.name] = entityData
      })

      story.location_entities?.forEach((entity: any) => {
        const entityData = {
          name: entity.name,
          qid: entity.qid || '',
          description: entity.description || '',
          wikidata_thumbnail: entity.thumbnail || '',
          entity_type: 'location',
          claim_count: 0
        }
        entitiesObj[entity.id] = entityData
        entitiesObj[entity.name] = entityData
      })

      setStoryEntities(entitiesObj)
    }
  }, [story])

  const fetchStoryDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/stories/${storyId}`)

      if (!response.ok) {
        throw new Error('Story not found')
      }

      const data = await response.json()

      if (data.story) {
        setStory(data.story)
      }
    } catch (error) {
      console.error('Error fetching story:', error)
    } finally {
      setLoading(false)
    }
  }

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {/* Overlay backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Story content */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header with close button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
              Story v.{story?.revision || story?.version || '1'}
            </div>
            <h2 className="text-lg font-bold text-slate-900 truncate">Full Story</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : story ? (
            <div className="space-y-6">
              {/* Title */}
              <h1 className="text-3xl font-bold text-slate-900 leading-tight">{story.title}</h1>

              {/* Story metadata */}
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{story.artifact_count} sources</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{story.people_count || 0} people</span>
                </div>
                {story.coherence_score !== undefined && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{Math.round(story.coherence_score * 100)}% coherence</span>
                  </div>
                )}
              </div>

              {/* Story content */}
              {story.content && story.content.length > 100 && (
                <div className="prose prose-lg max-w-none">
                  <div className="text-slate-800 leading-relaxed">
                    <StoryContentRenderer
                      content={story.content}
                      citationsMetadata={
                        story.artifacts
                          ? Object.fromEntries(
                              story.artifacts
                                .filter((a) => a.id || a.page_id)
                                .map((a) => [
                                  a.id || a.page_id,
                                  {
                                    url: a.url,
                                    title: a.title,
                                    domain: a.site || a.domain,
                                    pub_time: a.pub_time || a.published_at || a.pub_date,
                                    snippet: a.gist || a.snippet || '',
                                  },
                                ])
                            )
                          : undefined
                      }
                      entitiesMetadata={storyEntities}
                      isDev={import.meta.env.DEV}
                    />
                  </div>
                </div>
              )}

              {/* People, Orgs, Locations */}
              {story.entities && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-200">
                  {story.entities.people && story.entities.people.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2">People</h3>
                      <div className="space-y-1">
                        {story.entities.people.slice(0, 5).map((person) => (
                          <Link
                            key={person.id}
                            to={`/people/${person.id}/${person.name.toLowerCase().replace(/\s+/g, '-')}`}
                            className="block text-sm text-blue-600 hover:text-blue-700 truncate"
                          >
                            {person.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {story.entities.organizations && story.entities.organizations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2">Organizations</h3>
                      <div className="space-y-1">
                        {story.entities.organizations.slice(0, 5).map((org) => (
                          <Link
                            key={org.id}
                            to={`/organizations/${org.id}/${org.name.toLowerCase().replace(/\s+/g, '-')}`}
                            className="block text-sm text-blue-600 hover:text-blue-700 truncate"
                          >
                            {org.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {story.entities.locations && story.entities.locations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2">Locations</h3>
                      <div className="space-y-1">
                        {story.entities.locations.slice(0, 5).map((location) => (
                          <Link
                            key={location.id}
                            to={`/locations/${location.id}/${location.name.toLowerCase().replace(/\s+/g, '-')}`}
                            className="block text-sm text-blue-600 hover:text-blue-700 truncate"
                          >
                            {location.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">Story not found</div>
          )}
        </div>

        {/* Footer with action buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <Link
            to={`/builder/${storyId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit in Builder
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
          >
            Back to Chat
          </button>
        </div>
      </div>
    </div>
  )
}

export default StoryOverlay
