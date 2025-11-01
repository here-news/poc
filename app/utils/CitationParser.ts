/**
 * Citation Markup Parser
 *
 * Parses story content with inline citation and entity markup:
 * - Citations: {{cite:page_id1,page_id2}} → [1,2]
 * - Entities: [[Entity Name|canonical_id]] → styled entity link
 */

export interface Citation {
  type: 'citation'
  pageIds: string[]
  originalText: string
  startIndex: number
  endIndex: number
}

export interface Entity {
  type: 'entity'
  name: string
  canonicalId?: string  // Optional for legacy format [[Entity Name]]
  originalText: string
  startIndex: number
  endIndex: number
}

export interface PlainText {
  type: 'text'
  content: string
  startIndex: number
  endIndex: number
}

export type ContentSegment = Citation | Entity | PlainText

export interface ParsedContent {
  segments: ContentSegment[]
  citations: Citation[]
  entities: Entity[]
  warnings: string[]
}

/**
 * Parse citation markup: {{cite:page_id1,page_id2,page_id3}}
 */
function parseCitations(content: string): {
  citations: Citation[]
  warnings: string[]
} {
  const citations: Citation[] = []
  const warnings: string[] = []

  // Regex to match {{cite:page_id1,page_id2,...}}
  // Matches: {{cite:UUID,UUID,...}} with optional spaces after commas
  const citationRegex = /\{\{cite:([a-f0-9\-,\s]+)\}\}/gi

  let match: RegExpExecArray | null
  while ((match = citationRegex.exec(content)) !== null) {
    const originalText = match[0]
    const pageIdsStr = match[1]
    const startIndex = match.index
    const endIndex = match.index + originalText.length

    // Parse comma-separated page IDs
    const pageIds = pageIdsStr
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0)

    // Validate page IDs (should be UUIDs)
    const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
    const validPageIds = pageIds.filter(id => uuidRegex.test(id))

    if (validPageIds.length === 0) {
      warnings.push(`Invalid citation markup at position ${startIndex}: ${originalText}`)
      continue
    }

    if (validPageIds.length < pageIds.length) {
      const invalidIds = pageIds.filter(id => !uuidRegex.test(id))
      warnings.push(`Citation contains invalid page IDs: ${invalidIds.join(', ')}`)
    }

    citations.push({
      type: 'citation',
      pageIds: validPageIds,
      originalText,
      startIndex,
      endIndex
    })
  }

  return { citations, warnings }
}

/**
 * Parse entity markup: [[Entity Name|canonical_id]] or [[Entity Name]] (legacy)
 */
function parseEntities(content: string): {
  entities: Entity[]
  warnings: string[]
} {
  const entities: Entity[] = []
  const warnings: string[] = []

  // Regex to match both:
  // - [[Entity Name|canonical_id]] (new format)
  // - [[Entity Name]] (legacy format)
  const entityRegex = /\[\[([^\]]+)\]\]/g

  let match: RegExpExecArray | null
  while ((match = entityRegex.exec(content)) !== null) {
    const originalText = match[0]
    const content_inside = match[1]
    const startIndex = match.index
    const endIndex = match.index + originalText.length

    // Check if it has canonical_id (contains pipe)
    if (content_inside.includes('|')) {
      const [name, canonicalId] = content_inside.split('|').map(s => s.trim())

      if (!name || !canonicalId) {
        warnings.push(`Malformed entity markup at position ${startIndex}: ${originalText}`)
        continue
      }

      entities.push({
        type: 'entity',
        name,
        canonicalId,
        originalText,
        startIndex,
        endIndex
      })
    } else {
      // Legacy format: [[Entity Name]] without canonical_id
      const name = content_inside.trim()

      if (!name) {
        warnings.push(`Empty entity markup at position ${startIndex}: ${originalText}`)
        continue
      }

      entities.push({
        type: 'entity',
        name,
        canonicalId: undefined,  // Legacy format has no canonical_id
        originalText,
        startIndex,
        endIndex
      })
    }
  }

  return { entities, warnings }
}

/**
 * Parse content with both citations and entities
 * Returns segments in order for rendering
 */
export function parseContent(content: string): ParsedContent {
  const { citations, warnings: citationWarnings } = parseCitations(content)
  const { entities, warnings: entityWarnings } = parseEntities(content)
  const warnings = [...citationWarnings, ...entityWarnings]

  // Combine all markup elements and sort by position
  const allMarkup = [...citations, ...entities].sort((a, b) => a.startIndex - b.startIndex)

  // Build segments (text + markup in order)
  const segments: ContentSegment[] = []
  let lastIndex = 0

  for (const markup of allMarkup) {
    // Add text before this markup
    if (markup.startIndex > lastIndex) {
      const textContent = content.substring(lastIndex, markup.startIndex)
      if (textContent.length > 0) {
        segments.push({
          type: 'text',
          content: textContent,
          startIndex: lastIndex,
          endIndex: markup.startIndex
        })
      }
    }

    // Add the markup segment
    segments.push(markup)
    lastIndex = markup.endIndex
  }

  // Add remaining text after last markup
  if (lastIndex < content.length) {
    const textContent = content.substring(lastIndex)
    if (textContent.length > 0) {
      segments.push({
        type: 'text',
        content: textContent,
        startIndex: lastIndex,
        endIndex: content.length
      })
    }
  }

  return {
    segments,
    citations,
    entities,
    warnings
  }
}

/**
 * Strip all markup from content (fallback for plain text rendering)
 */
export function stripMarkup(content: string): string {
  return content
    .replace(/\{\{cite:[a-f0-9\-,]+\}\}/gi, '')
    .replace(/\[\[([^\|\]]+)\|([^\]]+)\]\]/g, '$1') // Keep entity name, remove ID
    .trim()
}

/**
 * Validate that all citations have corresponding metadata
 */
export function validateCitations(
  citations: Citation[],
  citationsMetadata: Record<string, any>
): string[] {
  const errors: string[] = []

  for (const citation of citations) {
    for (const pageId of citation.pageIds) {
      if (!citationsMetadata[pageId]) {
        errors.push(`Missing metadata for citation: ${pageId}`)
      }
    }
  }

  return errors
}

/**
 * Validate that all entities have corresponding metadata
 */
export function validateEntities(
  entities: Entity[],
  entitiesMetadata: Record<string, any>
): string[] {
  const errors: string[] = []

  for (const entity of entities) {
    if (!entitiesMetadata[entity.canonicalId]) {
      errors.push(`Missing metadata for entity: ${entity.canonicalId} (${entity.name})`)
    }
  }

  return errors
}
