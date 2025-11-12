import React, { useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle, DollarSign, FileText, AlertCircle } from 'lucide-react'

const CreateQuestWizard = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [evidenceType, setEvidenceType] = useState<'url' | 'text' | 'skip'>('skip')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceText, setEvidenceText] = useState('')
  const [bountyAmount, setBountyAmount] = useState<number>(0)

  const canProceedStep1 = title.trim().length >= 10 && description.trim().length >= 30
  const canProceedStep2 =
    evidenceType === 'skip' ||
    (evidenceType === 'url' && evidenceUrl.trim().length > 0) ||
    (evidenceType === 'text' && evidenceText.trim().length >= 50)

  const handleNext = () => {
    if (currentStep === 1 && canProceedStep1) {
      setCurrentStep(2)
    } else if (currentStep === 2 && canProceedStep2) {
      setCurrentStep(3)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setError(null)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        initial_bounty: bountyAmount,
        initial_evidence_url: evidenceType === 'url' ? evidenceUrl.trim() : null,
        initial_evidence_text: evidenceType === 'text' ? evidenceText.trim() : null,
        user_id: 'user-current' // TODO: Get from auth session
      }

      const response = await fetch('/jimmylai/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Failed to create quest')
      }

      const data = await response.json()

      // Redirect to the new quest page
      window.location.href = `/quest/${data.quest.id}`
    } catch (err) {
      console.error('Failed to create quest:', err)
      setError('Failed to create quest. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Create New Clarity Quest</h1>
              <p className="text-slate-600 mt-1">Launch an investigation into an unresolved question</p>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <StepIndicator number={1} label="Quest Question" active={currentStep === 1} completed={currentStep > 1} />
          <div className="flex-1 h-1 bg-slate-200 mx-2">
            <div className={`h-full transition-all ${currentStep > 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
          </div>
          <StepIndicator number={2} label="Initial Evidence" active={currentStep === 2} completed={currentStep > 2} />
          <div className="flex-1 h-1 bg-slate-200 mx-2">
            <div className={`h-full transition-all ${currentStep > 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
          </div>
          <StepIndicator number={3} label="Bounty" active={currentStep === 3} completed={false} />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Step 1: Quest Question */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">What question needs investigation?</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Quest Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Did Jimmy Lai collude with foreign forces?"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={200}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {title.length}/200 characters (minimum 10)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Quest Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide context about this question. What is the background? Why does this matter? What are the competing claims?"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={8}
                  maxLength={2000}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {description.length}/2000 characters (minimum 30)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> Good quests are specific, verifiable, and have competing explanations.
                  Avoid overly broad or opinion-based questions.
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={handleNext}
                disabled={!canProceedStep1}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Add Evidence
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Initial Evidence */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">Add initial evidence (optional)</h2>
            </div>

            <p className="text-sm text-slate-600 mb-6">
              Providing initial evidence helps the AI generate better hypotheses. You can skip this and add evidence later.
            </p>

            <div className="space-y-4 mb-6">
              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 border-slate-200">
                <input
                  type="radio"
                  name="evidenceType"
                  checked={evidenceType === 'url'}
                  onChange={() => setEvidenceType('url')}
                  className="w-5 h-5 text-blue-600"
                />
                <div>
                  <div className="font-medium text-slate-900">Link to source (URL)</div>
                  <div className="text-xs text-slate-500">News article, court document, etc.</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 border-slate-200">
                <input
                  type="radio"
                  name="evidenceType"
                  checked={evidenceType === 'text'}
                  onChange={() => setEvidenceType('text')}
                  className="w-5 h-5 text-blue-600"
                />
                <div>
                  <div className="font-medium text-slate-900">Paste text evidence</div>
                  <div className="text-xs text-slate-500">Quote, transcript, or summary</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 border-slate-200">
                <input
                  type="radio"
                  name="evidenceType"
                  checked={evidenceType === 'skip'}
                  onChange={() => setEvidenceType('skip')}
                  className="w-5 h-5 text-blue-600"
                />
                <div>
                  <div className="font-medium text-slate-900">Skip for now</div>
                  <div className="text-xs text-slate-500">Add evidence after creating the quest</div>
                </div>
              </label>
            </div>

            {evidenceType === 'url' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Source URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {evidenceType === 'text' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Evidence Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  placeholder="Paste the relevant text, quote, or summary of the evidence here..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={8}
                  maxLength={5000}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {evidenceText.length}/5000 characters (minimum 50)
                </p>
              </div>
            )}

            <div className="flex items-center justify-between mt-8">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceedStep2}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Set Bounty
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Bounty */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-slate-900">Set initial bounty (optional)</h2>
            </div>

            <p className="text-sm text-slate-600 mb-6">
              Bounties incentivize high-quality evidence contributions. You can start with $0 and add to the pool later.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Initial Bounty Amount (USD)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  value={bountyAmount}
                  onChange={(e) => setBountyAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  min="0"
                  step="10"
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xl font-bold"
                />
              </div>
            </div>

            {bountyAmount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="text-sm text-green-800 space-y-2">
                  <div className="font-bold">Bounty Distribution Preview:</div>
                  <div className="flex justify-between">
                    <span>Total pool:</span>
                    <span className="font-medium">${bountyAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contributors (90%):</span>
                    <span className="font-medium">${(bountyAmount * 0.9).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform fee (10%):</span>
                    <span className="font-medium">${(bountyAmount * 0.1).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>💡 How bounties work:</strong> When the quest converges (≥80% probability),
                90% of the pool is distributed to contributors based on their evidence quality.
                More evidence = larger bounty pool!
              </p>
            </div>

            <div className="flex items-center justify-between mt-8">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>Creating Quest...</>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Create Quest
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface StepIndicatorProps {
  number: number
  label: string
  active: boolean
  completed: boolean
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ number, label, active, completed }) => {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
          completed
            ? 'bg-green-600 text-white'
            : active
            ? 'bg-blue-600 text-white'
            : 'bg-slate-200 text-slate-500'
        }`}
      >
        {completed ? <CheckCircle className="w-5 h-5" /> : number}
      </div>
      <div className={`text-xs mt-2 font-medium ${active ? 'text-blue-600' : 'text-slate-500'}`}>
        {label}
      </div>
    </div>
  )
}

export default CreateQuestWizard
