// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { TrendingUp, Clock, Eye, DollarSign, CheckCircle, AlertTriangle, Flame, Target } from 'lucide-react'

const LiveFeed = () => {
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
          <p className="mt-4 text-slate-600">Loading live questions...</p>
        </div>
      </div>
    )
  }

  // Flatten all asks from all stories
  const allQuestions = stories.flatMap(story =>
    story.cases.flatMap(caseItem =>
      caseItem.asks.map(ask => ({
        ...ask,
        storyTitle: story.title,
        caseTitle: caseItem.title,
        storyId: story.id,
        caseId: caseItem.id,
        resonance: story.resonance,
      }))
    )
  )

  // Sort by status: open + high bounty first
  const hotQuestions = allQuestions
    .filter(q => q.status === 'open')
    .sort((a, b) => b.bounty - a.bounty)

  const recentlySolved = allQuestions
    .filter(q => q.status === 'resolved')
    .slice(0, 3)

  const easyWins = allQuestions
    .filter(q => q.status === 'open' && q.bounty < 50 && q.clarity < 30)
    .slice(0, 3)

  if (selectedQuestion) {
    return <QuestionDetail question={selectedQuestion} onBack={() => setSelectedQuestion(null)} />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">Truth Market</h1>
          <p className="text-blue-100">The world's questions, answered live</p>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Hot Right Now */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-slate-900">Hot Right Now</h2>
          </div>
          <div className="space-y-4">
            {hotQuestions.slice(0, 5).map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                onClick={() => setSelectedQuestion(q)}
              />
            ))}
          </div>
        </section>

        {/* Recently Solved */}
        {recentlySolved.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <h2 className="text-2xl font-bold text-slate-900">Recently Solved</h2>
            </div>
            <div className="space-y-3">
              {recentlySolved.map((q) => (
                <SolvedCard
                  key={q.id}
                  question={q}
                  onClick={() => setSelectedQuestion(q)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Easy Wins */}
        {easyWins.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-6 h-6 text-amber-500" />
              <h2 className="text-2xl font-bold text-slate-900">Easy Wins</h2>
              <span className="text-sm text-slate-500">(Help needed)</span>
            </div>
            <div className="space-y-3">
              {easyWins.map((q) => (
                <EasyWinCard
                  key={q.id}
                  question={q}
                  onClick={() => setSelectedQuestion(q)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// Hot question card
const QuestionCard = ({ question, onClick }) => {
  const confidence = question.clarity
  const isUrgent = question.followers > 15
  const activeCount = Math.floor(Math.random() * 5) + 1 // Mock active users

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl p-5 border-2 border-slate-200 hover:border-blue-400 transition-all text-left shadow-sm hover:shadow-md"
    >
      {/* Question */}
      <div className="mb-3">
        <div className="text-xs text-slate-500 mb-1">{question.storyTitle}</div>
        <h3 className="text-lg font-bold text-slate-900 leading-tight">
          {question.question}
        </h3>
      </div>

      {/* Confidence bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-slate-600">
            {confidence}% sure
          </span>
          <span className="text-xs text-slate-400">
            {getConfidenceLabel(confidence)}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              confidence >= 70 ? 'bg-green-500' : confidence >= 40 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-blue-600 font-semibold">
          <DollarSign className="w-4 h-4" />
          ${question.bounty}
        </div>
        <div className={`flex items-center gap-1 ${isUrgent ? 'text-orange-600' : 'text-slate-600'}`}>
          {isUrgent ? <Flame className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {question.followers} watching
        </div>
        {activeCount > 0 && (
          <div className="flex items-center gap-1 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {activeCount} racing now
          </div>
        )}
      </div>
    </button>
  )
}

// Solved question card
const SolvedCard = ({ question, onClick }) => {
  const topAnswer = question.answers?.[0]

  return (
    <button
      onClick={onClick}
      className="w-full bg-green-50 rounded-lg p-4 border border-green-200 hover:border-green-400 transition-all text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-700 font-medium">SOLVED</span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">{question.question}</h4>
          <p className="text-xs text-slate-600">Resolved • Full evidence available</p>
        </div>
        {topAnswer && (
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-bold text-green-600">${topAnswer.payout?.toFixed(0) || 0}</div>
            <div className="text-xs text-slate-500">earned</div>
          </div>
        )}
      </div>
    </button>
  )
}

// Easy win card
const EasyWinCard = ({ question, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full bg-amber-50 rounded-lg p-4 border border-amber-200 hover:border-amber-400 transition-all text-left"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-amber-700 font-medium">EASY WIN</span>
          </div>
          <h4 className="text-sm font-semibold text-slate-900">{question.question.substring(0, 60)}...</h4>
        </div>
        <div className="flex items-center gap-1 text-lg font-bold text-amber-600 ml-3">
          <DollarSign className="w-5 h-5" />
          {question.bounty}
        </div>
      </div>
    </button>
  )
}

// Question detail view
const QuestionDetail = ({ question, onBack }) => {
  const [sources, setSources] = useState([])

  useEffect(() => {
    fetchSources()
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

  // Group answers by support/oppose
  const supportAnswers = question.answers?.filter(a => a.clarity_gain > 0) || []
  const opposeAnswers = question.answers?.filter(a => a.clarity_gain <= 0) || []

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button onClick={onBack} className="text-sm text-blue-100 hover:text-white mb-2">
            ← Back to feed
          </button>
          <h1 className="text-xl font-bold">{question.question}</h1>
          <p className="text-sm text-blue-100 mt-1">{question.storyTitle}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Status */}
        <div className="bg-white rounded-xl p-5 border-2 border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl font-bold text-slate-900">{question.clarity}% sure</div>
              <div className="text-sm text-slate-600 mt-1">{getConfidenceLabel(question.clarity)}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">${question.bounty}</div>
              <div className="text-xs text-slate-500">bounty</div>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${
                question.clarity >= 70 ? 'bg-green-500' : question.clarity >= 40 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${question.clarity}%` }}
            />
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {question.followers} watching
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {calculateTimeLeft(question.deadline)}
            </div>
          </div>
        </div>

        {/* Evidence War */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Evidence</h2>

          {supportAnswers.length > 0 && (
            <div className="bg-green-50 rounded-xl p-5 border-2 border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-green-900">Supporting ({supportAnswers.length})</h3>
              </div>
              <div className="space-y-3">
                {supportAnswers.map((answer, idx) => (
                  <EvidenceItem key={idx} answer={answer} sources={sources} type="support" />
                ))}
              </div>
            </div>
          )}

          {opposeAnswers.length > 0 && (
            <div className="bg-red-50 rounded-xl p-5 border-2 border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-red-900">Conflicting ({opposeAnswers.length})</h3>
              </div>
              <div className="space-y-3">
                {opposeAnswers.map((answer, idx) => (
                  <EvidenceItem key={idx} answer={answer} sources={sources} type="oppose" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Add Evidence CTA */}
        <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-lg transition-all">
          💡 I have evidence → Earn ${question.bounty}
        </button>
      </div>
    </div>
  )
}

const EvidenceItem = ({ answer, sources, type }) => {
  const source = sources.find(s => answer.source_ids?.includes(s.id))

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          {answer.synopsis && (
            <p className="text-sm text-slate-900 font-medium mb-2">{answer.synopsis}</p>
          )}
          {source && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>{getModalityEmoji(source.modality)}</span>
              <span className="font-medium">{source.type === 'primary' ? '⭐ PRIMARY' : 'Secondary'}</span>
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
        </div>
        <div className="flex-shrink-0 text-right">
          <div className={`text-lg font-bold ${type === 'support' ? 'text-green-600' : 'text-red-600'}`}>
            +{answer.clarity_gain}
          </div>
          {answer.validated && (
            <div className="text-xs text-green-600 mt-1">✓ Verified</div>
          )}
        </div>
      </div>
    </div>
  )
}

function getConfidenceLabel(clarity) {
  if (clarity >= 80) return 'Very confident'
  if (clarity >= 60) return 'Fairly confident'
  if (clarity >= 40) return 'Uncertain'
  if (clarity >= 20) return 'Very uncertain'
  return 'No evidence yet'
}

function getModalityEmoji(modality) {
  const map = {
    video: '📹',
    transcript: '📝',
    article: '📰',
    social_post: '💬',
    document: '📄'
  }
  return map[modality] || '📄'
}

function calculateTimeLeft(deadline) {
  const now = new Date()
  const end = new Date(deadline)
  const diff = end.getTime() - now.getTime()
  if (diff <= 0) return 'Expired'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days}d ${hours}h left`
  return `${hours}h left`
}

export default LiveFeed
