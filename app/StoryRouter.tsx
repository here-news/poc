import React from 'react'
import { useParams, useSearchParams, Navigate } from 'react-router-dom'
import StoryChatPage from './StoryChatPage'
import StoryPageLegacy from './StoryPageLegacy'

/**
 * Story Router
 *
 * Handles routing for stories with different view modes:
 * - /story/:id → Chat view (default)
 * - /story/:id/:slug → Chat view with SEO slug
 * - /story/:id?view=full → Full page view (legacy)
 * - /story/:id/:slug?view=full → Full page view with slug
 *
 * The slug parameter is optional and used for SEO purposes only.
 * All routing is based on the story ID.
 */
function StoryRouter() {
  const { storyId, slug } = useParams<{ storyId: string; slug?: string }>()
  const [searchParams] = useSearchParams()

  const view = searchParams.get('view') as 'chat' | 'full' | null

  // Default to chat view if no view param specified
  const viewMode = view || 'chat'

  // Validate story ID
  if (!storyId) {
    return <Navigate to="/app" replace />
  }

  // Render based on view mode
  switch (viewMode) {
    case 'full':
      return <StoryPageLegacy />

    case 'chat':
    default:
      return <StoryChatPage />
  }
}

export default StoryRouter
