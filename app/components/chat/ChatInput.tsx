import React, { useState, useRef, KeyboardEvent } from 'react'

interface ChatInputProps {
  onSubmit: (input: string) => void
  disabled?: boolean
  placeholder?: string
}

function ChatInput({
  onSubmit,
  disabled = false,
  placeholder = "What are you seeing? Paste a link or describe the signal..."
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || disabled) return

    onSubmit(trimmed)
    setInput('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (but allow Shift+Enter for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    const newHeight = Math.max(Math.min(textarea.scrollHeight, 200), 56) // Min 56px, max 200px
    textarea.style.height = `${newHeight}px`
  }

  return (
    <div className="border-t border-slate-200 bg-white p-4">
      <div className="flex gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
          className="flex-1 resize-none px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400 text-sm leading-relaxed"
          style={{ maxHeight: '200px', minHeight: '56px', height: '56px' }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className="self-end px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-semibold rounded-xl transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded">Shift+Enter</kbd> for new line
      </p>
    </div>
  )
}

export default ChatInput
