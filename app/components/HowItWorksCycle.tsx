import React, { useState } from 'react'

const HowItWorksCycle = () => {
  const [isHovered, setIsHovered] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const steps = [
    { icon: '📥', title: 'Submit', description: 'Evidence URL' },
    { icon: '🔄', title: 'Match', description: 'Existing stories' },
    { icon: '🔍', title: 'Verify', description: 'Check claims' },
    { icon: '✨', title: 'Emerge', description: 'New narratives' }
  ]

  return (
    <div
      className="relative bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100/30 transition-colors relative z-10"
        aria-label="Toggle how it works"
      >
        <h3 className="font-semibold text-slate-900 text-sm">How it works</h3>
        <svg
          className={`w-4 h-4 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Rotating cycle background */}
      {isExpanded && (
        <div className="absolute inset-0 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 300 300" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cycleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.1" />
                <stop offset="50%" stopColor="rgb(59, 130, 246)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Animated rotating border showing cycle */}
            <rect
              x="2"
              y="2"
              width="296"
              height="296"
              rx="16"
              fill="none"
              stroke="url(#cycleGradient)"
              strokeWidth="3"
              strokeDasharray={isHovered ? "20 10" : "0"}
              className={`transition-all duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
              style={{
                animation: isHovered ? 'rotateBorder 3s linear infinite' : 'none'
              }}
            />
          </svg>
        </div>
      )}

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 relative z-10">
        {steps.map((step, index) => (
          <div key={index}>
            {/* Step */}
            <div className="flex items-center gap-3">
              <div className={`
                w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm
                transition-all duration-300
                ${isHovered ? 'scale-110 shadow-md' : 'scale-100'}
              `}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <span className="text-xl">{step.icon}</span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900">{step.title}</div>
                <div className="text-xs text-slate-600">{step.description}</div>
              </div>
            </div>

            {/* Arrow between steps with flowing effect */}
            {index < steps.length - 1 && (
              <div className="ml-5 my-1 relative h-6">
                <div className={`
                  absolute left-0 w-0.5 h-full bg-slate-300
                  transition-all duration-300
                  ${isHovered ? 'bg-blue-400' : 'bg-slate-300'}
                `}
                  style={{ transitionDelay: `${index * 100 + 50}ms` }}
                />
                {/* Animated dot flowing down */}
                {isHovered && (
                  <div
                    className="absolute left-0 w-1.5 h-1.5 -ml-0.5 bg-blue-600 rounded-full"
                    style={{
                      animation: 'flow 1.5s ease-in-out infinite',
                      animationDelay: `${index * 0.3}s`
                    }}
                  />
                )}
              </div>
            )}
          </div>
        ))}

        {/* Loop back indicator */}
        <div className={`
          ml-5 mt-3 mb-1 flex items-center gap-2 text-slate-400
          transition-all duration-300
          ${isHovered ? 'text-blue-500' : 'text-slate-400'}
        `}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9" />
          </svg>
          <span className="text-xs font-medium">Cycles continuously</span>
        </div>
        </div>
      )}

      {/* Animation keyframes */}
      <style>{`
        @keyframes flow {
          0% {
            top: 0;
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }
        @keyframes rotateBorder {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 120;
          }
        }
      `}</style>
    </div>
  )
}

export default HowItWorksCycle
