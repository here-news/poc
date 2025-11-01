import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from './components/layout/Header'
import StoryChatSidebar from './components/layout/StoryChatSidebar'
import { ensureUserId } from './userSession'
import { StoryContentRenderer } from './components/story/StoryContentRenderer'
import type { CitationMetadata, EntityMetadata } from './types/story'
import { parseContent } from './utils/CitationParser'

// Declare Leaflet types
declare const L: any

interface StoryDetails {
  id: string
  title: string
  description: string
  content?: string
  category: string
  artifact_count: number
  claim_count: number
  people_count: number
  org_count?: number
  location_count?: number
  locations: string[]
  last_updated_human: string
  last_updated?: string
  created_at?: string
  cover_image?: string
  health_indicator?: string
  entropy?: number
  verified_claims?: number
  total_claims?: number
  confidence?: number
  coherence_score?: number
  revision?: string
  artifacts?: Array<{
    url: string
    title: string
    domain: string
    thumbnail_url?: string
    created_at: string
    pub_date?: string
    pub_time?: string
    published_at?: string
    publication_date?: string
    publish_date?: string
  }>
  related_stories?: Array<{
    id: string
    title: string
    match_score: number
    relationship_type: string
  }>
  entities?: {
    people: Array<{ id: string; name: string }>
    organizations: Array<{ id: string; name: string }>
    locations: Array<{ id: string; name: string }>
  }
}

// Helper function to strip markup from text (for summaries)
function stripMarkup(text: string): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, '$1')
}

// Helper function to parse custom date formats from database
function parseCustomDateFormat(dateStr: string): Date | null {
  try {
    // Handle relative dates like "Today at 6:00 a.m. EDT"
    if (dateStr.startsWith('Today ')) {
      const timeMatch = dateStr.match(/(\d+):(\d+)\s*(a\.m\.|p\.m\.|AM|PM)/i)
      if (timeMatch) {
        const now = new Date()
        let hour = parseInt(timeMatch[1])
        const minutes = parseInt(timeMatch[2])
        const meridiem = timeMatch[3].toLowerCase().replace(/\./g, '')

        if (meridiem === 'pm' && hour !== 12) hour += 12
        else if (meridiem === 'am' && hour === 12) hour = 0

        now.setHours(hour, minutes, 0, 0)
        return now
      }
    }

    // Match various formats:
    // "October 19, 2025 at 6:08 PM EDT"
    // "October 20, 2025 at 3:24 p.m. EDT"
    // "October 23, 2025, 2:16 PM ET"
    const match = dateStr.match(/^(\w+ \d+, \d+)[,\s]+(?:at\s+)?(\d+):(\d+)\s*(a\.m\.|p\.m\.|AM|PM)/i)
    if (!match) return null

    const [, datePart, hours, minutes, meridiem] = match
    let hour = parseInt(hours)

    // Normalize meridiem to lowercase without periods
    const normalizedMeridiem = meridiem.toLowerCase().replace(/\./g, '')

    // Convert to 24-hour format
    if (normalizedMeridiem === 'pm' && hour !== 12) {
      hour += 12
    } else if (normalizedMeridiem === 'am' && hour === 12) {
      hour = 0
    }

    // Parse the date part
    const dateObj = new Date(`${datePart} ${hour}:${minutes}:00`)
    return isNaN(dateObj.getTime()) ? null : dateObj
  } catch {
    return null
  }
}

// Helper function to format timestamp as relative time
function formatRelativeTime(timestamp: string): string {
  try {
    const now = new Date()
    let then = new Date(timestamp)

    // If standard parsing fails, try custom format
    if (isNaN(then.getTime())) {
      const customParsed = parseCustomDateFormat(timestamp)
      if (customParsed) {
        then = customParsed
      } else {
        console.warn('Failed to parse date:', timestamp)
        return 'Recently'
      }
    }

    const diffMs = now.getTime() - then.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)

    if (diffSeconds < 60) return 'just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffWeeks < 4) return `${diffWeeks}w ago`
    if (diffMonths < 12) return `${diffMonths}mo ago`
    return `${diffYears}y ago`
  } catch (err) {
    console.error('Error parsing date:', timestamp, err)
    return 'Recently'
  }
}

// Note: Canonical media names are now fetched from Neo4j Organization entities by domain
// The hardcoded mapping function has been removed in favor of database lookups

// Helper function to render content with entity links and tooltips
/**
 * Render story content with citation and entity markup
 * Supports both new format ({{cite:...}}, [[...|...]]) and legacy format ([[...]])
 */
function renderContentWithCitations(
  content: string,
  citationsMetadata?: Record<string, CitationMetadata>,
  entitiesMetadata?: Record<string, EntityMetadata>,
  onCitationClick?: (pageIds: string[]) => void
): JSX.Element {
  // If we have citations_metadata, use new StoryContentRenderer
  if (citationsMetadata || content.includes('{{cite:')) {
    return (
      <StoryContentRenderer
        content={content}
        citationsMetadata={citationsMetadata}
        entitiesMetadata={entitiesMetadata}
        onCitationClick={onCitationClick}
        isDev={import.meta.env.DEV}
        LegacyEntityComponent={EntityLink}
      />
    )
  }

  // Legacy format: [[Entity Name]] only (backwards compatibility)
  const entityPattern = /\[\[([^\]]+)\]\]/g
  const parts: (string | JSX.Element)[] = []
  let lastIndex = 0
  let match

  while ((match = entityPattern.exec(content)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index))
    }

    // Add legacy entity link
    const entityName = match[1]
    parts.push(
      <EntityLink
        key={`entity-${match.index}`}
        entityName={entityName}
      />
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex))
  }

  return <>{parts}</>
}

