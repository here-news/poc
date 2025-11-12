/**
 * Story URL utilities
 * Provides consistent URL generation for stories across different view modes
 */

/**
 * Generate a URL-friendly slug from a story title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')     // Trim hyphens from start/end
}

/**
 * Get canonical story URL
 *
 * @param id - Story ID (required)
 * @param options - Optional configuration
 * @param options.slug - SEO-friendly slug (optional)
 * @param options.view - View mode: 'chat' (default) or 'full'
 * @param options.overlay - Open as overlay in chat context
 *
 * @returns Canonical story URL
 *
 * @example
 * getStoryUrl('abc123')
 * // => '/story/abc123'
 *
 * getStoryUrl('abc123', { slug: 'israel-gaza-conflict' })
 * // => '/story/abc123/israel-gaza-conflict'
 *
 * getStoryUrl('abc123', { view: 'full' })
 * // => '/story/abc123?view=full'
 *
 * getStoryUrl('abc123', { overlay: true })
 * // => '/story/abc123?overlay=true'
 */
export function getStoryUrl(
  id: string,
  options?: {
    slug?: string
    view?: 'chat' | 'full'
    overlay?: boolean
  }
): string {
  const { slug, view, overlay } = options || {}

  // Base path
  let url = `/story/${id}`

  // Add slug if provided
  if (slug) {
    url += `/${slug}`
  }

  // Build query params
  const params = new URLSearchParams()

  if (view && view !== 'chat') {
    params.set('view', view)
  }

  if (overlay) {
    params.set('overlay', 'true')
  }

  // Append query string if params exist
  const queryString = params.toString()
  if (queryString) {
    url += `?${queryString}`
  }

  return url
}

/**
 * Parse story URL to extract ID and parameters
 *
 * @param pathname - URL pathname (e.g., '/story/abc123/slug')
 * @param search - URL search params (e.g., '?view=full')
 *
 * @returns Parsed story URL data
 */
export function parseStoryUrl(pathname: string, search: string = '') {
  // Extract ID and slug from pathname
  // Pattern: /story/:id/:slug?
  const match = pathname.match(/^\/story\/([^\/]+)(?:\/([^\/]+))?$/)

  if (!match) {
    return null
  }

  const [, id, slug] = match
  const params = new URLSearchParams(search)

  return {
    id,
    slug: slug || undefined,
    view: (params.get('view') as 'chat' | 'full') || 'chat',
    overlay: params.get('overlay') === 'true'
  }
}

/**
 * Get story URL from story data
 * Automatically generates slug from title if not provided
 */
export function getStoryUrlFromData(
  story: { id: string; title: string },
  options?: {
    view?: 'chat' | 'full'
    overlay?: boolean
  }
): string {
  return getStoryUrl(story.id, {
    slug: generateSlug(story.title),
    ...options
  })
}
