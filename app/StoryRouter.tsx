import React from 'react'
import { useParams, Navigate } from 'react-router-dom'
import StoryChatPage from './StoryChatPage'

/**
 * Story Router
 *
 * Handles routing for stories:
 * - /story/:id → Chat view
 * - /story/:id/:slug → Chat view with SEO slug
 * - /story/:id/:slug?overlay=true → Chat view with auto-opened overlay
 *
 * The slug parameter is optional and used for SEO purposes only.
 * All routing is based on the story ID.
 *
 * To share the full story view, use ?overlay=true parameter which will
 * automatically open the story overlay in the chat interface.
 */
function StoryRouter() {
  const { storyId } = useParams<{ storyId: string }>()

  // Validate story ID
  if (!storyId) {
    return <Navigate to="/app" replace />
  }

  // Always render chat view
  // The ?overlay=true param is handled in StoryChatPage to auto-open overlay
  return <StoryChatPage />
}

export default StoryRouter