// OpenStreetMap component using Leaflet with visual hierarchy
function LocationMap({ locations, hoveredLocation }: { locations: Array<{ name: string }>, hoveredLocation: string | null }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const geocodeCacheRef = useRef<Map<string, { lat: number, lon: number, type: string, boundingbox?: number[] }>>(new Map())
  const [isInitialized, setIsInitialized] = useState(false)
  const allMarkersLoadedRef = useRef(false)

  // Determine location granularity and appropriate zoom level
  const getLocationConfig = (locationType: string) => {
    const type = locationType.toLowerCase()

    if (type.includes('country') || type.includes('nation')) {
      return { zoom: 4, color: '#3b82f6', size: 'large', radius: 5, label: 'Country' }
    } else if (type.includes('state') || type.includes('province') || type.includes('region')) {
      return { zoom: 6, color: '#10b981', size: 'medium', radius: 4, label: 'Region' }
    } else if (type.includes('city') || type.includes('town') || type.includes('village')) {
      return { zoom: 10, color: '#ef4444', size: 'small', radius: 3, label: 'City' }
    } else {
      // Default for unknown types
      return { zoom: 7, color: '#8b5cf6', size: 'medium', radius: 4, label: 'Location' }
    }
  }

  // Create custom marker with visual hierarchy
  const createCustomMarker = (lat: number, lon: number, name: string, type: string, isHovered: boolean) => {
    const config = getLocationConfig(type)
    const radius = isHovered ? config.radius * 1.4 : config.radius
    const opacity = isHovered ? 1 : 0.85

    const icon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: ${radius * 2}px;
          height: ${radius * 2}px;
          background: ${config.color};
          border: 1.5px solid white;
          border-radius: 50%;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
          opacity: ${opacity};
          transition: all 0.3s ease;
          transform: ${isHovered ? 'scale(1.2)' : 'scale(1)'};
        "></div>
      `,
      iconSize: [radius * 2, radius * 2],
      iconAnchor: [radius, radius]
    })

    return L.marker([lat, lon], { icon })
  }

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined' || mapInstanceRef.current) return

    mapInstanceRef.current = L.map(mapRef.current, {
      scrollWheelZoom: false,
      dragging: true,
      zoomControl: true,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(mapInstanceRef.current)

    setIsInitialized(true)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Load all location data on mount
  useEffect(() => {
    if (!isInitialized || allMarkersLoadedRef.current) return

    const loadAllLocations = async () => {
      const map = mapInstanceRef.current
      const bounds = L.latLngBounds([])

      // Load from localStorage first
      const loadFromCache = (name: string) => {
        try {
          const cached = localStorage.getItem(`geocode_${name}`)
          if (cached) {
            const data = JSON.parse(cached)
            // Validate cache data structure
            if (data.coords && data.coords.lat && data.coords.lon && data.timestamp) {
              // Check if cache is less than 30 days old
              if (Date.now() - data.timestamp < 30 * 24 * 60 * 60 * 1000) {
                console.log(`✓ Cache hit for ${name}:`, data.coords)
                geocodeCacheRef.current.set(name, data.coords)
                return true
              } else {
                console.log(`✗ Cache expired for ${name}`)
                localStorage.removeItem(`geocode_${name}`)
              }
            } else {
              console.log(`✗ Invalid cache data for ${name}`)
              localStorage.removeItem(`geocode_${name}`)
            }
          }
        } catch (err) {
          console.error('Failed to load from cache:', err)
          localStorage.removeItem(`geocode_${name}`)
        }
        return false
      }

      // Geocode all locations in parallel
      const geocodePromises = locations.map(async (location) => {
        // Try cache first
        if (loadFromCache(location.name)) {
          return
        }

        try {
          // Add random jitter (50-150ms) to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100))

          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location.name)}&limit=1`)
          const data = await response.json()

          if (data.length > 0) {
            const result = data[0]
            let locType = result.type || 'unknown'
            if (result.class === 'boundary' && result.type === 'administrative') {
              if (result.addresstype === 'country' || result.osm_type === 'relation') {
                locType = 'country'
              }
            }

            const coords = {
              lat: parseFloat(result.lat),
              lon: parseFloat(result.lon),
              type: locType,
              boundingbox: result.boundingbox
            }

            console.log(`✓ Geocoded ${location.name}:`, {
              display_name: result.display_name,
              lat: coords.lat,
              lon: coords.lon,
              type: locType
            })

            geocodeCacheRef.current.set(location.name, coords)

            // Save to localStorage
            try {
              localStorage.setItem(`geocode_${location.name}`, JSON.stringify({
                coords,
                timestamp: Date.now()
              }))
            } catch (err) {
              console.error('Failed to save to cache:', err)
            }
          } else {
            console.warn(`✗ No geocoding results for ${location.name}`)
          }
        } catch (err) {
          console.error('Failed to geocode location:', location.name, err)
        }
      })

      // Wait for all geocoding to complete
      await Promise.all(geocodePromises)

      // Add all markers
      geocodeCacheRef.current.forEach((coords, name) => {
        const marker = createCustomMarker(coords.lat, coords.lon, name, coords.type, false)
        marker.bindPopup(`<b>${name}</b><br><small>${getLocationConfig(coords.type).label}</small>`)
        marker.addTo(map)
        markersRef.current.set(name, { marker, coords })
        bounds.extend([coords.lat, coords.lon])
      })

      // Fit bounds with smart zoom limiting
      if (bounds.isValid()) {
        if (locations.length === 1) {
          const singleCoords = geocodeCacheRef.current.get(locations[0].name)
          if (singleCoords) {
            const config = getLocationConfig(singleCoords.type)
            map.setView([singleCoords.lat, singleCoords.lon], config.zoom)
          }
        } else {
          map.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 6,
            animate: true,
            duration: 0.8
          })
        }
      }

      allMarkersLoadedRef.current = true
    }

    loadAllLocations()
  }, [locations, isInitialized])

  // Handle hover interactions
  useEffect(() => {
    if (!mapInstanceRef.current || !allMarkersLoadedRef.current) return

    const map = mapInstanceRef.current

    if (hoveredLocation) {
      const cached = geocodeCacheRef.current.get(hoveredLocation)
      if (!cached) return

      const config = getLocationConfig(cached.type)

      // Update all markers: highlight hovered, dim others
      markersRef.current.forEach((data, name) => {
        const isHovered = name === hoveredLocation
        data.marker.remove()
        const newMarker = createCustomMarker(
          data.coords.lat,
          data.coords.lon,
          name,
          data.coords.type,
          isHovered
        )
        newMarker.bindPopup(`<b>${name}</b><br><small>${getLocationConfig(data.coords.type).label}</small>`)
        if (isHovered) {
          newMarker.openPopup()
        }
        newMarker.addTo(map)
        markersRef.current.set(name, { ...data, marker: newMarker })
      })

      // Smooth fly to hovered location with appropriate zoom
      map.flyTo([cached.lat, cached.lon], config.zoom, {
        duration: 0.6,
        easeLinearity: 0.25
      })
    } else {
      // Reset to overview when hoveredLocation is null
      const bounds = L.latLngBounds([])

      markersRef.current.forEach((data, name) => {
        data.marker.remove()
        const newMarker = createCustomMarker(
          data.coords.lat,
          data.coords.lon,
          name,
          data.coords.type,
          false
        )
        newMarker.bindPopup(`<b>${name}</b><br><small>${getLocationConfig(data.coords.type).label}</small>`)
        newMarker.addTo(map)
        markersRef.current.set(name, { ...data, marker: newMarker })
        bounds.extend([data.coords.lat, data.coords.lon])
      })

      // Fly back to overview
      if (bounds.isValid()) {
        if (locations.length === 1) {
          const singleCoords = geocodeCacheRef.current.get(locations[0].name)
          if (singleCoords) {
            const config = getLocationConfig(singleCoords.type)
            map.flyTo([singleCoords.lat, singleCoords.lon], config.zoom, {
              duration: 0.6,
              easeLinearity: 0.25
            })
          }
        } else {
          map.flyToBounds(bounds, {
            padding: [40, 40],
            maxZoom: 6,
            duration: 0.6,
            easeLinearity: 0.25
          })
        }
      }
    }
  }, [hoveredLocation, locations])

  return <div ref={mapRef} className="w-full h-full min-h-[200px]" />
}

