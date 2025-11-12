import React from 'react'

interface LoadingCardProps {
  message?: string
}

function LoadingCard({ message = 'Processing...' }: LoadingCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-5">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
        <span className="text-sm text-slate-600">{message}</span>
      </div>
    </div>
  )
}

export default LoadingCard
