import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { StoryContentRenderer } from '../story/StoryContentRenderer'
import type { CitationMetadata, EntityMetadata } from '../../types/story'
import { getStoryUrl, getStoryUrlFromData, generateSlug } from '../../utils/storyUrl'

// Declare Leaflet types
declare const L: any

interface StoryOverlayProps {
  storyId: string
  isOpen: boolean
  onClose: () => void
}

interface StoryDetails {
  id: string
  title: string
  content?: string
  category: string
  artifact_count: number
  claim_count: number
  people_count: number
  org_count?: number
  location_count?: number
  coherence_score?: number
  revision?: string
  version?: string
  cover_image?: string
  last_updated?: string
  artifacts?: Array<{
    id?: string
    page_id?: string
    url: string
    title: string
    domain?: string
    site?: string
    pub_time?: string
    published_at?: string
    pub_date?: string
    publication_date?: string
    publish_date?: string
    created_at?: string
    gist?: string
    snippet?: string
  }>
  people_entities?: Array<{
    id: string
    name: string
    thumbnail?: string
    qid?: string
    description?: string
  }>
  org_entities?: Array<{
    id: string
    name: string
    thumbnail?: string
    domain?: string
  }>
  location_entities?: Array<{
    id: string
    name: string
    thumbnail?: string
  }>
  entities?: {
    people: Array<{ id: string; name: string; thumbnail?: string }>
    organizations: Array<{ id: string; name: string; thumbnail?: string; domain?: string }>
    locations: Array<{ id: string; name: string; thumbnail?: string }>
  }
}

// Helper function to format timestamp as relative time
function formatRelativeTime(timestamp: string): string {
  try {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)

    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffWeeks < 4) return `${diffWeeks}w ago`
    return then.toLocaleDateString()
  } catch {
    return 'Recently'
  }
}

// LocationMap component - borrowed from legacy Story Page with full features
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
            if (data.coords && data.coords.lat && data.coords.lon && data.timestamp) {
              if (Date.now() - data.timestamp < 30 * 24 * 60 * 60 * 1000) {
                geocodeCacheRef.current.set(name, data.coords)
                return true
              } else {
                localStorage.removeItem(`geocode_${name}`)
              }
            } else {
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
        if (loadFromCache(location.name)) {
          return
        }

        try {
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

            geocodeCacheRef.current.set(location.name, coords)

            try {
              localStorage.setItem(`geocode_${location.name}`, JSON.stringify({
                coords,
                timestamp: Date.now()
              }))
            } catch (err) {
              console.error('Failed to save to cache:', err)
            }
          }
        } catch (err) {
          console.error('Failed to geocode location:', location.name, err)
        }
      })

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

