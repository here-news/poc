import React, { useEffect, useState } from 'react'
import Header from './components/layout/Header'
import LiveSignals from './components/layout/LiveSignals'
import SubmissionInput from './components/SubmissionInput'
import SubmissionResult from './components/SubmissionResult'
import { useSubmissions } from './hooks/useSubmissions'
import { ensureUserId } from './userSession'

function SimplifiedHome() {
  const [userId, setUserId] = useState('')
  const { submissions, submitInput } = useSubmissions(userId)

  useEffect(() => {
    const uid = ensureUserId()
    setUserId(uid)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Header userId={userId} />

        {/* Main Content: Stories (left) + Submission Sidebar (right) */}
        <div className="mt-10 grid lg:grid-cols-[2fr_1fr] gap-6">
          {/* Left: Stories List (Main Content) */}
          <div>
            <LiveSignals />
          </div>

          {/* Right: Submission Sidebar */}
          <aside className="lg:sticky lg:top-8 h-fit space-y-6">
            {/* Submission Input */}
            <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#008080] to-[#1a2f3a] flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Submit Evidence</h2>
                  <p className="text-sm text-slate-500">Add sources to investigations</p>
                </div>
              </div>
              <SubmissionInput onSubmit={submitInput} />
            </div>

            {/* Recent Submissions */}
            {submissions.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Your Submissions</h3>
                <div className="space-y-3">
                  {submissions.slice(0, 5).map((submission) => (
                    <SubmissionResult key={submission.id} submission={submission} />
                  ))}
                </div>
                {submissions.length > 5 && (
                  <p className="text-xs text-slate-500 text-center mt-3">
                    Showing {Math.min(5, submissions.length)} of {submissions.length} submissions
                  </p>
                )}
              </div>
            )}

            {/* Info Card */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-3">How it works</h3>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex gap-3">
                  <span className="text-lg">🔍</span>
                  <div>
                    <strong>1. Submit</strong>
                    <p className="text-xs text-slate-600">Paste a news article URL</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-lg">🔗</span>
                  <div>
                    <strong>2. Match</strong>
                    <p className="text-xs text-slate-600">Find related stories</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-lg">✅</span>
                  <div>
                    <strong>3. Verify</strong>
                    <p className="text-xs text-slate-600">Collaborate on facts</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default SimplifiedHome
