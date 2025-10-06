import React from 'react'

interface TypingIndicatorProps {
  message?: string
}

function TypingIndicator({ message = 'Analyzing...' }: TypingIndicatorProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div className="flex-1">
        <div className="inline-block rounded-2xl rounded-tl-sm bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">{message}</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TypingIndicator