// Entity link component with hover tooltip and floating headshot
function EntityLink({ entityName }: { entityName: string }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [entityData, setEntityData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [hasBeenTapped, setHasBeenTapped] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<'center' | 'left' | 'right'>('center')
  const [tooltipCoords, setTooltipCoords] = useState({ top: 0, left: 0 })
  const [showHeadshot, setShowHeadshot] = useState(false)
  const [headshotSide, setHeadshotSide] = useState<'left' | 'right'>('left')
  const linkRef = React.useRef<HTMLAnchorElement>(null)
  const [hasLoadedHeadshot, setHasLoadedHeadshot] = useState(false)

  const fetchEntityData = async () => {
    if (entityData || loading) return entityData

    setLoading(true)
    try {
      const response = await fetch(`/api/entity?name=${encodeURIComponent(entityName)}`)
      if (response.ok) {
        const data = await response.json()
        setEntityData(data)
        return data
      }
    } catch (err) {
      console.error('Failed to fetch entity:', err)
    } finally {
      setLoading(false)
    }
    return null
  }

  // Intersection Observer for lazy loading headshots
  React.useEffect(() => {
    if (!linkRef.current || hasLoadedHeadshot) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasLoadedHeadshot) {
            setHasLoadedHeadshot(true)

            // Fetch entity data
            fetchEntityData().then((data) => {
              // Only show headshot for people with thumbnails
              if (data?.entity_type === 'Person' && data?.wikidata_thumbnail) {
                // Determine left or right based on position in viewport
                const rect = linkRef.current?.getBoundingClientRect()
                if (rect) {
                  const viewportCenter = window.innerWidth / 2
                  setHeadshotSide(rect.left < viewportCenter ? 'left' : 'right')
                }

                // Show headshot with slight delay for animation
                setTimeout(() => setShowHeadshot(true), 100)
              }
            })
          }
        })
      },
      {
        threshold: 0,
        // Slightly anticipatory - triggers when entering top 75% of viewport
        rootMargin: '0px 0px -25% 0px'
      }
    )

    observer.observe(linkRef.current)

    return () => {
      if (linkRef.current) {
        observer.unobserve(linkRef.current)
      }
    }
  }, [hasLoadedHeadshot])

  const handleMouseEnter = () => {
    if (showTooltip) return // Prevent recalculation if already shown
    setShowTooltip(true)
    fetchEntityData()
    // Delay position calculation slightly to ensure link is rendered
    setTimeout(() => {
      const coords = calculateTooltipPosition()
      setTooltipCoords({ top: coords.top, left: coords.left })
    }, 10)
  }

  const calculateTooltipPosition = () => {
    if (!linkRef.current) return { position: 'center', top: 0, left: 0 }

    const rect = linkRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const padding = 16
    // On mobile, tooltip width is viewport - 2rem (32px), on desktop it's 320px
    const tooltipWidth = viewportWidth < 640 ? viewportWidth - 32 : 320
    const tooltipHeight = 450 // Approximate max height

    // Calculate top position (prefer below the link)
    let top = rect.bottom + 8
    let showAbove = false

    // If tooltip would go below viewport, show above instead
    if (top + tooltipHeight > viewportHeight - padding) {
      top = rect.top - 8
      showAbove = true

      // If also too high when above, clamp to top of viewport
      if (top < padding) {
        top = padding
        showAbove = false
      } else {
        top = top - tooltipHeight
      }
    }

    // Ensure top is never negative or too low
    top = Math.max(padding, Math.min(top, viewportHeight - tooltipHeight - padding))

    let left = rect.left + rect.width / 2 - tooltipWidth / 2
    let position: 'center' | 'left' | 'right' = 'center'

    // If tooltip would overflow on the right
    if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding
      position = 'right'
    }
    // If tooltip would overflow on the left
    else if (left < padding) {
      left = padding
      position = 'left'
    }

    setTooltipPosition(position)
    return { position, top, left }
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
  }

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Always prevent default and handle navigation manually
    e.preventDefault()

    // Detect touch devices
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    if (isTouchDevice) {
      if (!hasBeenTapped) {
        // First tap - show tooltip only
        e.stopPropagation()
        setShowTooltip(true)
        setHasBeenTapped(true)
        fetchEntityData()
        const coords = calculateTooltipPosition()
        setTooltipCoords({ top: coords.top, left: coords.left })
        return
      }
    }

    // Fetch entity data if not already loaded
    const data = entityData || await fetchEntityData()

    console.log('Entity data for navigation:', data) // Debug log

    // Try multiple possible field names for entity ID
    const entityId = data?.id || data?.entity_id || data?.rid || data?.canonical_id

    if (entityId && data?.entity_type) {
      const type = data.entity_type.toLowerCase()
      const slug = entityName.toLowerCase().replace(/\s+/g, '-')

      const typeMap: { [key: string]: string } = {
        'person': 'people',
        'organization': 'organizations',
        'location': 'locations'
      }

      const path = typeMap[type] || 'entity'
      const url = `/${path}/${entityId}/${slug}`
      console.log('Navigating to:', url) // Debug log
      window.location.href = url
    } else {
      console.error('Missing entity ID or type:', data)
    }
  }

  const handleTouchEnd = () => {
    // Reset tap state when tooltip is closed by tapping elsewhere
    if (!showTooltip) {
      setHasBeenTapped(false)
    }
  }

  // Close tooltip when clicking outside
  React.useEffect(() => {
    if (showTooltip) {
      const handleClickOutside = () => {
        setShowTooltip(false)
        setHasBeenTapped(false)
      }
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showTooltip])

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Person': return 'bg-blue-100 text-blue-700'
      case 'Organization': return 'bg-orange-100 text-orange-700'
      case 'Location': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Construct entity page URL using RID and entity type
  const getEntityUrl = () => {
    if (!entityData?.id || !entityData?.entity_type) return '#'

    const type = entityData.entity_type.toLowerCase()
    const slug = entityName.toLowerCase().replace(/\s+/g, '-')

    // Map entity types to URL paths
    const typeMap: { [key: string]: string } = {
      'person': 'people',
      'organization': 'organizations',
      'location': 'locations'
    }

    const path = typeMap[type] || 'entity'
    return `/${path}/${entityData.id}/${slug}`
  }

  // Calculate arrow position relative to entity link
  const getArrowPosition = () => {
    if (!linkRef.current) return { left: '50%' }

    const rect = linkRef.current.getBoundingClientRect()
    const linkCenter = rect.left + rect.width / 2
    const arrowLeft = linkCenter - tooltipCoords.left

    return { left: `${arrowLeft}px` }
  }

  return (
    <span className="relative inline-block">
      <a
        ref={linkRef}
        href={getEntityUrl()}
        className="text-blue-600 hover:text-blue-700 border-b border-blue-300 border-dotted cursor-pointer transition-colors"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onTouchEnd={handleTouchEnd}
      >
        {entityName}
      </a>

      {/* Floating headshot */}
      {showHeadshot && entityData?.wikidata_thumbnail && (
        <span
          className={`inline-block align-middle mx-1 sm:mx-2 transition-all duration-500 ease-out ${
            showHeadshot ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          }`}
          style={{
            animation: 'fadeInScale 0.5s ease-out'
          }}
        >
          <img
            src={entityData.wikidata_thumbnail}
            alt={entityData.canonical_name || entityName}
            className="w-10 h-10 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-blue-300 shadow-lg"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              setShowHeadshot(false)
            }}
          />
        </span>
      )}

      {showTooltip && (
        <div
          className="fixed z-50 w-[calc(100vw-2rem)] max-w-sm sm:w-80 p-4 bg-white border border-slate-300 rounded-lg shadow-xl pointer-events-auto"
          style={{
            top: `${tooltipCoords.top}px`,
            left: `${tooltipCoords.left}px`,
            pointerEvents: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={(e) => e.stopPropagation()}
        >
          {/* Arrow */}
          <div
            className="absolute -top-2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-slate-300"
            style={getArrowPosition()}
          />

          {loading && (
            <div className="text-sm text-slate-500 italic">Loading...</div>
          )}

          {!loading && entityData && (
            <>
              {/* Thumbnail Image or Media Logo */}
              {entityData.wikidata_thumbnail ? (
                <div className="mb-3 flex justify-center">
                  <img
                    src={entityData.wikidata_thumbnail}
                    alt={entityData.canonical_name}
                    className="w-32 h-32 object-cover rounded-lg border border-slate-200"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              ) : entityData.entity_type === 'Organization' && entityData.context?.domain ? (
                <div className="mb-3 flex justify-center">
                  <div className="w-32 h-32 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${entityData.context.domain}&sz=128`}
                      alt={entityData.canonical_name}
                      className="w-20 h-20"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              ) : null}

              <div className="font-semibold text-slate-900 mb-2">{entityData.canonical_name}</div>
              <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mb-3 ${getTypeColor(entityData.entity_type)}`}>
                {entityData.entity_type}
              </div>

              {entityData.description && (
                <p className="text-sm text-slate-700 mb-3 leading-relaxed">
                  {entityData.description}
                </p>
              )}

              {entityData.wikidata_qid && (
                <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                  <a
                    href={`https://www.wikidata.org/wiki/${entityData.wikidata_qid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    🔗 View on Wikidata
                  </a>
                </div>
              )}

              {entityData.confidence && (
                <div className="text-xs text-slate-500 mt-2">
                  Confidence: {Math.round(entityData.confidence * 100)}%
                </div>
              )}
            </>
          )}

          {!loading && !entityData && (
            <div className="text-sm text-slate-500">
              Entity information unavailable
            </div>
          )}
        </div>
      )}
    </span>
  )
}

