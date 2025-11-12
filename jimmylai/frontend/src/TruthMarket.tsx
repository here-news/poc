// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react'
import { TrendingUp, Clock, Users, DollarSign, FileText, CheckCircle, AlertCircle, Award, BarChart3, GitBranch, User, PlayCircle } from 'lucide-react'
import MarkdownViewer from './components/MarkdownViewer'
import UncertaintyDashboard from './components/UncertaintyDashboard'
import SourceLineage from './components/SourceLineage'
import BuilderPersona from './components/BuilderPersona'
import StoryTimeline from './components/StoryTimeline'

// Three-pane layout
// - Left: Asks for selected Case
// - Center: Stories list (middle) with Cases nested
// - Right: Answers for selected Ask + light submission form

const API_BASE = 'api'  // Relative path for portability

const TruthMarketPrototype = () => {
  const [stories, setStories] = useState([])
  const [currentBuilder, setCurrentBuilder] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [storiesRes, buildersRes] = await Promise.all([
          fetch(`${API_BASE}/stories`),
          fetch(`${API_BASE}/builders`)
        ])
        const storiesData = await storiesRes.json()
        const buildersData = await buildersRes.json()

        setStories(storiesData)
        // Default to builder-anon
        const anon = buildersData.find(b => b.id === 'builder-anon')
        setCurrentBuilder(anon || buildersData[0])
        setLoading(false)
      } catch (err) {
        console.error('Failed to fetch data:', err)
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const [selectedStoryId, setSelectedStoryId] = useState(stories[0]?.id || null)
  const [selectedCaseId, setSelectedCaseId] = useState(stories[0]?.cases[0]?.id || null)
  const [selectedAskId, setSelectedAskId] = useState(stories[0]?.cases[0]?.asks[0]?.id || null)

  const [answerText, setAnswerText] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [showCaseStudy, setShowCaseStudy] = useState(false)
  const [activeTab, setActiveTab] = useState('answers') // 'answers', 'sources', 'timeline', 'builder'
  const caseStudyMap: Record<string, string> = {
    'case-1a': '/static/cases/CASE_STUDY_TRUMP_JIMMY_LAI.md',
  }

  const selectedStory = useMemo(() => stories.find(s => s.id === selectedStoryId) || null, [stories, selectedStoryId])
  const selectedCase = useMemo(() => selectedStory?.cases.find(c => c.id === selectedCaseId) || null, [selectedStory, selectedCaseId])
  const asks = selectedCase?.asks || []
  const selectedAsk = useMemo(() => asks.find(a => a.id === selectedAskId) || null, [asks, selectedAskId])

  useEffect(() => {
    // Ensure case selection stays valid when story changes
    if (!selectedStory) return
    if (!selectedStory.cases.find(c => c.id === selectedCaseId)) {
      const firstCase = selectedStory.cases[0]
      setSelectedCaseId(firstCase?.id || null)
      setSelectedAskId(firstCase?.asks[0]?.id || null)
    }
  }, [selectedStoryId])

  useEffect(() => {
    // Ensure ask selection stays valid when case changes
    if (!selectedCase) return
    if (!selectedCase.asks.find(a => a.id === selectedAskId)) {
      setSelectedAskId(selectedCase.asks[0]?.id || null)
    }
  }, [selectedCaseId])

  const handleSelectStory = (sid: string) => {
    setSelectedStoryId(sid)
    const st = stories.find(s => s.id === sid)
    const firstCase = st?.cases[0]
    setSelectedCaseId(firstCase?.id || null)
    setSelectedAskId(firstCase?.asks[0]?.id || null)
  }

  const handleSelectCase = (cid: string) => {
    setSelectedCaseId(cid)
    const cs = selectedStory?.cases.find(c => c.id === cid)
    setSelectedAskId(cs?.asks[0]?.id || null)
  }

  const handleSelectAsk = (aid: string) => setSelectedAskId(aid)

  const handleFundAsk = async (askId: string, amount: number) => {
    if (!currentBuilder || currentBuilder.credits < amount) return

    try {
      const res = await fetch(
        `${API_BASE}/stories/${selectedStoryId}/cases/${selectedCaseId}/asks/${askId}/fund`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ builder_id: currentBuilder.id, amount })
        }
      )
      const data = await res.json()

      if (data.success) {
        // Update local state
        setCurrentBuilder(data.builder)
        setStories(prev => prev.map(st => {
          if (st.id !== selectedStoryId) return st
          return {
            ...st,
            cases: st.cases.map(cs => {
              if (cs.id !== selectedCaseId) return cs
              return {
                ...cs,
                asks: cs.asks.map(a => a.id === askId ? data.ask : a)
              }
            })
          }
        }))
      }
    } catch (err) {
      console.error('Failed to fund ask:', err)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!sourceUrl || !selectedAsk || !currentBuilder) return

    try {
      const res = await fetch(
        `${API_BASE}/stories/${selectedStoryId}/cases/${selectedCaseId}/asks/${selectedAsk.id}/answers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            builder_id: currentBuilder.id,
            source_url: sourceUrl,
            synopsis: answerText
          })
        }
      )
      const data = await res.json()

      if (data.success) {
        // Update local state with new answer
        setStories(prev => prev.map(st => {
          if (st.id !== selectedStoryId) return st
          return {
            ...st,
            cases: st.cases.map(cs => {
              if (cs.id !== selectedCaseId) return cs
              return {
                ...cs,
                asks: cs.asks.map(a => a.id === selectedAsk.id ? data.ask : a)
              }
            })
          }
        }))
        setAnswerText('')
        setSourceUrl('')
      }
    } catch (err) {
      console.error('Failed to submit answer:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Loading Truth Market...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">H</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Race to Truth</h1>
                <p className="text-xs text-slate-500">Stories • Cases • Asks • Answers</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-900">
                  {currentBuilder ? currentBuilder.credits.toFixed(1) : '0'} credits
                </span>
              </div>
              {currentBuilder && (
                <div className="text-sm text-slate-600">
                  {currentBuilder.username}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Uncertainty Dashboard - Top Banner */}
      {selectedStory && (
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <UncertaintyDashboard story={selectedStory} selectedCase={selectedCase} />
        </div>
      )}

      {/* 3-pane layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left: Asks */}
          <aside className="lg:w-72">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-900">Asks</h3>
                <p className="text-xs text-slate-500">For the selected Case</p>
              </div>

              <div className="p-2 space-y-2 max-h-[70vh] overflow-auto">
                {asks.length === 0 && (
                  <div className="p-4 text-sm text-slate-600">No asks yet</div>
                )}
                {asks.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleSelectAsk(a.id)}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      selectedAskId === a.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium text-slate-900 text-sm">{a.question}</div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5">
                          <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full" style={{ width: `${a.clarity}%` }} />
                        </div>
                        <span>{a.clarity}</span>
                      </div>
                      <div className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{a.bounty}</div>
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.timeLeft}</div>
                      <div className="flex items-center gap-1"><Users className="w-3 h-3" />{a.followers}</div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); handleFundAsk(a.id, 10) }} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">Fund +10</button>
                      <button onClick={(e) => { e.stopPropagation(); handleFundAsk(a.id, 20) }} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">Fund +20</button>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Center: Stories + Cases */}
          <main className="flex-1">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Stories</h3>
                  <p className="text-xs text-slate-500">Pick a Story, then a Case</p>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {[...stories].sort((a,b) => b.resonance - a.resonance).map((story) => (
                  <div key={story.id} className={`rounded-lg border ${story.id === selectedStoryId ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                    <div className="p-4 flex items-start justify-between">
                      <div>
                        <button onClick={() => handleSelectStory(story.id)} className="text-left">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-orange-500" />
                            <h4 className="font-semibold text-slate-900">{story.title}</h4>
                            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Resonance {story.resonance}</span>
                          </div>
                        </button>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {story.cases.map(cs => (
                            <button
                              key={cs.id}
                              onClick={() => { setSelectedStoryId(story.id); handleSelectCase(cs.id) }}
                              className={`px-3 py-1 rounded-full text-xs border transition ${
                                cs.id === selectedCaseId && story.id === selectedStoryId ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {cs.title}
                              <span className="ml-2 text-[10px] opacity-70">Cl {cs.clarity} · {cs.urgency}</span>
                            </button>
                          ))}
                          {/* Case study quick link (if available) */}
                          {story.id === selectedStoryId && selectedCase && caseStudyMap[selectedCase.id] && (
                            <button
                              onClick={() => setShowCaseStudy(true)}
                              className="px-3 py-1 rounded-full text-xs border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                              title="Open Case Study"
                            >
                              Open Case Study
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>

          {/* Right: Tabbed Panel */}
          <aside className="lg:w-96">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              {/* Tab Headers */}
              <div className="p-2 border-b border-slate-200 flex gap-1">
                <button
                  onClick={() => setActiveTab('answers')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'answers' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Answers
                </button>
                <button
                  onClick={() => setActiveTab('sources')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'sources' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <GitBranch className="w-4 h-4" />
                  Sources
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'timeline' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <PlayCircle className="w-4 h-4" />
                  Timeline
                </button>
                <button
                  onClick={() => setActiveTab('builder')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'builder' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {activeTab === 'answers' && (
                  <div>
                    <div className="mb-4">
                      <h3 className="font-bold text-slate-900">Answers</h3>
                      {!selectedAsk && <p className="text-xs text-slate-500">Select an Ask to view answers</p>}
                      {selectedAsk && <p className="text-xs text-slate-500">{selectedAsk.question}</p>}
                    </div>

              <div className="p-3 space-y-3 max-h-[50vh] overflow-auto">
                {selectedAsk && selectedAsk.answers.length === 0 && (
                  <div className="p-4 text-sm text-slate-600">No answers yet</div>
                )}
                {selectedAsk && [...selectedAsk.answers].sort((a,b) => b.clarity_gain - a.clarity_gain).map((answer, idx) => (
                  <div key={answer.id} className="rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-bold text-blue-600">#{idx + 1}</div>
                        <div className="text-green-600 font-bold">+{answer.clarity_gain} ΔH</div>
                      </div>
                      {answer.validated && (
                        <span className="flex items-center gap-1 text-green-700 text-xs bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />Validated</span>
                      )}
                    </div>
                    <div className="mt-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-700">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-blue-600 font-medium truncate">{answer.source_ids?.[0] || 'Unknown source'}</span>
                      </div>
                      {answer.synopsis && (
                        <div className="mt-1 text-xs text-slate-600 italic">{answer.synopsis}</div>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <span className="text-slate-600">
                          Novelty: <span className={answer.novelty === 'high' ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>{answer.novelty}</span>
                        </span>
                        {answer.payout > 0 && (
                          <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                            <Award className="w-3 h-3" />
                            {answer.payout.toFixed(1)} credits
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

                    {/* Submit Answer */}
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="text-sm font-medium text-slate-900 mb-2">Submit Answer</div>
                      <input
                        type="url"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="Source URL"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                      <textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        rows={3}
                        placeholder="Synopsis (optional)"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                      <button
                        onClick={handleSubmitAnswer}
                        disabled={!sourceUrl || !selectedAsk}
                        className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add Answer
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'sources' && selectedAsk && (
                  <SourceLineage
                    askId={selectedAsk.id}
                    answers={selectedAsk.answers}
                    storyId={selectedStoryId}
                    caseId={selectedCaseId}
                  />
                )}

                {activeTab === 'timeline' && selectedStory && (
                  <StoryTimeline storyId={selectedStoryId} story={selectedStory} />
                )}

                {activeTab === 'builder' && currentBuilder && (
                  <BuilderPersona builderId={currentBuilder.id} />
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Case Study Modal */}
      {showCaseStudy && selectedCase && caseStudyMap[selectedCase.id] && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowCaseStudy(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">Case Study</div>
                  <div className="font-semibold text-slate-900 truncate">{selectedCase.title}</div>
                </div>
                <button onClick={() => setShowCaseStudy(false)} className="px-3 py-1.5 text-sm rounded bg-slate-100 hover:bg-slate-200">Close</button>
              </div>
              <div className="p-4 overflow-auto">
                <MarkdownViewer src={caseStudyMap[selectedCase.id]} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TruthMarketPrototype
