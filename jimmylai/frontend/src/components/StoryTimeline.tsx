// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, Clock, TrendingUp, Users } from 'lucide-react'

interface StoryTimelineProps {
  storyId: string
  story: any
}

const StoryTimeline: React.FC<StoryTimelineProps> = ({ storyId, story }) => {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(100) // 0-100 slider
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (story) {
      buildTimeline()
    }
  }, [story])

  const buildTimeline = () => {
    // Collect all clarity events from all asks
    const allEvents = []

    story.cases.forEach(caseItem => {
      caseItem.asks.forEach(ask => {
        if (ask.clarity_events && ask.clarity_events.length > 0) {
          ask.clarity_events.forEach(event => {
            allEvents.push({
              ...event,
              askId: ask.id,
              askQuestion: ask.question,
              caseTitle: caseItem.title,
            })
          })
        } else {
          // If no events, create one for current state
          allEvents.push({
            timestamp: ask.created_at,
            clarity_before: 0,
            clarity_after: ask.clarity,
            delta: ask.clarity,
            trigger: 'ask_created',
            askId: ask.id,
            askQuestion: ask.question,
            caseTitle: caseItem.title,
          })
        }
      })
    })

    // Sort by timestamp
    allEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    setEvents(allEvents)
  }

  useEffect(() => {
    if (playing) {
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= 100) {
            setPlaying(false)
            return 100
          }
          return prev + 1
        })
      }, 100) // Move 1% every 100ms = 10 seconds for full replay

      return () => clearInterval(interval)
    }
  }, [playing])

  const handlePlayPause = () => {
    if (currentTime >= 100) {
      setCurrentTime(0)
    }
    setPlaying(!playing)
  }

  const handleReset = () => {
    setPlaying(false)
    setCurrentTime(0)
  }

  // Calculate which events are visible at current time
  const visibleEvents = events.filter((_, idx) => {
    const eventPosition = (idx / Math.max(events.length - 1, 1)) * 100
    return eventPosition <= currentTime
  })

  // Calculate current clarity based on visible events
  const currentClarity = visibleEvents.length > 0
    ? visibleEvents[visibleEvents.length - 1].clarity_after
    : 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Story Timeline
            </h3>
            <p className="text-sm text-slate-500">Watch clarity evolve over time</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-600">{currentClarity}%</div>
            <div className="text-xs text-slate-500">Current Clarity</div>
          </div>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="p-6">
        {/* Clarity Chart */}
        <div className="mb-6 relative" style={{ height: '120px' }}>
          <div className="absolute inset-0 flex items-end">
            {events.map((event, idx) => {
              const position = (idx / Math.max(events.length - 1, 1)) * 100
              const isVisible = position <= currentTime
              const height = (event.clarity_after / 100) * 100

              return (
                <div
                  key={idx}
                  className="relative flex-1 flex flex-col justify-end transition-all duration-300"
                  style={{
                    opacity: isVisible ? 1 : 0.2,
                  }}
                >
                  <div
                    className={`${
                      isVisible ? 'bg-gradient-to-t from-blue-500 to-purple-500' : 'bg-slate-200'
                    } rounded-t transition-all duration-500`}
                    style={{ height: `${height}%` }}
                  />
                  {event.delta > 0 && isVisible && (
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-green-600">
                      +{event.delta}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-slate-400 -ml-8">
            <span>100%</span>
            <span>50%</span>
            <span>0%</span>
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max="100"
            value={currentTime}
            onChange={(e) => {
              setPlaying(false)
              setCurrentTime(Number(e.target.value))
            }}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={handleReset}
            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={handlePlayPause}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
          >
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {playing ? 'Pause' : currentTime >= 100 ? 'Replay' : 'Play'}
          </button>
        </div>

        {/* Event List */}
        <div className="space-y-2 max-h-48 overflow-auto">
          {visibleEvents.map((event, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border transition-all duration-300 ${
                idx === visibleEvents.length - 1
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 mb-1">
                    {event.trigger.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs text-slate-600 truncate">
                    {event.askQuestion}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {event.delta !== 0 && (
                    <div className={`text-sm font-bold ${
                      event.delta > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {event.delta > 0 ? '+' : ''}{event.delta}
                    </div>
                  )}
                  <div className="text-xs text-slate-400">
                    {new Date(event.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs text-slate-500 mb-1">Total Events</div>
          <div className="text-lg font-bold text-slate-900">{visibleEvents.length}/{events.length}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">ΔClarity Gain</div>
          <div className="text-lg font-bold text-green-600">+{currentClarity}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Duration</div>
          <div className="text-lg font-bold text-slate-900">
            {events.length > 0 ? calculateDuration(events[0].timestamp, events[events.length - 1]?.timestamp) : '0d'}
          </div>
        </div>
      </div>
    </div>
  )
}

function calculateDuration(start: string, end: string): string {
  if (!end) return '0d'
  const startDate = new Date(start)
  const endDate = new Date(end)
  const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  return `${days}d`
}

export default StoryTimeline
