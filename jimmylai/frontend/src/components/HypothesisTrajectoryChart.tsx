import React, { useEffect, useState } from 'react'

interface TrajectoryPoint {
  timestamp: string
  probability: number
  event: string
}

interface HypothesisTrajectoryChartProps {
  storyId: string
  caseId: string
  askId: string
  hypothesisId: string
  currentProbability: number
  mini?: boolean
}

const HypothesisTrajectoryChart: React.FC<HypothesisTrajectoryChartProps> = ({
  storyId,
  caseId,
  askId,
  hypothesisId,
  currentProbability,
  mini = false
}) => {
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrajectory = async () => {
      try {
        const response = await fetch(
          `/jimmylai/api/stories/${storyId}/cases/${caseId}/asks/${askId}/hypotheses/${hypothesisId}/trajectory`
        )
        const data = await response.json()
        setTrajectory(data)
      } catch (error) {
        console.error('Failed to fetch trajectory:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrajectory()
  }, [storyId, caseId, askId, hypothesisId])

  if (loading) {
    return (
      <div className={`${mini ? 'h-12' : 'h-48'} bg-slate-50 rounded animate-pulse`}></div>
    )
  }

  if (trajectory.length === 0) {
    return null
  }

  // Calculate dimensions
  const width = mini ? 200 : 600
  const height = mini ? 48 : 200
  const padding = mini ? { top: 4, right: 4, bottom: 4, left: 4 } : { top: 20, right: 20, bottom: 40, left: 40 }

  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Find min/max for scaling
  const maxProb = Math.max(...trajectory.map(p => p.probability), 100)
  const minProb = Math.min(...trajectory.map(p => p.probability), 0)
  const probRange = maxProb - minProb

  // Create SVG path
  const points = trajectory.map((point, idx) => {
    const x = padding.left + (idx / (trajectory.length - 1)) * chartWidth
    const y = padding.top + chartHeight - ((point.probability - minProb) / probRange) * chartHeight
    return { x, y, point }
  })

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  // Area fill path (for visual appeal)
  const areaPathD = `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`

  // Determine color based on current probability
  const color = currentProbability >= 80
    ? 'rgb(34, 197, 94)'  // green-500 for winner
    : currentProbability >= 50
    ? 'rgb(59, 130, 246)'  // blue-500 for leading
    : currentProbability >= 30
    ? 'rgb(251, 146, 60)'  // orange-400
    : 'rgb(148, 163, 184)'  // slate-400

  const fillColor = currentProbability >= 80
    ? 'rgba(34, 197, 94, 0.1)'
    : currentProbability >= 50
    ? 'rgba(59, 130, 246, 0.1)'
    : currentProbability >= 30
    ? 'rgba(251, 146, 60, 0.1)'
    : 'rgba(148, 163, 184, 0.1)'

  return (
    <div className={`${mini ? '' : 'bg-white border border-slate-200 rounded-lg p-4'}`}>
      {!mini && (
        <div className="text-xs font-semibold text-slate-700 mb-2">
          Probability Over Time
        </div>
      )}

      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines (only for full chart) */}
        {!mini && (
          <g className="text-slate-300">
            {[0, 25, 50, 75, 100].map(val => {
              const y = padding.top + chartHeight - ((val - minProb) / probRange) * chartHeight
              return (
                <g key={val}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    fontSize="10"
                    textAnchor="end"
                    fill="currentColor"
                  >
                    {val}%
                  </text>
                </g>
              )
            })}
          </g>
        )}

        {/* Area fill */}
        <path
          d={areaPathD}
          fill={fillColor}
        />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={mini ? 2 : 3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points (only for full chart) */}
        {!mini && points.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill="white"
              stroke={color}
              strokeWidth={2}
            />
            {/* Tooltip on hover */}
            <title>
              {new Date(p.point.timestamp).toLocaleDateString()}
              {'\n'}
              {p.point.probability}%
              {'\n'}
              {p.point.event}
            </title>
          </g>
        ))}
      </svg>

      {/* Timeline labels (only for full chart) */}
      {!mini && (
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <div>{new Date(trajectory[0].timestamp).toLocaleDateString()}</div>
          <div>{new Date(trajectory[trajectory.length - 1].timestamp).toLocaleDateString()}</div>
        </div>
      )}

      {/* Event list (only for full chart) */}
      {!mini && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold text-slate-700 mb-2">Key Events</div>
          {trajectory.map((point, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              <div className="flex-shrink-0 w-16 text-slate-500">
                {new Date(point.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="flex-shrink-0 font-bold" style={{ color }}>
                {point.probability}%
              </div>
              <div className="text-slate-600">{point.event}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default HypothesisTrajectoryChart
