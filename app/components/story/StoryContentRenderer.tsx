import React, { useState } from 'react'
import { parseContent, ContentSegment } from '../../utils/CitationParser'
import { Citation, CitationMetadata } from './Citation'
import { EntityLink, EntityMetadata } from './EntityLink'

interface StoryContentRendererProps {
  content: string
  citationsMetadata?: Record<string, CitationMetadata>
  entitiesMetadata?: Record<string, EntityMetadata>
  onCitationClick?: (pageIds: string[]) => void
  onEntityClick?: (canonicalId: string) => void
  isDev?: boolean
  LegacyEntityComponent?: React.ComponentType<{ entityName: string }>
}

/**
 * Story Content Renderer
 *
 * Renders story content with inline citation and entity markup
 * Handles both new format ({{cite:...}}, [[...|...]]) and legacy format ([[...]])
 */
export function StoryContentRenderer({
  content,
  citationsMetadata = {},
  entitiesMetadata = {},
  onCitationClick,
  onEntityClick,
  isDev = false,
  LegacyEntityComponent
}: StoryContentRendererProps) {
  // State for tracking citation numbers - assign individual numbers to each page ID
  const [pageIdNumbers] = useState<Map<string, number>>(() => {
    // Pre-assign citation numbers to individual page IDs based on order of appearance
    const parsed = parseContent(content)
    const numbers = new Map<string, number>()
    let counter = 1

    for (const citation of parsed.citations) {
      for (const pageId of citation.pageIds) {
        if (!numbers.has(pageId)) {
          numbers.set(pageId, counter++)
        }
      }
    }

    return numbers
  })

  // Parse content into segments
  const { segments, warnings } = parseContent(content)

  // Log warnings in dev mode
  if (isDev && warnings.length > 0) {
    console.warn('Citation/Entity parsing warnings:', warnings)
  }

  // Group segments into paragraphs by splitting on double newlines in text segments
  const groupIntoParagraphs = (): Array<ContentSegment[]> => {
    const paragraphs: Array<ContentSegment[]> = []
    let currentParagraph: ContentSegment[] = []

    segments.forEach((segment, index) => {
      if (segment.type === 'text') {
        // Split text on double newlines
        const parts = segment.content.split(/\n\n+/)

        parts.forEach((part, partIndex) => {
          if (part.trim()) {
            // Add trimmed text to current paragraph
            currentParagraph.push({ ...segment, content: part })
          }

          // Start new paragraph after each part except the last
          if (partIndex < parts.length - 1) {
            if (currentParagraph.length > 0) {
              paragraphs.push(currentParagraph)
              currentParagraph = []
            }
          }
        })
      } else {
        // Citations and entities stay inline with current paragraph
        currentParagraph.push(segment)
      }
    })

    // Add final paragraph if not empty
    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph)
    }

    return paragraphs
  }

  // Render a single segment inline
  const renderInlineSegment = (segment: ContentSegment, index: number): JSX.Element | string => {
    switch (segment.type) {
      case 'text': {
        // Handle single newlines within paragraph as <br>
        const lines = segment.content.split('\n')
        return (
          <React.Fragment key={`text-${index}`}>
            {lines.map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </React.Fragment>
        )
      }

      case 'citation': {
        // Get citation numbers for all page IDs in this citation
        const citationNumbers = segment.pageIds
          .map(pageId => pageIdNumbers.get(pageId))
          .filter((num): num is number => num !== undefined)

        return (
          <Citation
            key={`citation-${index}`}
            pageIds={segment.pageIds}
            citationsMetadata={citationsMetadata}
            citationNumbers={citationNumbers}
            onClick={onCitationClick}
            isDev={isDev}
          />
        )
      }

      case 'entity': {
        // Use custom LegacyEntityComponent if provided, or fallback to LegacyEntityLink for old format without canonical_id
        if (!segment.canonicalId) {
          const Component = LegacyEntityComponent || LegacyEntityLink
          return (
            <Component
              key={`entity-${index}`}
              entityName={segment.name}
            />
          )
        }

        // Use new EntityLink for entities with canonical_id
        return (
          <EntityLink
            key={`entity-${index}`}
            name={segment.name}
            canonicalId={segment.canonicalId}
            entitiesMetadata={entitiesMetadata}
            onClick={onEntityClick}
            isDev={isDev}
          />
        )
      }

      default:
        return ''
    }
  }

  // Group segments into paragraphs and render
  const paragraphs = groupIntoParagraphs()

  return (
    <>
      {paragraphs.map((paragraphSegments, pIndex) => (
        <p key={`para-${pIndex}`} className="mb-4">
          {paragraphSegments.map((segment, sIndex) =>
            renderInlineSegment(segment, `${pIndex}-${sIndex}`)
          )}
        </p>
      ))}
    </>
  )
}

/**
 * Legacy Entity Link Component (for old format [[Entity Name]])
 * Used for backwards compatibility with stories that don't have canonical IDs
 */
export function LegacyEntityLink({ entityName }: { entityName: string }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <span
      className="entity-link-legacy"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        cursor: 'pointer',
        color: '#718096',
        fontWeight: 500,
        borderBottom: '2px solid #718096',
        textDecoration: 'none',
        position: 'relative',
        display: 'inline'
      }}
    >
      {entityName}
      {showTooltip && (
        <div
          className="entity-tooltip-legacy"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            backgroundColor: '#2d3748',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            minWidth: '150px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}
        >
          {entityName}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #2d3748'
            }}
          />
        </div>
      )}
    </span>
  )
}
