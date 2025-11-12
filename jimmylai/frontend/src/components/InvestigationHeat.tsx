/**
 * Investigation Heat - Visualizes tension (Θ) without exposing math
 *
 * Shows:
 * - Heat level (🔥 metaphor)
 * - Phase indicator (🌱 ignition → 🌪️ storm → 💡 breakthrough → ✅ resolution)
 * - Community activity metrics
 * - Current urgency
 */
import React, { useEffect, useState } from 'react'
import { Flame, TrendingUp, Users, DollarSign } from 'lucide-react'

interface DynamicsSnapshot {
  timestamp: string
  entropy: number  // H ∈ [0, 1]
  tension: number  // Θ ∈ [0, 100]
  phase: 'ignition' | 'storm' | 'breakthrough' | 'resolution' | 'decay'
  clarity_per_scope: Record<string, number>
  tension_components: {
    backdrop_α: number
    social_trigger_β: number
    semantic_gap_γ: number
    evidence_density_δ: number
  }
}

interface InvestigationHeatProps {
  storyId: string
  caseId: string
  askId: string
  commentCount?: number
  bountyTotal?: number
}

const InvestigationHeat: React.FC<InvestigationHeatProps> = ({
  storyId,
  caseId,
  askId,
  commentCount = 0,
  bountyTotal = 0,
}) => {
  const [dynamics, setDynamics] = useState<DynamicsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDynamics()
  }, [storyId, caseId, askId])

  const fetchDynamics = async () => {
    try {
      const res = await fetch(`/jimmylai/api/stories/${storyId}/cases/${caseId}/asks/${askId}/dynamics`)
      const data = await res.json()
      setDynamics(data)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch dynamics:', err)
      setLoading(false)
    }
  }

  if (loading || !dynamics) {
    return (
      <div className="bg-white rounded-xl p-6 border-2 border-slate-200 animate-pulse">
        <div className="h-32 bg-slate-100 rounded"></div>
      </div>
    )
  }

  const getPhaseEmoji = (phase: string) => {
    const map: Record<string, string> = {
      ignition: '🌱',
      storm: '🌪️',
      breakthrough: '💡',
      resolution: '✅',
      decay: '😴',
    }
    return map[phase] || '❓'
  }

  const getPhaseLabel = (phase: string) => {
    const map: Record<string, string> = {
      ignition: 'Ignition',
      storm: 'Evidence Storm',
      breakthrough: 'Breakthrough',
      resolution: 'Resolution',
      decay: 'Settled',
    }
    return map[phase] || 'Unknown'
  }

  const getTensionLevel = (tension: number): [string, string] => {
    if (tension >= 75) return ['Very High', '🔥🔥🔥']
    if (tension >= 60) return ['High', '🔥🔥']
    if (tension >= 40) return ['Medium', '🔥']
    if (tension >= 20) return ['Low', '💨']
    return ['Very Low', '😴']
  }

  const [tensionLabel, tensionEmoji] = getTensionLevel(dynamics.tension)

  // Calculate heat bar fill percentage
  const heatPercentage = Math.min(dynamics.tension, 100)

  // Gradient color based on tension
  const getGradientColor = (tension: number) => {
    if (tension >= 75) return 'from-red-500 to-orange-500'
    if (tension >= 60) return 'from-orange-500 to-amber-500'
    if (tension >= 40) return 'from-amber-500 to-yellow-500'
    if (tension >= 20) return 'from-yellow-500 to-blue-400'
    return 'from-slate-400 to-slate-300'
  }

  return (
    <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-bold text-slate-900">Investigation Heat</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getPhaseEmoji(dynamics.phase)}</span>
          <span className="text-sm font-medium text-slate-700">{getPhaseLabel(dynamics.phase)}</span>
        </div>
      </div>

      {/* Heat Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Community Urgency</span>
          <span className="text-sm font-bold text-slate-900">{tensionLabel} {tensionEmoji}</span>
        </div>
        <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full bg-gradient-to-r ${getGradientColor(
              dynamics.tension
            )} transition-all duration-500 ease-out`}
            style={{ width: `${heatPercentage}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-slate-900 mix-blend-difference">
              {Math.round(dynamics.tension)}%
            </span>
          </div>
        </div>
      </div>

      {/* Activity Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-slate-600">Voices</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{commentCount}</div>
        </div>

        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-slate-600">Stakes</span>
          </div>
          <div className="text-xl font-bold text-slate-900">${bountyTotal}</div>
        </div>

        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-medium text-slate-600">Clarity</span>
          </div>
          <div className="text-xl font-bold text-slate-900">
            {Math.round((1 - dynamics.entropy) * 100)}%
          </div>
        </div>
      </div>

      {/* Phase Description */}
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <div className="text-xs font-bold text-blue-900 mb-1">CURRENT PHASE</div>
        <div className="text-sm text-blue-800">
          {dynamics.phase === 'ignition' && (
            <>🌱 Curiosity building. Community is anticipating evidence.</>
          )}
          {dynamics.phase === 'storm' && (
            <>🌪️ High debate! Conflicting claims need primary evidence.</>
          )}
          {dynamics.phase === 'breakthrough' && (
            <>💡 Evidence arriving! Clarity is increasing rapidly.</>
          )}
          {dynamics.phase === 'resolution' && (
            <>✅ Consensus reached. Key questions answered.</>
          )}
          {dynamics.phase === 'decay' && (
            <>😴 Investigation settled. Community activity is low.</>
          )}
        </div>
      </div>

      {/* Debug: Show components (can be removed later) */}
      <details className="mt-4">
        <summary className="text-xs text-slate-500 cursor-pointer">Debug: Tension Components</summary>
        <div className="mt-2 text-xs space-y-1 font-mono">
          <div>backdrop α: {dynamics.tension_components.backdrop_α.toFixed(2)}</div>
          <div>social β: {dynamics.tension_components.social_trigger_β.toFixed(2)}</div>
          <div>semantic gap γ: {dynamics.tension_components.semantic_gap_γ.toFixed(2)}</div>
          <div>evidence δ: {dynamics.tension_components.evidence_density_δ.toFixed(2)}</div>
          <div className="pt-2 border-t">
            Entropy H: {dynamics.entropy.toFixed(3)} | Tension Θ: {dynamics.tension.toFixed(1)}
          </div>
        </div>
      </details>
    </div>
  )
}

export default InvestigationHeat
