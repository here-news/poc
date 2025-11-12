import React, { useState, useEffect } from 'react'
import { Play, Pause, Square, RotateCcw, ExternalLink, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface SimulationStatus {
  running: boolean
  currentStep: number
  totalSteps: number
  currentQuestId: string | null
  currentDay: number
  totalDays: number
  events: SimulationEvent[]
  questStats: {
    hypotheses: number
    evidence: number
    comments: number
    bounty: number
    leadingHypothesis: string
    leadingProbability: number
  } | null
}

interface SimulationEvent {
  day: number
  time: string
  type: 'quest' | 'evidence' | 'comment' | 'bounty' | 'convergence'
  description: string
  completed: boolean
  current: boolean
}

export default function SimulationControl() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<SimulationStatus | null>(null)
  const [speed, setSpeed] = useState<number>(2) // 2x default
  const [loading, setLoading] = useState(false)

  // Poll for simulation status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/jimmylai/api/simulation/status')
        if (res.ok) {
          const data = await res.json()
          setStatus(data)
        }
      } catch (err) {
        console.error('Failed to fetch simulation status:', err)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 1000) // Poll every second
    return () => clearInterval(interval)
  }, [])

  const startSimulation = async () => {
    setLoading(true)
    try {
      const res = await fetch('/jimmylai/api/simulation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed })
      })
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (err) {
      console.error('Failed to start simulation:', err)
      alert('Failed to start simulation')
    } finally {
      setLoading(false)
    }
  }

  const pauseSimulation = async () => {
    try {
      await fetch('/jimmylai/api/simulation/pause', { method: 'POST' })
    } catch (err) {
      console.error('Failed to pause simulation:', err)
    }
  }

  const resumeSimulation = async () => {
    try {
      const res = await fetch('/jimmylai/api/simulation/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed })
      })
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (err) {
      console.error('Failed to resume simulation:', err)
    }
  }

  const stopSimulation = async () => {
    try {
      await fetch('/jimmylai/api/simulation/stop', { method: 'POST' })
      setStatus(null)
    } catch (err) {
      console.error('Failed to stop simulation:', err)
    }
  }

  const restartSimulation = async () => {
    await stopSimulation()
    setTimeout(() => startSimulation(), 500)
  }

  const progress = status ? (status.currentStep / status.totalSteps) * 100 : 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">🎮 Simulation Control Panel</h1>
          <p className="text-purple-100">
            Run and control the Jimmy Lai Quest simulation with real-time timeline events
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Main Control Panel */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              📊 Jimmy Lai Quest Simulation
            </h2>
            {status?.currentQuestId && (
              <button
                onClick={() => navigate(`/quest/${status.currentQuestId}`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open Quest
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {status && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Progress: Day {status.currentDay}/{status.totalDays}
                </span>
                <span className="text-sm text-slate-500">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex items-center gap-3 mb-6">
            {!status?.running ? (
              <button
                onClick={startSimulation}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Play className="w-5 h-5" />
                {status ? 'Resume' : 'Start Simulation'}
              </button>
            ) : (
              <button
                onClick={pauseSimulation}
                className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
              >
                <Pause className="w-5 h-5" />
                Pause
              </button>
            )}

            {status && (
              <>
                <button
                  onClick={stopSimulation}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Square className="w-5 h-5" />
                  Stop
                </button>
                <button
                  onClick={restartSimulation}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  Restart
                </button>
              </>
            )}
          </div>

          {/* Speed Control */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-slate-900">Simulation Speed</span>
            </div>
            <div className="flex items-center gap-3">
              {[1, 2, 5, 10, 100].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    speed === s
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {s === 100 ? 'Instant' : `${s}x`}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {speed === 100
                ? 'Run all events instantly'
                : `1 simulated day = ${60 / speed} seconds real time`}
            </p>
          </div>
        </div>

        {/* Timeline Events */}
        {status && status.events.length > 0 && (
          <div className="bg-white rounded-xl border-2 border-slate-200 p-6 mb-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">📅 Timeline Events</h3>
            <div className="space-y-3">
              {status.events.map((event, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
                    event.current
                      ? 'border-purple-400 bg-purple-50'
                      : event.completed
                      ? 'border-green-200 bg-green-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    event.completed ? 'bg-green-600' : event.current ? 'bg-purple-600 animate-pulse' : 'bg-slate-400'
                  }`}>
                    {event.completed ? '✓' : event.current ? '⏳' : '⏹'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">Day {event.day}</span>
                      <span className="text-xs text-slate-500">{event.time}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        event.type === 'quest' ? 'bg-blue-100 text-blue-700' :
                        event.type === 'evidence' ? 'bg-purple-100 text-purple-700' :
                        event.type === 'comment' ? 'bg-slate-100 text-slate-700' :
                        event.type === 'bounty' ? 'bg-green-100 text-green-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {event.type}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current State */}
        {status?.questStats && (
          <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">🎯 Current Quest State</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-500 mb-1">Hypotheses</div>
                <div className="text-2xl font-bold text-slate-900">
                  {status.questStats.hypotheses}
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-500 mb-1">Evidence</div>
                <div className="text-2xl font-bold text-slate-900">
                  {status.questStats.evidence}
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-500 mb-1">Comments</div>
                <div className="text-2xl font-bold text-slate-900">
                  {status.questStats.comments}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 mb-1">Bounty Pool</div>
                <div className="text-2xl font-bold text-green-700">
                  ${status.questStats.bounty.toFixed(2)}
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg col-span-2">
                <div className="text-sm text-blue-600 mb-1">Leading Hypothesis</div>
                <div className="text-lg font-bold text-blue-700">
                  {status.questStats.leadingHypothesis}
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  {(status.questStats.leadingProbability * 100).toFixed(1)}% confidence
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!status && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-3">
              📚 How to Use
            </h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li>1. Click "Start Simulation" to begin the Jimmy Lai Quest timeline</li>
              <li>2. Adjust speed (1x = slow, 10x = fast, Instant = all at once)</li>
              <li>3. Use Pause/Resume to control the flow</li>
              <li>4. Click "Open Quest" to see the live quest page</li>
              <li>5. Watch probabilities update as evidence comes in</li>
              <li>6. See convergence when a hypothesis reaches 80%</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
