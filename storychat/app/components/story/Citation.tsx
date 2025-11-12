import React from 'react'

export interface CitationMetadata {
  url: string
  title: string
  domain: string
  pub_time: string
  snippet: string
}

interface CitationProps {
  pageIds: string[]
  citationsMetadata: Record<string, CitationMetadata>
  citationNumbers: number[]
  onClick?: (pageIds: string[]) => void
  isDev?: boolean
}

/**
 * Citation Component
 *
 * Renders inline citations as superscript numbers
 * Clicking scrolls to the source in the sidebar
 */
export function Citation({
  pageIds,
  citationsMetadata,
  citationNumbers,
  onClick,
  isDev = false
}: CitationProps) {
  // Check if all page IDs have metadata
  const missingPageIds = pageIds.filter(id => !citationsMetadata[id])
  const hasMissingMetadata = missingPageIds.length > 0

  // Get metadata for valid page IDs
  const validMetadata = pageIds
    .filter(id => citationsMetadata[id])
    .map(id => citationsMetadata[id])

  const handleNumberClick = (e: React.MouseEvent, pageId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (onClick && citationsMetadata[pageId]) {
      onClick([pageId])
    }
  }

  // Dev mode: Show error indicator for missing metadata
  if (isDev && hasMissingMetadata) {
    console.warn(`Missing citation metadata for page IDs: ${missingPageIds.join(', ')}`)
  }

  return (
    <sup
      className={`citation ${hasMissingMetadata && isDev ? 'citation-error' : ''}`}
      style={{
        color: hasMissingMetadata && isDev ? '#e53e3e' : '#3182ce',
        fontWeight: 500,
        fontSize: '0.75em',
        marginLeft: '0.2em',
        marginRight: '0.2em',
        display: 'inline-block'
      }}
    >
      [
      {pageIds.map((pageId, index) => {
        const number = citationNumbers[index]
        const hasMetadata = citationsMetadata[pageId]

        return (
          <React.Fragment key={pageId}>
            <span
              onClick={(e) => handleNumberClick(e, pageId)}
              style={{
                cursor: hasMetadata ? 'pointer' : 'default',
                textDecoration: hasMetadata ? 'underline' : 'none',
                textDecorationStyle: 'dotted',
                padding: '0.1em 0.2em',
                display: 'inline-block'
              }}
            >
              {number}
            </span>
            {index < pageIds.length - 1 && ','}
          </React.Fragment>
        )
      })}
      {isDev && hasMissingMetadata && (
        <span style={{ color: '#e53e3e', marginLeft: '0.1em' }}>!</span>
      )}
      ]
    </sup>
  )
}
