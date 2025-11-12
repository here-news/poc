// @ts-nocheck
/**
 * Replay Mode - Experience the truth race as it unfolded
 * Travel through time and feel the uncertainty → clarity journey
 */
import React, { useState, useEffect } from 'react'
import { Play, Pause, SkipForward, SkipBack, X } from 'lucide-react'

interface ReplayModeProps {
  question: any
  sources: any[]
  onClose: () => void
}

const ReplayMode: React.FC<ReplayModeProps> = ({ question, sources, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  // Build replay timeline
  const steps = buildReplayTimeline(question, sources)

  // Auto-advance when playing
  useEffect(() => {
    if (playing && currentStep < steps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(currentStep + 1)
      }, 4000 / speed) // 4 seconds per step, adjusted by speed

      return () => clearTimeout(timer)
    } else if (currentStep >= steps.length - 1) {
      setPlaying(false)
    }
  }, [playing, currentStep, speed, steps.length])

  const currentSnapshot = steps[currentStep]

  return (
    <div className="fixed inset-0 bg-black/90 z-50 overflow-auto">
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">🎬 Replay Mode</div>
              <div className="font-bold">{question.question}</div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <SnapshotCard snapshot={currentSnapshot} isAnimating={playing} />
          </div>
        </div>

        {/* Controls */}
        <div className="bg-slate-900 text-white p-6 sticky bottom-0">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Timeline */}
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-400 w-20">
                {formatDate(currentSnapshot.timestamp)}
              </div>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="0"
                  max={steps.length - 1}
                  value={currentStep}
                  onChange={(e) => {
                    setPlaying(false)
                    setCurrentStep(Number(e.target.value))
                  }}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                {/* Event markers */}
                <div className="absolute top-0 left-0 right-0 h-2 pointer-events-none">
                  {steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="absolute top-0 w-3 h-3 bg-white rounded-full transform -translate-y-0.5"
                      style={{ left: `${(idx / (steps.length - 1)) * 100}%` }}
                      title={step.title}
                    />
                  ))}
                </div>
              </div>
              <div className="text-xs text-slate-400 w-20 text-right">
                Step {currentStep + 1}/{steps.length}
              </div>
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={() => setPlaying(!playing)}
                className="p-4 bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>

              <button
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                disabled={currentStep === steps.length - 1}
                className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              {/* Speed control */}
              <div className="ml-4 flex gap-2">
                {[1, 2, 3].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-3 py-1 rounded text-sm ${
                      speed === s ? 'bg-purple-600' : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Step info */}
            <div className="text-center text-sm text-slate-400">
              {currentSnapshot.title}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Snapshot card showing state at this moment
const SnapshotCard = ({ snapshot, isAnimating }) => {
  const [showReactions, setShowReactions] = useState(false)

  useEffect(() => {
    if (isAnimating) {
      // Delay reactions slightly for dramatic effect
      const timer = setTimeout(() => setShowReactions(true), 1000)
      return () => clearTimeout(timer)
    } else {
      setShowReactions(true)
    }
  }, [snapshot, isAnimating])

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
      {/* Clarity meter */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-4xl font-bold">{snapshot.clarity}%</div>
            <div className="text-sm opacity-75">{getClarityLabel(snapshot.clarity)}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">${snapshot.pool}</div>
            <div className="text-xs opacity-75">bounty pool</div>
          </div>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-1000 ${
              snapshot.clarity >= 70 ? 'bg-green-500' : snapshot.clarity >= 40 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${snapshot.clarity}%` }}
          />
        </div>
      </div>

      {/* Evidence */}
      <div className="p-6">
        <div className="mb-4">
          <div className="text-xs text-slate-500 mb-2">THE STORY SO FAR:</div>
          <div className="space-y-4">
            {snapshot.evidence.map((ev, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-2 ${
                  idx === snapshot.evidence.length - 1
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{ev.emoji}</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 mb-1">{ev.title}</div>
                    <div className="text-sm text-slate-600 mb-2">{ev.description}</div>
                    {ev.clarityChange && (
                      <div className={`text-sm font-bold ${
                        ev.clarityChange > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {ev.clarityChange > 0 ? '+' : ''}{ev.clarityChange} clarity
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Community reactions */}
        {showReactions && snapshot.reactions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-sm font-bold text-slate-700">💬 Community ({snapshot.watchers} watching)</div>
            </div>
            <div className="space-y-2">
              {snapshot.reactions.map((reaction, idx) => (
                <div
                  key={idx}
                  className="text-sm text-slate-600 animate-fade-in"
                  style={{ animationDelay: `${idx * 200}ms` }}
                >
                  <span className="font-semibold">{reaction.user}:</span> {reaction.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Build timeline snapshots from question data
function buildReplayTimeline(question: any, sources: any[]): any[] {
  const steps = []

  // Sort answers by source timestamp
  const sortedAnswers = [...(question.answers || [])].sort((a, b) => {
    const aSource = sources.find(s => a.source_ids?.includes(s.id))
    const bSource = sources.find(s => b.source_ids?.includes(s.id))
    const aTime = new Date(aSource?.timestamp || a.submitted_at).getTime()
    const bTime = new Date(bSource?.timestamp || b.submitted_at).getTime()
    return aTime - bTime
  })

  // Clarity progression based on the case study
  const clarityProgression = [25, 15, 58, 72, 72] // prediction → denial → video → transcript → WH claim

  sortedAnswers.forEach((answer, idx) => {
    const source = sources.find(s => answer.source_ids?.includes(s.id))

    // Use predefined clarity progression for better storytelling
    const currentClarity = clarityProgression[idx] || 72

    // Build evidence list up to this point
    const evidenceSoFar = sortedAnswers.slice(0, idx + 1).map(a => {
      const s = sources.find(src => a.source_ids?.includes(src.id))
      return {
        emoji: getModalityEmoji(s?.modality),
        title: getEventTitle(a, s),
        description: a.synopsis,
        clarityChange: a.clarity_gain
      }
    })

    // Add step
    steps.push({
      timestamp: source?.timestamp || answer.submitted_at,
      title: getEventTitle(answer, source),
      clarity: currentClarity,
      pool: 60, // Could be dynamic based on contributions
      watchers: 18 + (idx * 6), // Simulate growing audience
      evidence: evidenceSoFar,
      reactions: getCommunityReactions(answer, source, idx)
    })
  })

  return steps
}

function getEventTitle(answer: any, source: any): string {
  const synopsis = answer.synopsis?.toLowerCase() || ''

  if (synopsis.includes('prediction') || synopsis.includes('expect')) {
    return '📰 Prediction: Trump expected to raise Lai'
  }
  if (synopsis.includes('denial')) {
    return '❌ Denial: Chinese posts + Grok claim he didn\'t'
  }
  if (synopsis.includes('video')) {
    return '📹 Video Evidence: Press conference footage'
  }
  if (synopsis.includes('transcript')) {
    return '📝 Transcript Confirms: No public mention'
  }
  if (synopsis.includes('wh official')) {
    return '💬 Plot Twist: WH official claims he did privately'
  }
  if (synopsis.includes('contradiction')) {
    return '🚨 Misinformation Flagged'
  }

  return 'Evidence submitted'
}

function getCommunityReactions(answer: any, source: any, eventIndex: number): any[] {
  const synopsis = answer.synopsis?.toLowerCase() || ''

  if (synopsis.includes('prediction')) {
    return [
      { user: '@PolicyWonk', text: 'Big if true' },
      { user: '@ChinaHawk', text: 'He needs to raise this!' },
      { user: '@Skeptic99', text: 'Doubt it happens' }
    ]
  }

  if (synopsis.includes('denial')) {
    return [
      { user: '@NewsJunkie', text: 'Wait, really??' },
      { user: '@Skeptic99', text: 'Called it!' },
      { user: '@PolicyWonk', text: 'Need video proof' }
    ]
  }

  if (synopsis.includes('video')) {
    return [
      { user: '@PolicyWonk', text: 'THERE\'S THE PROOF!' },
      { user: '@NewsJunkie', text: 'Video doesn\'t lie' },
      { user: '@ChinaHawk', text: 'What about the private meeting?' },
      { user: '@Skeptic99', text: 'Grok was wrong lol' }
    ]
  }

  if (synopsis.includes('transcript')) {
    return [
      { user: '@PolicyWonk', text: 'Case closed?' },
      { user: '@ChinaHawk', text: 'But what about private portion?' },
      { user: '@BuilderA', text: 'Thanks @BuilderB! 💪' }
    ]
  }

  if (synopsis.includes('wh official')) {
    return [
      { user: '@PolicyWonk', text: 'Which official??' },
      { user: '@Skeptic99', text: 'Anonymous source = 🚩' },
      { user: '@ChinaHawk', text: 'Need corroboration' },
      { user: '@NewsJunkie', text: 'Private meeting is different scope' }
    ]
  }

  return []
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

function getClarityLabel(clarity: number): string {
  if (clarity >= 80) return 'Very confident'
  if (clarity >= 60) return 'Fairly confident'
  if (clarity >= 40) return 'Uncertain'
  if (clarity >= 20) return 'Very uncertain'
  return 'No evidence'
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default ReplayMode
