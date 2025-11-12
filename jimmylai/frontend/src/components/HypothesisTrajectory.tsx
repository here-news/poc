import React, { useEffect, useState, useCallback } from 'react';
import { useQuestWebSocket } from '../hooks/useQuestWebSocket';

interface ProbabilityEvent {
  old_probability: number;
  new_probability: number;
  trigger_type: string;
  trigger_id: string;
  timestamp: string;
}

interface Hypothesis {
  id: string;
  statement: string;
  current_probability: number;
  is_winner: boolean;
  probability_history: ProbabilityEvent[];
}

interface TrajectoryData {
  quest_id: string;
  hypotheses: Hypothesis[];
}

interface Props {
  questId: string;
}

const HypothesisTrajectory: React.FC<Props> = ({ questId }) => {
  const [data, setData] = useState<TrajectoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredHypothesis, setHoveredHypothesis] = useState<string | null>(null);

  // Fetch trajectory data
  const fetchTrajectory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/jimmylai/api/quests/${questId}/hypothesis-trajectory`);
      if (!response.ok) {
        throw new Error(`Failed to fetch trajectory: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trajectory');
    } finally {
      setLoading(false);
    }
  }, [questId]);

  // Initial fetch
  useEffect(() => {
    fetchTrajectory();
  }, [fetchTrajectory]);

  // WebSocket handlers for real-time updates
  useQuestWebSocket(questId, {
    onEvidenceSubmitted: () => {
      console.log('📊 Trajectory: Evidence submitted, refetching...');
      fetchTrajectory();
    },
    onProbabilityUpdate: () => {
      console.log('📊 Trajectory: Probability updated, refetching...');
      fetchTrajectory();
    },
    onHypothesisFork: () => {
      console.log('📊 Trajectory: Hypothesis fork event, refetching...');
      fetchTrajectory();
    },
    onQuestConverged: () => {
      console.log('📊 Trajectory: Quest converged, refetching...');
      fetchTrajectory();
    }
  });

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 border-2 border-blue-200">
        <div className="text-center text-slate-600">Loading hypothesis trajectory...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 rounded-xl p-8 border-2 border-red-200">
        <div className="text-center text-red-600">{error || 'No data available'}</div>
      </div>
    );
  }

  // Prepare data for visualization
  const hypothesisColors = [
    { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-700', lightBg: 'bg-blue-100', stroke: '#3b82f6' },
    { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-700', lightBg: 'bg-green-100', stroke: '#22c55e' },
    { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-700', lightBg: 'bg-purple-100', stroke: '#a855f7' },
    { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-700', lightBg: 'bg-orange-100', stroke: '#f97316' },
    { bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-700', lightBg: 'bg-pink-100', stroke: '#ec4899' },
  ];

  // Collect all unique timestamps across all hypotheses
  const allTimestamps = new Set<string>();
  data.hypotheses.forEach(hyp => {
    hyp.probability_history.forEach(event => {
      allTimestamps.add(event.timestamp);
    });
  });
  const sortedTimestamps = Array.from(allTimestamps).sort();

  // Build complete probability series for each hypothesis
  const hypothesesWithSeries = data.hypotheses.map((hyp, index) => {
    const series: { timestamp: string; probability: number; event?: ProbabilityEvent }[] = [];

    // Start with initial probability (before first event)
    if (hyp.probability_history.length > 0) {
      const firstEvent = hyp.probability_history[0];
      series.push({
        timestamp: firstEvent.timestamp,
        probability: firstEvent.old_probability,
      });
    }

    // Add all events
    hyp.probability_history.forEach(event => {
      series.push({
        timestamp: event.timestamp,
        probability: event.new_probability,
        event,
      });
    });

    return {
      ...hyp,
      series,
      color: hypothesisColors[index % hypothesisColors.length],
    };
  });

  // Calculate chart dimensions
  const chartHeight = 300;
  const chartWidth = 800;
  const padding = { top: 20, right: 20, bottom: 60, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Scale functions
  const xScale = (timestamp: string): number => {
    if (sortedTimestamps.length <= 1) return padding.left;
    const index = sortedTimestamps.indexOf(timestamp);
    return padding.left + (index / (sortedTimestamps.length - 1)) * innerWidth;
  };

  const yScale = (probability: number): number => {
    return padding.top + innerHeight - (probability * innerHeight);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900 mb-2">📈 Hypothesis Probability Evolution</h3>
        <p className="text-sm text-slate-600">
          Track how each hypothesis's probability changed over time as evidence was submitted
        </p>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-blue-200 p-4 overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="mx-auto">
          {/* Y-axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map(prob => (
            <g key={prob}>
              <line
                x1={padding.left}
                y1={yScale(prob)}
                x2={chartWidth - padding.right}
                y2={yScale(prob)}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray={prob === 0.5 ? "4,4" : "0"}
              />
              <text
                x={padding.left - 10}
                y={yScale(prob)}
                textAnchor="end"
                alignmentBaseline="middle"
                className="text-xs fill-slate-500"
              >
                {(prob * 100).toFixed(0)}%
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {sortedTimestamps.map((timestamp, index) => {
            if (sortedTimestamps.length > 10 && index % Math.ceil(sortedTimestamps.length / 8) !== 0) {
              return null; // Skip labels if too many
            }
            return (
              <text
                key={timestamp}
                x={xScale(timestamp)}
                y={chartHeight - padding.bottom + 20}
                textAnchor="middle"
                className="text-xs fill-slate-500"
                transform={`rotate(-45, ${xScale(timestamp)}, ${chartHeight - padding.bottom + 20})`}
              >
                {formatTimestamp(timestamp)}
              </text>
            );
          })}

          {/* Hypothesis lines */}
          {hypothesesWithSeries.map((hyp) => {
            const isHovered = hoveredHypothesis === hyp.id;
            const isDimmed = hoveredHypothesis && !isHovered;

            if (hyp.series.length < 2) return null;

            // Create path
            const pathData = hyp.series.map((point, index) => {
              const x = xScale(point.timestamp);
              const y = yScale(point.probability);
              return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
            }).join(' ');

            return (
              <g
                key={hyp.id}
                onMouseEnter={() => setHoveredHypothesis(hyp.id)}
                onMouseLeave={() => setHoveredHypothesis(null)}
                className="cursor-pointer"
                opacity={isDimmed ? 0.2 : 1}
              >
                {/* Line */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={hyp.color.stroke}
                  strokeWidth={isHovered ? 4 : 2}
                />

                {/* Data points */}
                {hyp.series.map((point, index) => (
                  <circle
                    key={index}
                    cx={xScale(point.timestamp)}
                    cy={yScale(point.probability)}
                    r={isHovered ? 6 : 4}
                    stroke={hyp.color.stroke}
                    fill="white"
                    strokeWidth="2"
                  />
                ))}

                {/* Winner marker */}
                {!!hyp.is_winner && hyp.series.length > 0 && (
                  <text
                    x={xScale(hyp.series[hyp.series.length - 1].timestamp)}
                    y={yScale(hyp.series[hyp.series.length - 1].probability) - 15}
                    textAnchor="middle"
                    className="text-lg"
                  >
                    🏆
                  </text>
                )}
              </g>
            );
          })}

          {/* Axis labels */}
          <text
            x={chartWidth / 2}
            y={chartHeight - 5}
            textAnchor="middle"
            className="text-xs font-semibold fill-slate-600"
          >
            Timeline
          </text>
          <text
            x={15}
            y={chartHeight / 2}
            textAnchor="middle"
            className="text-xs font-semibold fill-slate-600"
            transform={`rotate(-90, 15, ${chartHeight / 2})`}
          >
            Probability
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
        {hypothesesWithSeries.map((hyp) => (
          <div
            key={hyp.id}
            className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
              hoveredHypothesis === hyp.id
                ? `${hyp.color.lightBg} ${hyp.color.border}`
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
            onMouseEnter={() => setHoveredHypothesis(hyp.id)}
            onMouseLeave={() => setHoveredHypothesis(null)}
          >
            <div className="flex items-start gap-2">
              <div className={`w-4 h-4 rounded-full ${hyp.color.bg} mt-0.5 flex-shrink-0`}></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 mb-1">
                  {hyp.statement}
                  {!!hyp.is_winner && <span className="ml-2">🏆</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span>Current: <strong>{(hyp.current_probability * 100).toFixed(1)}%</strong></span>
                  <span>Updates: {hyp.probability_history.length}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 text-xs text-slate-500 italic">
        💡 Each line represents a hypothesis. Watch how probabilities evolved as evidence accumulated.
        The winning hypothesis is marked with 🏆. Hover over lines for details.
      </div>
    </div>
  );
};

export default HypothesisTrajectory;
