import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, TrendingUp, Users, DollarSign, Clock, AlertCircle, MessageCircle, ThumbsUp, ThumbsDown, HelpCircle, Send } from 'lucide-react'
import { useQuestWebSocket } from '../hooks/useQuestWebSocket'
import EpistemicScoreboard from './EpistemicScoreboard'
import HypothesisTrajectory from './HypothesisTrajectory'

interface Hypothesis {
  id: string
  statement: string
  current_probability: number
  initial_probability: number
  last_updated: string
  generated_by: string
  is_winner: number
}

interface Comment {
  id: string
  evidence_id: string
  user_id: string
  text: string
  parent_comment_id: string | null
  reaction_type: string | null
  timestamp: string
}

interface Evidence {
  id: string
  source_url: string
  synopsis: string | null
  source_type: string | null
  submitted_by: string
  submitted_at: string
  novelty_score: number | null
  llm_reasoning: string | null
  key_claims: string[] | null
  source_credibility: number | null
  verification_level: number | null
  epistemic_value: number | null
}

interface Quest {
  id: string
  title: string
  description: string
  status: string
  created_by: string
  created_at: string
  converged_at: string | null
  winning_hypothesis_id: string | null
  winning_probability: number | null
  initial_bounty: number
  total_bounty: number
  evidence_count: number
  participant_count: number
  hypotheses: Hypothesis[]
  evidence: Evidence[]
}

const formatBounty = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getUserAvatar = (userId: string) => {
  // Generate consistent avatar based on user ID
  const avatars = ['👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '🧑‍💼', '👨‍🔬', '👩‍🔬', '🧑‍🔬', '👨‍💻', '👩‍💻', '🧑‍💻']
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-amber-100 text-amber-700',
    'bg-cyan-100 text-cyan-700',
    'bg-rose-100 text-rose-700',
    'bg-indigo-100 text-indigo-700'
  ]

  // Simple hash function for consistent avatar selection
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const avatarIndex = Math.abs(hash) % avatars.length
  const colorIndex = Math.abs(hash >> 4) % colors.length

  return {
    emoji: avatars[avatarIndex],
    colorClass: colors[colorIndex]
  }
}

