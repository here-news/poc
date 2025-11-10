import React from 'react'
import { Link } from 'react-router-dom'

interface Story {
  id: string
  title: string
  description?: string
  gist?: string
  coherence_score?: number
  artifact_count?: number
}

interface Entity {
  id: string
  name: string
  thumbnail?: string
  qid?: string
  description?: string
  domain?: string
  story_count?: number
}

interface NewsCurationData {
  stories: Story[]
  entities: {
    people: Entity[]
    organizations: Entity[]
    locations: Entity[]
  }
  last_updated?: string
}

interface NewsCurationWelcomeProps {
  curation: NewsCurationData | null
  loading: boolean
  onSelectStory: (storyId: string) => void
}

function NewsCurationWelcome({ curation, loading, onSelectStory }: NewsCurationWelcomeProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="inline-block w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!curation || !curation.stories) {
    return null
  }

  return (
    <div className="space-y-6 pb-4">
      {/* Welcome header */}
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Welcome to HERE.news
        </h2>
        <p className="text-sm text-slate-600">
          Your personalized news intelligence • Updated {curation.last_updated ? new Date(curation.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}
        </p>
      </div>

      {/* Top Stories */}
      {curation.stories.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            Top Stories
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {curation.stories.slice(0, 4).map((story) => (
              <button
                key={story.id}
                onClick={() => onSelectStory(story.id)}
                className="text-left p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <h4 className="font-semibold text-sm text-slate-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {story.title}
                </h4>
                <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                  {story.description || story.gist}
                </p>
                <div className="flex items-center gap-2">
                  {story.coherence_score !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-semibold">
                      {Math.round(story.coherence_score * 100)}%
                    </span>
                  )}
                  {story.artifact_count !== undefined && (
                    <span className="text-[10px] text-slate-400">
                      {story.artifact_count} sources
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trending People */}
      {curation.entities.people.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Trending People
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {curation.entities.people.slice(0, 6).map((person) => (
              <Link
                key={person.id}
                to={`/people/${person.id}/${person.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="flex-shrink-0 w-24 group"
              >
                <div className="flex flex-col items-center gap-2">
                  {person.thumbnail ? (
                    <img
                      src={person.thumbnail}
                      alt={person.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 group-hover:border-purple-400 transition-colors"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center border-2 border-slate-200 group-hover:border-purple-400 transition-colors">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-900 line-clamp-2 group-hover:text-purple-600 transition-colors">
                      {person.name}
                    </p>
                    {person.story_count !== undefined && person.story_count > 0 && (
                      <p className="text-[10px] text-slate-500">
                        {person.story_count} {person.story_count === 1 ? 'story' : 'stories'}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Trending Locations & Organizations */}
      <div className="grid grid-cols-2 gap-4">
        {/* Locations */}
        {curation.entities.locations.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Locations
            </h3>
            <div className="space-y-1.5">
              {curation.entities.locations.slice(0, 4).map((location) => (
                <Link
                  key={location.id}
                  to={`/locations/${location.id}/${location.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="block px-2 py-1.5 text-xs text-slate-700 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{location.name}</span>
                    {location.story_count !== undefined && location.story_count > 0 && (
                      <span className="text-[10px] text-slate-400 ml-2">{location.story_count}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Organizations */}
        {curation.entities.organizations.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Organizations
            </h3>
            <div className="space-y-1.5">
              {curation.entities.organizations.slice(0, 4).map((org) => (
                <Link
                  key={org.id}
                  to={`/organizations/${org.id}/${org.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="block px-2 py-1.5 text-xs text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{org.name}</span>
                    {org.story_count !== undefined && org.story_count > 0 && (
                      <span className="text-[10px] text-slate-400 ml-2">{org.story_count}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 pt-4">
        <p className="text-xs text-slate-500 text-center italic">
          Ask me anything about these stories or topics
        </p>
      </div>
    </div>
  )
}

export default NewsCurationWelcome
