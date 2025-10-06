import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ensureUserId,
  persistUserId,
  composeUserHeaders
} from './userSession'
import UserProfile from './UserProfile'

interface PreviewImage {
  url: string
  secure_url: string
  width: number | null
  height: number | null
}

interface Publisher {
  name: string
  favicon: string
  facebook: string
  twitter: string
}

interface Author {
  name: string
  facebook: string
  twitter: string
}

interface Metadata {
  language: string
  language_name: string
  locale: string
  publish_date: string
  section: string
  tags: string[]
  content_type: string
}

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
  language?: string
  language_confidence?: number
}

interface Preview {
  title: string
  description: string
  preview_image: PreviewImage
  url: string
  domain: string
  publisher: Publisher
  author: Author
  metadata: Metadata
  metrics: {
    word_count: number
    reading_time_minutes: number
    language_confidence: number
  }
  quality: {
    flags: string[]
    is_readable: boolean
    status: string
  }
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
  user_id?: string
}

function ResultPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const [userId, setUserId] = useState('')
  const [task, setTask] = useState<TaskResponse | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [polling, setPolling] = useState(true)
  const [error, setError] = useState('')
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleaningResult, setCleaningResult] = useState<any>(null)
  const [isSemanticizing, setIsSemanticizing] = useState(false)
  const [semanticData, setSemanticData] = useState<any>(null)

  useEffect(() => {
    const id = ensureUserId()
    setUserId(id)
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout

    const checkTaskStatus = async () => {
      try {
        const response = await fetch(`/api/task/${taskId}`, {
          headers: composeUserHeaders(userId)
        })
        const data = await response.json()

        setTask(data)

        if (data.user_id && data.user_id !== userId) {
          setUserId(data.user_id)
          persistUserId(data.user_id)
        }

        // Stop polling if completed or failed
        if (data.status === 'completed' || data.status === 'failed') {
          setPolling(false)

          // Fetch preview data when completed
          if (data.status === 'completed') {
            fetchPreview()
          }
        }
      } catch (err) {
        setError('Failed to fetch task status')
        setPolling(false)
      }
    }

    const fetchPreview = async () => {
      try {
        const response = await fetch(`/api/task/${taskId}/preview`, {
          headers: composeUserHeaders(userId)
        })
        const data = await response.json()
        setPreview(data)
      } catch (err) {
        console.error('Failed to fetch preview:', err)
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
  }, [taskId, polling, userId])

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
      // Submit cleaning job to Cloud Run
      const response = await fetch(`/api/task/${taskId}/clean`, {
        method: 'POST',
        headers: composeUserHeaders(userId)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to clean content')
        setIsCleaning(false)
        return
      }

      // Poll for cleaning completion
      let attempts = 0
      const maxAttempts = 30 // 30 seconds max
      const pollInterval = 1000 // 1 second
      const startTime = task?.result?.updated_at || Date.now()

      const pollForCompletion = async () => {
        attempts++
        const taskResponse = await fetch(`/api/task/${taskId}`, {
          headers: composeUserHeaders(userId)
        })
        const taskData = await taskResponse.json()

        if (taskData.user_id && taskData.user_id !== userId) {
          setUserId(taskData.user_id)
          persistUserId(taskData.user_id)
        }

        // Check if cleaning completed (either tokens > 0 OR content was too short)
        const cleaningDone = taskData.token_costs?.cleaning > 0 ||
                            (taskData.result?.word_count === 0 && attempts > 3) ||
                            (taskData.result?.updated_at && taskData.result.updated_at !== startTime)

        if (cleaningDone) {
          // Cleaning complete! Update UI
          setTask(taskData)
          setCleaningResult({
            is_valid: true,
            message: taskData.result?.word_count === 0 ? 'Content too short to clean' : 'Content cleaned successfully',
            token_usage: taskData.token_costs.cleaning
          })
          setIsCleaning(false)
        } else if (attempts >= maxAttempts) {
          setError('Cleaning timed out - please refresh the page')
          setIsCleaning(false)
        } else {
          // Keep polling
          setTimeout(pollForCompletion, pollInterval)
        }
      }

      // Start polling after a brief delay
      setTimeout(pollForCompletion, 1000)

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
      // Submit semantization job to Cloud Run
      const response = await fetch(`/api/task/${taskId}/semantize`, {
        method: 'POST',
        headers: composeUserHeaders(userId)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to semantize content')
        setIsSemanticizing(false)
        return
      }

      // Poll for semantization completion
      let attempts = 0
      const maxAttempts = 60 // 60 seconds max (semantization takes longer)
      const pollInterval = 1000 // 1 second

      const pollForCompletion = async () => {
        attempts++
        const taskResponse = await fetch(`/api/task/${taskId}`, {
          headers: composeUserHeaders(userId)
        })
        const taskData = await taskResponse.json()

        // Check if semantization completed
        const semantizationDone = (taskData.token_costs?.semantization > 0 && taskData.semantic_data) ||
                                   taskData.status === 'completed'

        if (semantizationDone) {
          // Semantization complete! Update UI
          setTask(taskData)
          if (taskData.user_id && taskData.user_id !== userId) {
            setUserId(taskData.user_id)
            persistUserId(taskData.user_id)
          }
          if (taskData.semantic_data) {
            setSemanticData(taskData.semantic_data)
          }
          setIsSemanticizing(false)
        } else if (attempts >= maxAttempts) {
          setError('Semantization timed out - please refresh the page')
          setIsSemanticizing(false)
        } else {
          // Keep polling
          setTimeout(pollForCompletion, pollInterval)
        }
      }

      // Start polling after a brief delay
      setTimeout(pollForCompletion, 2000)

    } catch (err) {
      setError('Failed to semantize content')
      setIsSemanticizing(false)
    }
  }

  const renderTokenUsage = () => {
    if (!task?.token_costs || task.token_costs.total <= 0) {
      return null
    }

    const { extraction, cleaning, semantization, total } = task.token_costs

    return (
      <div className="mt-2 w-full max-w-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-700">Token Usage</span>
          <span className="font-bold text-blue-700">Total: {total.toLocaleString()}</span>
        </div>
        <div className="flex flex-wrap gap-3 justify-end text-xs">
          {extraction > 0 && (
            <div className="text-right">
              <div className="text-gray-500">Extraction</div>
              <div className="font-semibold text-gray-700">{extraction.toLocaleString()}</div>
            </div>
          )}
          {cleaning > 0 && (
            <div className="text-right">
              <div className="text-green-600">Cleaning</div>
              <div className="font-semibold text-green-700">{cleaning.toLocaleString()}</div>
            </div>
          )}
          {semantization > 0 && (
            <div className="text-right">
              <div className="text-purple-600">Semantization</div>
              <div className="font-semibold text-purple-700">{semantization.toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
          >
            <span className="text-lg">←</span>
            <span>Back to Home</span>
          </button>
          <UserProfile userId={userId} />
        </div>

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
            {/* Preview Image */}
            {preview && preview.preview_image && preview.preview_image.url && (
              <div className="mb-6 -mx-8 -mt-8">
                <img
                  src={preview.preview_image.url}
                  alt={preview.title}
                  className="w-full h-64 object-cover rounded-t-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}

            {/* Publisher Header with Favicon */}
            {preview && (
              <div className="mb-4 pb-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={preview.publisher.favicon}
                    alt=""
                    className="w-6 h-6 rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div>
                    <div className="font-semibold text-gray-800">{preview.publisher.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      {preview.publisher.facebook && (
                        <a href={preview.publisher.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                          FB
                        </a>
                      )}
                      {preview.publisher.twitter && (
                        <a href={`https://twitter.com/${preview.publisher.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                          {preview.publisher.twitter}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Language & Section Badges */}
                <div className="flex gap-2">
                  {preview.metadata.language && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium">
                      🌐 {preview.metadata.language_name}
                    </span>
                  )}
                  {preview.metadata.section && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full font-medium">
                      📂 {preview.metadata.section}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="mb-6 flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{task.result.title || 'Untitled'}</h1>

                {/* Tags */}
                {preview && preview.metadata.tags && preview.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {preview.metadata.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-sm text-gray-500 space-y-1">
                  <p>Domain: {task.result.domain}</p>
                  <p>URL: <a href={task.result.canonical_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{task.result.canonical_url}</a></p>
                  {task.result.author && <p>Author: {task.result.author}</p>}
                  {task.result.publish_date && <p>Published: {task.result.publish_date}</p>}
                  <p>Word Count: {task.result.word_count} words ({task.result.reading_time_minutes} min read)</p>
                  <p>Extracted in: {task.result.processing_time_ms}ms</p>
                  {preview && preview.metadata.language && preview.metrics.language_confidence && (
                    <p>Language: {preview.metadata.language_name} ({Math.round(preview.metrics.language_confidence * 100)}% confidence)</p>
                  )}
                </div>
              </div>
              {!cleaningResult ? (
                <div className="ml-4 flex flex-col items-end gap-2">
                  <button
                    onClick={handleClean}
                    disabled={isCleaning}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:bg-gray-400"
                  >
                    {isCleaning ? 'Cleaning...' : 'Clean'}
                  </button>
                  {renderTokenUsage()}
                </div>
              ) : (
                <div className="ml-4 flex flex-col items-end gap-2">
                  <button
                    onClick={handleSemantize}
                    disabled={isSemanticizing}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:bg-gray-400"
                  >
                    {isSemanticizing ? 'Semantizing...' : 'Semantize'}
                  </button>
                  {renderTokenUsage()}
                </div>
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