function StoryOverlay({ storyId, isOpen, onClose }: StoryOverlayProps) {
  const [story, setStory] = useState<StoryDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [storyEntities, setStoryEntities] = useState<Record<string, any>>({})
  const [activeTab, setActiveTab] = useState<'story' | 'sources' | 'map'>('story')
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null)
  const [sourceVotes, setSourceVotes] = useState<{ [url: string]: { upvotes: number, downvotes: number, userVote: 'up' | 'down' | null } }>({})
  const [mediaEntities, setMediaEntities] = useState<{ [domain: string]: any }>({})
  const [copyFeedback, setCopyFeedback] = useState(false)

  // Fetch story details when opened
  useEffect(() => {
    if (isOpen && storyId) {
      fetchStoryDetails()
    }
  }, [isOpen, storyId])

  // Build entities lookup
  useEffect(() => {
    if (story) {
      const entitiesObj: Record<string, any> = {}

      story.people_entities?.forEach((entity: any) => {
        const entityData = {
          name: entity.name,
          qid: entity.qid || '',
          description: entity.description || '',
          wikidata_thumbnail: entity.thumbnail || '',
          entity_type: 'person',
          claim_count: 0
        }
        entitiesObj[entity.id] = entityData
        entitiesObj[entity.name] = entityData
      })

      story.org_entities?.forEach((entity: any) => {
        const entityData = {
          name: entity.name,
          qid: entity.qid || '',
          description: entity.description || '',
          wikidata_thumbnail: entity.thumbnail || '',
          entity_type: 'organization',
          claim_count: 0
        }
        entitiesObj[entity.id] = entityData
        entitiesObj[entity.name] = entityData
      })

      story.location_entities?.forEach((entity: any) => {
        const entityData = {
          name: entity.name,
          qid: entity.qid || '',
          description: entity.description || '',
          wikidata_thumbnail: entity.thumbnail || '',
          entity_type: 'location',
          claim_count: 0
        }
        entitiesObj[entity.id] = entityData
        entitiesObj[entity.name] = entityData
      })

      setStoryEntities(entitiesObj)
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
    if (story?.artifacts && story.artifacts.length > 0) {
      const fetchMediaEntities = async () => {
        const extractDomain = (url: string) => {
          try {
            const urlObj = new URL(url)
            return urlObj.hostname.replace(/^www\./, '')
          } catch {
            return null
          }
        }

        const allDomains = story.artifacts.map(a => a.domain || extractDomain(a.url))
        const domains = [...new Set(allDomains.filter(d => d && d !== 'null'))]

        for (const domain of domains) {
          try {
            const response = await fetch(`/storychat/api/entity?domain=${encodeURIComponent(domain)}`)
            if (response.ok) {
              const data = await response.json()
              if (data && data.entity_type === 'Organization') {
                setMediaEntities(prev => ({ ...prev, [domain]: data }))
              }
            }
          } catch (err) {
            console.error(`Failed to fetch entity for domain ${domain}:`, err)
          }
        }
      }

      fetchMediaEntities()
    }
  }, [story?.artifacts])

  // Handle source voting
  const handleVote = (url: string, vote: 'up' | 'down') => {
    setSourceVotes(prev => {
      const current = prev[url] || { upvotes: 0, downvotes: 0, userVote: null }

      if (current.userVote === vote) {
        // Remove vote
        return {
          ...prev,
          [url]: {
            upvotes: vote === 'up' ? current.upvotes - 1 : current.upvotes,
            downvotes: vote === 'down' ? current.downvotes - 1 : current.downvotes,
            userVote: null
          }
        }
      } else {
        // Add or change vote
        return {
          ...prev,
          [url]: {
            upvotes: vote === 'up' ? current.upvotes + (current.userVote === 'down' ? 0 : 1) : (current.userVote === 'up' ? current.upvotes - 1 : current.upvotes),
            downvotes: vote === 'down' ? current.downvotes + (current.userVote === 'up' ? 0 : 1) : (current.userVote === 'down' ? current.downvotes - 1 : current.downvotes),
            userVote: vote
          }
        }
      }
    })
  }

  const fetchStoryDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/storychat/api/stories/${storyId}`)

      if (!response.ok) {
        throw new Error('Story not found')
      }

      const data = await response.json()

      if (data.story) {
        setStory(data.story)
      }
    } catch (error) {
      console.error('Error fetching story:', error)
    } finally {
      setLoading(false)
    }
  }

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {/* Overlay backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Story content */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header with close button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
              Story v.{story?.revision || story?.version || '1'}
            </div>
            <h2 className="text-lg font-bold text-slate-900 truncate">Full Story</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <button
            onClick={() => setActiveTab('story')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'story'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            Story
          </button>
          {story?.artifacts && story.artifacts.length > 0 && (
            <button
              onClick={() => setActiveTab('sources')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'sources'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Sources ({story.artifacts.length})
            </button>
          )}
          {story?.entities?.locations && story.entities.locations.length > 0 && (
            <button
              onClick={() => setActiveTab('map')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'map'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Map ({story.entities.locations.length} locations)
            </button>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : story ? (
            <>
              {/* Story Tab */}
              {activeTab === 'story' && (
                <div className="p-6 space-y-6">
                  {/* Cover Image */}
                  {story.cover_image && (
                    <div className="relative h-64 -mx-6 -mt-6 mb-6">
                      <img
                        src={story.cover_image}
                        alt={story.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <h1 className="absolute bottom-4 left-6 right-6 text-3xl font-bold text-white leading-tight drop-shadow-lg">
                        {story.title}
                      </h1>
                    </div>
                  )}

                  {/* Title (if no cover image) */}
                  {!story.cover_image && (
                    <h1 className="text-3xl font-bold text-slate-900 leading-tight">{story.title}</h1>
                  )}

                  {/* Story metadata */}
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{story.artifact_count} sources</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{story.people_count || 0} people</span>
                    </div>
                    {story.coherence_score !== undefined && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{Math.round(story.coherence_score * 100)}% coherence</span>
                      </div>
                    )}
                  </div>

                  {/* Story content */}
                  {story.content && story.content.length > 100 && (
                    <div className="prose prose-lg max-w-none">
                      <div className="text-slate-800 leading-relaxed">
                        <StoryContentRenderer
                          content={story.content}
                          citationsMetadata={
                            story.artifacts
                              ? Object.fromEntries(
                                  story.artifacts
                                    .filter((a) => a.id || a.page_id)
                                    .map((a) => [
                                      a.id || a.page_id,
                                      {
                                        url: a.url,
                                        title: a.title,
                                        domain: a.site || a.domain,
                                        pub_time: a.pub_time || a.published_at || a.pub_date,
                                        snippet: a.gist || a.snippet || '',
                                      },
                                    ])
                                )
                              : undefined
                          }
                          entitiesMetadata={storyEntities}
                          isDev={import.meta.env.DEV}
                        />
                      </div>
                    </div>
                  )}

                  {/* Locations Map - shown inline if locations exist */}
                  {story.entities?.locations && story.entities.locations.length > 0 && (
                    <div className="pt-6 border-t border-slate-200">
                      <h2 className="text-lg font-bold text-slate-900 mb-3">Locations</h2>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {story.entities.locations.map((location: any) => (
                          <button
                            key={location.id}
                            onMouseEnter={() => setHoveredLocation(location.name)}
                            onMouseLeave={() => setHoveredLocation(null)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                              hoveredLocation === location.name
                                ? 'bg-green-100 border-green-400 text-green-700 scale-105 shadow-md'
                                : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
                            } border`}
                          >
                            {location.thumbnail ? (
                              <img
                                src={location.thumbnail}
                                alt={location.name}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <span>📍</span>
                            )}
                            {location.name}
                          </button>
                        ))}
                      </div>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <LocationMap locations={story.entities.locations} hoveredLocation={hoveredLocation} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sources Tab */}
              {activeTab === 'sources' && story.artifacts && (
                <div className="p-6">
                  <div className="space-y-3">
                    {story.artifacts.map((artifact) => {
                      // Extract domain from URL as fallback
                      let domain = artifact.domain
                      if (!domain || domain === 'null') {
                        try {
                          domain = new URL(artifact.url).hostname.replace('www.', '')
                        } catch {
                          domain = 'unknown'
                        }
                      }

                      const mediaEntity = domain ? mediaEntities[domain] : null
                      const canonicalName = mediaEntity?.canonical_name || domain || 'Unknown source'
                      const votes = sourceVotes[artifact.url] || { upvotes: 0, downvotes: 0, userVote: null }
                      const pubDate = artifact.pub_time || artifact.published_at || artifact.pub_date || artifact.publication_date || artifact.publish_date || artifact.created_at || story.last_updated

                      return (
                        <div
                          key={artifact.url}
                          className="border border-slate-200 hover:border-slate-300 rounded-lg p-4 transition-all"
                        >
                          {/* Header with logo and media name */}
                          <div className="flex items-start gap-3 mb-3">
                            {domain && domain !== 'unknown' ? (
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                                alt={domain}
                                className="w-8 h-8 flex-shrink-0 mt-0.5"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              <svg className="w-8 h-8 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-slate-600 mb-1">{canonicalName}</div>
                              <a
                                href={artifact.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-base font-semibold text-slate-900 hover:text-blue-600 leading-snug block"
                              >
                                {artifact.title || 'Untitled'}
                              </a>
                            </div>
                          </div>

                          {/* Footer with voting and time */}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            {/* Voting */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  handleVote(artifact.url, 'up')
                                }}
                                className={`p-1.5 rounded transition-colors ${
                                  votes.userVote === 'up' ? 'bg-green-100' : 'hover:bg-green-50'
                                }`}
                              >
                                <svg className={`w-4 h-4 ${
                                  votes.userVote === 'up' ? 'text-green-600' : 'text-slate-400'
                                }`} fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                </svg>
                              </button>
                              <span className="text-sm font-semibold text-slate-700 min-w-[24px] text-center">{votes.upvotes}</span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  handleVote(artifact.url, 'down')
                                }}
                                className={`p-1.5 rounded transition-colors ${
                                  votes.userVote === 'down' ? 'bg-red-100' : 'hover:bg-red-50'
                                }`}
                              >
                                <svg className={`w-4 h-4 ${
                                  votes.userVote === 'down' ? 'text-red-600' : 'text-slate-400'
                                }`} fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                                </svg>
                              </button>
                              <span className="text-sm text-slate-500 min-w-[20px] text-center">{votes.downvotes}</span>
                            </div>

                            {/* Publication time */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              )}

              {/* Map Tab */}
              {activeTab === 'map' && story.entities?.locations && (
                <div className="p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-slate-900 mb-3">Story Locations</h2>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {story.entities.locations.map((location: any) => (
                        <button
                          key={location.id}
                          onMouseEnter={() => setHoveredLocation(location.name)}
                          onMouseLeave={() => setHoveredLocation(null)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            hoveredLocation === location.name
                              ? 'bg-green-100 border-green-400 text-green-700 scale-105 shadow-md'
                              : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
                          } border`}
                        >
                          {location.thumbnail ? (
                            <img
                              src={location.thumbnail}
                              alt={location.name}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <span>📍</span>
                          )}
                          {location.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <LocationMap locations={story.entities.locations} hoveredLocation={hoveredLocation} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-500">Story not found</div>
          )}
        </div>

        {/* Footer with action buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link
              to={`/builder/${storyId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit in Builder
            </Link>
            {story && (
              <button
                onClick={() => {
                  // Generate shareable URL with overlay param
                  const slug = generateSlug(story.title)
                  const shareUrl = `${window.location.origin}${getStoryUrl(storyId, { slug, overlay: true })}`

                  // Copy to clipboard
                  navigator.clipboard.writeText(shareUrl).then(() => {
                    setCopyFeedback(true)
                    setTimeout(() => setCopyFeedback(false), 2000)
                  }).catch(err => {
                    console.error('Failed to copy:', err)
                  })
                }}
                className="relative flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:border-slate-400 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {copyFeedback ? 'Copied!' : 'Share'}
                {copyFeedback && (
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    Link copied to clipboard
                  </span>
                )}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
          >
            Back to Chat
          </button>
        </div>
      </div>
    </div>
  )
}

export default StoryOverlay
