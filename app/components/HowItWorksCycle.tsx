import React, { useState } from 'react'

const HowItWorksCycle = () => {
  const [isHovered, setIsHovered] = useState(false)

  const steps = [
    { icon: '📥', title: 'Submit', description: 'Evidence URL' },
    { icon: '🔄', title: 'Match', description: 'Existing stories' },
    { icon: '🔍', title: 'Verify', description: 'Check claims' },
    { icon: '✨', title: 'Emerge', description: 'New narratives' }
  ]

  return (
    <div
      className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h3 className="font-semibold text-slate-900 mb-4">How it works</h3>

      <div className="space-y-3">
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

        {/* Loop back arrow */}
        <div className={`
          ml-5 mt-3 mb-1 flex items-center gap-2 text-slate-400
          transition-all duration-300
          ${isHovered ? 'text-blue-500' : 'text-slate-400'}
        `}>
          <div className="relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {/* Rotating indicator when hovered */}
            {isHovered && (
              <div
                className="absolute inset-0"
                style={{
                  animation: 'spin 2s linear infinite'
                }}
              >
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9" />
                </svg>
              </div>
            )}
          </div>
          <span className="text-xs font-medium">Cycles continuously</span>
        </div>
      </div>

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
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}

export default HowItWorksCycle
