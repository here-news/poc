import React, { useEffect, useState } from 'react'
import { StoryContentRenderer } from './story/StoryContentRenderer'
import { PhiAvatar } from './PhiAvatar'

// Add fadeInScale animation for entity headshots
const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`
if (!document.head.querySelector('style[data-entity-animations]')) {
  styleSheet.setAttribute('data-entity-animations', 'true')
  document.head.appendChild(styleSheet)
}

interface EntityMetadata {
  name: string
  canonical_id: string
  wikidata_thumbnail?: string
  description?: string
}

interface CurationData {
  success: boolean
  content: string | null
  entities_metadata: Record<string, EntityMetadata>
  story_ids: string[]
  last_updated: string | null
  error?: string
}

/**
 * Top Stories Curation Component
 *
 * Displays LLM-generated curation summary with inline entity headshots
 * Updates every 10 minutes via backend cache
 */
export function TopStoriesCuration() {
  const [curation, setCuration] = useState<CurationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCuration = async () => {
    try {
      const response = await fetch('/storychat/api/top-stories-curation')
      const data = await response.json()

      console.log('🎨 Top Stories Curation API response:', data)
      console.log('📊 Entities metadata:', data.entities_metadata)

      if (data.success && data.content) {
        setCuration(data)
        setError(null)
      } else {
        setError(data.error || 'Failed to load curation')
      }
    } catch (err) {
      console.error('Error fetching top stories curation:', err)
      setError('Failed to load curation')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchCuration()

    // Refresh every 2 minutes to pick up backend cache updates
    const interval = setInterval(fetchCuration, 120000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex gap-2 justify-start mb-4">
        <PhiAvatar size="sm" className="mt-1" />
        <div className="max-w-[80%] rounded-lg px-4 py-2 bg-slate-100">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !curation) {
    return null // Don't show error state, just hide the component
  }

  if (!curation.content) {
    return null
  }

  return (
    <div className="flex gap-2 justify-start mb-4">
      {/* Phi Avatar */}
      <PhiAvatar size="sm" className="mt-1" />

      {/* Message Content */}
      <div className="max-w-[80%] rounded-lg px-4 py-3 bg-slate-100 text-slate-900">
        <div className="text-sm leading-relaxed">
          <StoryContentRenderer
            content={curation.content}
            citationsMetadata={{}}
            entitiesMetadata={curation.entities_metadata || {}}
            isDev={true}
          />
        </div>
      </div>
    </div>
  )
}
