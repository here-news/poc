import React, { useState, useRef, KeyboardEvent } from 'react'

interface SubmissionInputProps {
  onSubmit: (input: string) => void
  disabled?: boolean
}

function SubmissionInput({ onSubmit, disabled = false }: SubmissionInputProps) {
  const [input, setInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed) return

    onSubmit(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // TODO: Implement file upload
      alert('File upload coming soon!')
      e.target.value = '' // Reset
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Input Box */}
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Paste news URL, text, or upload file..."
          rows={3}
          className="w-full px-4 py-3 pr-16 border-2 border-slate-300 rounded-xl focus:border-[#008080] focus:ring-2 focus:ring-teal-100 outline-none transition-all resize-none disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-900 placeholder:text-slate-400"
        />

        {/* File Upload Button */}
        <button
          type="button"
          onClick={handleFileClick}
          disabled={disabled}
          className="absolute right-3 top-3 p-2 text-slate-400 hover:text-[#008080] hover:bg-teal-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Upload file (coming soon)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.txt"
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={disabled || !input.trim()}
        className="mt-3 w-full px-6 py-3 bg-gradient-to-r from-[#008080] to-[#1a2f3a] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2"
      >
        <span>Submit</span>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>

      {/* Helper Text */}
      <p className="mt-2 text-xs text-slate-500 text-center">
        Press Enter to submit • Shift+Enter for new line
      </p>
    </div>
  )
}

export default SubmissionInput