function StoryPage() {
  const { id } = useParams<{ id: string }>()
  const [userId, setUserId] = useState('')
  const [story, setStory] = useState<StoryDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [orgsExpanded, setOrgsExpanded] = useState(false)
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null)
  const [tappedLocation, setTappedLocation] = useState<string | null>(null)
  const [sourcesOrderNewest, setSourcesOrderNewest] = useState(false)
  const [sourceVotes, setSourceVotes] = useState<{ [url: string]: { upvotes: number, downvotes: number, userVote: 'up' | 'down' | null } }>({})
  const [mediaEntities, setMediaEntities] = useState<{ [domain: string]: any }>({})
  const [highlightedSourceId, setHighlightedSourceId] = useState<string | null>(null)
  const [pageIdToCitationNumber, setPageIdToCitationNumber] = useState<Map<string, number>>(new Map())
  const [storyClaims, setStoryClaims] = useState<Array<{ text: string; confidence?: number }>>([])

  // Pin state (mockup)
  const [isPinned, setIsPinned] = useState(false)

  // Tip/contributors state (mockup)
  const [contributorCount, setContributorCount] = useState(5)
  const [totalTips, setTotalTips] = useState(12)

  useEffect(() => {
    const uid = ensureUserId()
    setUserId(uid)
  }, [])

  useEffect(() => {
    if (id) {
      fetchStoryDetails(id)
    }
  }, [id])

  // Reset tapped location when clicking outside locations section
  useEffect(() => {
    const handleClickOutside = () => {
      setTappedLocation(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Auto-expand Organizations if no People or Locations
  useEffect(() => {
    if (story) {
      const hasPeople = story.entities?.people && story.entities.people.length > 0
      const hasLocations = story.entities?.locations && story.entities.locations.length > 0
      const hasOrgs = story.entities?.organizations && story.entities.organizations.length > 0

      // Expand organizations if there are orgs but no people and no locations
      if (hasOrgs && !hasPeople && !hasLocations) {
        setOrgsExpanded(true)
      }
    }
  }, [story])

  // Initialize source votes when story artifacts are loaded
  useEffect(() => {
    if (story?.artifacts && story.artifacts.length > 0) {
      const newVotes: { [url: string]: { upvotes: number, downvotes: number, userVote: 'up' | 'down' | null } } = {}
      story.artifacts.forEach(artifact => {
        if (!sourceVotes[artifact.url]) {
          newVotes[artifact.url] = {
            upvotes: Math.floor(Math.random() * 50) + 10,
            downvotes: Math.floor(Math.random() * 5),
            userVote: null
          }
        }
      })
      if (Object.keys(newVotes).length > 0) {
        setSourceVotes(prev => ({ ...prev, ...newVotes }))
      }
    }
  }, [story?.artifacts])

  // Fetch media organization entities for artifacts
  useEffect(() => {
    console.log('Media fetch useEffect triggered. Story artifacts:', story?.artifacts)
    if (story?.artifacts && story.artifacts.length > 0) {
      const fetchMediaEntities = async () => {
        // Extract domain from URL if not present in artifact
        const extractDomain = (url: string) => {
          try {
            const urlObj = new URL(url)
            return urlObj.hostname.replace(/^www\./, '')
          } catch {
            return null
          }
        }

        const allDomains = story.artifacts.map(a => a.domain || extractDomain(a.url))
        console.log('All domains after extraction:', allDomains)
        const domains = [...new Set(allDomains.filter(d => d && d !== 'null'))]
        console.log('Unique domains after filter:', domains)

        for (const domain of domains) {
          try {
            console.log(`Fetching entity for domain: ${domain}`)
            // Try to fetch organization entity by domain
            const response = await fetch(`/api/entity?domain=${encodeURIComponent(domain)}`)
            console.log(`Response for ${domain}:`, response.status, response.ok)

            if (response.ok) {
              const data = await response.json()
              console.log(`Entity data for ${domain}:`, data)
              if (data && data.entity_type === 'Organization') {
                setMediaEntities(prev => ({ ...prev, [domain]: data }))
                console.log(`✅ Found organization: ${data.canonical_name}`)
              } else {
                console.log(`Not an organization entity for ${domain}`)
              }
            } else if (response.status === 404) {
              console.log(`Entity not found for ${domain}`)
            } else {
              console.log(`API error for ${domain}: ${response.status}`)
            }
          } catch (err) {
            console.error(`Failed to fetch entity for domain ${domain}:`, err)
          }
        }
      }

      fetchMediaEntities()
    }
  }, [story?.artifacts])

  // Build citation number mapping when story content changes
  useEffect(() => {
    if (story?.content) {
      const parsed = parseContent(story.content)
      const numbers = new Map<string, number>()
      let counter = 1

      for (const citation of parsed.citations) {
        for (const pageId of citation.pageIds) {
          if (!numbers.has(pageId)) {
            numbers.set(pageId, counter++)
          }
        }
      }

      setPageIdToCitationNumber(numbers)
    }
  }, [story?.content])

  // Fetch claims for the story
  useEffect(() => {
    if (story?.id) {
      fetch(`/api/story/${story.id}/claims`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.claims)) {
            console.log('Fetched claims:', data.claims.slice(0, 2)) // Debug: check first 2 claims
            setStoryClaims(data.claims)
          }
        })
        .catch(err => console.error('Failed to fetch claims:', err))
    }
  }, [story?.id])

  // Handle voting
  const handleVote = (url: string, voteType: 'up' | 'down') => {
    setSourceVotes(prev => {
      const current = prev[url] || { upvotes: 0, downvotes: 0, userVote: null }

      if (current.userVote === voteType) {
        // Unvote
        return {
          ...prev,
          [url]: {
            upvotes: voteType === 'up' ? current.upvotes - 1 : current.upvotes,
            downvotes: voteType === 'down' ? current.downvotes - 1 : current.downvotes,
            userVote: null
          }
        }
      } else if (current.userVote === null) {
        // New vote
        return {
          ...prev,
          [url]: {
            upvotes: voteType === 'up' ? current.upvotes + 1 : current.upvotes,
            downvotes: voteType === 'down' ? current.downvotes + 1 : current.downvotes,
            userVote: voteType
          }
        }
      } else {
        // Change vote
        return {
          ...prev,
          [url]: {
            upvotes: voteType === 'up' ? current.upvotes + 1 : current.upvotes - 1,
            downvotes: voteType === 'down' ? current.downvotes + 1 : current.downvotes - 1,
            userVote: voteType
          }
        }
      }
    })
  }

  const fetchStoryDetails = async (storyId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/stories/${storyId}`)

      if (!response.ok) {
        setError('Story not found')
        return
      }

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else if (data.story) {
        console.log('Raw API story data:', data.story) // Debug - see all fields

        // Map API response to StoryDetails format
        const storyData = {
          ...data.story,
          // Ensure all required fields have defaults
          description: data.story.description || data.story.gist || 'No description available',
          content: data.story.content,
          locations: data.story.locations || [],
          artifact_count: data.story.artifact_count || 0,
          claim_count: data.story.claim_count || 0,
          people_count: data.story.people_count || 0,
          last_updated: data.story.last_activity || data.story.updated_at || data.story.last_updated || data.story.lastUpdated,
          created_at: data.story.created_at || data.story.createdAt,
          last_updated_human: data.story.last_updated_human || 'Recently',
          health_indicator: data.story.health_indicator || 'healthy',
          category: data.story.category || 'general'
        }

        console.log('Story last_updated timestamp:', storyData.last_updated) // Debug
        setStory(storyData)
      } else {
        setError('Invalid story data')
      }
    } catch (err) {
      console.error('Error fetching story:', err)
      setError('Failed to load story details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Header userId={userId} />
          <div className="mt-10 text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-600">Loading story...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Header userId={userId} />
          <div className="mt-10 text-center">
            <p className="text-red-600">{error || 'Story not found'}</p>
            <Link to="/" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const entropy = story.entropy || 0.45
  const entropyPercentage = (entropy * 100).toFixed(0)
  const entropyBarWidth = `${entropyPercentage}%`
  const confidence = story.confidence || 72

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <Header userId={userId} />

        <main className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 sm:gap-6 lg:gap-8">
          {/* Main Story Content */}
          <div className="space-y-4 sm:space-y-6">
            {/* Title & Summary - Merged */}
            <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 border-2 border-blue-200 rounded-2xl overflow-hidden shadow-md relative">

              {/* Pin Button - At Corner */}
              <button
                onClick={() => setIsPinned(!isPinned)}
                className={`absolute top-2 left-2 z-20 transition-all duration-300 ${
                  isPinned ? 'text-yellow-500' : 'text-slate-400 hover:text-slate-600'
                }`}
                style={{
                  transform: isPinned ? 'rotate(-45deg) scale(1.1)' : 'rotate(0deg) scale(1)',
                  transformOrigin: 'center'
                }}
                title={isPinned ? 'Pinned - Watching for 24h' : 'Click to pin (1p to keep 24h watching)'}
              >
                {/* Simple pushpin icon */}
                <svg className="w-6 h-6 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 12V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                </svg>
              </button>

              <div className="relative z-10 p-6 sm:p-8 md:p-10">
                {/* Title */}
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 leading-tight text-slate-900 tracking-tight">{story.title}</h1>

                {/* Summary with Quote Styling */}
                <div className="relative">
                  <div className="absolute -left-4 top-0 text-7xl text-blue-200 font-serif leading-none select-none">"</div>
                  <p className="relative text-xl leading-relaxed text-slate-800 font-medium pl-8">
                    {stripMarkup(story.description)}
                    <span className="text-sm text-slate-500 ml-3 font-normal">
                      • {story.last_updated ? formatRelativeTime(story.last_updated) : story.last_updated_human}
                    </span>
                  </p>
                </div>

                {/* Tipping Visual Bar - Flow: Coherence ← Builders ← Fund ← Tip */}
                <div className="mt-8 border-t border-slate-200 pt-6">
                  {/* Helper text */}
                  <div className="text-xs text-slate-500 mb-3 italic">
                    💡 Tips fund community & AI to evolve this story
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Coherence Bar - Smaller */}
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2.5 bg-slate-200 rounded-full overflow-hidden relative group">
                        <div
                          className="h-full bg-gradient-to-r from-slate-600 via-emerald-400 to-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${(story.coherence_score || 0.75) * 100}%` }}
                        />
                        {/* Tooltip on hover */}
                        <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap z-10">
                          Story coherence: {Math.round((story.coherence_score || 0.75) * 100)}%
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-green-700 whitespace-nowrap">
                        {Math.round((story.coherence_score || 0.75) * 100)}%
                      </span>
                    </div>

                    {/* Left Arrow */}
                    <svg className="hidden sm:block w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>

                    {/* Builders Count */}
                    <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 bg-slate-50 rounded border border-slate-200">
                      <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                      </svg>
                      <span className="text-xs font-semibold text-slate-700">
                        {contributorCount}
                      </span>
                    </div>

                    {/* Left Arrow */}
                    <svg className="hidden sm:block w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>

                    {/* Fund Amount */}
                    <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 bg-teal-50 rounded border border-teal-200">
                      <span className="text-xs text-slate-600 font-medium">fund:</span>
                      <span className="text-xs sm:text-sm font-bold text-teal-700">
                        ${(totalTips * 0.01).toFixed(2)}
                      </span>
                    </div>

                    {/* Left Arrow */}
                    <svg className="hidden sm:block w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>

                    {/* Tip Buttons - Compact */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <span className="text-xs text-slate-500 font-medium">tip:</span>
                      {[1, 10, 100].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setTotalTips(totalTips + amount)}
                          className="px-2 sm:px-2.5 py-1 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white text-xs font-semibold rounded transition-all shadow-sm hover:shadow-md active:scale-95"
                        >
                          {amount}c
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Full Story Content */}
            {story.content && story.content.length > 100 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 sm:p-8 md:p-10">
                  {/* Story Body with Enhanced Typography */}
                  <div className="prose prose-lg sm:prose-xl prose-slate max-w-none">
                    <div className="text-slate-800 leading-[1.9] text-base sm:text-[18px] whitespace-pre-line">
                      {/* Drop cap for first letter - using brand teal color */}
                      <style>{`
                        .story-content::first-letter {
                          font-size: 3.5em;
                          line-height: 0.9;
                          float: left;
                          margin: 0.1em 0.1em 0 0;
                          font-weight: bold;
                          color: #008080;
                        }
                        @keyframes fadeInScale {
                          from {
                            opacity: 0;
                            transform: scale(0.3);
                          }
                          to {
                            opacity: 1;
                            transform: scale(1);
                          }
                        }
                      `}</style>
                      <div className="story-content">
                        {renderContentWithCitations(
                          story.content,
                          // Build citationsMetadata from artifacts array
                          story.artifacts ? Object.fromEntries(
                            (story.artifacts as any[])
                              .filter(a => a.id || a.page_id)
                              .map(a => [
                                a.id || a.page_id,
                                {
                                  url: a.url,
                                  title: a.title,
                                  domain: a.site || a.domain,
                                  pub_time: a.pub_time || a.published_at || a.pub_date,
                                  snippet: a.gist || a.snippet || ''
                                }
                              ])
                          ) : (story as any).story_content?.citations_metadata,
                          (story as any).story_content?.entities_metadata,
                          // Citation click handler - scroll to sidebar source
                          (pageIds: string[]) => {
                            // Highlight and scroll to first cited source
                            if (pageIds.length > 0) {
                              const firstPageId = pageIds[0]
                              console.log('Citation clicked - Page IDs:', pageIds, 'First:', firstPageId)
                              setHighlightedSourceId(firstPageId)

                              setTimeout(() => {
                                const element = document.querySelector(`[data-source-id="${firstPageId}"]`) as HTMLElement
                                if (element) {
                                  console.log('Found element with title:', element.querySelector('a')?.textContent)
                                  // Find the scrollable sources-list container
                                  const sourcesList = document.getElementById('sources-list')
                                  if (sourcesList) {
                                    // Calculate element position relative to the sources-list container
                                    const elementTop = element.offsetTop
                                    const sourcesListHeight = sourcesList.clientHeight
                                    const elementHeight = element.clientHeight

                                    // Scroll to center the element in the sources-list
                                    const scrollTo = elementTop - (sourcesListHeight / 2) + (elementHeight / 2)
                                    sourcesList.scrollTo({
                                      top: scrollTo,
                                      behavior: 'smooth'
                                    })
                                  }
                                }
                              }, 100)

                              // Clear highlight after 3 seconds
                              setTimeout(() => setHighlightedSourceId(null), 3000)
                            }
                          }
                        )}
                        <span className="text-slate-600 italic"> ── φ HERE.news</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Locations Section - Horizontal with Map */}
            {story.entities?.locations && story.entities.locations.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 sm:p-6 md:p-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Locations</h2>

                  <div
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    onMouseLeave={() => {
                      // Reset hover when mouse leaves the entire locations container
                      setTimeout(() => {
                        setHoveredLocation(null)
                        setTappedLocation(null)
                      }, 100)
                    }}
                  >
                    {/* Location chips - horizontal layout */}
                    <div className="flex flex-wrap gap-2">
                      {story.entities.locations.map((location: any) => (
                        <Link
                          key={location.id}
                          to={`/locations/${location.id}/${location.name.toLowerCase().replace(/\s+/g, '-')}`}
                          className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-teal-50 hover:from-green-100 hover:to-teal-100 border rounded-full transition-all duration-200 group ${
                            hoveredLocation === location.name || tappedLocation === location.name
                              ? 'border-green-400 shadow-md scale-105'
                              : 'border-green-200 hover:border-green-300'
                          }`}
                          onMouseEnter={() => setHoveredLocation(location.name)}
                          onClick={(e) => {
                            // Detect if it's a touch device
                            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

                            if (isTouchDevice) {
                              e.stopPropagation() // Prevent document click listener
                              if (tappedLocation === location.name) {
                                // Second tap - allow navigation
                                return
                              } else {
                                // First tap - prevent navigation, pan map
                                e.preventDefault()
                                setTappedLocation(location.name)
                                setHoveredLocation(location.name)
                              }
                            }
                            // Desktop: normal click navigation
                          }}
                        >
                          {location.thumbnail ? (
                            <img
                              src={location.thumbnail}
                              alt={location.name}
                              className="w-6 h-6 rounded-full object-cover border border-green-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                            <span className="text-sm">📍</span>
                          )}
                          <span className="text-sm font-medium text-slate-900 group-hover:text-green-700">
                            {location.name}
                          </span>
                        </Link>
                      ))}
                    </div>

                    {/* Map with location markers using OpenStreetMap */}
                    <div className="bg-slate-100 rounded-lg overflow-hidden border border-slate-200 h-48 lg:h-auto min-h-[200px] relative">
                      <LocationMap
                        locations={story.entities.locations}
                        hoveredLocation={hoveredLocation}
                      />
                      {hoveredLocation && (
                        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border border-green-300 pointer-events-none z-[1000]">
                          <span className="text-xs font-semibold text-green-700">
                            📍 {hoveredLocation}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Related Stories Section */}
            {story.related_stories && story.related_stories.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 sm:p-6 md:p-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Related Stories</h2>
                  <div className="space-y-2">
                    {story.related_stories.map((related) => (
                      <Link
                        key={related.id}
                        to={`/story/${related.id}`}
                        className="flex items-center justify-between p-4 bg-slate-50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border border-slate-200 hover:border-blue-300 rounded-lg transition-all duration-200 group"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                            {related.title}
                          </div>
                          {related.match_score && (
                            <div className="text-xs text-slate-500 mt-1">
                              {Math.round(related.match_score * 100)}% match
                            </div>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-3 sm:space-y-4 lg:space-y-5 lg:sticky lg:top-8 h-fit">
            {/* Organizations in Story - Collapsible */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
              <button
                onClick={() => setOrgsExpanded(!orgsExpanded)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Organizations</h3>
                <div className="flex items-center gap-2">
                  {story.entities?.organizations && story.entities.organizations.length > 0 && (
                    <span className="text-xs text-slate-500">({story.entities.organizations.length})</span>
                  )}
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${orgsExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {orgsExpanded && (
                <div className="mt-4">
                  {story.entities?.organizations && story.entities.organizations.length > 0 ? (
                    <div className="space-y-2">
                      {story.entities.organizations.map((org: any) => (
                        <Link
                          key={org.id}
                          to={`/organizations/${org.id}/${org.name.toLowerCase().replace(/\s+/g, '-')}`}
                          className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group"
                        >
                          {org.thumbnail ? (
                            <img
                              src={org.thumbnail}
                              alt={org.name}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-slate-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : org.domain ? (
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${org.domain}&sz=64`}
                              alt={org.name}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-slate-200 bg-white p-2"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          <div className={`w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 ${org.thumbnail || org.domain ? 'hidden' : ''}`}>
                            <span className="text-base">🏢</span>
                          </div>
                          <span className="text-sm text-slate-900 group-hover:text-blue-600 flex-1">{org.name}</span>
                          <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No organizations mentioned</p>
                  )}
                </div>
              )}
            </div>

            {/* Timeline Placeholder */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Timeline</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Story timeline coming soon
              </p>
            </div>

            {/* Sources */}
            {story.artifacts && story.artifacts.length > 0 && (() => {
              const extractDomain = (url: string) => {
                try {
                  const urlObj = new URL(url)
                  return urlObj.hostname.replace(/^www\./, '')
                } catch {
                  return null
                }
              }

              const uniqueArtifacts = story.artifacts.reduce((acc, artifact) => {
                const existing = acc.find(a => a.url === artifact.url)
                const artifactWithDomain = {
                  ...artifact,
                  domain: artifact.domain || extractDomain(artifact.url)
                }
                if (!existing) {
                  acc.push(artifactWithDomain)
                }
                return acc
              }, [] as typeof story.artifacts)

              // Sort by publication time (use index as stable fallback to prevent shuffling)
              const sortedArtifacts = [...uniqueArtifacts].sort((a, b) => {
                // Try multiple possible field names for publication date (prioritize pub_time)
                const getTimestamp = (artifact: any) => {
                  const pubDate = artifact.pub_time || artifact.published_at || artifact.pub_date || artifact.publication_date || artifact.publish_date || artifact.created_at
                  if (pubDate) {
                    let date = new Date(pubDate)
                    // If standard parsing fails, try custom format
                    if (isNaN(date.getTime())) {
                      const customParsed = parseCustomDateFormat(pubDate)
                      if (customParsed) {
                        date = customParsed
                      }
                    }
                    return date.getTime()
                  }
                  // If no date, use a stable fallback based on array position to prevent random shuffling
                  return uniqueArtifacts.indexOf(artifact)
                }

                const timeA = getTimestamp(a)
                const timeB = getTimestamp(b)
                return sourcesOrderNewest ? timeB - timeA : timeA - timeB
              })

              return (
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-700">
                        Sources({uniqueArtifacts.length})
                      </span>
                      <span className="text-slate-400">by</span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                        </svg>
                        Builders({contributorCount})
                      </span>
                      <button
                        onClick={() => setSourcesOrderNewest(!sourcesOrderNewest)}
                        className="flex items-center justify-center w-6 h-6 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                        title={sourcesOrderNewest ? "Showing newest first - click for oldest" : "Showing oldest first - click for newest"}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sourcesOrderNewest ? "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" : "M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"} />
                        </svg>
                      </button>
                    </div>
                    <a
                      href={`/builder/${story.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm hover:shadow-md whitespace-nowrap"
                      title="Open in Builder View - Edit story collaboratively"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Build
                    </a>
                  </div>
                  <div id="sources-list" className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                    {sortedArtifacts.map((artifact, idx) => {
                      // Get canonical name from fetched media entity or fall back to domain
                      const mediaEntity = artifact.domain ? mediaEntities[artifact.domain] : null
                      const canonicalName = mediaEntity?.canonical_name || artifact.domain || 'Unknown source'
                      const votes = sourceVotes[artifact.url] || { upvotes: 0, downvotes: 0, userVote: null }

                      // Try multiple possible field names for publication date (prioritize pub_time from experiments-v2)
                      // Fallback to story's last_updated if artifact has no date
                      const pubDate = artifact.pub_time || artifact.published_at || artifact.pub_date || artifact.publication_date || artifact.publish_date || artifact.created_at || story.last_updated

                      // Debug logging to see what's available (only first artifact)
                      if (idx === 0) {
                        console.log('Artifact full object:', artifact)
                        console.log('Artifact keys:', Object.keys(artifact))
                        console.log('Date fields:', {
                          pub_time: artifact.pub_time,
                          pub_date: artifact.pub_date,
                          published_at: artifact.published_at,
                          publication_date: artifact.publication_date,
                          publish_date: artifact.publish_date,
                          created_at: artifact.created_at,
                          story_fallback: story.last_updated
                        })
                        console.log('Media entity:', mediaEntity)
                        console.log('Canonical name:', canonicalName)
                        console.log('Final pubDate used:', pubDate)
                      }

                      const isHighlighted = artifact.id && highlightedSourceId === artifact.id
                      const citationNumber = artifact.id ? pageIdToCitationNumber.get(artifact.id) : undefined

                      return (
                        <div
                          key={artifact.url}
                          data-source-id={artifact.id}
                          className={`border rounded-lg p-3 transition-all duration-300 ${
                            isHighlighted
                              ? 'border-blue-500 bg-blue-50 shadow-lg'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {/* Header with citation number, logo and media name */}
                          <div className="flex items-start gap-2 mb-2">
                            {citationNumber !== undefined && (
                              <div
                                className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold"
                                title={`Citation [${citationNumber}]`}
                              >
                                {citationNumber}
                              </div>
                            )}
                            {artifact.domain && artifact.domain !== 'null' ? (
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${artifact.domain}&sz=64`}
                                alt={artifact.domain}
                                className="w-6 h-6 flex-shrink-0 mt-0.5"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 flex-shrink-0 text-slate-400">
                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                <polyline points="13 2 13 9 20 9"></polyline>
                              </svg>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-slate-700 mb-0.5">{canonicalName}</div>
                              <a
                                href={artifact.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-slate-900 hover:text-blue-600 leading-snug block"
                              >
                                {artifact.title || 'Untitled'}
                              </a>
                            </div>
                          </div>

                          {/* Footer with voting and time */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                            {/* Voting */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  handleVote(artifact.url, 'up')
                                }}
                                className={`p-1 rounded transition-colors group ${
                                  votes.userVote === 'up' ? 'bg-green-100' : 'hover:bg-green-50'
                                }`}
                              >
                                <svg className={`w-4 h-4 ${
                                  votes.userVote === 'up' ? 'text-green-600' : 'text-slate-400 group-hover:text-green-600'
                                }`} fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                </svg>
                              </button>
                              <span className="text-xs font-semibold text-slate-700 min-w-[20px] text-center">{votes.upvotes}</span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  handleVote(artifact.url, 'down')
                                }}
                                className={`p-1 rounded transition-colors group ${
                                  votes.userVote === 'down' ? 'bg-red-100' : 'hover:bg-red-50'
                                }`}
                              >
                                <svg className={`w-4 h-4 ${
                                  votes.userVote === 'down' ? 'text-red-600' : 'text-slate-400 group-hover:text-red-600'
                                }`} fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                                </svg>
                              </button>
                              <span className="text-xs text-slate-500 min-w-[16px] text-center">{votes.downvotes}</span>
                            </div>

                            {/* Publication time */}
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{pubDate ? formatRelativeTime(pubDate) : 'Recently'}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </aside>
        </main>
      </div>

      {/* Story Chat Sidebar - Only show for mature stories (coherence > 0.5) */}
      {story && (story.coherence_score || 0) > 0.5 && (
        <StoryChatSidebar
          storyId={story.id}
          storyTitle={story.title}
          isOpen={chatOpen}
          onToggle={() => setChatOpen(!chatOpen)}
          claims={storyClaims}
        />
      )}
    </div>
  )
}

export default StoryPage
