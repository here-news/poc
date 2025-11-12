// @ts-nocheck
/**
 * Truth Race - Show the unfolding drama of a question
 * Inspired by the Trump-Lai case study timeline
 */
import React, { useState, useEffect } from 'react'
import { Clock, AlertCircle, CheckCircle, TrendingUp, Zap, DollarSign, PlayCircle } from 'lucide-react'
import ReplayMode from './ReplayMode'

const TruthRaceUX2 = () => {
  const [stories, setStories] = useState([])
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStories()
  }, [])

  const fetchStories = async () => {
    try {
      const res = await fetch('/jimmylai/api/stories')
      const data = await res.json()
      setStories(data)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch:', err)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Loading truth races...</p>
        </div>
      </div>
    )
  }

  // Get all active questions
  const allQuestions = stories.flatMap(story =>
    story.cases.flatMap(caseItem =>
      caseItem.asks.map(ask => ({
        ...ask,
        storyTitle: story.title,
        caseTitle: caseItem.title,
        storyId: story.id,
        caseId: caseItem.id,
      }))
    )
  )

  if (selectedQuestion) {
    return (
      <QuestionRace
        question={selectedQuestion}
        onBack={() => setSelectedQuestion(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">Truth Race</h1>
          <p className="text-blue-100">Crowdsourced fact-checking with bounties</p>

          {/* Search + Start Bounty */}
          <div className="mt-6 flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search investigations... (e.g., 'Trump', 'climate', 'election')"
                className="w-full px-4 py-3 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-300 focus:outline-none"
              />
              <span className="absolute right-3 top-3 text-slate-400">🔍</span>
            </div>
            <button
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <span>💡</span>
              <span>Start New Bounty</span>
              <span className="text-xs opacity-75">(2¢ min)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">🔥 High Tension Investigations</h2>
        <div className="space-y-4">
          {allQuestions.map((q) => (
            <button
              key={q.id}
              onClick={() => setSelectedQuestion(q)}
              className="w-full bg-white rounded-xl p-5 border-2 border-slate-200 hover:border-blue-400 transition-all text-left shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-xs text-slate-500 mb-1">{q.storyTitle}</div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{q.question}</h3>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={`px-2 py-1 rounded-full ${getClarityStyle(q.clarity)}`}>
                      {q.clarity}% confident
                    </span>
                    <span className="text-slate-600">{q.answers?.length || 0} updates</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-bold text-blue-600">${q.bounty}</div>
                  <div className="text-xs text-slate-500">bounty</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// The main "race" view showing the timeline
const QuestionRace = ({ question, onBack }) => {
  const [sources, setSources] = useState([])
  const [users, setUsers] = useState([])
  const [showAddEvidence, setShowAddEvidence] = useState(false)
  const [showReplay, setShowReplay] = useState(false)
  // Global state to track which action box is currently open (only one at a time)
  const [activeActionBox, setActiveActionBox] = useState(null) // Format: 'evidence-{answerId}-{action}' or 'comment-{commentId}-{action}'

  useEffect(() => {
    fetchSources()
    fetchUsers()
  }, [])

  const fetchSources = async () => {
    try {
      const res = await fetch('/jimmylai/api/sources')
      const data = await res.json()
      setSources(data)
    } catch (err) {
      console.error('Failed to fetch sources:', err)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/jimmylai/api/users')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  // Build timeline from PRIMARY answers only (filter out attachments)
  // Attachments will be nested under their parents
  const allAnswers = question.answers || []
  const primaryAnswers = allAnswers.filter(a => !a.parent_answer_id)
  const attachments = allAnswers.filter(a => a.parent_answer_id)

  // Build evidence events
  const evidenceEvents = primaryAnswers.map(answer => {
    const answerSources = (answer.source_ids || [])
      .map(sid => sources.find(s => s.id === sid))
      .filter(Boolean)

    // Find attachments for this answer
    const relatedAttachments = attachments.filter(att => att.parent_answer_id === answer.id)

    // Use source timestamp if available (more accurate for when evidence appeared)
    const eventTime = answerSources[0]?.timestamp || answer.submitted_at

    return {
      type: 'evidence',
      timestamp: eventTime,
      answer,
      sources: answerSources,
      clarityImpact: answer.clarity_gain,
      attachments: relatedAttachments,
    }
  })

  // Build funding events (standalone contributions not linked to specific evidence comments)
  const fundingEvents = (question.bounty_contributions || [])
    .filter(contrib => {
      // Only show as standalone if not already shown inline with evidence comments
      // We'll include all for now - inline comments will show the funding reaction
      return true
    })
    .map(contrib => ({
      type: 'funding',
      timestamp: contrib.timestamp,
      contribution: contrib,
    }))

  // Merge and sort all events (REVERSE chronological - newest first)
  const timeline = [...evidenceEvents, ...fundingEvents]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white sticky top-0 z-10 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button onClick={onBack} className="text-sm text-blue-100 hover:text-white mb-2 flex items-center gap-1">
            ← Back to questions
          </button>
          <h1 className="text-xl font-bold mb-1">{question.question}</h1>
          <p className="text-sm text-blue-100">{question.storyTitle}</p>
        </div>
      </div>

      {/* Current Status */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Compact Status Dashboard */}
        <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm mb-6">
          {/* Current Resolution Summary */}
          <div className="mb-5 pb-5 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📋</span>
              <h3 className="font-bold text-slate-900">Current Status</h3>
            </div>
            <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg">
              {question.resolutions && question.resolutions.length > 0 ? (
                <>
                  {question.resolutions.map((res, idx) => (
                    <span key={idx}>
                      {res.statement}
                      {idx < question.resolutions.length - 1 ? ' ' : ''}
                    </span>
                  ))}
                  <div className="mt-3 text-xs text-slate-500 italic">
                    While multiple independent media sources state the topic was discussed, there is no official confirmation through diplomatic channels or readouts from either government.
                  </div>
                </>
              ) : (
                "Family statements and advocacy groups have acknowledged that Trump raised the issue, but the details are not present in official summaries from either side, and both governments have avoided direct confirmation in their public communications. Therefore, while multiple independent media sources state the topic was discussed, there is no official confirmation through diplomatic channels or readouts."
              )}
            </div>
          </div>

          {/* Claims Arena - Logical structure of key claims */}
          <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">⚖️</span>
              <h3 className="font-bold text-slate-900">Claims Arena</h3>
              <span className="text-xs text-slate-500 ml-auto">Key statements and their evidence</span>
            </div>

            <div className="space-y-3">
              {/* Confirmed claim */}
              <div className="border-l-4 border-green-500 bg-green-50 p-3 rounded-r-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-xs font-bold text-green-700 bg-green-200 px-2 py-0.5 rounded">CONFIRMED</div>
                  <div className="text-xs text-green-600">3 sources agree</div>
                </div>
                <div className="text-sm font-medium text-slate-900 mb-1">
                  No mention of "Jimmy Lai" in official transcript or readout
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span>Evidence: <a href="#evidence-1" className="text-blue-600 hover:underline">#1 Official Video</a></span>
                  <span>• <a href="#evidence-2" className="text-blue-600 hover:underline">#2 Transcript</a></span>
                  <span>• <a href="#evidence-3" className="text-blue-600 hover:underline">#3 US Readout</a></span>
                </div>
              </div>

              {/* Disputed claim with contradiction arrows */}
              <div className="border-l-4 border-amber-500 bg-amber-50 p-3 rounded-r-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-xs font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded">DISPUTED</div>
                  <div className="text-xs text-amber-600">Conflicting claims</div>
                </div>
                <div className="text-sm font-medium text-slate-900 mb-2">
                  Private portion: Did Trump raise Jimmy Lai's case with Xi?
                </div>
                <div className="pl-3 space-y-1.5 border-l-2 border-amber-300 mb-2">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-slate-700">Family sources claim Trump mentioned it
                      <a href="#evidence-4" className="text-blue-600 hover:underline ml-1">#4</a>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-amber-600 pl-4">
                    <span>⟷</span>
                    <span className="italic">contradicts</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-red-600 font-bold">✗</span>
                    <span className="text-slate-700">No official diplomatic confirmation
                      <a href="#evidence-5" className="text-blue-600 hover:underline ml-1">#5</a>
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-600">
                  💬 <a href="#discussion" className="text-blue-600 hover:underline">12 comments</a> discussing this claim
                </div>
              </div>

              {/* Unclear claim */}
              <div className="border-l-4 border-slate-400 bg-slate-50 p-3 rounded-r-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">UNCLEAR</div>
                  <div className="text-xs text-slate-500">No evidence available</div>
                </div>
                <div className="text-sm font-medium text-slate-900 mb-1">
                  Full private meeting minutes content
                </div>
                <div className="text-xs text-slate-500">
                  No sources available • Likely classified or unreleased
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Confirmed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-amber-500 rounded"></div>
                <span>Disputed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-slate-400 rounded"></div>
                <span>Unclear</span>
              </div>
              <span className="ml-auto text-slate-500">Click evidence # to jump to timeline</span>
            </div>
          </div>

          {/* Metrics Grid with Integrated Chart */}
          <div className="grid grid-cols-6 gap-4">
            {/* Clarity Chart */}
            <div className="text-center">
              <div className="text-xs font-medium text-slate-600 mb-2">CLARITY</div>
              <div className="relative w-16 h-16 mx-auto">
                <svg className="transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeDasharray={`${Math.min(question.clarity, 100)}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-600">{Math.min(question.clarity, 100)}%</span>
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-1">{getClarityLabel(question.clarity)}</div>
            </div>

            {/* Bounty Pool */}
            <div className="text-center">
              <div className="text-xs font-medium text-slate-600 mb-2">BOUNTY</div>
              <div className="text-2xl font-bold text-green-600 mb-1">${question.bounty.toFixed(0)}</div>
              <div className="text-xs text-slate-500">
                ${(question.answers || []).reduce((sum, a) => sum + a.payout, 0).toFixed(0)} paid
              </div>
              <button className="mt-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded-full transition-colors">
                + Funds
              </button>
            </div>

            {/* Contributors */}
            <div className="text-center">
              <div className="text-xs font-medium text-slate-600 mb-2">EVIDENCE</div>
              <div className="text-2xl font-bold text-purple-600 mb-1">{(question.answers || []).length}</div>
              <div className="text-xs text-slate-500">
                {new Set((question.answers || []).map(a => a.builder_id)).size} people
              </div>
              <div className="mt-1 text-xs text-slate-400">
                →
              </div>
            </div>

            {/* Integrated Timeline Chart - Takes 3 columns (half the row) */}
            <div className="col-span-3">
              <div className="text-xs font-medium text-slate-600 mb-2 flex items-center justify-between">
                <span>TIMELINE</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-slate-500 text-xs">Clarity</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-slate-500 text-xs">$</span>
                  </div>
                </div>
              </div>

              {/* Chart Canvas with Dual Y-Axes */}
              <div className="relative h-28 bg-slate-50 rounded-lg">
              {(() => {
                // Build timeline data points
                const answers = question.answers || []
                const contributions = question.bounty_contributions || []

                if (answers.length === 0) {
                  return (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                      No data yet - submit evidence to see the timeline
                    </div>
                  )
                }

                // Sort all events by timestamp
                const allEvents = [
                  ...answers.map(a => ({ type: 'answer', time: new Date(a.submitted_at).getTime(), data: a })),
                  ...contributions.map(c => ({ type: 'funding', time: new Date(c.timestamp).getTime(), data: c }))
                ].sort((a, b) => a.time - b.time)

                const startTime = allEvents[0]?.time || Date.now()
                const endTime = allEvents[allEvents.length - 1]?.time || Date.now()
                const timeRange = Math.max(endTime - startTime, 1)

                // Calculate cumulative values at each point
                let cumulativeClarity = 0
                let cumulativeFunding = 0
                let cumulativePayout = 0

                const dataPoints = allEvents.map(event => {
                  const x = ((event.time - startTime) / timeRange) * 200  // Changed from 100 to 200 for wider chart

                  if (event.type === 'answer') {
                    cumulativeClarity += event.data.clarity_gain || 0
                    cumulativePayout += event.data.payout || 0
                  } else if (event.type === 'funding') {
                    cumulativeFunding += event.data.amount || 0
                  }

                  return {
                    x,
                    clarity: cumulativeClarity,
                    funding: cumulativeFunding,
                    payout: cumulativePayout,
                    event
                  }
                })

                // Max values for dual Y-axes
                const maxClarity = Math.max(...dataPoints.map(d => d.clarity), 100)
                const maxMoney = Math.max(
                  ...dataPoints.map(d => Math.max(d.funding, d.payout)),
                  10
                )

                // Create smooth curve paths
                const createSmoothPath = (points) => {
                  if (points.length === 0) return ''
                  if (points.length === 1) return `M ${points[0].x},${points[0].y}`

                  let path = `M ${points[0].x},${points[0].y}`
                  for (let i = 1; i < points.length; i++) {
                    path += ` L ${points[i].x},${points[i].y}`
                  }
                  return path
                }

                // Generate points for each curve
                const clarityPoints = dataPoints
                  .filter(d => d.event.type === 'answer')
                  .map(d => ({
                    x: d.x,
                    y: 90 - ((d.clarity / maxClarity) * 80) // 10% margin top, 10% bottom
                  }))

                const fundingPoints = dataPoints.map(d => ({
                  x: d.x,
                  y: 90 - ((d.funding / maxMoney) * 80)
                }))

                const payoutPoints = dataPoints
                  .filter(d => d.event.type === 'answer')
                  .map(d => ({
                    x: d.x,
                    y: 90 - ((d.payout / maxMoney) * 80)
                  }))

                return (
                  <>
                    {/* Left Y-axis (Clarity %) */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-blue-600 py-1">
                      <div>{Math.round(maxClarity)}</div>
                      <div>{Math.round(maxClarity * 0.5)}</div>
                      <div>0</div>
                    </div>

                    {/* Right Y-axis ($ Amount) */}
                    <div className="absolute right-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-green-600 py-1 text-right">
                      <div>${Math.round(maxMoney)}</div>
                      <div>${Math.round(maxMoney * 0.5)}</div>
                      <div>$0</div>
                    </div>

                    {/* Chart area */}
                    <div className="absolute left-8 right-8 top-1 bottom-1">
                      <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                        {/* Background */}
                        <rect x="0" y="0" width="200" height="100" fill="transparent" />

                        {/* Grid lines */}
                        <line x1="0" y1="10" x2="200" y2="10" stroke="#e2e8f0" strokeWidth="0.3" strokeDasharray="1,1" />
                        <line x1="0" y1="30" x2="200" y2="30" stroke="#e2e8f0" strokeWidth="0.3" strokeDasharray="1,1" />
                        <line x1="0" y1="50" x2="200" y2="50" stroke="#e2e8f0" strokeWidth="0.5" />
                        <line x1="0" y1="70" x2="200" y2="70" stroke="#e2e8f0" strokeWidth="0.3" strokeDasharray="1,1" />
                        <line x1="0" y1="90" x2="200" y2="90" stroke="#e2e8f0" strokeWidth="0.3" strokeDasharray="1,1" />

                        {/* Funding curve (green) - uses right axis */}
                        {fundingPoints.length > 1 && (
                          <>
                            <path
                              d={`${createSmoothPath(fundingPoints)} L 200,90 L 0,90 Z`}
                              fill="rgba(34, 197, 94, 0.15)"
                              stroke="none"
                            />
                            <path
                              d={createSmoothPath(fundingPoints)}
                              fill="none"
                              stroke="#22c55e"
                              strokeWidth="2"
                              vectorEffect="non-scaling-stroke"
                            />
                          </>
                        )}

                        {/* Payout curve (amber) - uses right axis */}
                        {payoutPoints.length > 1 && (
                          <>
                            <path
                              d={`${createSmoothPath(payoutPoints)} L ${payoutPoints[payoutPoints.length - 1].x},90 L ${payoutPoints[0].x},90 Z`}
                              fill="rgba(251, 191, 36, 0.15)"
                              stroke="none"
                            />
                            <path
                              d={createSmoothPath(payoutPoints)}
                              fill="none"
                              stroke="#fbbf24"
                              strokeWidth="2"
                              vectorEffect="non-scaling-stroke"
                            />
                          </>
                        )}

                        {/* Clarity curve (blue) - uses left axis */}
                        {clarityPoints.length > 1 && (
                          <path
                            d={createSmoothPath(clarityPoints)}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2.5"
                            vectorEffect="non-scaling-stroke"
                          />
                        )}

                        {/* Event markers on clarity curve */}
                        {clarityPoints.map((point, idx) => (
                          <g key={idx}>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="1.5"
                              fill="#3b82f6"
                              stroke="white"
                              strokeWidth="0.8"
                              vectorEffect="non-scaling-stroke"
                            />
                          </g>
                        ))}
                      </svg>
                    </div>
                  </>
                )
              })()}
              </div>
            </div>
          </div>
        </div>

        {/* THE STORY UNFOLDS - Timeline */}
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              The Story Unfolds
            </h2>
            <button
              onClick={() => setShowAddEvidence(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              + Add Evidence
            </button>
          </div>

          <div className="space-y-6">
            {timeline.map((event, idx) => {
              // Calculate evidence number (only count evidence events for numbering)
              const evidenceNumber = timeline
                .slice(0, idx + 1)
                .filter(e => e.type === 'evidence').length

              if (event.type === 'funding') {
                return (
                  <FundingEvent
                    key={`funding-${idx}`}
                    contribution={event.contribution}
                    users={users}
                  />
                )
              }

              return (
                <TimelineEvent
                  key={`evidence-${idx}`}
                  event={event}
                  isLatest={idx === timeline.length - 1 && event.type === 'evidence'}
                  eventNumber={evidenceNumber}
                  users={users}
                  question={question}
                  activeActionBox={activeActionBox}
                  setActiveActionBox={setActiveActionBox}
                />
              )
            })}

            {timeline.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No evidence yet. Be the first to submit!</p>
              </div>
            )}
          </div>
        </div>

        {/* What We Know vs Don't Know */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 rounded-xl p-5 border-2 border-green-200">
            <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              What We Know
            </h3>
            <div className="space-y-2 text-sm">
              {question.resolutions?.filter(r => r.status === 'resolved').map((res, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <div>
                    <div className="font-medium text-slate-900">{res.scope}</div>
                    <div className="text-slate-600 text-xs">{res.statement}</div>
                  </div>
                </div>
              ))}
              {question.resolutions?.filter(r => r.status === 'resolved').length === 0 && (
                <div className="text-slate-500 italic">Investigation ongoing...</div>
              )}
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-5 border-2 border-amber-200">
            <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Still Unclear
            </h3>
            <div className="space-y-2 text-sm">
              {question.resolutions?.filter(r => r.status === 'pending').map((res, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">?</span>
                  <div>
                    <div className="font-medium text-slate-900">{res.scope}</div>
                    <div className="text-slate-600 text-xs">{res.statement}</div>
                  </div>
                </div>
              ))}
              {question.resolutions?.filter(r => r.status === 'pending').length === 0 && (
                <div className="text-slate-500 italic">All questions resolved</div>
              )}
            </div>
          </div>
        </div>

        {/* Related Stories */}
        <div className="bg-white rounded-xl p-5 border-2 border-slate-200 mb-6">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-600" />
            Related Stories
          </h3>
          <div className="space-y-2">
            <div className="text-sm text-slate-500 italic">
              Other investigations in {question.storyTitle}
            </div>
            {/* Placeholder - can be populated with actual related cases */}
            <div className="text-xs text-slate-400">
              More cases will appear here as the story develops
            </div>
          </div>
        </div>
      </div>

      {/* Add Evidence Modal */}
      {showAddEvidence && (
        <AddEvidenceModal
          question={question}
          onClose={() => setShowAddEvidence(false)}
        />
      )}

      {/* Replay Mode */}
      {showReplay && (
        <ReplayMode
          question={question}
          sources={sources}
          onClose={() => setShowReplay(false)}
        />
      )}
    </div>
  )
}

// Individual timeline event
const TimelineEvent = ({ event, isLatest, eventNumber, users = [], question = null, activeActionBox, setActiveActionBox }) => {
  const source = event.sources[0] // Primary source for this event
  const isPositive = event.clarityImpact > 0
  const isNegative = event.clarityImpact < 0
  const author = users.find(u => u.id === event.answer.builder_id)
  const comments = event.answer.comments || []
  const attachments = event.attachments || []

  // Calculate combined stats if there are attachments
  const totalClarity = event.clarityImpact + attachments.reduce((sum, att) => sum + (att.clarity_gain || 0), 0)
  const totalPayout = event.answer.payout + attachments.reduce((sum, att) => sum + (att.payout || 0), 0)

  // Voting state
  const [voteScore, setVoteScore] = useState(event.answer.vote_score || 0)
  const [voting, setVoting] = useState(false)

  // Interaction states - using global state
  const boxId = `evidence-${event.answer.id}`
  const [actionText, setActionText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Check if this box's action is active
  // Format: 'evidence-{answerId}-{action}' e.g., 'evidence-ans-123-support'
  const activeAction = activeActionBox?.startsWith(boxId + '-')
    ? activeActionBox.substring(boxId.length + 1) as 'support' | 'refute' | 'reply'
    : null

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!question || voting) return

    setVoting(true)
    try {
      const res = await fetch(
        `/jimmylai/api/stories/${question.storyId}/cases/${question.caseId}/asks/${question.id}/answers/${event.answer.id}/vote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 'user-demo',
            vote_type: voteType
          })
        }
      )

      if (res.ok) {
        const data = await res.json()
        setVoteScore(data.vote_score)
      } else {
        const error = await res.json()
        alert(error.detail || 'Failed to vote')
      }
    } catch (err) {
      console.error('Vote failed:', err)
      alert('Failed to vote. Please try again.')
    } finally {
      setVoting(false)
    }
  }

  const handleActionClick = (action: 'support' | 'refute' | 'reply') => {
    const newBoxId = `${boxId}-${action}`
    // If clicking the same action, close it. Otherwise, open this one (closes others automatically)
    setActiveActionBox(activeActionBox === newBoxId ? null : newBoxId)
    setActionText('')
  }

  const submitAction = async () => {
    if (!actionText.trim() || submitting) return

    setSubmitting(true)
    try {
      const actionLabels = {
        support: '👍 Support',
        refute: '⚠️ Refutation',
        reply: '💬 Reply'
      }
      alert(`${actionLabels[activeAction!]} posted: "${actionText}"\n\n(Backend API not yet implemented)`)
      setActionText('')
      setActiveActionBox(null)
    } catch (err) {
      console.error('Action failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBoost = () => {
    alert('💰 Boost clicked!\n\nThis would add $5 directly to this specific evidence, increasing its payout.')
  }

  return (
    <div className={`relative pl-8 pb-6 border-l-2 ${isLatest ? 'border-blue-500' : 'border-slate-300'}`}>
      {/* Timeline dot */}
      <div className={`absolute -left-2 top-0 w-4 h-4 rounded-full border-2 ${
        isLatest ? 'bg-blue-500 border-blue-500 animate-pulse' :
        isPositive ? 'bg-green-500 border-green-500' :
        isNegative ? 'bg-red-500 border-red-500' :
        'bg-slate-400 border-slate-400'
      }`} />

      {/* Event number badge */}
      <div className="absolute -left-8 top-0 text-xs font-bold text-slate-400">
        #{eventNumber}
      </div>

      {/* Content */}
      <div className={`rounded-lg p-4 ${
        isPositive ? 'bg-green-50 border border-green-200' :
        isNegative ? 'bg-red-50 border border-red-200' :
        'bg-slate-50 border border-slate-200'
      }`}>
        {/* Author + Timestamp */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {author && (
              <>
                <span className="text-2xl">{author.avatar}</span>
                <div>
                  <div className="font-bold text-sm text-slate-900">{author.username}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(event.timestamp)}
                  </div>
                </div>
              </>
            )}
          </div>
          {isLatest && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold text-xs">LATEST</span>}
        </div>

        {/* Synopsis - rewrite technical descriptions into story */}
        <p className="text-sm font-medium text-slate-900 mb-3">
          {getStoryDescription(event.answer, event.sources[0])}
        </p>

        {/* Source */}
        {source && (
          <div className="flex items-center gap-2 text-xs mb-3">
            <span>{getModalityEmoji(source.modality)}</span>
            <span className="font-medium">{source.type === 'primary' ? '⭐ PRIMARY SOURCE' : 'Secondary source'}</span>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate max-w-[200px]"
            >
              {source.title}
            </a>
          </div>
        )}

        {/* Impact + Inline Payout */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {isPositive && (
            <div className="flex items-center gap-1 text-green-700 font-bold text-sm">
              <TrendingUp className="w-4 h-4" />
              +{event.clarityImpact} clarity
            </div>
          )}
          {isNegative && (
            <div className="flex items-center gap-1 text-red-700 font-bold text-sm">
              <AlertCircle className="w-4 h-4" />
              {event.clarityImpact} clarity (contradicts)
            </div>
          )}
          {event.answer.validated && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              ✓ Verified
            </span>
          )}
          {event.answer.payout > 0 && (
            <div className="ml-auto bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
              <div className="text-xs text-amber-700">💰 Earned</div>
              <div className="text-lg font-bold text-amber-600">${event.answer.payout.toFixed(0)}</div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="border-y border-slate-200 my-3">
          <div className="flex items-center gap-2 py-3">
            {/* Actions without individual cost indicators */}
            <button
              onClick={() => handleActionClick('support')}
              className={`text-sm px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                activeAction === 'support'
                  ? 'text-blue-700 bg-blue-100'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              👍 Support
            </button>
            <button
              onClick={() => handleActionClick('refute')}
              className={`text-sm px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                activeAction === 'refute'
                  ? 'text-amber-700 bg-amber-100'
                  : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50'
              }`}
            >
              ⚠️ Refute
            </button>
            <button
              onClick={() => handleActionClick('reply')}
              className={`text-sm px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                activeAction === 'reply'
                  ? 'text-purple-700 bg-purple-100'
                  : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50'
              }`}
            >
              💬 Reply
            </button>
          </div>

          {/* Inline Action Box */}
          {activeAction && (
            <div className={`pb-3 px-3 border-t ${
              activeAction === 'support' ? 'bg-blue-50 border-blue-200' :
              activeAction === 'refute' ? 'bg-amber-50 border-amber-200' :
              'bg-purple-50 border-purple-200'
            }`}>
              <div className={`text-xs font-medium mb-2 ${
                activeAction === 'support' ? 'text-blue-800' :
                activeAction === 'refute' ? 'text-amber-800' :
                'text-purple-800'
              }`}>
                {activeAction === 'support' && '👍 Why do you support this evidence?'}
                {activeAction === 'refute' && '⚠️ What\'s wrong with this evidence?'}
                {activeAction === 'reply' && '💬 Reply to this evidence'}
              </div>
              <textarea
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                placeholder={
                  activeAction === 'support' ? 'Explain what makes this valuable...' :
                  activeAction === 'refute' ? 'Explain the issues or concerns...' :
                  'Share your thoughts, ask questions...'
                }
                rows={2}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 mb-2 ${
                  activeAction === 'support' ? 'border-blue-300 focus:ring-blue-500 focus:border-blue-500' :
                  activeAction === 'refute' ? 'border-amber-300 focus:ring-amber-500 focus:border-amber-500' :
                  'border-purple-300 focus:ring-purple-500 focus:border-purple-500'
                }`}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveActionBox(null)}
                  className={`text-xs px-3 py-1 border rounded hover:bg-white ${
                    activeAction === 'support' ? 'border-blue-300' :
                    activeAction === 'refute' ? 'border-amber-300' :
                    'border-purple-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={submitAction}
                  disabled={submitting || !actionText.trim()}
                  className={`text-xs px-3 py-1 text-white rounded disabled:opacity-50 flex items-center gap-1 ${
                    activeAction === 'support' ? 'bg-blue-600 hover:bg-blue-700' :
                    activeAction === 'refute' ? 'bg-amber-600 hover:bg-amber-700' :
                    'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {submitting ? 'Posting...' : 'Post (2¢)'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Attachments (e.g., transcript attached to video) */}
        {attachments.length > 0 && (
          <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-300">
            <div className="text-xs font-bold text-slate-600 mb-3">📎 ATTACHMENTS ({attachments.length})</div>
            {attachments.map((attachment, idx) => {
              const attachmentAuthor = users.find(u => u.id === attachment.builder_id)
              return (
                <div key={attachment.id} className="bg-white/50 rounded-lg p-3 mb-3 border border-slate-200">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-xl">{attachmentAuthor?.avatar}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">{attachmentAuthor?.username}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {attachment.attachment_type || 'attachment'}
                        </span>
                        <span className="text-xs text-slate-500">{formatTimestamp(attachment.submitted_at)}</span>
                      </div>
                      <div className="text-sm text-slate-700">{attachment.synopsis}</div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="text-xs text-green-600 font-bold">+{attachment.clarity_gain} clarity</div>
                        {attachment.payout > 0 && (
                          <div className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                            💰 Earned ${attachment.payout.toFixed(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Combined Stats */}
            {attachments.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="text-xs font-bold text-blue-900 mb-2">🤝 COMBINED CONTRIBUTION</div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-blue-700">
                    Total clarity: <span className="font-bold">+{totalClarity} points</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    Total earnings: <span className="font-bold">${totalPayout.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comments Thread */}
        {comments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="text-sm font-bold text-slate-700 mb-3">
              💬 {comments.length} comment{comments.length > 1 ? 's' : ''}
            </div>
            <div className="space-y-2">
              {comments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  users={users}
                  allComments={comments}
                  activeActionBox={activeActionBox}
                  setActiveActionBox={setActiveActionBox}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Funding event marker in timeline (compact single-line)
const FundingEvent = ({ contribution, users }) => {
  const contributor = users.find(u => u.id === contribution.contributor_id)

  return (
    <div className="relative pl-8 pb-3 border-l-2 border-amber-400">
      {/* Timeline dot */}
      <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-amber-400 border-2 border-amber-400" />

      {/* Content - single compact line */}
      <div className="flex items-center gap-2 text-sm py-1">
        <span className="text-lg">💰</span>
        <span className="font-semibold text-amber-900">
          {contributor ? `${contributor.username}` : 'Anonymous'}
        </span>
        <span className="text-slate-600">added</span>
        <span className="font-bold text-amber-600">+${contribution.amount}</span>
        <span className="text-slate-400 text-xs ml-auto">{formatTimestamp(contribution.timestamp)}</span>
      </div>
    </div>
  )
}

// Recursive comment thread
const CommentItem = ({ comment, users, allComments, depth = 0, activeActionBox, setActiveActionBox }) => {
  // Only render if this is a top-level comment (no parent)
  if (depth === 0 && comment.parent_comment_id) return null

  const user = users.find(u => u.id === comment.user_id)
  const replies = allComments.filter(c => c.parent_comment_id === comment.id)

  // Action state management - using global state
  const boxId = `comment-${comment.id}`
  const [actionText, setActionText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Check if this box's action is active
  // Format: 'comment-{commentId}-{action}' e.g., 'comment-c1-support'
  const activeAction = activeActionBox?.startsWith(boxId + '-')
    ? activeActionBox.substring(boxId.length + 1) as 'support' | 'refute' | 'reply'
    : null

  const reactionIcon = {
    fund: '💰',
    refute: '⚠️',
    support: '👍',
    question: '❓',
    comment: ''
  }[comment.reaction_type || 'comment']

  const handleActionClick = (action: 'support' | 'refute' | 'reply') => {
    const newBoxId = `${boxId}-${action}`
    // If clicking the same action, close it. Otherwise, open this one (closes others automatically)
    setActiveActionBox(activeActionBox === newBoxId ? null : newBoxId)
    setActionText('')
  }

  const submitAction = async () => {
    if (!actionText.trim() || submitting) return

    setSubmitting(true)
    try {
      const actionLabels = {
        support: '👍 Support',
        refute: '⚠️ Refutation',
        reply: '💬 Reply'
      }
      alert(`${actionLabels[activeAction!]} posted: "${actionText}"\n\n(Backend API not yet implemented)`)
      setActionText('')
      setActiveActionBox(null)
    } catch (err) {
      console.error('Action failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`${depth > 0 ? 'ml-6 pl-3 border-l-2 border-slate-200' : ''}`}>
      <div className="flex items-start gap-2">
        {user && <span className="text-lg flex-shrink-0">{user.avatar}</span>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-slate-900">{user?.username || 'Unknown'}</span>
            {reactionIcon && <span className="text-xs">{reactionIcon}</span>}
            <span className="text-xs text-slate-500">{formatTimestamp(comment.timestamp)}</span>
          </div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap mb-2">{comment.text}</div>

          {/* Action Bar - same pattern as evidence */}
          <div className="border-y border-slate-200 my-2">
            <div className="flex items-center gap-2 py-2">
              <button
                onClick={() => handleActionClick('support')}
                className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  activeAction === 'support'
                    ? 'text-blue-700 bg-blue-100'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                👍 Support
              </button>
              <button
                onClick={() => handleActionClick('refute')}
                className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  activeAction === 'refute'
                    ? 'text-amber-700 bg-amber-100'
                    : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50'
                }`}
              >
                ⚠️ Refute
              </button>
              <button
                onClick={() => handleActionClick('reply')}
                className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  activeAction === 'reply'
                    ? 'text-purple-700 bg-purple-100'
                    : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50'
                }`}
              >
                💬 Reply
              </button>
            </div>

            {/* Inline Action Box - colored by action type */}
            {activeAction && (
              <div
                className={`pb-2 px-2 border-t ${
                  activeAction === 'support'
                    ? 'bg-blue-50 border-blue-200'
                    : activeAction === 'refute'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-purple-50 border-purple-200'
                }`}
              >
                <textarea
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  placeholder={
                    activeAction === 'support'
                      ? 'Add supporting evidence or reasoning...'
                      : activeAction === 'refute'
                      ? 'Explain why this is incorrect...'
                      : 'Your reply...'
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
                    onClick={submitAction}
                    disabled={!actionText.trim() || submitting}
                    className={`text-xs px-3 py-1 text-white rounded transition-colors ${
                      activeAction === 'support'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : activeAction === 'refute'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-purple-600 hover:bg-purple-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {submitting ? 'Posting...' : 'Post (2¢)'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recursive replies */}
          {replies.length > 0 && (
            <div className="mt-2 space-y-2">
              {replies.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  users={users}
                  allComments={allComments}
                  depth={depth + 1}
                  activeActionBox={activeActionBox}
                  setActiveActionBox={setActiveActionBox}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Simple add evidence modal
const AddEvidenceModal = ({ question, onClose }) => {
  const [url, setUrl] = useState('')
  const [synopsis, setSynopsis] = useState('')

  const handleSubmit = async () => {
    if (!url) return

    try {
      const res = await fetch(
        `/jimmylai/api/stories/${question.storyId}/cases/${question.caseId}/asks/${question.id}/answers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            builder_id: 'builder-anon',
            source_url: url,
            synopsis: synopsis
          })
        }
      )

      if (res.ok) {
        onClose()
        window.location.reload() // Refresh to show new evidence
      }
    } catch (err) {
      console.error('Failed to submit:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full">
        <h3 className="text-xl font-bold text-slate-900 mb-4">Submit Evidence</h3>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Source URL *
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              What does this show? (optional)
            </label>
            <textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              rows={3}
              placeholder="Brief explanation..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!url}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function getClarityStyle(clarity: number): string {
  if (clarity >= 70) return 'bg-green-100 text-green-700'
  if (clarity >= 40) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function getClarityColor(clarity: number): string {
  if (clarity >= 70) return 'bg-green-500'
  if (clarity >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

function getClarityLabel(clarity: number): string {
  if (clarity >= 80) return 'Very confident'
  if (clarity >= 60) return 'Fairly confident'
  if (clarity >= 40) return 'Uncertain'
  if (clarity >= 20) return 'Very uncertain'
  return 'No clear evidence'
}

function getModalityEmoji(modality: string): string {
  const map = {
    video: '📹',
    transcript: '📝',
    article: '📰',
    social_post: '💬',
    document: '📄'
  }
  return map[modality] || '📄'
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getStoryDescription(answer: any, source: any): string {
  const synopsis = answer.synopsis?.toLowerCase() || ''

  // Pattern matching to create narrative descriptions
  if (synopsis.includes('prediction') || synopsis.includes('expect')) {
    return '📰 "Trump is expected to raise Jimmy Lai case with Xi" — Lianhe Zaobao reports senators are pushing for it'
  }

  if (synopsis.includes('denial') || synopsis.includes('didn\'t')) {
    return '❌ "Trump didn\'t mention it!" — Chinese social media posts deny it happened. Grok AI amplifies the denial.'
  }

  if (synopsis.includes('video') && source?.modality === 'video') {
    return '📹 Video evidence drops — Full press conference footage shows Trump made NO public mention of Jimmy Lai'
  }

  if (synopsis.includes('transcript')) {
    return '📝 Transcript confirms — Word-for-word record of the press conference. "Jimmy Lai" appears nowhere in public remarks.'
  }

  if (synopsis.includes('wh official') || synopsis.includes('white house')) {
    return '💬 Plot twist! — EWTN journalist claims a White House official confirmed Trump DID raise it privately'
  }

  if (synopsis.includes('contradiction') || synopsis.includes('grok')) {
    return '🚨 Misinformation spotted — Chinese posts + Grok AI spread false claims before video evidence appeared'
  }

  // Fallback to original synopsis
  return answer.synopsis || 'Evidence submitted'
}

export default TruthRaceUX2
