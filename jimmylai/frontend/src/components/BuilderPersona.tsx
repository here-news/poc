// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { Award, TrendingUp, Target, Zap, Medal, Star } from 'lucide-react'

interface BuilderPersonaProps {
  builderId: string
}

const SPECIALIZATIONS = {
  transcriber: { icon: '📝', color: 'blue', label: 'Transcriber' },
  translator: { icon: '🌐', color: 'purple', label: 'Translator' },
  fact_checker: { icon: '✓', color: 'green', label: 'Fact Checker' },
  data_scraper: { icon: '🔍', color: 'amber', label: 'Data Scraper' },
  interviewer: { icon: '🎤', color: 'red', label: 'Interviewer' },
}

const BuilderPersona: React.FC<BuilderPersonaProps> = ({ builderId }) => {
  const [builder, setBuilder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBuilder()
  }, [builderId])

  const fetchBuilder = async () => {
    try {
      const res = await fetch(`/jimmylai/api/builders/${builderId}`)
      const data = await res.json()
      setBuilder(data)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch builder:', err)
      setLoading(false)
    }
  }

  if (loading || !builder) {
    return <div className="text-sm text-slate-500">Loading builder...</div>
  }

  // Calculate level based on total clarity contributed
  const level = Math.floor(builder.total_clarity_contributed / 50) + 1
  const nextLevelClarity = level * 50
  const progressToNextLevel = ((builder.total_clarity_contributed % 50) / 50) * 100

  // Calculate average ΔClarity per answer
  const avgClarity = builder.answers_submitted > 0
    ? Math.round(builder.total_clarity_contributed / builder.answers_submitted)
    : 0

  // Determine primary specialization (mock for now)
  const primarySpec = builder.badges?.[0] || 'transcriber'
  const spec = SPECIALIZATIONS[primarySpec] || SPECIALIZATIONS.transcriber

  return (
    <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 text-white shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl backdrop-blur">
            {spec.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold">{builder.username}</h3>
            <div className="text-sm text-white/80">Level {level} {spec.label}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{builder.credits.toFixed(0)}</div>
          <div className="text-xs text-white/70">credits</div>
        </div>
      </div>

      {/* Level Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-white/80">Progress to Level {level + 1}</span>
          <span className="font-semibold">{builder.total_clarity_contributed}/{nextLevelClarity} ΔH</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2 backdrop-blur">
          <div
            className="bg-white h-2 rounded-full transition-all duration-500 shadow-lg"
            style={{ width: `${progressToNextLevel}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{builder.total_clarity_contributed}</div>
          <div className="text-xs text-white/70 mt-1">Total ΔH</div>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{builder.answers_submitted}</div>
          <div className="text-xs text-white/70 mt-1">Answers</div>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{avgClarity}</div>
          <div className="text-xs text-white/70 mt-1">Avg ΔH</div>
        </div>
      </div>

      {/* Specialization Badge */}
      <div className="bg-white/10 backdrop-blur rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-yellow-300" />
          <span className="text-sm font-semibold">Specialization</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{spec.icon}</span>
            <span className="text-sm">{spec.label}</span>
          </div>
          <div className="text-xs bg-white/20 px-2 py-1 rounded">
            Level {level}
          </div>
        </div>
      </div>

      {/* Badges */}
      {builder.badges && builder.badges.length > 0 && (
        <div className="bg-white/10 backdrop-blur rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Medal className="w-4 h-4 text-amber-300" />
            <span className="text-sm font-semibold">Badges</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {builder.badges.map((badge, idx) => (
              <div
                key={idx}
                className="bg-white/20 text-xs px-2 py-1 rounded-full backdrop-blur"
              >
                {badge.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="mt-4 pt-4 border-t border-white/20">
        <button className="w-full bg-white text-purple-600 font-semibold py-2 px-4 rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
          <Target className="w-4 h-4" />
          Find Matching Asks
        </button>
      </div>
    </div>
  )
}

export default BuilderPersona
