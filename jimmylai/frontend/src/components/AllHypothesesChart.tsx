import React, { useEffect, useState } from 'react'

interface TrajectoryPoint {
  timestamp: string
  probability: number
  event: string
}

interface HypothesisData {
  id: string
  statement: string
  currentProbability: number
  trajectory: TrajectoryPoint[]
}

interface AllHypothesesChartProps {
  storyId: string
  caseId: string
  askId: string
  hypotheses: Array<{
    id: string
    statement: string
    probability: number
  }>
}

const AllHypothesesChart: React.FC<AllHypothesesChartProps> = ({
  storyId,
  caseId,
  askId,
  hypotheses
}) => {
  const [trajectories, setTrajectories] = useState<Record<string, TrajectoryPoint[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAllTrajectories = async () => {
      try {
        const promises = hypotheses.map(h =>
          fetch(`/jimmylai/api/stories/${storyId}/cases/${caseId}/asks/${askId}/hypotheses/${h.id}/trajectory`)
            .then(res => res.json())
            .then(data => ({ id: h.id, trajectory: data }))
        )
        const results = await Promise.all(promises)

        const trajectoryMap: Record<string, TrajectoryPoint[]> = {}
        results.forEach(r => {
          trajectoryMap[r.id] = r.trajectory
        })

        setTrajectories(trajectoryMap)
      } catch (error) {
        console.error('Failed to fetch trajectories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllTrajectories()
  }, [storyId, caseId, askId, hypotheses])

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="h-64 bg-slate-50 rounded animate-pulse"></div>
      </div>
    )
  }

  // Get all unique timestamps across all trajectories
  const allTimestamps = Array.from(
    new Set(
      Object.values(trajectories).flatMap(t => t.map(p => p.timestamp))
    )
  ).sort()

  if (allTimestamps.length === 0) {
    return null
  }

  // Chart dimensions
  const width = 800
  const height = 300
  const padding = { top: 40, right: 120, bottom: 60, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Colors for each hypothesis
  const colors = [
    { stroke: 'rgb(34, 197, 94)', fill: 'rgba(34, 197, 94, 0.1)' },   // green
    { stroke: 'rgb(251, 146, 60)', fill: 'rgba(251, 146, 60, 0.1)' }, // orange
    { stroke: 'rgb(59, 130, 246)', fill: 'rgba(59, 130, 246, 0.1)' }, // blue
    { stroke: 'rgb(148, 163, 184)', fill: 'rgba(148, 163, 184, 0.1)' } // slate
  ]

  // Create paths for each hypothesis
  const hypothesisLines = hypotheses.map((h, idx) => {
    const trajectory = trajectories[h.id] || []
    if (trajectory.length === 0) return null

    const points = trajectory.map((point, pointIdx) => {
      const x = padding.left + (pointIdx / (trajectory.length - 1)) * chartWidth
      const y = padding.top + chartHeight - (point.probability / 100) * chartHeight
      return { x, y, point }
    })

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ')

    const color = colors[idx % colors.length]

    return {
      id: h.id,
      statement: h.statement,
      currentProbability: h.probability,
      pathD,
      points,
      color
    }
  }).filter(Boolean)

  // Find winner (>=80%)
  const winner = hypotheses.find(h => h.probability >= 80)

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-bold text-slate-900">Hypothesis Competition Over Time</div>
          <div className="text-xs text-slate-500 mt-1">
            How probabilities evolved as evidence emerged
          </div>
        </div>
        {winner && (
          <div className="bg-green-100 border-2 border-green-400 rounded-lg px-4 py-2">
            <div className="text-xs font-bold text-green-700 mb-1">🏆 WINNER</div>
            <div className="text-sm font-bold text-green-900">{winner.probability}% Confidence</div>
          </div>
        )}
      </div>

      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        <g className="text-slate-200">
          {[0, 25, 50, 75, 100].map(val => {
            const y = padding.top + chartHeight - (val / 100) * chartHeight
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray={val === 80 ? "4,2" : "2,2"}
                  strokeOpacity={val === 80 ? 0.6 : 0.3}
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fontSize="10"
                  textAnchor="end"
                  fill="#64748b"
                  fontWeight={val === 80 ? "bold" : "normal"}
                >
                  {val}%
                  {val === 80 && " ← Winner threshold"}
                </text>
              </g>
            )
          })}
        </g>

        {/* Lines for each hypothesis */}
        {hypothesisLines.map((line) => (
          <g key={line!.id}>
            {/* Line */}
            <path
              d={line!.pathD}
              fill="none"
              stroke={line!.color.stroke}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {line!.points.map((p, idx) => (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r={4}
                fill="white"
                stroke={line!.color.stroke}
                strokeWidth={2}
              >
                <title>
                  {line!.statement}
                  {'\n'}
                  {new Date(p.point.timestamp).toLocaleDateString()}
                  {'\n'}
                  {p.point.probability}%
                  {'\n'}
                  {p.point.event}
                </title>
              </circle>
            ))}
          </g>
        ))}

        {/* Legend */}
        <g transform={`translate(${width - padding.right + 10}, ${padding.top})`}>
          {hypothesisLines.map((line, idx) => (
            <g key={line!.id} transform={`translate(0, ${idx * 60})`}>
              {/* Color indicator */}
              <line
                x1={0}
                y1={10}
                x2={20}
                y2={10}
                stroke={line!.color.stroke}
                strokeWidth="3"
              />
              {/* Text */}
              <text
                x={25}
                y={8}
                fontSize="10"
                fill="#475569"
                fontWeight="bold"
              >
                {line!.currentProbability}%
              </text>
              <text
                x={25}
                y={20}
                fontSize="9"
                fill="#64748b"
                className="max-w-[100px]"
              >
                {line!.statement.length > 30
                  ? line!.statement.substring(0, 30) + '...'
                  : line!.statement}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {/* Timeline */}
      <div className="flex justify-between text-xs text-slate-500 mt-4 px-12">
        <div>{new Date(allTimestamps[0]).toLocaleDateString()}</div>
        <div>→ Timeline →</div>
        <div>{new Date(allTimestamps[allTimestamps.length - 1]).toLocaleDateString()}</div>
      </div>

      {/* Key Events Timeline */}
      <div className="mt-6 border-t border-slate-200 pt-4">
        <div className="text-sm font-bold text-slate-900 mb-3">Key Events Timeline</div>
        <div className="space-y-4">
          {hypotheses.map((h, idx) => {
            const trajectory = trajectories[h.id] || []
            if (trajectory.length === 0) return null

            const color = colors[idx % colors.length]

            return (
              <div key={h.id}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color.stroke }}></div>
                  <span className="text-xs font-bold" style={{ color: color.stroke }}>
                    H{idx + 1}: {h.statement.length > 50 ? h.statement.substring(0, 50) + '...' : h.statement}
                  </span>
                </div>
                <div className="ml-5 space-y-1">
                  {trajectory.map((point, pointIdx) => (
                    <div key={pointIdx} className="flex items-start gap-3 text-xs">
                      <div className="flex-shrink-0 w-24 text-slate-500">
                        {new Date(point.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex-shrink-0 font-bold w-12" style={{ color: color.stroke }}>
                        {point.probability}%
                        {pointIdx > 0 && (
                          <span className={`ml-1 ${point.probability > trajectory[pointIdx - 1].probability ? 'text-green-600' : 'text-red-600'}`}>
                            {point.probability > trajectory[pointIdx - 1].probability ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 text-slate-700">{point.event}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AllHypothesesChart
