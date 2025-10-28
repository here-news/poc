import React, { useCallback, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from 'reactflow'
import 'reactflow/dist/style.css'

interface Claim {
  id: string
  text: string
  modality: string
  source: {
    url: string
    title: string
    domain: string
    image_url?: string
  }
}

interface Source {
  url: string
  title: string
  domain: string
  image_url?: string
}

interface Entity {
  canonical_name: string
  type: string
  role?: string
  wikidata_thumbnail?: string
  wikidata_qid: string
  claim_id: string
}

interface StoryGraphProps {
  story: {
    id: string
    topic: string
  }
  claims: Claim[]
  sources: Source[]
  claim_entities: Entity[]
}

const StoryGraph: React.FC<StoryGraphProps> = ({ story, claims, sources, claim_entities }) => {
  console.log('StoryGraph rendering:', {
    story: story.id,
    claimsCount: claims.length,
    sourcesCount: sources.length,
    entitiesCount: claim_entities.length
  })

  // Create nodes and edges from data with grouped layout
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    const centerX = 600
    const centerY = 400

    // 1. Story Core Node (center)
    nodes.push({
      id: 'story',
      type: 'default',
      position: { x: centerX, y: centerY },
      data: {
        label: (
          <div className="text-center px-4 py-3">
            <div className="text-2xl mb-1">📰</div>
            <div className="text-sm font-bold text-white">Story Core</div>
            <div className="text-xs text-teal-100 mt-1">{claims.length} claims</div>
          </div>
        ),
      },
      style: {
        background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
        color: 'white',
        border: '3px solid white',
        borderRadius: '50%',
        width: 140,
        height: 140,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 10px 40px rgba(20, 184, 166, 0.4)',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    })

    // 2. Claims (TOP) - clustered in groups of 3-4 across the top
    const claimsToShow = claims.slice(0, 12)  // Show up to 12 claims
    const claimsPerCluster = 3  // 3 claims stacked per cluster
    const numClusters = Math.ceil(claimsToShow.length / claimsPerCluster)
    const clusterSpacing = 320  // Space between clusters horizontally
    const claimVerticalSpacing = 75  // Vertical spacing within cluster (overlapping slightly)
    const clusterStartX = centerX - ((numClusters - 1) * clusterSpacing) / 2

    claimsToShow.forEach((claim, idx) => {
      const nodeId = `claim-${claim.id}`
      const clusterIdx = Math.floor(idx / claimsPerCluster)
      const positionInCluster = idx % claimsPerCluster

      // Get modality icon and color
      const modalityInfo = {
        observation: { icon: '✓', color: '#3b82f6', bg: '#eff6ff' },
        reported_speech: { icon: '📰', color: '#8b5cf6', bg: '#f5f3ff' },
        opinion: { icon: '💭', color: '#f59e0b', bg: '#fffbeb' },
        allegation: { icon: '⚠️', color: '#ef4444', bg: '#fef2f2' }
      }
      const info = modalityInfo[claim.modality as keyof typeof modalityInfo] ||
                   { icon: '❓', color: '#6b7280', bg: '#f9fafb' }

      nodes.push({
        id: nodeId,
        type: 'default',
        position: {
          x: clusterStartX + (clusterIdx * clusterSpacing),  // Horizontal clusters
          y: centerY - 450 + (positionInCluster * claimVerticalSpacing)  // Moved higher up to avoid overlapping
        },
        data: {
          label: (
            <div className="flex items-start gap-2 p-2" style={{ width: '240px' }} title={claim.text}>
              <div className="text-base flex-shrink-0 mt-0.5" style={{ color: info.color }}>
                {info.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-900 leading-relaxed line-clamp-3">
                  {claim.text}
                </div>
              </div>
            </div>
          ),
        },
        style: {
          background: info.bg,
          border: `2px solid ${info.color}40`,
          borderRadius: '8px',
          padding: '0',
          fontSize: '11px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          width: 'auto',
          height: 'auto',
        },
      })

      // Edge from claim to story
      edges.push({
        id: `${nodeId}-story`,
        source: nodeId,
        target: 'story',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#94a3b8',
        },
      })
    })

    // 3. Sources/Artifacts (BOTTOM) - horizontal line below story, moved lower
    const sourceSpacing = 200
    const sourceStartX = centerX - ((sources.length - 1) * sourceSpacing) / 2

    sources.forEach((source, idx) => {
      const nodeId = `source-${idx}`
      nodes.push({
        id: nodeId,
        type: 'default',
        position: {
          x: sourceStartX + idx * sourceSpacing,
          y: centerY + 380  // Increased from 280 to 380 to move further down
        },
        data: {
          label: (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center p-3 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-4xl mb-2">📄</div>
              <div className="text-xs font-semibold text-slate-900 leading-tight max-w-[160px] line-clamp-2 mb-1">
                {source.title}
              </div>
              <div className="text-xs text-slate-500 truncate max-w-[160px]">
                {source.domain}
              </div>
            </a>
          ),
        },
        style: {
          background: 'white',
          border: '2px solid #93c5fd',
          borderRadius: '12px',
          padding: '0',
          boxShadow: '0 4px 12px rgba(147, 197, 253, 0.3)',
          cursor: 'pointer',
        },
      })

      // Edge from story to source
      edges.push({
        id: `story-${nodeId}`,
        source: 'story',
        target: nodeId,
        type: 'default',
        animated: true,
        style: { stroke: '#cbd5e1', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#cbd5e1',
        },
      })
    })

    // 4. Group entities by type
    const uniqueEntities = Array.from(
      new Map(claim_entities.map(e => [e.canonical_name, e])).values()
    )

    const people = uniqueEntities.filter(e => e.type === 'Person').slice(0, 8)
    const organizations = uniqueEntities.filter(e => e.type === 'Organization').slice(0, 8)
    const locations = uniqueEntities.filter(e => e.type === 'Location').slice(0, 8)

    // 5. People (LEFT side) - vertical arrangement
    const peopleSpacing = 100
    const peopleStartY = centerY - ((people.length - 1) * peopleSpacing) / 2

    people.forEach((entity, idx) => {
      const nodeId = `entity-${entity.wikidata_qid}`
      nodes.push({
        id: nodeId,
        type: 'default',
        position: {
          x: centerX - 400,
          y: peopleStartY + idx * peopleSpacing
        },
        data: {
          label: (
            <div className="text-center" title={`${entity.canonical_name}${entity.role ? ` - ${entity.role}` : ''}`}>
              {entity.wikidata_thumbnail ? (
                <img
                  src={entity.wikidata_thumbnail}
                  alt={entity.canonical_name}
                  className="w-12 h-12 object-cover rounded-full mx-auto mb-1"
                  onError={(e) => {
                    const fallback = document.createElement('div')
                    fallback.className = 'text-2xl'
                    fallback.textContent = '👤'
                    e.currentTarget.replaceWith(fallback)
                  }}
                />
              ) : (
                <div className="text-2xl mb-1">👤</div>
              )}
              <div className="text-xs font-semibold truncate max-w-[80px]">
                {entity.canonical_name}
              </div>
              {entity.role && (
                <div className="text-xs text-purple-600 truncate max-w-[80px]">
                  {entity.role}
                </div>
              )}
            </div>
          ),
        },
        style: {
          background: '#faf5ff',
          border: '2px solid #c084fc',
          borderRadius: '50%',
          padding: '8px',
          width: 100,
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(192, 132, 252, 0.3)',
        },
      })

      // Connect to story
      edges.push({
        id: `story-${nodeId}`,
        source: 'story',
        target: nodeId,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#e9d5ff', strokeWidth: 1.5, strokeDasharray: '5,5' },
      })
    })

    // 6. Organizations (RIGHT side) - vertical arrangement
    const orgSpacing = 100
    const orgStartY = centerY - ((organizations.length - 1) * orgSpacing) / 2

    organizations.forEach((entity, idx) => {
      const nodeId = `entity-${entity.wikidata_qid}`
      nodes.push({
        id: nodeId,
        type: 'default',
        position: {
          x: centerX + 400,
          y: orgStartY + idx * orgSpacing
        },
        data: {
          label: (
            <div className="text-center" title={entity.canonical_name}>
              {entity.wikidata_thumbnail ? (
                <img
                  src={entity.wikidata_thumbnail}
                  alt={entity.canonical_name}
                  className="w-12 h-12 object-cover rounded-full mx-auto mb-1"
                  onError={(e) => {
                    const fallback = document.createElement('div')
                    fallback.className = 'text-2xl'
                    fallback.textContent = '🏢'
                    e.currentTarget.replaceWith(fallback)
                  }}
                />
              ) : (
                <div className="text-2xl mb-1">🏢</div>
              )}
              <div className="text-xs font-semibold truncate max-w-[80px]">
                {entity.canonical_name}
              </div>
            </div>
          ),
        },
        style: {
          background: '#d1fae5',
          border: '2px solid #34d399',
          borderRadius: '50%',
          padding: '8px',
          width: 100,
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)',
        },
      })

      // Connect to story
      edges.push({
        id: `story-${nodeId}`,
        source: 'story',
        target: nodeId,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#a7f3d0', strokeWidth: 1.5, strokeDasharray: '5,5' },
      })
    })

    // 7. Locations (scattered around or in corners)
    const locationPositions = [
      { x: centerX - 300, y: centerY - 250 }, // top-left
      { x: centerX + 300, y: centerY - 250 }, // top-right
      { x: centerX - 300, y: centerY + 250 }, // bottom-left
      { x: centerX + 300, y: centerY + 250 }, // bottom-right
      { x: centerX - 450, y: centerY - 150 },
      { x: centerX + 450, y: centerY - 150 },
      { x: centerX - 450, y: centerY + 150 },
      { x: centerX + 450, y: centerY + 150 },
    ]

    locations.forEach((entity, idx) => {
      const nodeId = `entity-${entity.wikidata_qid}`
      const pos = locationPositions[idx % locationPositions.length]

      nodes.push({
        id: nodeId,
        type: 'default',
        position: pos,
        data: {
          label: (
            <div className="text-center" title={entity.canonical_name}>
              {entity.wikidata_thumbnail ? (
                <img
                  src={entity.wikidata_thumbnail}
                  alt={entity.canonical_name}
                  className="w-10 h-10 object-cover rounded-full mx-auto mb-1"
                  onError={(e) => {
                    const fallback = document.createElement('div')
                    fallback.className = 'text-xl'
                    fallback.textContent = '📍'
                    e.currentTarget.replaceWith(fallback)
                  }}
                />
              ) : (
                <div className="text-xl mb-1">📍</div>
              )}
              <div className="text-xs font-semibold truncate max-w-[70px]">
                {entity.canonical_name}
              </div>
            </div>
          ),
        },
        style: {
          background: '#fef3c7',
          border: '2px solid #fbbf24',
          borderRadius: '50%',
          padding: '6px',
          width: 90,
          height: 90,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)',
        },
      })

      // Connect to story with subtle edge
      edges.push({
        id: `story-${nodeId}`,
        source: 'story',
        target: nodeId,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#fde68a', strokeWidth: 1, strokeDasharray: '5,5', opacity: 0.5 },
      })
    })

    console.log('Generated nodes:', nodes.length, 'edges:', edges.length)
    console.log('Sample nodes:', nodes.slice(0, 3))
    return { nodes, edges }
  }, [story, claims, sources, claim_entities])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  console.log('ReactFlow state - nodes:', nodes.length, 'edges:', edges.length)

  if (nodes.length === 0) {
    return <div className="w-full h-full flex items-center justify-center text-slate-500">No nodes to display</div>
  }

  return (
    <div className="w-full h-full bg-slate-50 rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-right"
        minZoom={0.2}
        maxZoom={1.5}
        className="rounded-lg"
      >
        <Background color="#cbd5e1" gap={16} />
        <Controls position="top-left" />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            if (node.id === 'story') return '#14b8a6'
            if (node.id.startsWith('claim')) return '#cbd5e1'
            if (node.id.startsWith('source')) return '#93c5fd'
            if (node.id.includes('Person')) return '#c084fc'
            if (node.id.includes('Organization')) return '#34d399'
            return '#fbbf24'
          }}
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg"
        />
      </ReactFlow>
    </div>
  )
}

export default StoryGraph
