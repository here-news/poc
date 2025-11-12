import React, { useEffect, useState, useCallback } from 'react'
import { Plus, TrendingUp, AlertCircle, CheckCircle, Clock, Activity, Wifi, WifiOff } from 'lucide-react'
import { useGlobalWebSocket, GlobalActivity } from '../hooks/useGlobalWebSocket'

interface Quest {
  id: string
  title: string
  description: string
  status: string
  total_bounty: number
  evidence_count: number
  participant_count: number
  entropy: number
  leading_hypothesis: {
    statement: string
    probability: number
  } | null
  created_at: string
}

// Helper functions
const formatBounty = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount)
}

const getEntropyColor = (entropy: number) => {
  if (entropy > 0.7) return 'text-red-600'
  if (entropy > 0.4) return 'text-amber-600'
  return 'text-green-600'
}

const getEntropyLabel = (entropy: number) => {
  if (entropy > 0.7) return 'High uncertainty'
  if (entropy > 0.4) return 'Moderate clarity'
  return 'High clarity'
}

const HomePage = () => {
  const [trendingQuests, setTrendingQuests] = useState<Quest[]>([])
  const [activeQuests, setActiveQuests] = useState<Quest[]>([])
  const [convergedQuests, setConvergedQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)

  // Global WebSocket connection for live activity feed
  const handleActivity = useCallback((activity: GlobalActivity) => {
    console.log('🌐 Global activity:', activity.type, activity.quest_title)
    // Reload quests when there's activity
    loadQuests()
  }, [])

  const { isConnected, recentActivity } = useGlobalWebSocket({
    onActivity: handleActivity
  })

  useEffect(() => {
    console.log('🏠 HomePage: Loading quests...')
    loadQuests()
    // Poll for updates every 5 seconds as backup
    const interval = setInterval(loadQuests, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadQuests = async () => {
    console.log('📊 HomePage: Fetching quests from api/quests')
    try {
      // Load all quests
      const response = await fetch('/jimmylai/api/quests?limit=50')
      console.log('📊 Response status:', response.status)
      const allQuests = await response.json()
      console.log('📊 Quests loaded:', allQuests.length)

      // Categorize quests
      const trending = allQuests
        .filter((q: Quest) => q.status === 'active' && q.evidence_count > 0)
        .sort((a: Quest, b: Quest) => b.total_bounty - a.total_bounty)
        .slice(0, 5)

      // Get trending quest IDs to exclude from active section
      const trendingIds = new Set(trending.map((q: Quest) => q.id))

      const active = allQuests
        .filter((q: Quest) => q.status === 'active' && !trendingIds.has(q.id))
        .sort((a: Quest, b: Quest) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)

      const converged = allQuests
        .filter((q: Quest) => q.status === 'converged')
        .sort((a: Quest, b: Quest) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

      setTrendingQuests(trending)
      setActiveQuests(active)
      setConvergedQuests(converged)
      console.log('✅ HomePage: Quests state updated')
    } catch (error) {
      console.error('❌ HomePage: Failed to load quests:', error)
    } finally {
      console.log('✅ HomePage: Loading complete, setLoading(false)')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading quests...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Truth Market</h1>
              <p className="text-slate-600 mt-1">Community-driven clarity quests</p>
            </div>
            <button
              onClick={() => window.location.href = '/create-quest'}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create New Quest
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Live Activity Feed */}
        {recentActivity.length > 0 && (
          <section className="mb-8">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">Live Activity</h2>
                <div className="ml-auto flex items-center gap-2 text-xs">
                  {isConnected ? (
                    <>
                      <Wifi className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 font-medium">Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-400">Disconnected</span>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {recentActivity.slice(0, 10).map((activity, idx) => (
                  <ActivityItem key={`${activity.quest_id}-${activity.timestamp}-${idx}`} activity={activity} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Trending Quests */}
        {trendingQuests.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-6 h-6 text-orange-600" />
              <h2 className="text-2xl font-bold text-slate-900">🔥 Trending Quests</h2>
            </div>
            <div className="grid gap-4">
              {trendingQuests.map(quest => (
                <QuestCard key={quest.id} quest={quest} prominent />
              ))}
            </div>
          </section>
        )}

        {/* Active Quests Needing Evidence */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-900">⚡ Active Investigations</h2>
          </div>
          <div className="grid gap-4">
            {activeQuests.map(quest => (
              <QuestCard key={quest.id} quest={quest} />
            ))}
          </div>
        </section>

        {/* Recently Converged */}
        {convergedQuests.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-bold text-slate-900">📊 Recently Resolved</h2>
            </div>
            <div className="grid gap-4">
              {convergedQuests.map(quest => (
                <QuestCard key={quest.id} quest={quest} converged />
              ))}
            </div>
          </section>
        )}

        {activeQuests.length === 0 && trendingQuests.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-xl font-medium text-slate-600 mb-4">No active quests yet</h3>
            <button
              onClick={() => window.location.href = '/create-quest'}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create the First Quest
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface QuestCardProps {
  quest: Quest
  prominent?: boolean
  converged?: boolean
}

const QuestCard: React.FC<QuestCardProps> = ({ quest, prominent, converged }) => {
  const cardClasses = prominent
    ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200'
    : converged
    ? 'bg-green-50 border border-green-200'
    : 'bg-white border border-slate-200'

  return (
    <a
      href={`/quest/${quest.id}`}
      className={`block ${cardClasses} rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className={`${prominent ? 'text-xl' : 'text-lg'} font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2`}>
            {quest.title}
          </h3>
          <p className="text-slate-600 text-sm line-clamp-2">{quest.description}</p>
        </div>

        <div className="flex flex-col items-end gap-2 ml-4">
          {quest.total_bounty > 0 && (
            <div className={`${prominent ? 'text-2xl' : 'text-xl'} font-bold text-green-600`}>
              💰 {formatBounty(quest.total_bounty)}
            </div>
          )}
        </div>
      </div>

      {/* Leading Hypothesis */}
      {quest.leading_hypothesis && (
        <div className="mb-3 bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs font-bold text-slate-500 mb-1">
            {converged ? '🏆 WINNER' : 'Leading Hypothesis'}
          </div>
          <div className="text-sm text-slate-900 font-medium mb-1">
            {quest.leading_hypothesis.statement}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  quest.leading_hypothesis.probability >= 0.8
                    ? 'bg-green-500'
                    : quest.leading_hypothesis.probability >= 0.5
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${quest.leading_hypothesis.probability * 100}%` }}
              />
            </div>
            <div className="text-sm font-bold text-slate-700">
              {Math.round(quest.leading_hypothesis.probability * 100)}%
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-slate-600">
          <span className="font-medium">{quest.evidence_count}</span>
          <span>evidence</span>
        </div>
        <span className="text-slate-300">•</span>
        <div className="flex items-center gap-1 text-slate-600">
          <span className="font-medium">{quest.participant_count}</span>
          <span>contributors</span>
        </div>
        {!converged && (
          <>
            <span className="text-slate-300">•</span>
            <div className={`flex items-center gap-1 text-xs ${getEntropyColor(quest.entropy)}`}>
              <span className="font-medium">{getEntropyLabel(quest.entropy)}</span>
            </div>
          </>
        )}
        <div className="ml-auto text-xs text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(quest.created_at).toLocaleDateString()}
        </div>
      </div>
    </a>
  )
}

interface ActivityItemProps {
  activity: GlobalActivity
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'evidence_submitted':
        return '📄'
      case 'quest_converged':
        return '🏆'
      case 'hypothesis_fork':
        return '🍴'
      default:
        return '•'
    }
  }

  const getActivityText = () => {
    switch (activity.type) {
      case 'evidence_submitted':
        return 'New evidence submitted'
      case 'quest_converged':
        return 'Quest converged!'
      case 'hypothesis_fork':
        return 'Hypothesis forked'
      default:
        return 'Activity'
    }
  }

  const getActivityColor = () => {
    switch (activity.type) {
      case 'evidence_submitted':
        return 'text-blue-600 bg-blue-50'
      case 'quest_converged':
        return 'text-green-600 bg-green-50'
      case 'hypothesis_fork':
        return 'text-purple-600 bg-purple-50'
      default:
        return 'text-slate-600 bg-slate-50'
    }
  }

  const timeAgo = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <a
      href={`/quest/${activity.quest_id}`}
      className={`block ${getActivityColor()} rounded-lg p-3 hover:shadow-md transition-all cursor-pointer group`}
    >
      <div className="flex items-center gap-3">
        <div className="text-lg">{getActivityIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
            {activity.quest_title || 'Unknown Quest'}
          </div>
          <div className="text-xs text-slate-600">
            {getActivityText()}
          </div>
        </div>
        <div className="text-xs text-slate-400">
          {timeAgo(activity.timestamp)}
        </div>
      </div>
    </a>
  )
}

export default HomePage
