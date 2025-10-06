import React from 'react'
import { ActionPrompt } from '../../types/chat'

interface ActionButtonsProps {
  prompt: ActionPrompt
  onAction?: (actionId: string, route?: string) => void
}

const variantStyles = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
  ghost: 'bg-transparent hover:bg-slate-50 text-slate-600 border border-slate-200'
}

function ActionButtons({ prompt, onAction }: ActionButtonsProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3">
      <p className="text-xs text-slate-700 mb-2">
        {prompt.message}
      </p>

      {prompt.actions && prompt.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {prompt.actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onAction?.(action.id, action.route)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${variantStyles[action.variant]}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ActionButtons
