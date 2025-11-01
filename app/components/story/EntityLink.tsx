import React, { useState, useRef } from 'react'

export interface EntityMetadata {
  name: string
  qid: string
  description: string
  image_url?: string
  entity_type: string
  claim_count: number
}

interface EntityLinkProps {
  name: string
  canonicalId: string
  entitiesMetadata: Record<string, EntityMetadata>
  onClick?: (canonicalId: string) => void
  isDev?: boolean
}

/**
 * Entity Link Component
 *
 * Renders inline entity links with hover tooltips showing Wikidata info
 * Clicking navigates to entity page or entity graph view
 */
export function EntityLink({
  name,
  canonicalId,
  entitiesMetadata,
  onClick,
  isDev = false
}: EntityLinkProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const metadata = entitiesMetadata[canonicalId]
  const hasMissingMetadata = !metadata

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (onClick && metadata) {
      onClick(canonicalId)
    }
  }

  const handleMouseEnter = () => {
    setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
  }

  // Dev mode: Warn about missing metadata
  if (isDev && hasMissingMetadata) {
    console.warn(`Missing entity metadata for: ${canonicalId} (${name})`)
  }

  // Entity type colors
  const entityTypeColors: Record<string, string> = {
    person: '#805ad5',
    organization: '#3182ce',
    location: '#38a169',
    event: '#d69e2e',
    default: '#718096'
  }

  const entityColor =
    metadata?.entity_type && entityTypeColors[metadata.entity_type.toLowerCase()]
      ? entityTypeColors[metadata.entity_type.toLowerCase()]
      : entityTypeColors.default

  return (
    <span
      className="entity-link-wrapper"
      style={{ position: 'relative', display: 'inline' }}
    >
      <span
        className={`entity-link ${hasMissingMetadata && isDev ? 'entity-error' : ''}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: metadata ? 'pointer' : 'default',
          color: hasMissingMetadata && isDev ? '#e53e3e' : entityColor,
          fontWeight: 500,
          borderBottom: `2px solid ${hasMissingMetadata && isDev ? '#e53e3e' : entityColor}`,
          textDecoration: 'none',
          transition: 'all 0.2s ease'
        }}
      >
        {name}
        {isDev && hasMissingMetadata && (
          <span style={{ color: '#e53e3e', marginLeft: '2px', fontSize: '0.8em' }}>
            [!]
          </span>
        )}
      </span>

      {/* Tooltip with entity info */}
      {showTooltip && metadata && (
        <div
          ref={tooltipRef}
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
            lineHeight: '1.4'
          }}
        >
          {/* Entity image (if available) */}
          {metadata.image_url && (
            <div style={{ marginBottom: '8px' }}>
              <img
                src={metadata.image_url}
                alt={metadata.name}
                style={{
                  width: '100%',
                  maxHeight: '120px',
                  objectFit: 'cover',
                  borderRadius: '4px'
                }}
              />
            </div>
          )}

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

          {/* Wikidata QID */}
          <div
            style={{
              fontSize: '11px',
              color: '#a0aec0',
              marginBottom: '8px'
            }}
          >
            {metadata.qid} • {metadata.claim_count} claim
            {metadata.claim_count !== 1 ? 's' : ''}
          </div>

          {/* Description */}
          <div style={{ color: '#e2e8f0' }}>{metadata.description}</div>

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
}
