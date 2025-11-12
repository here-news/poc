// @ts-nocheck
import React from 'react'
import { AlertCircle, Clock, DollarSign, TrendingUp } from 'lucide-react'

interface UncertaintyDashboardProps {
  story: any
  selectedCase?: any
}

const UncertaintyDashboard: React.FC<UncertaintyDashboardProps> = ({ story, selectedCase }) => {
  if (!story) return null

  // Calculate aggregate clarity across all cases
  const totalClarity = story.cases.reduce((sum, c) => sum + (c.clarity || 0), 0)
  const avgClarity = story.cases.length > 0 ? Math.round(totalClarity / story.cases.length) : 0
  const uncertainty = 100 - avgClarity

  // Get all unanswered or low-clarity asks
  const mysteries = story.cases.flatMap(c =>
    c.asks
      .filter(a => a.clarity < 70)
      .map(a => ({
        ...a,
        caseTitle: c.title,
        caseId: c.id
      }))
  ).sort((a, b) => b.bounty - a.bounty)

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-lg border border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-bold">Uncertainty Dashboard</h3>
      </div>

      {/* Clarity Meter */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-300">What we know</span>
          <span className="text-2xl font-bold text-green-400">{avgClarity}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-400 h-3 rounded-full transition-all duration-500"
            style={{ width: `${avgClarity}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">What we're chasing</span>
          <span className="text-lg font-semibold text-amber-400">{uncertainty}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-amber-500 to-orange-400 h-2 rounded-full transition-all duration-500"
            style={{ width: `${uncertainty}%` }}
          />
        </div>
      </div>

      {/* Active Mysteries */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Active Mysteries ({mysteries.length})
        </h4>
        <div className="space-y-2 max-h-48 overflow-auto">
          {mysteries.length === 0 && (
            <div className="text-sm text-slate-400 italic">All questions resolved!</div>
          )}
          {mysteries.slice(0, 5).map((mystery) => {
            const timeLeft = calculateTimeLeft(mystery.deadline)
            const isUrgent = timeLeft.includes('h') || timeLeft.includes('m')

            return (
              <div
                key={mystery.id}
                className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {mystery.question}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {mystery.caseTitle}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1 bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs font-medium">
                      <DollarSign className="w-3 h-3" />
                      {mystery.bounty}
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      isUrgent ? 'bg-red-500/20 text-red-300' : 'bg-slate-700 text-slate-300'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {timeLeft}
                    </div>
                  </div>
                </div>

                {/* Clarity progress */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full"
                      style={{ width: `${mystery.clarity}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{mystery.clarity}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-xs text-slate-400">Total Bounty</div>
          <div className="text-lg font-bold text-blue-400">
            ${mysteries.reduce((sum, m) => sum + m.bounty, 0)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Open Asks</div>
          <div className="text-lg font-bold text-amber-400">{mysteries.length}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Resonance</div>
          <div className="text-lg font-bold text-green-400">{story.resonance}</div>
        </div>
      </div>
    </div>
  )
}

function calculateTimeLeft(deadline: string): string {
  const now = new Date()
  const end = new Date(deadline)
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) return 'Expired'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default UncertaintyDashboard
