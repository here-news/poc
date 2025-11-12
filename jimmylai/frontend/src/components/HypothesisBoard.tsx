/**
 * Hypothesis Board - Probability space of competing explanations
 * LLM-synthesized from evidence, updated as new evidence arrives
 */
import React, { useEffect, useState } from 'react'
import { TrendingUp, MessageSquare, ChevronDown, ChevronUp, ThumbsUp, AlertTriangle, Reply } from 'lucide-react'
import HypothesisTrajectoryChart from './HypothesisTrajectoryChart'
import AllHypothesesChart from './AllHypothesesChart'
import CommentThread from './CommentThread'

interface EvidenceDetail {
  id: string
  number: number  // #1, #2, etc.
  builder: string
  builderId: string
  timestamp: string
  synopsis: string
  sourceUrl: string
  impact: number  // Contribution to this hypothesis probability (%)
  upvotes: number
  downvotes: number
  commentCount: number
  type: 'supporting' | 'against' | 'context'
  comments?: any[]  // Full comment data
  attachments?: any[]  // Attached evidence (screenshots, docs)
  parentAnswerId?: string  // If this is building on another evidence
  payout?: number  // Credits earned/pending for this evidence
  payoutPreview?: number  // Live preview of potential earnings
}

interface Hypothesis {
  id: string
  statement: string
  probability: number  // 0-100
  supporting_evidence: EvidenceDetail[]
  refuting_evidence: EvidenceDetail[]
  context_evidence: EvidenceDetail[]
  comment_count: number
  last_updated?: string
}

interface HypothesisBoardProps {
  storyId: string
  caseId: string
  askId: string
  answers: any[]  // Real answer data from question
  users: any[]
  sources: any[]
}