export default function QuestDetailPage() {
  const { questId } = useParams<{ questId: string }>()
  const navigate = useNavigate()
  const [quest, setQuest] = useState<Quest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [evidenceComments, setEvidenceComments] = useState<Record<string, Comment[]>>({})
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null)
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [bountyAmount, setBountyAmount] = useState<string>('10')
  const [currentUserId] = useState('user-' + Math.random().toString(36).substr(2, 9))
  const [activeActionBox, setActiveActionBox] = useState<string | null>(null) // Format: 'ev-{evidenceId}-{action}'
  const [showEvidenceModal, setShowEvidenceModal] = useState(false)
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceSynopsis, setEvidenceSynopsis] = useState('')
  const [evidenceType, setEvidenceType] = useState('')
  const [submittingEvidence, setSubmittingEvidence] = useState(false)
  const [forkEvent, setForkEvent] = useState<any | null>(null)

  // 🔥 Real-time WebSocket connection
  // useMemo to prevent handler object from changing on every render
  const wsHandlers = useMemo(() => ({
    onEvidenceSubmitted: (data: any) => {
      console.log('📡 New evidence submitted:', data)
      // Incrementally add new evidence to avoid full page reload
      setQuest(prev => {
        if (!prev) return null
        // Check if evidence already exists (avoid duplicates)
        const exists = prev.evidence?.some(e => e.id === data.evidence.id) || false
        if (exists) return prev

        return {
          ...prev,
          evidence: [...(prev.evidence || []), data.evidence],
          evidence_count: (prev.evidence_count || 0) + 1
        }
      })
    },
    onProbabilityUpdate: (data: any) => {
      console.log('📡 Probabilities updated:', data)
      // Update hypotheses with new probabilities smoothly
      setQuest(prev => prev ? {
        ...prev,
        hypotheses: prev.hypotheses.map(h => {
          const updated = data.hypotheses.find((uh: any) => uh.id === h.id)
          return updated ? { ...h, current_probability: updated.probability } : h
        })
      } : null)
    },
    onCommentAdded: (data: any) => {
      console.log('📡 Comment added:', data)
      // Reload comments for this evidence
      loadComments(data.evidence_id)
    },
    onBountyAdded: (data: any) => {
      console.log('📡 Bounty added:', data)
      // Update bounty total
      setQuest(prev => prev ? { ...prev, total_bounty: data.new_total } : null)
    },
    onQuestConverged: (data: any) => {
      console.log('📡 Quest converged!', data)
      // Reload full quest to show convergence
      if (questId) {
        fetch(`/jimmylai/api/quests/${questId}`)
          .then(res => res.json())
          .then(data => setQuest(data))
      }
    },
    onHypothesisFork: (data: any) => {
      console.log('🍴 Hypothesis fork triggered!', data)
      // Show fork event banner
      setForkEvent(data)
      // Auto-hide after 10 seconds
      setTimeout(() => setForkEvent(null), 10000)
    }
  }), []) // Empty deps - handlers use setState which is stable

  const { isConnected } = useQuestWebSocket(questId, wsHandlers)

  useEffect(() => {
    if (!questId) return

    fetch(`/jimmylai/api/quests/${questId}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load quest: ${res.status}`)
        return res.json()
      })
      .then(data => {
        setQuest(data)
        // Auto-expand newest evidence for just-in-time debate
        if (data.evidence && data.evidence.length > 0) {
          const sortedEvidence = [...data.evidence].sort((a, b) =>
            new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
          )
          setExpandedEvidence(sortedEvidence[0].id)
        }
        setLoading(false)

        // Load comments for all evidence
        if (data.evidence) {
          data.evidence.forEach((ev: Evidence) => {
            loadComments(ev.id)
          })
        }
      })
      .catch(err => {
        console.error('Failed to load quest:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [questId])

  const loadComments = async (evidenceId: string) => {
    try {
      const res = await fetch(`/jimmylai/api/evidence/${evidenceId}/comments`)
      const comments = await res.json()
      setEvidenceComments(prev => ({ ...prev, [evidenceId]: comments }))
    } catch (err) {
      console.error('Failed to load comments:', err)
    }
  }

  const submitComment = async (evidenceId: string, reactionType: string | null = null) => {
    const boxId = `ev-${evidenceId}`
    const text = newComment[boxId]
    if (!text || !text.trim()) return

    try {
      await fetch('/jimmylai/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_id: evidenceId,
          user_id: currentUserId,
          text: text.trim(),
          reaction_type: reactionType
        })
      })

      // Reload comments
      await loadComments(evidenceId)

      // Clear input and close action box
      setNewComment(prev => ({ ...prev, [boxId]: '' }))
      setActiveActionBox(null)
    } catch (err) {
      console.error('Failed to submit comment:', err)
    }
  }

  const handleActionClick = (evidenceId: string, action: 'support' | 'refute' | 'question') => {
    const newBoxId = `ev-${evidenceId}-${action}`
    // Toggle: if clicking same action, close it. Otherwise open this one
    setActiveActionBox(activeActionBox === newBoxId ? null : newBoxId)
    const boxId = `ev-${evidenceId}`
    if (activeActionBox !== newBoxId) {
      setNewComment(prev => ({ ...prev, [boxId]: '' }))
    }
  }

  const addBounty = async () => {
    const amount = parseFloat(bountyAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    try {
      const res = await fetch(`/jimmylai/api/quests/${questId}/bounty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          amount: amount,
          message: 'Community contribution'
        })
      })

      const result = await res.json()

      // Update quest bounty in UI
      if (quest) {
        setQuest({ ...quest, total_bounty: result.new_bounty })
      }

      alert(`Successfully added $${amount} to the bounty pool!`)
      setBountyAmount('10')
    } catch (err) {
      console.error('Failed to add bounty:', err)
      alert('Failed to add bounty')
    }
  }

  const submitEvidence = async () => {
    if (!evidenceUrl.trim()) {
      alert('Please enter a source URL')
      return
    }

    setSubmittingEvidence(true)
    try {
      const res = await fetch(`/jimmylai/api/quests/${questId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_url: evidenceUrl,
          synopsis: evidenceSynopsis,
          source_type: evidenceType,
          user_id: currentUserId
        })
      })

      if (!res.ok) {
        throw new Error(`Failed to submit evidence: ${res.status}`)
      }

      const result = await res.json()

      // Reload quest to get updated evidence
      const questRes = await fetch(`/jimmylai/api/quests/${questId}`)
      const updatedQuest = await questRes.json()
      setQuest(updatedQuest)

      // Close modal and reset form
      setShowEvidenceModal(false)
      setEvidenceUrl('')
      setEvidenceSynopsis('')
      setEvidenceType('')

      alert('Evidence submitted successfully! The LLM is analyzing its impact on probabilities.')
    } catch (err) {
      console.error('Failed to submit evidence:', err)
      alert('Failed to submit evidence')
    } finally {
      setSubmittingEvidence(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading quest...</div>
      </div>
    )
  }

  if (error || !quest) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <div className="text-xl text-slate-900 mb-2">Quest not found</div>
          <div className="text-sm text-slate-600 mb-4">{error || 'This quest may have been deleted.'}</div>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    )
  }

  const sortedHypotheses = [...quest.hypotheses].sort((a, b) => b.current_probability - a.current_probability)
  const sortedEvidence = [...quest.evidence].sort((a, b) =>
    new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 🍴 Fork Event Banner */}
      {forkEvent && (
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-4 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🍴</div>
                <div>
                  <div className="font-bold text-lg">HYPOTHESIS FORK TRIGGERED!</div>
                  <div className="text-sm opacity-90">
                    {forkEvent.submitter_id && `Evidence by @${forkEvent.submitter_id.replace('user-', '')} `}
                    revealed new dimensions of truth
                  </div>
                </div>
              </div>
              <button
                onClick={() => setForkEvent(null)}
                className="text-white hover:bg-white/20 px-3 py-1 rounded transition-colors"
              >
                ×
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="font-semibold mb-1">Previous hypotheses:</div>
                {forkEvent.old_hypotheses?.map((h: any, i: number) => (
                  <div key={i} className="opacity-80">• {h.statement}</div>
                ))}
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="font-semibold mb-1">🌿 Forked into:</div>
                {forkEvent.forked_hypotheses?.map((h: any, i: number) => (
                  <div key={i} className="opacity-90">
                    • [{h.scope}] {h.statement}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Quests
          </button>

          <div className="flex items-start gap-6">
            {/* Portrait box on the left */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col gap-2 items-center shrink-0">
              <div className="text-xs font-medium text-slate-500 mb-1">Key Figures</div>
              <img
                src="/static/trump.jpg"
                alt="Donald Trump"
                className="w-20 h-20 object-cover rounded-lg border-2 border-slate-300"
              />
              <img
                src="/static/jimmy-lai.jpg"
                alt="Jimmy Lai"
                className="w-20 h-20 object-cover rounded-lg border-2 border-slate-300"
              />
              <img
                src="/static/xi.jpg"
                alt="Xi Jinping"
                className="w-20 h-20 object-cover rounded-lg border-2 border-slate-300"
              />
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{quest.title}</h1>
              <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-line">{quest.description}</p>
            </div>

            <div className="flex flex-col gap-2">
              {/* 🔥 Live connection indicator */}
              {isConnected && (
                <div className="bg-green-100 text-green-600 px-4 py-2 rounded-lg font-bold text-center flex items-center justify-center gap-2">
                  <span className="animate-pulse">●</span>
                  ACTIVE
                </div>
              )}
              {quest.status === 'converged' && (
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold text-center">
                  🏆 CONVERGED
                </div>
              )}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 text-center">
                <div className="text-sm font-medium text-slate-600 mb-1">Total Bounty</div>
                <div className="text-3xl font-bold text-green-600">
                  💰 {formatBounty(quest.total_bounty)}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-slate-600">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">{quest.evidence_count}</span>
              <span className="text-sm">evidence submitted</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="w-5 h-5" />
              <span className="font-medium">{quest.participant_count}</span>
              <span className="text-sm">contributors</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-5 h-5" />
              <span className="text-sm">Created {formatDate(quest.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Hypotheses & Evidence */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hypotheses */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">📊 Hypotheses</h2>
              <div className="space-y-4">
                {(() => {
                  const mainHypotheses = sortedHypotheses.filter(h => (h.current_probability || 0) * 100 >= 12)
                  const speculativeHypotheses = sortedHypotheses.filter(h => (h.current_probability || 0) * 100 < 12)

                  return (
                    <>
                      {mainHypotheses.map((hyp, index) => {
                        const probability = (hyp.current_probability || 0) * 100
                        const isWinner = quest.status === 'converged' && hyp.id === quest.winning_hypothesis_id
                        const isLeading = index === 0

                        return (
                          <div
                            key={hyp.id}
                            className={`bg-white rounded-xl p-6 border-2 transition-all ${
                              isWinner
                                ? 'border-green-500 bg-green-50'
                                : isLeading
                                ? 'border-blue-300'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                {isWinner && (
                                  <div className="inline-block bg-green-600 text-white text-xs font-bold px-2 py-1 rounded mb-2">
                                    🏆 WINNER
                                  </div>
                                )}
                                {!isWinner && isLeading && (
                                  <div className="inline-block bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded mb-2">
                                    🥇 LEADING
                                  </div>
                                )}
                                <p className="text-lg font-medium text-slate-900">{hyp.statement}</p>
                              </div>
                              <div className="text-3xl font-bold text-slate-900 ml-4">
                                {probability.toFixed(1)}%
                              </div>
                            </div>

                            {/* Probability Bar */}
                            <div className="h-4 bg-slate-200 rounded-full overflow-hidden mb-2">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  isWinner
                                    ? 'bg-green-500'
                                    : probability >= 50
                                    ? 'bg-blue-500'
                                    : 'bg-slate-400'
                                }`}
                                style={{ width: `${probability}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>Started at {((hyp.initial_probability || 0) * 100).toFixed(1)}%</span>
                              <span>Last updated {formatDate(hyp.last_updated)}</span>
                            </div>
                          </div>
                        )
                      })}

                      {/* Compact speculative hypotheses line */}
                      {speculativeHypotheses.length > 0 && (
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-slate-500 shrink-0 mt-0.5">💭 Other possibilities:</span>
                            <span className="text-xs text-slate-600">
                              {speculativeHypotheses.map((h, idx) => (
                                <span key={h.id}>
                                  {h.statement} <span className="font-bold">({(h.current_probability * 100).toFixed(2)}%)</span>
                                  {idx < speculativeHypotheses.length - 1 ? '; ' : ''}
                                </span>
                              ))}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </section>

            {/* Evidence Timeline */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">🔍 Evidence Timeline</h2>
              {sortedEvidence.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
                  <p className="text-slate-600">No evidence submitted yet. Be the first to contribute!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedEvidence.map((ev, index) => {
                    const isExpanded = expandedEvidence === ev.id
                    const comments = evidenceComments[ev.id] || []
                    const isNewest = index === 0

                    return (
                      <div key={ev.id} className={`bg-white rounded-xl p-6 border-2 transition-all ${
                        isNewest ? 'border-blue-400 shadow-lg' : 'border-slate-200'
                      }`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full ${
                              isNewest ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'
                            } font-bold flex items-center justify-center`}>
                              {sortedEvidence.length - index}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">
                                {ev.submitted_by.replace('user-', '@')}
                              </div>
                              <div className="text-xs text-slate-500">{formatDate(ev.submitted_at)}</div>
                            </div>
                            {isNewest && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                                🔥 Latest
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {ev.novelty_score !== null && ev.novelty_score !== undefined && (
                              <div className="text-right">
                                <div className="text-xs font-medium text-slate-500">Novelty</div>
                                <div className="text-lg font-bold text-blue-600">
                                  {ev.novelty_score.toFixed(2)}
                                </div>
                              </div>
                            )}
                            {ev.source_credibility !== null && ev.source_credibility !== undefined && (
                              <div className="text-right">
                                <div className="text-xs font-medium text-slate-500">Quality</div>
                                <div className="text-lg font-bold text-green-600">
                                  {(ev.source_credibility * 100).toFixed(0)}%
                                </div>
                              </div>
                            )}
                            <button
                              onClick={() => setExpandedEvidence(isExpanded ? null : ev.id)}
                              className="text-slate-600 hover:text-slate-900 flex items-center gap-1"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-sm">{comments.length}</span>
                            </button>
                          </div>
                        </div>

                        {/* Source URL */}
                        <a
                          href={ev.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-3 font-medium"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {ev.source_type && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                              {ev.source_type}
                            </span>
                          )}
                          <span className="truncate text-sm">{ev.source_url}</span>
                        </a>

                        {/* Synopsis */}
                        {ev.synopsis && (
                          <div className="bg-slate-50 rounded-lg p-4 mb-3">
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                              {ev.synopsis.length > 300 && !isExpanded
                                ? ev.synopsis.substring(0, 300) + '...'
                                : ev.synopsis}
                            </p>
                            {ev.synopsis.length > 300 && (
                              <button
                                onClick={() => setExpandedEvidence(isExpanded ? null : ev.id)}
                                className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                              >
                                {isExpanded ? 'Show less' : 'Show more'}
                              </button>
                            )}
                          </div>
                        )}

                        {/* LLM Analysis */}
                        {ev.llm_reasoning && isExpanded && (
                          <div className="border-t border-slate-200 pt-3 mt-3">
                            <div className="text-xs font-bold text-slate-500 mb-2">🤖 LLM ANALYSIS</div>
                            <p className="text-sm text-slate-600 italic">{ev.llm_reasoning}</p>
                          </div>
                        )}

                        {/* Key Claims */}
                        {ev.key_claims && ev.key_claims.length > 0 && isExpanded && (
                          <div className="mt-3">
                            <div className="text-xs font-bold text-slate-500 mb-2">Key Claims:</div>
                            <ul className="space-y-1">
                              {ev.key_claims.map((claim, idx) => (
                                <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                                  <span className="text-blue-500 mt-1">•</span>
                                  <span>{claim}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Comments Section */}
                        {isExpanded && (
                          <div className="mt-4 border-t border-slate-200 pt-4">
                            <div className="flex items-center gap-2 mb-3">
                              <MessageCircle className="w-4 h-4 text-slate-500" />
                              <span className="text-sm font-bold text-slate-700">
                                Discussion ({comments.length})
                              </span>
                            </div>

                            {/* Existing Comments - Tree View */}
                            {comments.length > 0 && (
                              <div className="space-y-3 mb-4">
                                {comments.filter(c => !c.parent_comment_id).map(comment => (
                                  <CommentTreeItem
                                    key={comment.id}
                                    comment={comment}
                                    allComments={comments}
                                    depth={0}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Action Bar */}
                            <div className="border-y border-slate-200">
                              <div className="flex items-center gap-2 py-2">
                                <button
                                  onClick={() => handleActionClick(ev.id, 'support')}
                                  className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                                    activeActionBox === `ev-${ev.id}-support`
                                      ? 'text-blue-700 bg-blue-100'
                                      : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                                  }`}
                                >
                                  👍 Support
                                </button>
                                <button
                                  onClick={() => handleActionClick(ev.id, 'refute')}
                                  className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                                    activeActionBox === `ev-${ev.id}-refute`
                                      ? 'text-amber-700 bg-amber-100'
                                      : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50'
                                  }`}
                                >
                                  ⚠️ Refute
                                </button>
                                <button
                                  onClick={() => handleActionClick(ev.id, 'question')}
                                  className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                                    activeActionBox === `ev-${ev.id}-question`
                                      ? 'text-purple-700 bg-purple-100'
                                      : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50'
                                  }`}
                                >
                                  ❓ Question
                                </button>
                              </div>

                              {/* Colored Action Box */}
                              {(activeActionBox === `ev-${ev.id}-support` ||
                                activeActionBox === `ev-${ev.id}-refute` ||
                                activeActionBox === `ev-${ev.id}-question`) && (
                                <div
                                  className={`pb-2 px-2 border-t ${
                                    activeActionBox === `ev-${ev.id}-support`
                                      ? 'bg-blue-50 border-blue-200'
                                      : activeActionBox === `ev-${ev.id}-refute`
                                      ? 'bg-amber-50 border-amber-200'
                                      : 'bg-purple-50 border-purple-200'
                                  }`}
                                >
                                  <textarea
                                    value={newComment[`ev-${ev.id}`] || ''}
                                    onChange={(e) => setNewComment(prev => ({ ...prev, [`ev-${ev.id}`]: e.target.value }))}
                                    placeholder={
                                      activeActionBox === `ev-${ev.id}-support`
                                        ? 'Add supporting evidence or reasoning...'
                                        : activeActionBox === `ev-${ev.id}-refute`
                                        ? 'Explain why this is incorrect...'
                                        : 'Ask a question about this evidence...'
                                    }
                                    className="w-full px-3 py-2 mt-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                    rows={3}
                                  />
                                  <div className="flex items-center justify-end gap-2 mt-2">
                                    <button
                                      onClick={() => setActiveActionBox(null)}
                                      className="text-xs px-3 py-1 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => submitComment(ev.id,
                                        activeActionBox === `ev-${ev.id}-support` ? 'support' :
                                        activeActionBox === `ev-${ev.id}-refute` ? 'refute' : 'question'
                                      )}
                                      disabled={!newComment[`ev-${ev.id}`]?.trim()}
                                      className={`text-xs px-3 py-1 text-white rounded transition-colors ${
                                        activeActionBox === `ev-${ev.id}-support`
                                          ? 'bg-blue-600 hover:bg-blue-700'
                                          : activeActionBox === `ev-${ev.id}-refute`
                                          ? 'bg-amber-600 hover:bg-amber-700'
                                          : 'bg-purple-600 hover:bg-purple-700'
                                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                      Post (2¢)
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              {/* Quest Status */}
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4">Quest Status</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Status</div>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      quest.status === 'converged'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {quest.status === 'converged' ? '✓ Converged' : '⚡ Active'}
                    </div>
                  </div>

                  {quest.converged_at && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Converged At</div>
                      <div className="text-sm text-slate-900">{formatDate(quest.converged_at)}</div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs text-slate-500 mb-1">Created By</div>
                    <div className="text-sm text-slate-900">{quest.created_by}</div>
                  </div>
                </div>
              </div>

              {/* Add Evidence CTA */}
              {quest.status === 'active' && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
                  <h3 className="font-bold text-slate-900 mb-2">🎯 Contribute Evidence</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Help resolve this quest by submitting relevant evidence. Quality contributions are rewarded!
                  </p>
                  <button
                    onClick={() => setShowEvidenceModal(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Submit Evidence
                  </button>
                </div>
              )}

              {/* Bounty Info */}
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4">💰 Bounty Pool</h3>
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Total Pool</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatBounty(quest.total_bounty)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Initial Bounty</div>
                    <div className="text-sm text-slate-900">{formatBounty(quest.initial_bounty)}</div>
                  </div>
                  {quest.total_bounty > quest.initial_bounty && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Community Added</div>
                      <div className="text-sm text-green-600 font-medium">
                        +{formatBounty(quest.total_bounty - quest.initial_bounty)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Add Bounty */}
                {quest.status === 'active' && (
                  <div className="border-t border-slate-200 pt-4">
                    <div className="text-sm font-medium text-slate-700 mb-2">Add to Bounty</div>
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => setBountyAmount('10')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          bountyAmount === '10'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        $10
                      </button>
                      <button
                        onClick={() => setBountyAmount('20')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          bountyAmount === '20'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        $20
                      </button>
                      <button
                        onClick={() => setBountyAmount('50')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          bountyAmount === '50'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        $50
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                        <input
                          type="number"
                          value={bountyAmount}
                          onChange={(e) => setBountyAmount(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Custom"
                        />
                      </div>
                      <button
                        onClick={addBounty}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <DollarSign className="w-4 h-4" />
                        Fund
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Help incentivize quality evidence. Contributors earn based on impact.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Epistemic Analysis - Bottom Section */}
        {sortedEvidence.length > 0 && (
          <div className="space-y-8 mt-8">
            {/* Section Header */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">📊 Epistemic Transparency & Payout Preview</h2>
              <p className="text-slate-600">
                Review the complete epistemic analysis and bounty distribution before payouts are executed
              </p>
            </div>

            {/* Hypothesis Trajectory Chart */}
            <section>
              <HypothesisTrajectory questId={questId || ''} />
            </section>

            {/* Detailed Epistemic Scoreboard */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">💰 Evidence Quality & Payout Breakdown</h2>
              <EpistemicScoreboard questId={questId || ''} />
            </section>
          </div>
        )}
      </div>

      {/* Evidence Submission Modal */}
      {showEvidenceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Submit Evidence</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Source URL *
                </label>
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Source Type
                </label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select type...</option>
                  <option value="video_primary">Video (Primary Source)</option>
                  <option value="transcript_extraction">Transcript</option>
                  <option value="official_statement">Official Statement</option>
                  <option value="news_article">News Article</option>
                  <option value="prediction">Prediction/Analysis</option>
                  <option value="social_media">Social Media</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Synopsis / Summary
                </label>
                <textarea
                  value={evidenceSynopsis}
                  onChange={(e) => setEvidenceSynopsis(e.target.value)}
                  placeholder="Describe the key points of this evidence and how it relates to the quest..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                />
                <p className="text-xs text-slate-500 mt-1">
                  💡 The LLM will analyze your synopsis to determine how this evidence impacts the hypothesis probabilities
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEvidenceModal(false)
                  setEvidenceUrl('')
                  setEvidenceSynopsis('')
                  setEvidenceType('')
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitEvidence}
                disabled={!evidenceUrl.trim() || submittingEvidence}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingEvidence ? 'Submitting...' : 'Submit Evidence'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Recursive Comment Tree Component
interface CommentTreeItemProps {
  comment: Comment
  allComments: Comment[]
  depth: number
}

const CommentTreeItem: React.FC<CommentTreeItemProps> = ({ comment, allComments, depth }) => {
  const replies = allComments.filter(c => c.parent_comment_id === comment.id)
  const avatar = getUserAvatar(comment.user_id)

  const reactionIcon = {
    support: '👍',
    refute: '⚠️',
    question: '❓'
  }[comment.reaction_type || ''] || ''

  return (
    <div className={`${depth > 0 ? 'ml-6 pl-3 border-l-2 border-slate-200' : ''}`}>
      <div className="flex items-start gap-2">
        {/* User Avatar */}
        <div className={`w-8 h-8 rounded-full ${avatar.colorClass} flex items-center justify-center text-lg flex-shrink-0`}>
          {avatar.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-slate-900">
              {comment.user_id.replace('user-', '@')}
            </span>
            {reactionIcon && <span className="text-xs">{reactionIcon}</span>}
            <span className="text-xs text-slate-500">{formatDate(comment.timestamp)}</span>
          </div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap mb-2">{comment.text}</div>

          {/* Recursive replies */}
          {replies.length > 0 && (
            <div className="mt-2 space-y-2">
              {replies.map(reply => (
                <CommentTreeItem
                  key={reply.id}
                  comment={reply}
                  allComments={allComments}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
