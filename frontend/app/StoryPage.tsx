import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Header from './components/layout/Header'
import CommentThread from './components/story/CommentThread'
import ChatSidebar from './components/chat/ChatSidebar'
import StoryContent from './components/story/StoryContent'
import EntityCard from './components/story/EntityCard'
import ClaimsList from './components/story/ClaimsList'
import ArtifactsList from './components/story/ArtifactsList'
import CoherenceBreakdown from './components/story/CoherenceBreakdown'
import RelatedStories from './components/story/RelatedStories'
import { Story } from './types/story'

function StoryPage() {
  const { storyId } = useParams<{ storyId: string }>()
  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'entities' | 'claims' | 'sources'>('entities')

  useEffect(() => {
    if (storyId) {
      loadStory()
    }
  }, [storyId])

  const loadStory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/stories/${storyId}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setStory(data.story)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load story')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="text-white text-xl">Loading story...</div>
        </div>
      </div>
    )
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            Error: {error || 'Story not found'}
          </div>
        </div>
      </div>
    )
  }

  const allEntities = [
    ...(story.entities?.people || []),
    ...(story.entities?.organizations || []),
    ...(story.entities?.locations || [])
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Story Header */}
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h1 className="text-4xl font-bold text-slate-900 mb-4">{story.title}</h1>

              {story.description && (
                <p className="text-lg text-slate-600 leading-relaxed mb-6">
                  {story.description}
                </p>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-6 text-sm border-y border-slate-200 py-4">
                {story.coherence !== undefined && (
                  <div>
                    <span className="text-slate-500">Coherence: </span>
                    <span className="font-bold text-indigo-600 text-lg">
                      {(story.coherence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}

                {story.claim_count !== undefined && (
                  <div>
                    <span className="text-slate-500">Claims: </span>
                    <span className="font-semibold text-slate-700">{story.claim_count}</span>
                  </div>
                )}

                {story.artifact_count !== undefined && (
                  <div>
                    <span className="text-slate-500">Sources: </span>
                    <span className="font-semibold text-slate-700">{story.artifact_count}</span>
                  </div>
                )}

                {story.timely !== undefined && (
                  <div>
                    <span className="text-slate-500">Timely: </span>
                    <span className="font-semibold text-emerald-600">{story.timely.toFixed(0)}%</span>
                  </div>
                )}
              </div>

              {/* Story Content */}
              {story.content && (
                <div className="mt-6">
                  <StoryContent content={story.content} />
                </div>
              )}

              {/* Chat Button */}
              <button
                onClick={() => setChatOpen(true)}
                className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Ask AI about this story
              </button>
            </div>

            {/* Tabs Section */}
            <div className="bg-white rounded-xl shadow-sm">
              {/* Tab Headers */}
              <div className="border-b border-slate-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('entities')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition ${
                      activeTab === 'entities'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Entities ({allEntities.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('claims')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition ${
                      activeTab === 'claims'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Claims ({story.claims?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('sources')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition ${
                      activeTab === 'sources'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sources ({story.artifacts?.length || 0})
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'entities' && (
                  <div className="space-y-6">
                    {story.entities?.people && story.entities.people.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">People</h3>
                        <div className="grid gap-3">
                          {story.entities.people.map((person) => (
                            <EntityCard key={person.id} entity={person} type="person" />
                          ))}
                        </div>
                      </div>
                    )}

                    {story.entities?.organizations && story.entities.organizations.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">Organizations</h3>
                        <div className="grid gap-3">
                          {story.entities.organizations.map((org) => (
                            <EntityCard key={org.id} entity={org} type="organization" />
                          ))}
                        </div>
                      </div>
                    )}

                    {story.entities?.locations && story.entities.locations.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">Locations</h3>
                        <div className="grid gap-3">
                          {story.entities.locations.map((location) => (
                            <EntityCard key={location.id} entity={location} type="location" />
                          ))}
                        </div>
                      </div>
                    )}

                    {allEntities.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        No entities extracted yet
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'claims' && (
                  <ClaimsList claims={story.claims || []} />
                )}

                {activeTab === 'sources' && (
                  <ArtifactsList artifacts={story.artifacts || []} />
                )}
              </div>
            </div>

            {/* Comments */}
            {storyId && <CommentThread storyId={storyId} />}
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Coherence Breakdown */}
            {story.coherence_breakdown && (
              <CoherenceBreakdown breakdown={story.coherence_breakdown} />
            )}

            {/* Related Stories */}
            {story.related_stories && story.related_stories.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Related Stories</h3>
                <RelatedStories stories={story.related_stories} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      {storyId && (
        <ChatSidebar
          storyId={storyId}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  )
}

export default StoryPage
