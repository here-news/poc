// @ts-nocheck
import React from 'react'
import { DollarSign, TrendingUp, Users, Award } from 'lucide-react'

interface BountyPoolProps {
  question: any
  users?: any[]
}

const BountyPool: React.FC<BountyPoolProps> = ({ question, users = [] }) => {
  const contributions = question.bounty_contributions || []
  const totalPool = contributions.reduce((sum, c) => sum + c.amount, 0)

  // Calculate potential payouts
  const answers = question.answers || []
  const totalClarity = answers.reduce((sum, a) => sum + a.clarity_gain, 0)
  const reserve = totalPool * 0.10

  const payouts = answers
    .filter(a => a.clarity_gain > 0)
    .map(a => ({
      ...a,
      potential_payout: totalClarity > 0
        ? ((a.clarity_gain / totalClarity) * (totalPool - reserve))
        : 0
    }))
    .sort((a, b) => b.potential_payout - a.potential_payout)

  return (
    <div className="space-y-4">
      {/* Pool Summary */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm opacity-90 mb-1">Total Bounty Pool</div>
            <div className="text-4xl font-bold">${totalPool.toFixed(0)}</div>
          </div>
          <DollarSign className="w-12 h-12 opacity-50" />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white/10 rounded-lg p-2">
            <div className="opacity-75">Contributors</div>
            <div className="font-bold">{contributions.length}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-2">
            <div className="opacity-75">Reserved</div>
            <div className="font-bold">${reserve.toFixed(0)}</div>
          </div>
        </div>
      </div>

      {/* Contribution History */}
      <div className="bg-white rounded-xl p-5 border-2 border-slate-200">
        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Funding History
        </h3>
        <div className="space-y-2">
          {contributions.map((contrib, idx) => {
            const user = users.find(u => u.id === contrib.contributor_id)
            return (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xl">{user?.avatar || (contrib.contributor_id === 'system' ? '🏛️' : '👤')}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">
                      {user?.username || (contrib.contributor_id === 'system' ? 'Platform' : 'Anonymous')}
                    </div>
                    {contrib.note && (
                      <div className="text-xs text-slate-500 mt-0.5">{contrib.note}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500">
                    {formatDate(contrib.timestamp)}
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    +${contrib.amount}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Potential Payouts */}
      <div className="bg-white rounded-xl p-5 border-2 border-slate-200">
        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-600" />
          If Resolved Now
        </h3>
        <div className="space-y-2 mb-4">
          {payouts.map((payout, idx) => {
            const user = users.find(u => u.id === payout.builder_id)
            return (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏅'}
                  </div>
                  <span className="text-xl">{user?.avatar}</span>
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {user?.username || payout.builder_id}
                    </div>
                    <div className="text-xs text-slate-600">
                      +{payout.clarity_gain} clarity points
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-amber-600">
                    ${payout.potential_payout.toFixed(0)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {((payout.clarity_gain / totalClarity) * 100).toFixed(0)}% of pool
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="pt-3 border-t border-slate-200 text-sm text-slate-600">
          <div className="flex justify-between">
            <span>Total distributed:</span>
            <span className="font-bold">${(totalPool - reserve).toFixed(0)}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Treasury reserve (10%):</span>
            <span className="font-bold">${reserve.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Add to Pool CTA */}
      <div className="bg-slate-50 rounded-xl p-5 border-2 border-dashed border-slate-300">
        <div className="text-center">
          <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <div className="text-sm font-medium text-slate-900 mb-1">
            Want this resolved faster?
          </div>
          <div className="text-xs text-slate-600 mb-3">
            Larger bounties attract more contributors
          </div>
          <div className="flex gap-2 justify-center">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Add $50
            </button>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
              Add $100
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getContributorName(id: string): string {
  const names = {
    'system': '🏛️ Platform',
    'builder-anon': '👤 Anonymous',
    'builder-a': '👨‍💻 BuilderA',
    'builder-b': '👨‍💻 BuilderB',
    'builder-c': '👨‍💻 BuilderC',
    'builder-d': '👨‍💻 BuilderD',
  }
  return names[id] || id
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default BountyPool
