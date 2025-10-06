import React, { useState, useEffect } from 'react'

interface StorySummary {
  id: string
  title: string
  description: string
  category: 'local' | 'global' | string
  artifact_count: number
  claim_count: number
  people_count: number
  locations: string[]
  last_updated_human: string
  cover_image?: string
}

const categoryConfig: Record<string, { label: string; color: string; accent: string }> = {
  local: {
    label: 'US Focus',
    color: 'bg-emerald-100 text-emerald-700',
    accent: 'text-emerald-500'
  },
  global: {
    label: 'Global Signal',
    color: 'bg-blue-100 text-blue-700',
    accent: 'text-blue-500'
  }
}

function LiveSignals() {
  const [stories, setStories] = useState<StorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStories()
  }, [])

  const fetchStories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/stories?limit=12')
      const data = await response.json()

      if (data.error) {
        setError(data.error)
        setStories([])
      } else {
        const summaries: StorySummary[] = (data.stories || []).map((story: any) => ({
          id: story.id,
          title: story.title,
          description: story.description,
          category: story.category || 'global',
          artifact_count: story.artifact_count || 0,
          claim_count: story.claim_count || 0,
          people_count: story.people_count || 0,
          locations: story.locations || [],
          last_updated_human: story.last_updated_human || 'recently',
          cover_image: story.cover_image
        }))

        setStories(summaries)
      }
    } catch (err) {
      console.error('Error fetching stories:', err)
      setError('Failed to load stories')
      setStories([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Recent Threads</h2>
            <p className="text-sm text-slate-500">
              Active story threads from the community
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-slate-500">
              <div className="inline-block w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2" />
              <p className="text-sm">Loading threads...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No threads available</p>
            </div>
          ) : stories.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No threads yet. Seed the first one!</p>
            </div>
          ) : (
            stories.map((story) => {
              const category = categoryConfig[story.category] || categoryConfig.global

              return (
                <article
                  key={story.id}
                  className="group rounded-2xl border border-slate-200 bg-white/90 p-5 transition shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {story.title}
                        </h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${category.color}`}>
                          {category.label}
                        </span>
                      </div>
                      {story.description && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                          {story.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                        <span className={category.accent}>
                          {story.artifact_count} artifact{story.artifact_count !== 1 ? 's' : ''}
                        </span>
                        <span>{story.claim_count} claim{story.claim_count !== 1 ? 's' : ''}</span>
                        <span>{story.people_count} contributor{story.people_count !== 1 ? 's' : ''}</span>
                      </div>
                      {story.locations.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 text-xs text-slate-400">
                          {story.locations.slice(0, 3).map((location) => (
                            <span key={location} className="px-2 py-0.5 bg-slate-100 rounded-full">
                              {location}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                      {story.last_updated_human}
                    </span>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}

export default LiveSignals
