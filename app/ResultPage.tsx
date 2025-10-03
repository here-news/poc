import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

interface ExtractionResult {
  url: string
  canonical_url: string
  domain: string
  is_readable: boolean
  status: string
  title: string
  content_text: string
  meta_description: string
  author: string
  publish_date: string
  word_count: number
  reading_time_minutes: number
  extraction_timestamp: string
  processing_time_ms: number
  error_message: string
}

interface TokenCosts {
  extraction: number
  cleaning: number
  semantization: number
  total: number
}

interface TaskResponse {
  task_id: string
  url: string
  status: string
  created_at: string
  completed_at: string | null
  token_costs?: TokenCosts
  result?: ExtractionResult
  error?: string
}

function ResultPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<TaskResponse | null>(null)
  const [polling, setPolling] = useState(true)
  const [error, setError] = useState('')
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleaningResult, setCleaningResult] = useState<any>(null)
  const [isSemanticizing, setIsSemanticizing] = useState(false)
  const [semanticData, setSemanticData] = useState<any>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout

    const checkTaskStatus = async () => {
      try {
        const response = await fetch(`/api/task/${taskId}`)
        const data = await response.json()

        setTask(data)

        // Stop polling if completed or failed
        if (data.status === 'completed' || data.status === 'failed') {
          setPolling(false)
        }
      } catch (err) {
        setError('Failed to fetch task status')
        setPolling(false)
      }
    }

    // Initial fetch
    checkTaskStatus()

    // Poll every 2 seconds while processing
    if (polling) {
      interval = setInterval(checkTaskStatus, 2000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [taskId, polling])

  const formatContent = (content: string) => {
    if (!content) return ''
    return content.split('\n\n').map((para, idx) => (
      <p key={idx} className="mb-4">{para}</p>
    ))
  }

  const handleClean = async () => {
    if (!taskId) return

    setIsCleaning(true)
    setCleaningResult(null)
    setError('')

    try {
      const response = await fetch(`/api/task/${taskId}/clean`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to clean content')
        setIsCleaning(false)
        return
      }

      setCleaningResult(data)

      // If cleaning was successful, update the task with cleaned data
      if (data.is_valid && data.result && task) {
        setTask({
          ...task,
          result: data.result
        })
      }

      setIsCleaning(false)
    } catch (err) {
      setError('Failed to clean content')
      setIsCleaning(false)
    }
  }

  const handleSemantize = async () => {
    if (!taskId) return

    setIsSemanticizing(true)
    setSemanticData(null)
    setError('')

    try {
      const response = await fetch(`/api/task/${taskId}/semantize`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to semantize content')
        setIsSemanticizing(false)
        return
      }

      setSemanticData(data)
      setIsSemanticizing(false)
    } catch (err) {
      setError('Failed to semantize content')
      setIsSemanticizing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-4 text-blue-500 hover:text-blue-600 font-semibold"
        >
          ← Back to Home
        </button>

        {/* Token Costs Banner */}
        {task && task.token_costs && task.token_costs.total > 0 && (
          <div className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🪙</span>
                <span className="font-semibold text-gray-700">Token Usage</span>
              </div>
              <div className="flex gap-6 text-sm">
                {task.token_costs.extraction > 0 && (
                  <div className="text-center">
                    <div className="text-gray-500 text-xs">Extraction</div>
                    <div className="font-semibold text-gray-700">{task.token_costs.extraction.toLocaleString()}</div>
                  </div>
                )}
                {task.token_costs.cleaning > 0 && (
                  <div className="text-center">
                    <div className="text-green-600 text-xs">Cleaning</div>
                    <div className="font-semibold text-green-700">{task.token_costs.cleaning.toLocaleString()}</div>
                  </div>
                )}
                {task.token_costs.semantization > 0 && (
                  <div className="text-center">
                    <div className="text-purple-600 text-xs">Semantization</div>
                    <div className="font-semibold text-purple-700">{task.token_costs.semantization.toLocaleString()}</div>
                  </div>
                )}
                <div className="text-center border-l-2 border-gray-300 pl-6">
                  <div className="text-blue-600 text-xs font-semibold">TOTAL</div>
                  <div className="font-bold text-blue-700 text-lg">{task.token_costs.total.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!task && !error && (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading task...</p>
          </div>
        )}

        {task && task.status === 'pending' && (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Task pending...</p>
            <p className="text-sm text-gray-500 mt-2">URL: {task.url}</p>
          </div>
        )}

        {task && task.status === 'processing' && (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Extracting content...</p>
            <p className="text-sm text-gray-500 mt-2">URL: {task.url}</p>
          </div>
        )}

        {task && task.status === 'failed' && (
          <div className="bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Extraction Failed</h2>
            <p className="text-gray-600 mb-4">URL: {task.url}</p>
            <div className="bg-red-50 p-4 rounded border border-red-200">
              <p className="text-red-700">{task.error || 'Unknown error'}</p>
            </div>
          </div>
        )}

        {task && task.status === 'completed' && task.result && (
          <div className="bg-white p-8 rounded-lg shadow">
            <div className="mb-6 flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{task.result.title || 'Untitled'}</h1>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Domain: {task.result.domain}</p>
                  <p>URL: <a href={task.result.canonical_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{task.result.canonical_url}</a></p>
                  {task.result.author && <p>Author: {task.result.author}</p>}
                  {task.result.publish_date && <p>Published: {task.result.publish_date}</p>}
                  <p>Word Count: {task.result.word_count} words ({task.result.reading_time_minutes} min read)</p>
                  <p>Extracted in: {task.result.processing_time_ms}ms</p>
                </div>
              </div>
              {!cleaningResult ? (
                <button
                  onClick={handleClean}
                  disabled={isCleaning}
                  className="ml-4 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:bg-gray-400"
                >
                  {isCleaning ? 'Cleaning...' : 'Clean'}
                </button>
              ) : (
                <button
                  onClick={handleSemantize}
                  disabled={isSemanticizing}
                  className="ml-4 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:bg-gray-400"
                >
                  {isSemanticizing ? 'Semantizing...' : 'Semantize'}
                </button>
              )}
            </div>

            {cleaningResult && (
              <div className="mb-6 p-4 rounded border bg-green-50 border-green-200">
                <div>
                  <p className="text-green-700 font-semibold mb-2">✅ Content validated and cleaned</p>

                  {/* Display quality flags if any */}
                  {cleaningResult.flags && cleaningResult.flags.length > 0 && (
                    <div className="mb-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
                      <p className="text-yellow-800 font-semibold text-sm mb-1">⚠️ Content Quality Flags:</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {cleaningResult.flags.map((flag: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full border border-yellow-300">
                            {flag.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {cleaningResult.cleaned_data && Object.keys(cleaningResult.cleaned_data).length > 0 && (
                    <div className="text-sm text-gray-700 mt-2">
                      <p className="font-semibold">Cleaned metadata:</p>
                      <ul className="list-disc list-inside mt-1">
                        {cleaningResult.cleaned_data.title && <li>Title updated</li>}
                        {cleaningResult.cleaned_data.author && <li>Author: {cleaningResult.cleaned_data.author}</li>}
                        {cleaningResult.cleaned_data.publish_date && <li>Date: {cleaningResult.cleaned_data.publish_date}</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {semanticData && semanticData.semantic_data && (
              <div className="mb-6 p-4 rounded border bg-purple-50 border-purple-200">
                <p className="text-purple-700 font-semibold mb-4">🧠 Semantic Analysis Complete</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Summary:</p>
                    <p className="text-gray-600 italic">{semanticData.semantic_data.gist}</p>
                  </div>

                  {semanticData.semantic_data.entities && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      {semanticData.semantic_data.entities.people?.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700">People:</p>
                          <ul className="list-disc list-inside text-gray-600">
                            {semanticData.semantic_data.entities.people.map((p: string, i: number) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {semanticData.semantic_data.entities.organizations?.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700">Organizations:</p>
                          <ul className="list-disc list-inside text-gray-600">
                            {semanticData.semantic_data.entities.organizations.map((o: string, i: number) => (
                              <li key={i}>{o}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {semanticData.semantic_data.entities.locations?.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700">Locations:</p>
                          <ul className="list-disc list-inside text-gray-600">
                            {semanticData.semantic_data.entities.locations.map((l: string, i: number) => (
                              <li key={i}>{l}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="font-semibold text-gray-700 mb-2">✅ Admitted Claims ({semanticData.claims_count}):</p>
                    <div className="space-y-3">
                      {semanticData.semantic_data.claims?.map((claim: any, i: number) => (
                        <div key={i} className="bg-white p-3 rounded border border-green-200">
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-gray-800 flex-1">{claim.text}</p>
                            {claim.modality && (
                              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                                claim.modality === 'official_fact' ? 'bg-blue-100 text-blue-700' :
                                claim.modality === 'reported_claim' ? 'bg-green-100 text-green-700' :
                                claim.modality === 'allegation' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {claim.modality.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-4 text-xs text-gray-500">
                            {claim.who && claim.who.length > 0 && (
                              <span>👤 {claim.who.join(', ')}</span>
                            )}
                            {claim.where && claim.where.length > 0 && (
                              <span>📍 {claim.where.join(', ')}</span>
                            )}
                            {claim.when && claim.when.date && (
                              <span>📅 {claim.when.date}</span>
                            )}
                            {claim.evidence_references && claim.evidence_references.length > 0 && (
                              <span>📄 {claim.evidence_references.join(', ')}</span>
                            )}
                            <span>🎯 {Math.round(claim.confidence * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {semanticData.semantic_data.excluded_claims && semanticData.semantic_data.excluded_claims.length > 0 && (
                    <div className="mt-6">
                      <p className="font-semibold text-yellow-700 mb-2">⚠️ Excluded Claims ({semanticData.excluded_count || semanticData.semantic_data.excluded_claims.length}):</p>
                      <p className="text-xs text-gray-600 mb-3">These claims did not pass premise filters and require manual review before admission.</p>
                      <div className="space-y-3">
                        {semanticData.semantic_data.excluded_claims.map((claim: any, i: number) => (
                          <div key={i} className="bg-yellow-50 p-3 rounded border border-yellow-300">
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-gray-800 flex-1">{claim.text}</p>
                              {claim.modality && (
                                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                                  claim.modality === 'official_fact' ? 'bg-blue-100 text-blue-700' :
                                  claim.modality === 'reported_claim' ? 'bg-green-100 text-green-700' :
                                  claim.modality === 'allegation' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {claim.modality.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-4 text-xs text-gray-500 mb-2">
                              {claim.who && claim.who.length > 0 && (
                                <span>👤 {claim.who.join(', ')}</span>
                              )}
                              {claim.where && claim.where.length > 0 && (
                                <span>📍 {claim.where.join(', ')}</span>
                              )}
                              {claim.when && claim.when.date && (
                                <span>📅 {claim.when.date}</span>
                              )}
                              {claim.evidence_references && claim.evidence_references.length > 0 && (
                                <span>📄 {claim.evidence_references.join(', ')}</span>
                              )}
                              <span>🎯 {Math.round(claim.confidence * 100)}%</span>
                            </div>
                            <div className="mt-2 p-2 bg-yellow-100 rounded text-xs">
                              <span className="font-semibold text-yellow-900">Exclusion: </span>
                              <span className="text-yellow-800">{claim.excluded_reason}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {task.result.meta_description && (
              <div className="mb-6 p-4 bg-gray-50 rounded border-l-4 border-blue-500">
                <p className="text-gray-700 italic">{task.result.meta_description}</p>
              </div>
            )}

            <div className="prose max-w-none">
              {task.result.content_text ? (
                <div className="text-gray-800 leading-relaxed">
                  {formatContent(task.result.content_text)}
                </div>
              ) : (
                <p className="text-gray-500">No content extracted</p>
              )}
            </div>

            {!task.result.is_readable && (
              <div className="mt-6 bg-yellow-50 p-4 rounded border border-yellow-200">
                <p className="text-yellow-700">⚠️ Content might not be fully readable</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultPage
