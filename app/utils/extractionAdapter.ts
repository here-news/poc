import { URLPreview } from '../types/chat'

/**
 * Adapter to convert extraction service preview data to chat URLPreview format
 *
 * Maps from /api/task/{id}/preview response to URLPreview interface
 */

interface ExtractionPreview {
  title: string
  description: string
  preview_image: {
    url: string
    secure_url: string
    width: number | null
    height: number | null
  }
  url: string
  domain: string
  publisher: {
    name: string
    favicon: string
    facebook: string
    twitter: string
  }
  author: {
    name: string
    facebook: string
    twitter: string
  }
}

/**
 * Convert extraction service preview to chat URLPreview
 */
export function extractionToUrlPreview(extractionPreview: ExtractionPreview): URLPreview {
  return {
    url: extractionPreview.url,
    title: extractionPreview.title,
    description: extractionPreview.description,
    thumbnail: extractionPreview.preview_image?.secure_url || extractionPreview.preview_image?.url,
    siteName: extractionPreview.publisher?.name || extractionPreview.domain,
    author: extractionPreview.author?.name,
    favicon: extractionPreview.publisher?.favicon
  }
}

/**
 * Check if extraction service has preview data available
 */
export function hasPreviewData(taskResponse: any): boolean {
  return !!(
    taskResponse &&
    taskResponse.preview_available !== false &&
    (taskResponse.title || taskResponse.preview_meta)
  )
}

/**
 * Extract preview from task response (handles both preview_meta and full result)
 *
 * Thumbnail fallback chain:
 * 1. screenshot_url (from extraction - shows actual content)
 * 2. preview_meta.thumbnail_url (from iFramely - fast metadata)
 * 3. og_metadata.image (from Open Graph - unreliable)
 * 4. Domain favicon (always available)
 */
export function getPreviewFromTask(taskResponse: any): URLPreview | null {
  // Check for preview_meta first (quick iFramely stage)
  if (taskResponse.preview_meta) {
    const domain = taskResponse.preview_meta.domain || new URL(taskResponse.url).hostname

    return {
      url: taskResponse.url,
      title: taskResponse.preview_meta.title || '',
      description: taskResponse.preview_meta.description || '',
      thumbnail: taskResponse.preview_meta.thumbnail_url || taskResponse.preview_meta.thumbnail,
      siteName: taskResponse.preview_meta.site_name || taskResponse.preview_meta.site,
      author: taskResponse.preview_meta.author,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    }
  }

  // Fallback to full extraction result
  if (taskResponse.result) {
    const result = taskResponse.result
    const ogMeta = result.og_metadata || {}
    const domain = result.domain || new URL(taskResponse.url).hostname

    // Thumbnail fallback chain
    let thumbnail = undefined

    // 1. Try screenshot_url (best - shows actual content)
    if (result.screenshot_url) {
      thumbnail = result.screenshot_url
    }
    // 2. Try og_metadata.image (unreliable but worth trying)
    else if (ogMeta.image?.url || ogMeta.image?.secure_url) {
      thumbnail = ogMeta.image?.url || ogMeta.image?.secure_url
    }
    // 3. Fall back to favicon (always available, not ideal but better than nothing)
    // Note: We don't set thumbnail to favicon here, just use the favicon field

    return {
      url: result.canonical_url || result.url || taskResponse.url,
      title: result.title || ogMeta.title || '',
      description: result.meta_description || ogMeta.description || '',
      thumbnail: thumbnail,
      siteName: ogMeta.site_name || result.domain,
      author: result.author,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    }
  }

  return null
}

/**
 * Check cache for URL (calls extraction service /check endpoint)
 * Returns cached task_id if available, null otherwise
 */
export async function checkCachedUrl(url: string): Promise<{ task_id: string; preview: URLPreview } | null> {
  try {
    // Call server-side endpoint that proxies to extraction service /check
    const response = await fetch(`/api/check?url=${encodeURIComponent(url)}`)

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (!data.cache_hit) {
      return null
    }

    // Convert cached result to preview format
    const preview = getPreviewFromTask({
      url: url,
      result: data.result,
      semantic_data: data.semantic_data
    })

    if (!preview) {
      return null
    }

    return {
      task_id: data.task_id,
      preview
    }
  } catch (error) {
    console.error('Cache check failed:', error)
    return null
  }
}
