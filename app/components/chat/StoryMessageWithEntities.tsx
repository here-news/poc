import React, { useState, useEffect } from 'react'

interface EntityMetadata {
  name: string
  canonical_id: string
  entity_type: string
  qid: string
  wikidata_thumbnail?: string
  description: string
  claim_count: number
}

interface Claim {
  text: string
  confidence?: number
  created_at?: string
  source_url?: string
}

interface StoryMessageWithEntitiesProps {
  content: string
  claims: Claim[]
  messageIdx: number
  expandedClaims: Map<string, number>
  onToggleClaim: (claimKey: string, claimNum: number) => void
  formatRelativeTime: (timestamp?: string) => string
}

/**
 * Story Chat Message with Entity Resolution and Claim References
 *
 * Handles both:
 * - [[Entity Name]] markup → inline headshots with colored text and tooltip
 * - Claim references → clickable blue text with inline claim details
 */
export function StoryMessageWithEntities({
  content,
  claims,
  messageIdx,
  expandedClaims,
  onToggleClaim,
  formatRelativeTime
}: StoryMessageWithEntitiesProps) {
  const [entitiesMetadata, setEntitiesMetadata] = useState<Record<string, EntityMetadata>>({})
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null)

  useEffect(() => {
    const resolveEntities = async () => {
      // Extract all [[Entity Name]] from content
      const entityPattern = /\[\[([^\]|]+)\]\]/g
      const matches = content.matchAll(entityPattern)
      const entityNames = new Set<string>()

      for (const match of matches) {
        const name = match[1].trim()
        if (name) {
          entityNames.add(name)
        }
      }

      if (entityNames.size === 0) {
        return
      }

      // Resolve each entity by name using existing /api/entity endpoint
      const metadata: Record<string, EntityMetadata> = {}
      const promises = Array.from(entityNames).map(async (name) => {
        try {
          const response = await fetch(`/api/entity?name=${encodeURIComponent(name)}`)
          if (response.ok) {
            const entity = await response.json()
            metadata[name] = {
              name: entity.canonical_name || name,
              canonical_id: entity.canonical_id || '',
              entity_type: entity.entity_type?.toLowerCase() || 'unknown',
              qid: entity.wikidata_qid || '',
              wikidata_thumbnail: entity.wikidata_thumbnail,
              description: entity.description || '',
              claim_count: entity.claim_count || 0
            }
          }
        } catch (error) {
          // Silently fail for entity resolution
        }
      })

      await Promise.all(promises)
      setEntitiesMetadata(metadata)
    }

    resolveEntities()
  }, [content])

  // Parse content to render both claim references AND entity markup
  const renderContent = () => {
    // First, process entity markup [[Entity Name]]
    const entityPattern = /\[\[([^\]|]+)\]\]/g
    let processedContent = content

    // Replace entity markup with placeholders to avoid interference with claim regex
    const entityReplacements: { placeholder: string; jsx: JSX.Element }[] = []
    let entityIndex = 0
    processedContent = processedContent.replace(entityPattern, (match, name) => {
      const placeholder = `__ENTITY_${entityIndex}__`
      const metadata = entitiesMetadata[name.trim()]

      const entityColors: Record<string, string> = {
        person: '#805ad5',
        organization: '#3182ce',
        location: '#38a169',
        default: '#718096'
      }

      const entityColor = metadata?.entity_type && entityColors[metadata.entity_type]
        ? entityColors[metadata.entity_type]
        : entityColors.default

      const entityKey = `entity-${entityIndex}`

      entityReplacements.push({
        placeholder,
        jsx: (
          <span
            key={entityKey}
            className="inline"
            style={{ position: 'relative' }}
            onMouseEnter={() => setHoveredEntity(entityKey)}
            onMouseLeave={() => setHoveredEntity(null)}
          >
            <span
              style={{
                color: metadata ? '#7c3aed' : '#6b7280',
                borderBottom: metadata ? '2px solid #7c3aed' : '2px dotted #9ca3af',
                textDecoration: 'none',
                fontWeight: 500
              }}
            >
              {name.trim()}
            </span>
            {metadata?.wikidata_thumbnail && (
              <img
                src={metadata.wikidata_thumbnail}
                alt={metadata.name}
                className="inline-block w-6 h-6 rounded-full object-cover border-2 mx-1 align-middle"
                style={{ borderColor: entityColor }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}
            {!metadata && <span style={{ opacity: 0.6, marginLeft: '2px' }}>❓</span>}

            {/* Rich tooltip on hover */}
            {hoveredEntity === entityKey && metadata && (
              <div
                className="entity-tooltip"
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: '8px',
                  backgroundColor: '#2d3748',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  minWidth: '250px',
                  maxWidth: '350px',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  pointerEvents: 'none'
                }}
              >
                {/* Entity name and type */}
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: '4px',
                    color: '#90cdf4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{metadata.name}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      backgroundColor: entityColor,
                      color: 'white',
                      borderRadius: '3px',
                      textTransform: 'uppercase',
                      fontWeight: 500
                    }}
                  >
                    {metadata.entity_type}
                  </span>
                </div>

                {/* Wikidata QID and claim count */}
                <div
                  style={{
                    fontSize: '11px',
                    color: '#a0aec0',
                    marginBottom: '8px'
                  }}
                >
                  {metadata.qid} • {metadata.claim_count} claim{metadata.claim_count !== 1 ? 's' : ''}
                </div>

                {/* Description */}
                {metadata.description && (
                  <div style={{ color: '#e2e8f0' }}>{metadata.description}</div>
                )}

                {/* Tooltip arrow */}
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
      })

      entityIndex++
      return placeholder
    })

    // Now process claim references
    // Match patterns like "Claim 5" or "Claims 3 and 7" or "Claims 3, 7, and 12"
    const claimPattern = /\b[Cc]laim[s]?\s+(\d+(?:(?:,\s*(?:and\s+)?|\s+and\s+)\d+)*)/g
    const parts: (string | JSX.Element)[] = []
    let lastIndex = 0
    let match

    while ((match = claimPattern.exec(processedContent)) !== null) {
      if (match.index > lastIndex) {
        const text = processedContent.substring(lastIndex, match.index)
        // Replace entity placeholders with JSX
        const textParts = splitByPlaceholders(text, entityReplacements)
        parts.push(...textParts)
      }

      // Extract claim numbers
      const numbersText = match[1]
      const numbers = numbersText.match(/\d+/g)?.map(n => parseInt(n)) || []

      // Add clickable claim reference
      const claimKey = `${messageIdx}-${numbers[0]}`
      const isExpanded = expandedClaims.has(claimKey)

      parts.push(
        <span key={`claim-${match.index}`} className="inline-block">
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold cursor-pointer hover:bg-blue-200 transition-colors select-none"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleClaim(claimKey, numbers[0])
            }}
            title={isExpanded ? "Click to hide" : "Click to view claim text"}
          >
            Claim{numbers.length > 1 ? 's' : ''} {numbers.join(', ')}
          </span>
          {isExpanded && (
            <span className="block mt-2 space-y-2">
              {numbers.filter(num => num <= claims.length).map(num => (
                <span key={num} className="block p-3 bg-blue-50 border-l-4 border-blue-400 rounded text-xs text-slate-700 leading-relaxed">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-semibold text-blue-700">Claim {num}:</span>
                    {claims[num - 1]?.created_at && (
                      <span className="text-slate-500 text-[10px] flex-shrink-0">
                        {formatRelativeTime(claims[num - 1]?.created_at)}
                      </span>
                    )}
                  </div>
                  <div>{claims[num - 1]?.text}</div>
                </span>
              ))}
            </span>
          )}
        </span>
      )

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < processedContent.length) {
      const text = processedContent.substring(lastIndex)
      const textParts = splitByPlaceholders(text, entityReplacements)
      parts.push(...textParts)
    }

    return parts.length > 0 ? parts : processedContent
  }

  // Helper to split text by entity placeholders
  const splitByPlaceholders = (
    text: string,
    entityReplacements: { placeholder: string; jsx: JSX.Element }[]
  ): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = []
    let remainingText = text

    for (const { placeholder, jsx } of entityReplacements) {
      const index = remainingText.indexOf(placeholder)
      if (index !== -1) {
        if (index > 0) {
          parts.push(remainingText.substring(0, index))
        }
        parts.push(jsx)
        remainingText = remainingText.substring(index + placeholder.length)
      }
    }

    if (remainingText) {
      parts.push(remainingText)
    }

    return parts.length > 0 ? parts : [text]
  }

  return <>{renderContent()}</>
}