const HypothesisBoard: React.FC<HypothesisBoardProps> = ({ storyId, caseId, askId, answers, users, sources }) => {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedHypotheses, setExpandedHypotheses] = useState<Set<string>>(new Set())
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set())
  const [activeActionBox, setActiveActionBox] = useState<string | null>(null) // Format: 'evidence-{evidenceId}-{action}'
  const [actionText, setActionText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const toggleHypothesis = (hypothesisId: string) => {
    setExpandedHypotheses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(hypothesisId)) {
        newSet.delete(hypothesisId)
      } else {
        newSet.add(hypothesisId)
      }
      return newSet
    })
  }

  const toggleEvidence = (evidenceId: string) => {
    setExpandedEvidence(prev => {
      const newSet = new Set(prev)
      if (newSet.has(evidenceId)) {
        newSet.delete(evidenceId)
      } else {
        newSet.add(evidenceId)
      }
      return newSet
    })
  }

  useEffect(() => {
    fetchHypotheses()
  }, [storyId, caseId, askId])

  const fetchHypotheses = async () => {
    try {
      const res = await fetch(`/jimmylai/api/stories/${storyId}/cases/${caseId}/asks/${askId}/hypotheses`)
      const data = await res.json()

      // Map real answers to hypothesis evidence
      const hypothesesWithRealData = mapAnswersToHypotheses(data, answers, users, sources)
      setHypotheses(hypothesesWithRealData)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch hypotheses:', err)
      // Fallback to mock data using real answers
      const mockHypotheses = getMockHypotheses()
      const hypothesesWithRealData = mapAnswersToHypotheses(mockHypotheses, answers, users, sources)
      setHypotheses(hypothesesWithRealData)
      setLoading(false)
    }
  }

  // Helper: Convert Answer objects to EvidenceDetail objects
  const mapAnswersToHypotheses = (hypotheses: any[], answers: any[], users: any[], sources: any[]): Hypothesis[] => {
    return hypotheses.map(h => {
      // Map each evidence ID to full answer data
      const mapEvidence = (evidenceList: any[]): EvidenceDetail[] => {
        return evidenceList.map((ev, idx) => {
          // Find matching answer by ID
          const answer = answers.find(a => a.id === ev.id || `ans-${a.id}` === ev.id) || answers[idx % answers.length]
          if (!answer) return null

          const builder = users.find(u => u.id === answer.builder_id) || { username: 'Anonymous' }
          const answerSources = answer.source_ids?.map((sid: string) => sources.find(s => s.id === sid)).filter(Boolean) || []
          const sourceUrl = answerSources[0]?.url || '#'

          return {
            id: answer.id,
            number: ev.number || (idx + 1),
            builder: builder.username,
            builderId: answer.builder_id,
            timestamp: new Date(answer.submitted_at).toLocaleDateString(),
            synopsis: answer.synopsis || 'Evidence submitted',
            sourceUrl,
            impact: ev.impact || 0,
            upvotes: answer.upvotes || 0,
            downvotes: answer.downvotes || 0,
            commentCount: answer.comments?.length || 0,
            type: ev.type || 'supporting',
            comments: answer.comments || [],
            attachments: answer.source_ids?.map((sid: string) => sources.find(s => s.id === sid)).filter(Boolean) || [],
            parentAnswerId: answer.parent_answer_id,
            payout: answer.payout || 0,
            payoutPreview: answer.payout_preview || 0,
          }
        }).filter(Boolean) as EvidenceDetail[]
      }

      return {
        ...h,
        supporting_evidence: mapEvidence(h.supporting_evidence || []),
        refuting_evidence: mapEvidence(h.refuting_evidence || []),
        context_evidence: mapEvidence(h.context_evidence || []),
      }
    })
  }

  // Mock data until backend is ready - using simplified structure that will be mapped to real answers
  const getMockHypotheses = () => [
    {
      id: 'h1',
      statement: 'Trump raised issue privately, no public mention',
      probability: 51,
      supporting_evidence: [
        { id: answers[0]?.id, number: 1, impact: 28, type: 'supporting' },  // Lianhe Zaobao prediction
        { id: answers[1]?.id, number: 2, impact: 23, type: 'supporting' },
      ],
      refuting_evidence: [
        { id: answers[2]?.id, number: 3, impact: -15, type: 'against' },
      ],
      context_evidence: [],
      comment_count: 12,
    },
    {
      id: 'h2',
      statement: "Trump didn't raise it, family/activists misunderstood",
      probability: 22,
      supporting_evidence: [
        { id: answers[0]?.id, number: 1, impact: 12, type: 'supporting' },
        { id: answers[1]?.id, number: 2, impact: 10, type: 'supporting' },
      ],
      refuting_evidence: [],
      context_evidence: [],
      comment_count: 8,
    },
    {
      id: 'h3',
      statement: 'Coordinated information warfare (both sides obscuring truth)',
      probability: 18,
      supporting_evidence: [
        { id: answers[1]?.id, number: 2, impact: 15, type: 'supporting' },
      ],
      refuting_evidence: [],
      context_evidence: [
        { id: answers[2]?.id, number: 3, impact: 3, type: 'context' },
      ],
      comment_count: 15,
    },
    {
      id: 'h4',
      statement: 'Raised but officials bluffing/exaggerating details',
      probability: 9,
      supporting_evidence: [
        { id: answers[0]?.id, number: 1, impact: 6, type: 'supporting' },
      ],
      refuting_evidence: [],
      context_evidence: [],
      comment_count: 5,
    },
  ]

  const getProbabilityColor = (prob: number): string => {
    if (prob >= 40) return 'bg-green-500'
    if (prob >= 25) return 'bg-amber-500'
    if (prob >= 15) return 'bg-blue-500'
    return 'bg-slate-400'
  }

  const getProbabilityBgColor = (prob: number): string => {
    if (prob >= 40) return 'bg-green-50 border-green-200'
    if (prob >= 25) return 'bg-amber-50 border-amber-200'
    if (prob >= 15) return 'bg-blue-50 border-blue-200'
    return 'bg-slate-50 border-slate-200'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border-2 border-slate-200 animate-pulse">
        <div className="h-48 bg-slate-100 rounded"></div>
      </div>
    )
  }

  const getCoordinatesForPercent = (percent: number): [number, number] => {
    const x = 50 + 40 * Math.cos(2 * Math.PI * percent)
    const y = 50 + 40 * Math.sin(2 * Math.PI * percent)
    return [x, y]
  }

  const scrollToHypothesis = (hypothesisId: string) => {
    // Expand the hypothesis
    if (!expandedHypotheses.has(hypothesisId)) {
      toggleHypothesis(hypothesisId)
    }
    // Scroll to it with offset for header
    setTimeout(() => {
      const element = document.getElementById(`hypothesis-${hypothesisId}`)
      if (element) {
        const yOffset = -100 // Offset to account for any fixed headers
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
        window.scrollTo({ top: y, behavior: 'smooth' })
      }
    }, 100)
  }

  return (
    <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📊</span>
        <h3 className="font-bold text-slate-900">Hypothesis Space</h3>
        <span className="text-xs text-slate-500 ml-auto">
          LLM-synthesized from {hypotheses.reduce((acc, h) => acc + h.supporting_evidence.length + h.refuting_evidence.length, 0)} pieces of evidence
        </span>
      </div>

      {/* Winner Announcement (if >= 80%) */}
      {hypotheses.some(h => h.probability >= 80) && (
        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🏆</span>
            <div className="flex-1">
              <div className="text-sm font-bold text-green-700 mb-1">WINNER DECLARED</div>
              <div className="text-lg font-bold text-green-900">
                {hypotheses.find(h => h.probability >= 80)?.statement}
              </div>
              <div className="text-sm text-green-700 mt-1">
                Confidence reached {hypotheses.find(h => h.probability >= 80)?.probability}% threshold (≥80% required)
              </div>
            </div>
            <div className="text-5xl font-bold text-green-600">
              {hypotheses.find(h => h.probability >= 80)?.probability}%
            </div>
          </div>
        </div>
      )}

      {/* Hypothesis Race - Competition Bars */}
      <div className="mb-6">
        <div className="text-xs font-bold text-slate-700 mb-3">THE RACE</div>
        <div className="space-y-3">
          {hypotheses.map((h, idx) => {
            const isLeading = idx === 0
            const isWinner = h.probability >= 80
            const colors = ['bg-green-500', 'bg-amber-500', 'bg-blue-500', 'bg-slate-400']
            const bgColors = ['bg-green-50', 'bg-amber-50', 'bg-blue-50', 'bg-slate-50']
            const barColor = isWinner ? 'bg-green-600' : colors[idx % colors.length]
            const bgColor = isWinner ? 'bg-green-100' : bgColors[idx % bgColors.length]

            return (
              <button
                key={h.id}
                onClick={() => scrollToHypothesis(h.id)}
                className={`w-full text-left rounded-lg hover:shadow-md transition-all group ${bgColor} border-2 border-transparent hover:border-blue-400`}
              >
                {/* Top: Statement and percentage */}
                <div className="p-3 pb-2">
                  <div className="flex items-start gap-3 mb-2">
                    {/* Large hypothesis number with background */}
                    <div className={`flex-shrink-0 ${isLeading ? 'text-4xl' : 'text-3xl'} font-black px-3 py-1 rounded-lg ${
                      isWinner
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      H{idx + 1}
                    </div>
                    <div className="flex-1 flex items-start justify-between">
                      <div className={`flex-1 ${isLeading ? 'text-base font-bold' : 'text-sm font-medium'} text-slate-900 group-hover:text-blue-600`}>
                        {isWinner ? '🏆 WINNER: ' : isLeading ? '🏆 ' : ''}
                        {h.statement}
                      </div>
                      <div className={`${isLeading ? 'text-2xl' : 'text-xl'} font-bold ${isWinner ? 'text-green-600' : 'text-slate-700'} ml-3`}>
                        {h.probability}%
                      </div>
                    </div>
                  </div>

                  {/* Evidence count */}
                  <div className="text-xs text-slate-500 mb-2">
                    {h.supporting_evidence.length + h.refuting_evidence.length} pieces of evidence •
                    {h.comment_count > 0 && ` ${h.comment_count} comments debating`}
                  </div>
                </div>

                {/* Bottom: Competition bar */}
                <div className="px-3 pb-3">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all duration-500 ease-out`}
                      style={{ width: `${h.probability}%` }}
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Hypotheses - Fully Expanded Sections */}
      <div className="space-y-4">
        {hypotheses.map((h, idx) => {
          const isWinner = h.probability >= 80
          return (
            <div
              key={h.id}
              id={`hypothesis-${h.id}`}
              className={`border-2 rounded-lg p-4 ${getProbabilityBgColor(h.probability)} scroll-mt-20`}
            >
              {/* Hypothesis statement with probability */}
              <div className="flex items-start gap-4 mb-3">
                {/* Large hypothesis number with prominent background + tiny sparkline */}
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                  <button
                    onClick={() => {
                      const chartElement = document.getElementById('total-chart')
                      if (chartElement) {
                        chartElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                    }}
                    className={`text-6xl font-black px-4 py-2 rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform ${
                      isWinner
                        ? 'bg-green-600 text-white border-4 border-green-400'
                        : idx === 0
                        ? 'bg-green-500 text-white border-4 border-green-300'
                        : idx === 1
                        ? 'bg-amber-500 text-white border-4 border-amber-300'
                        : idx === 2
                        ? 'bg-blue-500 text-white border-4 border-blue-300'
                        : 'bg-slate-400 text-white border-4 border-slate-300'
                    }`}
                    title="Click to see full timeline"
                  >
                    H{idx + 1}
                  </button>
                  {/* Tiny sparkline */}
                  <div className="w-20">
                    <HypothesisTrajectoryChart
                      storyId={storyId}
                      caseId={caseId}
                      askId={askId}
                      hypothesisId={h.id}
                      currentProbability={h.probability}
                      mini={true}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-base font-bold text-slate-900 mb-2">
                    {isWinner && '🏆 '}
                    {h.statement}
                  </div>

                  {/* Probability bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-6 bg-white rounded-full overflow-hidden border border-slate-300">
                      <div
                        className={`h-full ${getProbabilityColor(h.probability)} transition-all duration-500 flex items-center justify-end pr-2`}
                        style={{ width: `${h.probability}%` }}
                      >
                        <span className="text-xs font-bold text-white">{h.probability}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            {/* Evidence summary */}
            <div className="flex items-center mb-3 text-xs text-slate-600">
              {h.supporting_evidence.length > 0 && (
                <span className="text-green-600 font-medium">
                  ✓ {h.supporting_evidence.length} supporting
                </span>
              )}
              {h.supporting_evidence.length > 0 && h.refuting_evidence.length > 0 && <span className="mx-2">•</span>}
              {h.refuting_evidence.length > 0 && (
                <span className="text-red-600 font-medium">
                  ✗ {h.refuting_evidence.length} against
                </span>
              )}
              {(h.supporting_evidence.length > 0 || h.refuting_evidence.length > 0) && h.context_evidence.length > 0 && <span className="mx-2">•</span>}
              {h.context_evidence.length > 0 && (
                <span className="text-slate-500 font-medium">
                  ℹ️ {h.context_evidence.length} context
                </span>
              )}
            </div>

            {/* Evidence cards - Always visible */}
            {(
              <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                {/* Supporting Evidence */}
                {h.supporting_evidence.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-green-700 mb-2 flex items-center gap-2">
                      <span className={`text-lg font-black px-2 py-1 rounded ${
                        idx === 0 ? 'bg-green-500 text-white' :
                        idx === 1 ? 'bg-amber-500 text-white' :
                        idx === 2 ? 'bg-blue-500 text-white' :
                        'bg-slate-400 text-white'
                      }`}>H{idx + 1}</span>
                      SUPPORTING EVIDENCE
                    </div>
                    {h.supporting_evidence.map((e) => {
                      // Action box state for this evidence
                      const boxId = `evidence-${e.id}`
                      const activeAction = activeActionBox?.startsWith(boxId + '-')
                        ? activeActionBox.substring(boxId.length + 1) as 'support' | 'refute' | 'reply'
                        : null

                      const handleActionClick = (action: 'support' | 'refute' | 'reply') => {
                        const newBoxId = `${boxId}-${action}`
                        setActiveActionBox(activeActionBox === newBoxId ? null : newBoxId)
                        setActionText('')
                      }

                      const submitAction = async () => {
                        if (!actionText.trim() || submitting) return
                        setSubmitting(true)
                        try {
                          // Post action to backend
                          const response = await fetch('/jimmylai/api/actions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              answer_id: e.id,
                              user_id: 'user-current', // TODO: Get from session
                              action_type: activeAction,
                              text: actionText
                            })
                          })

                          if (!response.ok) throw new Error('Failed to post action')

                          const data = await response.json()
                          console.log('Action posted:', data)

                          // Reset form
                          setActionText('')
                          setActiveActionBox(null)

                          // Reload comments to show new action
                          // TODO: Optimistically update UI instead of reload
                          window.location.reload()
                        } catch (err) {
                          console.error('Action failed:', err)
                          alert('Failed to post action. Please try again.')
                        } finally {
                          setSubmitting(false)
                        }
                      }

                      return (
                      <div key={e.id} className="bg-white rounded-lg p-3 border border-green-200 mb-2">
                        {/* Header with Avatar */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-slate-100 rounded-full pr-2">
                              <span className="text-lg">{users.find(u => u.id === e.builderId)?.avatar || '👤'}</span>
                              <span className="text-xs font-medium text-slate-700">@{e.builder}</span>
                            </div>
                            <span className="text-xs text-slate-400">{e.timestamp}</span>
                            <span className="font-bold text-blue-600">#{e.number}</span>
                            {e.parentAnswerId && (
                              <span className="text-xs text-purple-600 font-medium">
                                ↳ builds on #{e.parentAnswerId}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-green-600">+{e.impact}%</div>
                        </div>

                        {/* "First to share" badge */}
                        {e.number === 1 && (
                          <div className="mb-2">
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded">
                              ⭐ First to share this evidence
                            </span>
                          </div>
                        )}

                        {/* Synopsis */}
                        <div className="text-sm text-slate-900 mb-2">{e.synopsis}</div>

                        {/* Attachments/Sources */}
                        {e.attachments && e.attachments.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {e.attachments.map((att: any, idx: number) => (
                              <a
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded flex items-center gap-1"
                              >
                                📎 {att.title || att.type || 'Source'}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Actions Row */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              View source
                            </a>
                            <span className="text-slate-400">•</span>
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" /> {e.upvotes}
                            </span>
                            <button
                              onClick={() => toggleEvidence(e.id)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                            >
                              <MessageSquare className="w-3 h-3" /> {e.commentCount}
                            </button>
                          </div>

                          {/* Bounty/Payout Info */}
                          {((e.payout && e.payout > 0) || (e.payoutPreview && e.payoutPreview > 0)) && (
                            <div className="flex items-center gap-2">
                              {e.payout && e.payout > 0 ? (
                                <span className="bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded">
                                  💰 Earned ${e.payout}
                                </span>
                              ) : (
                                <span className="bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded">
                                  💰 Est. ${e.payoutPreview}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Support/Refute/Reply Buttons */}
                        <div className="border-y border-slate-200 my-2">
                          <div className="flex items-center gap-2 py-2">
                            <button
                              onClick={() => handleActionClick('support')}
                              className={`text-xs px-2 py-1 rounded transition-colors ${
                                activeAction === 'support'
                                  ? 'bg-blue-100 text-blue-700 font-medium'
                                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                              }`}
                            >
                              👍 Support
                            </button>
                            <button
                              onClick={() => handleActionClick('refute')}
                              className={`text-xs px-2 py-1 rounded transition-colors ${
                                activeAction === 'refute'
                                  ? 'bg-amber-100 text-amber-700 font-medium'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                              }`}
                            >
                              ⚠️ Refute
                            </button>
                            <button
                              onClick={() => handleActionClick('reply')}
                              className={`text-xs px-2 py-1 rounded transition-colors ${
                                activeAction === 'reply'
                                  ? 'bg-purple-100 text-purple-700 font-medium'
                                  : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                              }`}
                            >
                              💬 Reply
                            </button>
                          </div>

                          {/* Action input area */}
                          {activeAction && (
                            <div className="pb-2">
                              <textarea
                                value={actionText}
                                onChange={(e) => setActionText(e.target.value)}
                                placeholder={
                                  activeAction === 'support'
                                    ? 'Explain why this evidence is valid...'
                                    : activeAction === 'refute'
                                    ? 'Point out issues with this evidence...'
                                    : 'Your reply to this evidence...'
                                }
                                className="w-full text-sm border border-slate-300 rounded p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={submitAction}
                                  disabled={!actionText.trim() || submitting}
                                  className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                                    activeAction === 'support'
                                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                      : activeAction === 'refute'
                                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  {submitting ? 'Posting...' : 'Post (2¢)'}
                                </button>
                                <button
                                  onClick={() => setActiveActionBox(null)}
                                  className="text-xs px-3 py-1 text-slate-600 hover:text-slate-800"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Expanded Comments - Tree View */}
                        {expandedEvidence.has(e.id) && e.comments && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <CommentThread comments={e.comments} users={users} />
                          </div>
                        )}
                      </div>
                      )
                    })}
                  </div>
                )}

                {/* Refuting Evidence */}
                {h.refuting_evidence.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-red-700 mb-2 flex items-center gap-2">
                      <span className={`text-lg font-black px-2 py-1 rounded ${
                        idx === 0 ? 'bg-green-500 text-white' :
                        idx === 1 ? 'bg-amber-500 text-white' :
                        idx === 2 ? 'bg-blue-500 text-white' :
                        'bg-slate-400 text-white'
                      }`}>H{idx + 1}</span>
                      REFUTING EVIDENCE
                    </div>
                    {h.refuting_evidence.map((e) => (
                      <div key={e.id} className="bg-white rounded-lg p-3 border border-red-200 mb-2">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">#{e.number}</span>
                            <span className="text-xs text-slate-600">@{e.builder}</span>
                            <span className="text-xs text-slate-400">{e.timestamp}</span>
                          </div>
                          <div className="text-xs font-bold text-red-600">{e.impact}%</div>
                        </div>
                        <div className="text-sm text-slate-900 mb-2">{e.synopsis}</div>
                        <div className="flex items-center gap-3 text-xs">
                          <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            View source
                          </a>
                          <span className="text-slate-400">•</span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" /> {e.upvotes}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> {e.commentCount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Context Evidence */}
                {h.context_evidence.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <span className={`text-lg font-black px-2 py-1 rounded ${
                        idx === 0 ? 'bg-green-500 text-white' :
                        idx === 1 ? 'bg-amber-500 text-white' :
                        idx === 2 ? 'bg-blue-500 text-white' :
                        'bg-slate-400 text-white'
                      }`}>H{idx + 1}</span>
                      CONTEXTUAL EVIDENCE
                    </div>
                    {h.context_evidence.map((e) => (
                      <div key={e.id} className="bg-white rounded-lg p-3 border border-slate-200 mb-2">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">#{e.number}</span>
                            <span className="text-xs text-slate-600">@{e.builder}</span>
                            <span className="text-xs text-slate-400">{e.timestamp}</span>
                          </div>
                          <div className="text-xs font-bold text-slate-600">+{e.impact}%</div>
                        </div>
                        <div className="text-sm text-slate-900 mb-2">{e.synopsis}</div>
                        <div className="flex items-center gap-3 text-xs">
                          <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            View source
                          </a>
                          <span className="text-slate-400">•</span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" /> {e.upvotes}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> {e.commentCount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Evidence Button */}
                <button className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                  + Submit Evidence for this Hypothesis
                </button>
              </div>
            )}
          </div>
          )
        })}
      </div>

      {/* Total Competition Chart */}
      <div id="total-chart" className="mt-6 scroll-mt-20">
        <AllHypothesesChart
          storyId={storyId}
          caseId={caseId}
          askId={askId}
          hypotheses={hypotheses.map(h => ({
            id: h.id,
            statement: h.statement,
            probability: h.probability
          }))}
        />
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>High (≥40%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-amber-500 rounded"></div>
          <span>Medium (25-39%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Low (15-24%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-slate-400 rounded"></div>
          <span>Very Low (&lt;15%)</span>
        </div>
        <span className="ml-auto text-slate-500">Click evidence # to jump to timeline</span>
      </div>

      {/* Meta info */}
      <div className="mt-3 text-xs text-slate-500 italic">
        Probabilities are synthesized by LLM based on evidence quality, source reliability, and logical consistency.
        Updates automatically as new evidence arrives.
      </div>
    </div>
  )
}

export default HypothesisBoard
