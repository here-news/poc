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
 */
export function getPreviewFromTask(taskResponse: any): URLPreview | null {
  // Check for preview_meta first (quick iFramely stage)
  if (taskResponse.preview_meta) {
    return {
      url: taskResponse.url,
      title: taskResponse.preview_meta.title || '',
      description: taskResponse.preview_meta.description || '',
      thumbnail: taskResponse.preview_meta.thumbnail_url || taskResponse.preview_meta.thumbnail,
      siteName: taskResponse.preview_meta.site_name || taskResponse.preview_meta.site,
      author: taskResponse.preview_meta.author,
      favicon: `https://www.google.com/s2/favicons?domain=${taskResponse.preview_meta.domain || new URL(taskResponse.url).hostname}&sz=32`
    }
  }

  // Fallback to full extraction result
  if (taskResponse.result && taskResponse.result.og_metadata) {
    const result = taskResponse.result
    const ogMeta = result.og_metadata || {}

    return {
      url: result.canonical_url || result.url || taskResponse.url,
      title: result.title || ogMeta.title || '',
      description: result.meta_description || ogMeta.description || '',
      thumbnail: ogMeta.image?.url || ogMeta.image?.secure_url,
      siteName: ogMeta.site_name || result.domain,
      author: result.author,
      favicon: `https://www.google.com/s2/favicons?domain=${result.domain}&sz=32`
    }
  }

  // Last resort: minimal data from task
  if (taskResponse.result && taskResponse.result.title) {
    return {
      url: taskResponse.url,
      title: taskResponse.result.title,
      description: taskResponse.result.meta_description || '',
      thumbnail: undefined,
      siteName: taskResponse.result.domain,
      author: taskResponse.result.author,
      favicon: `https://www.google.com/s2/favicons?domain=${taskResponse.result.domain}&sz=32`
    }
  }

  return null
}
