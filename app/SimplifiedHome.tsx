import React, { useEffect, useState } from 'react'
import Header from './components/layout/Header'
import LiveSignals from './components/layout/LiveSignals'
import SubmissionInput from './components/SubmissionInput'
import SubmissionResult from './components/SubmissionResult'
import HowItWorksCycle from './components/HowItWorksCycle'
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <Header userId={userId} />

        {/* Main Content: Stories (left) + Submission Sidebar (right) */}
        <div className="mt-6 sm:mt-10 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 sm:gap-6">
          {/* Left: Stories List (Main Content) */}
          <div className="order-2 lg:order-1">
            <LiveSignals />
          </div>

          {/* Right: Submission Sidebar */}
          <aside className="order-1 lg:order-2 lg:sticky lg:top-8 h-fit space-y-4 sm:space-y-6">
            {/* Submission Input */}
            <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-2xl p-4 sm:p-6 shadow-sm">
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
              <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-2xl p-4 sm:p-6 shadow-sm">
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

            {/* How it works - Animated Cycle */}
            <HowItWorksCycle />
          </aside>
        </div>
      </div>
    </div>
  )
}

export default SimplifiedHome
