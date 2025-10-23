import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from './components/layout/Header'
import StoryChatSidebar from './components/layout/StoryChatSidebar'
import { ensureUserId } from './userSession'

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

// Helper function to format timestamp as relative time
function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
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
}

// Helper function to render content with entity links and tooltips
function renderContentWithEntityLinks(content: string): JSX.Element {
  // Pattern: [[Entity Name]] - new markup format from story synthesis
  const entityPattern = /\[\[([^\]]+)\]\]/g
  const parts: (string | JSX.Element)[] = []
  let lastIndex = 0
  let match

  while ((match = entityPattern.exec(content)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index))
    }

    // Add entity link with hover tooltip
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
      { threshold: 0.5, rootMargin: '50px' }
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
          className={`inline-block align-middle mx-2 transition-all duration-500 ease-out ${
            showHeadshot ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          }`}
          style={{
            animation: 'fadeInScale 0.5s ease-out'
          }}
        >
          <img
            src={entityData.wikidata_thumbnail}
            alt={entityData.canonical_name || entityName}
            className="w-16 h-16 rounded-full object-cover border-2 border-blue-300 shadow-lg"
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
                className={`absolute top-2 left-2 transition-all duration-300 ${
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

              <div className="p-6 sm:p-8 md:p-10">
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
                        {renderContentWithEntityLinks(story.content)}
                        <span className="text-slate-600 italic"> ── φ HERE.news</span>
                      </div>
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
            {/* People in Story */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-4">People</h3>
              {story.entities?.people && story.entities.people.length > 0 ? (
                <div className="space-y-2">
                  {story.entities.people.map((person: any, idx: number) => {
                    const isTopThree = idx < 3
                    const photoSize = isTopThree ? 'w-16 h-16' : 'w-10 h-10'
                    const iconSize = isTopThree ? 'text-2xl' : 'text-base'

                    return (
                      <Link
                        key={person.id}
                        to={`/people/${person.id}/${person.name.toLowerCase().replace(/\s+/g, '-')}`}
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group"
                      >
                        {person.thumbnail ? (
                          <img
                            src={person.thumbnail}
                            alt={person.name}
                            className={`${photoSize} rounded-full object-cover flex-shrink-0 border border-slate-200`}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <div className={`${photoSize} rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 ${person.thumbnail ? 'hidden' : ''}`}>
                          <span className={iconSize}>👤</span>
                        </div>
                        <span className={`${isTopThree ? 'text-base font-medium' : 'text-sm'} text-slate-900 group-hover:text-blue-600 flex-1`}>{person.name}</span>
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No people mentioned</p>
              )}
            </div>

            {/* Locations in Story */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-4">Locations</h3>
              {story.entities?.locations && story.entities.locations.length > 0 ? (
                <div className="space-y-2">
                  {story.entities.locations.map((location: any) => (
                    <Link
                      key={location.id}
                      to={`/locations/${location.id}/${location.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group"
                    >
                      {location.thumbnail ? (
                        <img
                          src={location.thumbnail}
                          alt={location.name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-slate-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      <div className={`w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 ${location.thumbnail ? 'hidden' : ''}`}>
                        <span className="text-lg">📍</span>
                      </div>
                      <span className="text-sm text-slate-900 group-hover:text-blue-600 flex-1">{location.name}</span>
                      <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No locations mentioned</p>
              )}
            </div>

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

              return (
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
                  <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-4">Sources ({uniqueArtifacts.length})</h3>
                  <div className="space-y-2">
                    {uniqueArtifacts.map((artifact) => (
                      <a
                        key={artifact.url}
                        href={artifact.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group"
                      >
                        {artifact.domain && artifact.domain !== 'null' ? (
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${artifact.domain}&sz=32`}
                            alt={artifact.domain}
                            className="w-5 h-5 flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0 text-slate-400">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                            <polyline points="13 2 13 9 20 9"></polyline>
                          </svg>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-900 group-hover:text-blue-600 truncate">
                            {artifact.domain || 'Source'}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )
            })()}
          </aside>
        </main>
      </div>

      {/* Story Chat Sidebar */}
      {story && (
        <StoryChatSidebar
          storyId={story.id}
          storyTitle={story.title}
          isOpen={chatOpen}
          onToggle={() => setChatOpen(!chatOpen)}
        />
      )}
    </div>
  )
}

export default StoryPage
