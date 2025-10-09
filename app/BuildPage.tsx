import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from './components/layout/Header'
import { ensureUserId } from './userSession'

interface GraphNode {
  id: string
  type: 'story' | 'claim' | 'artifact'
  label: string
  description?: string
  metadata?: Record<string, any>
}

interface GraphEdge {
  source: string
  target: string
  type: string
  label?: string
}

interface BuildGraph {
  story_id: string
  story_title: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}

function BuildPage() {
  const { id } = useParams<{ id: string }>()
  const [userId, setUserId] = useState('')
  const [graph, setGraph] = useState<BuildGraph | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const uid = ensureUserId()
    setUserId(uid)
  }, [])

  useEffect(() => {
    if (id) {
      fetchBuildGraph(id)
    }
  }, [id])

  const fetchBuildGraph = async (storyId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/story/${storyId}/graph`)
      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setGraph(data)
      }
    } catch (err) {
      console.error('Error fetching build graph:', err)
      setError('Failed to load evidence graph')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (graph && canvasRef.current) {
      renderGraph(graph)
    }
  }, [graph])

  const renderGraph = (graphData: BuildGraph) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Validate graph data
    if (!graphData || !graphData.nodes || !graphData.edges) {
      console.warn('Invalid graph data:', graphData)
      return
    }

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Clear canvas
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Simple force-directed layout simulation
    const nodePositions = new Map<string, { x: number; y: number }>()
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    // Position nodes in a radial layout
    graphData.nodes.forEach((node, index) => {
      if (node.type === 'story') {
        nodePositions.set(node.id, { x: centerX, y: centerY })
      } else {
        const angle = (index / graphData.nodes.length) * 2 * Math.PI
        const radius = node.type === 'claim' ? 150 : 250
        nodePositions.set(node.id, {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        })
      }
    })

    // Draw edges
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 2
    graphData.edges.forEach((edge) => {
      const source = nodePositions.get(edge.source)
      const target = nodePositions.get(edge.target)
      if (source && target) {
        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        ctx.stroke()
      }
    })

    // Draw nodes
    graphData.nodes.forEach((node) => {
      const pos = nodePositions.get(node.id)
      if (!pos) return

      const colors = {
        story: { fill: '#0ea5e9', stroke: '#06b6d4', radius: 30 },
        claim: { fill: '#8b5cf6', stroke: '#a78bfa', radius: 20 },
        artifact: { fill: '#10b981', stroke: '#34d399', radius: 15 }
      }

      const style = colors[node.type]

      // Draw node circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, style.radius, 0, 2 * Math.PI)
      ctx.fillStyle = style.fill
      ctx.fill()
      ctx.strokeStyle = style.stroke
      ctx.lineWidth = 3
      ctx.stroke()

      // Draw label
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        node.label.length > 20 ? node.label.substring(0, 20) + '...' : node.label,
        pos.x,
        pos.y + style.radius + 15
      )
    })
  }

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Header userId={userId} />
          <div className="mt-10 text-center">
            <div className="inline-block w-8 h-8 border-4 border-cyan-200 border-t-cyan-500 rounded-full animate-spin mb-4" />
            <p className="text-slate-400">Loading evidence graph...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Header userId={userId} />
          <div className="mt-10 text-center">
            <p className="text-red-400">{error}</p>
            <Link to={`/story/${id}`} className="mt-4 inline-block text-cyan-400 hover:text-cyan-300">
              ← Back to Story
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!graph) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Header userId={userId} />
          <div className="mt-10 text-center">
            <p className="text-slate-400">No graph data available for this story yet.</p>
            <p className="text-slate-500 text-sm mt-2">Start building by adding artifacts and claims!</p>
            <Link to={`/story/${id}`} className="mt-4 inline-block text-cyan-400 hover:text-cyan-300">
              ← Back to Story
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const storyNode = graph?.nodes?.find((n) => n.type === 'story')
  const claimNodes = graph?.nodes?.filter((n) => n.type === 'claim') || []
  const artifactNodes = graph?.nodes?.filter((n) => n.type === 'artifact') || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Header userId={userId} />

        <div className="mt-6">
          <Link to={`/story/${id}`} className="text-cyan-400 hover:text-cyan-300 text-sm">
            ← Reader View
          </Link>
        </div>

        {/* Build Header */}
        <div className="mt-6 bg-slate-800/90 backdrop-blur border border-cyan-500/20 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-semibold rounded-full">
                  🔧 BUILD MODE
                </span>
                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 text-xs font-semibold rounded-full">
                  {graph?.nodes?.length || 0} nodes
                </span>
              </div>
              <h1 className="text-2xl font-bold mb-2">{graph.story_title}</h1>
              <p className="text-slate-400 text-sm">
                Manage evidence graph structure, verify claims, and coordinate investigation workflow
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-900 font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all">
                + Add Artifact
              </button>
              <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-semibold rounded-lg transition-all">
                + Add Claim
              </button>
            </div>
          </div>
        </div>

        <main className="mt-6 grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Graph Canvas */}
          <div className="bg-slate-800/90 backdrop-blur border border-cyan-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-cyan-400">Evidence Graph</h2>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500" />
                  <span>Story</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span>Claims</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Artifacts</span>
                </div>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              className="w-full h-[600px] bg-slate-900 rounded-lg border border-slate-700"
            />

            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-cyan-400">{storyNode ? 1 : 0}</div>
                <div className="text-xs text-slate-400">Story</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-400">{claimNodes.length}</div>
                <div className="text-xs text-slate-400">Claims</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-400">{artifactNodes.length}</div>
                <div className="text-xs text-slate-400">Artifacts</div>
              </div>
            </div>
          </div>

          {/* Node List & Details */}
          <div className="space-y-6">
            {/* Build Actions */}
            <div className="bg-slate-800/90 backdrop-blur border border-cyan-500/20 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-cyan-400 uppercase mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-4 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-all">
                  <div className="font-semibold text-sm">📊 Review Entropy</div>
                  <div className="text-xs text-slate-400 mt-1">Check story coherence metrics</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-all">
                  <div className="font-semibold text-sm">✅ Verify Claims</div>
                  <div className="text-xs text-slate-400 mt-1">Review unverified claims</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-all">
                  <div className="font-semibold text-sm">🔗 Link Artifacts</div>
                  <div className="text-xs text-slate-400 mt-1">Connect evidence to claims</div>
                </button>
              </div>
            </div>

            {/* Selected Node Details */}
            {selectedNode && (
              <div className="bg-slate-800/90 backdrop-blur border border-cyan-500/20 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-cyan-400 uppercase mb-2">Selected Node</h3>
                <div className="space-y-2">
                  <div className="text-lg font-semibold">{selectedNode.label}</div>
                  {selectedNode.description && (
                    <p className="text-sm text-slate-300">{selectedNode.description}</p>
                  )}
                  <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      selectedNode.type === 'story' ? 'bg-cyan-500/20 text-cyan-300' :
                      selectedNode.type === 'claim' ? 'bg-purple-500/20 text-purple-300' :
                      'bg-green-500/20 text-green-300'
                    }`}>
                      {selectedNode.type}
                    </span>
                    <div className="flex gap-1">
                      <button className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">Edit</button>
                      <button className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs">Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Claims List */}
            <div className="bg-slate-800/90 backdrop-blur border border-cyan-500/20 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-cyan-400 uppercase mb-4">
                Claims ({claimNodes.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {claimNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => handleNodeClick(node)}
                    className="w-full text-left p-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-all"
                  >
                    <div className="text-sm font-medium">{node.label}</div>
                    {node.description && (
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {node.description}
                      </div>
                    )}
                  </button>
                ))}
                {claimNodes.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No claims yet</p>
                )}
              </div>
            </div>

            {/* Artifacts List */}
            <div className="bg-slate-800/90 backdrop-blur border border-cyan-500/20 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-cyan-400 uppercase mb-4">
                Artifacts ({artifactNodes.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {artifactNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => handleNodeClick(node)}
                    className="w-full text-left p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg transition-all"
                  >
                    <div className="text-sm font-medium">{node.label}</div>
                    {node.description && (
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {node.description}
                      </div>
                    )}
                  </button>
                ))}
                {artifactNodes.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No artifacts yet</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default BuildPage
