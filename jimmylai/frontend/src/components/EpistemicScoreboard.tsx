import React, { useEffect, useState, useCallback } from 'react';
import { useQuestWebSocket } from '../hooks/useQuestWebSocket';

interface QualityScores {
  source_credibility: number;
  verification_level: number;
  evidence_type_weight: number;
  curator_reputation: number;
  novelty_score: number;
  clarity_contribution: number;
  truth_alignment_score: number;
  redundancy_penalty: number;
  misinformation_penalty: number;
}

interface Evidence {
  id: string;
  submitted_by: string;
  source_url: string;
  source_type: string;
  synopsis: string;
  submitted_at: string;
  quality_scores: QualityScores;
  epistemic_value: number;
  payout_share_percent: number;
  estimated_payout: number;
  actual_payout?: number;
  is_flagged_misinfo: boolean;
}

interface ScoreboardData {
  quest: {
    id: string;
    status: string;
    total_bounty: number;
    platform_fee_percent: number;
  };
  total_epistemic_value: number;
  available_bounty: number;
  evidence: Evidence[];
}

interface Props {
  questId: string;
}

const EpistemicScoreboard: React.FC<Props> = ({ questId }) => {
  const [data, setData] = useState<ScoreboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);

  // Fetch scoreboard data
  const fetchScoreboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/jimmylai/api/quests/${questId}/epistemic-scoreboard`);
      if (!response.ok) {
        throw new Error(`Failed to fetch scoreboard: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scoreboard');
    } finally {
      setLoading(false);
    }
  }, [questId]);

  // Initial fetch
  useEffect(() => {
    fetchScoreboard();
  }, [fetchScoreboard]);

  // WebSocket handlers for real-time updates
  useQuestWebSocket(questId, {
    onEvidenceSubmitted: () => {
      console.log('💰 Scoreboard: Evidence submitted, refetching...');
      fetchScoreboard();
    },
    onProbabilityUpdate: () => {
      console.log('💰 Scoreboard: Probability updated, refetching...');
      fetchScoreboard();
    },
    onBountyAdded: () => {
      console.log('💰 Scoreboard: Bounty added, refetching...');
      fetchScoreboard();
    },
    onQuestConverged: () => {
      console.log('💰 Scoreboard: Quest converged, refetching...');
      fetchScoreboard();
    }
  });

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-8 border-2 border-purple-200">
        <div className="text-center text-slate-600">Loading epistemic scoreboard...</div>
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

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatMoney = (value: number) => `$${value.toFixed(2)}`;

  const getScoreColor = (score: number): string => {
    if (score >= 0.9) return 'text-green-700 bg-green-100';
    if (score >= 0.7) return 'text-blue-700 bg-blue-100';
    if (score >= 0.5) return 'text-yellow-700 bg-yellow-100';
    return 'text-orange-700 bg-orange-100';
  };

  const getPenaltyColor = (penalty: number): string => {
    if (penalty === 0) return 'text-green-700 bg-green-100';
    if (penalty < 0.3) return 'text-yellow-700 bg-yellow-100';
    return 'text-red-700 bg-red-100';
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-purple-200">
          <div className="text-xs font-medium text-purple-600 mb-1">Total Epistemic Value</div>
          <div className="text-2xl font-bold text-slate-900">{data.total_epistemic_value.toFixed(3)}</div>
          <div className="text-xs text-slate-500 mt-1">Sum of all evidence contributions</div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-green-200">
          <div className="text-xs font-medium text-green-600 mb-1">Available Bounty</div>
          <div className="text-2xl font-bold text-slate-900">{formatMoney(data.available_bounty)}</div>
          <div className="text-xs text-slate-500 mt-1">
            Total: {formatMoney(data.quest.total_bounty)}
            {data.quest.platform_fee_percent > 0 && ` (${data.quest.platform_fee_percent.toFixed(1)}% platform fee)`}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-blue-200">
          <div className="text-xs font-medium text-blue-600 mb-1">Evidence Contributions</div>
          <div className="text-2xl font-bold text-slate-900">{data.evidence.length}</div>
          <div className="text-xs text-slate-500 mt-1">Total pieces submitted</div>
        </div>
      </div>

      {/* Evidence List */}
      <div className="bg-white rounded-lg border border-purple-200 overflow-hidden">
        <div className="bg-purple-100 px-4 py-3 border-b border-purple-200">
          <h3 className="text-sm font-bold text-slate-900">Evidence Ranked by Epistemic Value</h3>
        </div>

        <div className="divide-y divide-slate-200">
          {data.evidence.map((ev, index) => (
            <div key={ev.id} className="p-4 hover:bg-slate-50 transition-colors">
              {/* Main Row */}
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-slate-700">#{index + 1}</span>
                    <span className="text-xs font-mono text-slate-500">{ev.id}</span>
                    {ev.is_flagged_misinfo && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                        Flagged
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 truncate mb-1">
                    {ev.synopsis || 'No synopsis available'}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>👤 {ev.submitted_by}</span>
                    <span>📋 {ev.source_type}</span>
                    <span>🕒 {new Date(ev.submitted_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Epistemic Value</div>
                    <div className="text-xl font-bold text-purple-700">{ev.epistemic_value.toFixed(3)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Share</div>
                    <div className="text-sm font-semibold text-blue-700">{ev.payout_share_percent.toFixed(1)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Payout</div>
                    <div className="text-lg font-bold text-green-700">{formatMoney(ev.estimated_payout)}</div>
                  </div>
                </div>
              </div>

              {/* Quality Scores - Collapsible */}
              <button
                onClick={() => setExpandedEvidence(expandedEvidence === ev.id ? null : ev.id)}
                className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
              >
                {expandedEvidence === ev.id ? '▼' : '▶'}
                {expandedEvidence === ev.id ? 'Hide' : 'Show'} quality breakdown
              </button>

              {expandedEvidence === ev.id && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Positive Factors */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 mb-2">📊 Quality Factors</div>

                      <div>
                        <div className="text-xs text-slate-600">Source Credibility</div>
                        <div className={`text-sm font-semibold px-2 py-1 rounded inline-block ${getScoreColor(ev.quality_scores.source_credibility)}`}>
                          {formatPercent(ev.quality_scores.source_credibility)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-600">Verification Level</div>
                        <div className={`text-sm font-semibold px-2 py-1 rounded inline-block ${getScoreColor(ev.quality_scores.verification_level)}`}>
                          {formatPercent(ev.quality_scores.verification_level)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-600">Evidence Type Weight</div>
                        <div className={`text-sm font-semibold px-2 py-1 rounded inline-block ${getScoreColor(ev.quality_scores.evidence_type_weight)}`}>
                          {formatPercent(ev.quality_scores.evidence_type_weight)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 mb-2">🎯 Contribution Factors</div>

                      <div>
                        <div className="text-xs text-slate-600">Curator Reputation</div>
                        <div className={`text-sm font-semibold px-2 py-1 rounded inline-block ${getScoreColor(ev.quality_scores.curator_reputation)}`}>
                          {formatPercent(ev.quality_scores.curator_reputation)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-600">Novelty Score</div>
                        <div className={`text-sm font-semibold px-2 py-1 rounded inline-block ${getScoreColor(ev.quality_scores.novelty_score)}`}>
                          {formatPercent(ev.quality_scores.novelty_score)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-600">Clarity Contribution (Δ)</div>
                        <div className={`text-sm font-semibold px-2 py-1 rounded inline-block ${getScoreColor(Math.abs(ev.quality_scores.clarity_contribution))}`}>
                          {ev.quality_scores.clarity_contribution >= 0 ? '+' : ''}{formatPercent(ev.quality_scores.clarity_contribution)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 mb-2">✅ Alignment & Penalties</div>

                      <div>
                        <div className="text-xs text-slate-600">Truth Alignment</div>
                        <div className={`text-sm font-semibold px-2 py-1 rounded inline-block ${getScoreColor(ev.quality_scores.truth_alignment_score)}`}>
                          {formatPercent(ev.quality_scores.truth_alignment_score)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-600">Redundancy Penalty</div>
                        <div className={`text-sm font-semibold px-2 py-1 rounded inline-block ${getPenaltyColor(ev.quality_scores.redundancy_penalty)}`}>
                          {ev.quality_scores.redundancy_penalty > 0 ? '-' : ''}{formatPercent(ev.quality_scores.redundancy_penalty)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-600">Misinformation Penalty</div>
                        <div className={`text-sm font-semibold px-2 py-1 rounded inline-block ${getPenaltyColor(ev.quality_scores.misinformation_penalty)}`}>
                          {ev.quality_scores.misinformation_penalty > 0 ? '-' : ''}{formatPercent(ev.quality_scores.misinformation_penalty)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Formula Display */}
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="text-xs text-slate-600 mb-1">Epistemic Value Formula:</div>
                    <div className="text-xs font-mono text-slate-700 bg-slate-100 p-2 rounded">
                      {ev.quality_scores.source_credibility.toFixed(2)} × {ev.quality_scores.verification_level.toFixed(2)} × {ev.quality_scores.evidence_type_weight.toFixed(2)} × {ev.quality_scores.novelty_score.toFixed(2)} × (1 + {ev.quality_scores.clarity_contribution.toFixed(3)}) × {ev.quality_scores.truth_alignment_score.toFixed(2)} × (1 - {ev.quality_scores.redundancy_penalty.toFixed(2)}) × (1 - {ev.quality_scores.misinformation_penalty.toFixed(2)}) = <span className="font-bold text-purple-700">{ev.epistemic_value.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-4 text-xs text-slate-500 italic">
        💡 Payouts are calculated proportionally based on each evidence's epistemic value contribution to the total.
        Higher quality, novel, and truth-aligned evidence receives larger shares of the bounty pool.
      </div>
    </div>
  );
};

export default EpistemicScoreboard;
