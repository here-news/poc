import { useState, useEffect, useRef } from 'react'

interface ProcessingTask {
  taskId: string
  url: string
  normalizedUrl: string
  status: 'processing' | 'completed' | 'error'
  stage?: string
  preview?: {
    title: string
    description?: string
    image?: string
    domain: string
  }
  claimsCount?: number
  errorMessage?: string
  addedAt: number
}

interface Source {
  url: string
  title: string
  domain: string
  site?: string
  image_url?: string
  published_at?: string
}

interface EvidenceManagerProps {
  storyId: string
  sources: Source[]
  onRefreshStory: () => void
  expandedSources: Set<string>
  setExpandedSources: (sources: Set<string>) => void
}

export default function EvidenceManager({
  storyId,
  sources,
  onRefreshStory,
  expandedSources,
  setExpandedSources
}: EvidenceManagerProps) {
  const [addEvidenceUrl, setAddEvidenceUrl] = useState('')
  const [processingTasks, setProcessingTasks] = useState<ProcessingTask[]>([])
  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // URL normalization for duplicate detection
  const normalizeUrl = (url: string): string => {
    try {
      const parsed = new URL(url)
      // Remove trailing slashes
      parsed.pathname = parsed.pathname.replace(/\/+$/, '')
      // Remove common tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'fbclid', 'gclid']
      trackingParams.forEach(param => parsed.searchParams.delete(param))
      return parsed.toString().toLowerCase()
    } catch {
      return url.toLowerCase().replace(/\/+$/, '')
    }
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      // Clear all polling intervals
      pollingIntervalsRef.current.forEach((interval) => clearInterval(interval))
      pollingIntervalsRef.current.clear()
    }
  }, [])

  const handleAddEvidence = async () => {
    if (!addEvidenceUrl.trim() || !storyId) return

    const url = addEvidenceUrl.trim()
    const normalizedUrl = normalizeUrl(url)

    // Check if URL already exists in story sources
    const existingSource = sources.find(source => normalizeUrl(source.url) === normalizedUrl)
    if (existingSource) {
      // Highlight existing source instead of re-adding
      setExpandedSources(new Set([existingSource.url]))
      // Scroll to it with visual feedback
      setTimeout(() => {
        const card = document.querySelector(`[data-source-url="${CSS.escape(existingSource.url)}"]`)
        if (card) {
          card.classList.add('ring-4', 'ring-teal-500', 'ring-offset-2')
          setTimeout(() => card.classList.remove('ring-4', 'ring-teal-500', 'ring-offset-2'), 3000)
          card.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
        }
      }, 100)
      setAddEvidenceUrl('')
      return
    }

    // Check if URL is already being processed
    const processingTask = processingTasks.find(task => task.normalizedUrl === normalizedUrl)
    if (processingTask) {
      // Highlight the processing card
      const card = document.querySelector(`[data-task-id="${CSS.escape(processingTask.taskId)}"]`)
      if (card) {
        card.classList.add('ring-2', 'ring-blue-500')
        setTimeout(() => card.classList.remove('ring-2', 'ring-blue-500'), 2000)
        card.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      setAddEvidenceUrl('')
      return
    }

    // Submit URL to backend
    try {
      const response = await fetch(`/api/story/${storyId}/add-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Add evidence error:', result)
        alert(`Failed to add evidence: ${result.error || result.detail || result.message || 'Unknown error'}`)
        return
      }

      if (result.task_id) {
        // Add task to processing list immediately
        setProcessingTasks(prev => [...prev, {
          taskId: result.task_id,
          url,
          normalizedUrl,
          status: 'processing',
          stage: 'preview',
          addedAt: Date.now()
        }])

        // Clear input for next submission
        setAddEvidenceUrl('')

        // Start polling this task
        startPollingTask(result.task_id)
      } else {
        console.error('Unexpected result:', result)
        alert('Unexpected response from server')
      }
    } catch (err) {
      console.error('Error adding evidence:', err)
      alert(`Network error: ${err instanceof Error ? err.message : 'Please check your connection'}`)
    }
  }

  const startPollingTask = (taskId: string) => {
    // Clear existing interval for this task if any
    const existingInterval = pollingIntervalsRef.current.get(taskId)
    if (existingInterval) {
      clearInterval(existingInterval)
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/task/${taskId}`)
        const task = await response.json()

        if (!response.ok) {
          // Stop polling and mark as error
          const interval = pollingIntervalsRef.current.get(taskId)
          if (interval) {
            clearInterval(interval)
            pollingIntervalsRef.current.delete(taskId)
          }
          setProcessingTasks(prev => prev.map(t =>
            t.taskId === taskId
              ? { ...t, status: 'error', errorMessage: 'Failed to check extraction status' }
              : t
          ))
          return
        }

        // Update task state with current progress
        setProcessingTasks(prev => prev.map(t => {
          if (t.taskId !== taskId) return t

          return {
            ...t,
            stage: task.current_stage || t.stage,
            preview: task.preview_meta ? {
              title: task.preview_meta.title,
              description: task.preview_meta.description,
              image: task.preview_meta.thumbnail_url,
              domain: task.preview_meta.site_name || new URL(task.url).hostname
            } : t.preview
          }
        }))

        // Handle completion (or stuck tasks with completed_at)
        const isCompleted = task.status === 'completed' ||
                           (task.completed_at && task.status === 'processing')

        if (isCompleted) {
          const interval = pollingIntervalsRef.current.get(taskId)
          if (interval) {
            clearInterval(interval)
            pollingIntervalsRef.current.delete(taskId)
          }

          console.log('Task completed:', task)

          // Check if extraction succeeded
          const claimsCount = task.semantic_data?.claims?.length || 0
          const isReadable = task.result?.is_readable !== false
          const hasContent = task.token_costs?.total > 0
          const semantizationFailed = task.current_stage === 'semantization' &&
                                     task.token_costs?.semantization === 0 &&
                                     task.completed_at

          if (claimsCount === 0) {
            // Determine specific failure reason
            let reason = 'Unable to extract content'
            if (semantizationFailed) {
              reason = 'Semantization failed - extracted content but no claims generated'
            } else if (task.result?.block_detection) {
              reason = 'Content protected/blocked'
            } else if (!isReadable) {
              reason = 'Article is not readable'
            } else if (!hasContent) {
              reason = 'No content extracted'
            }

            setProcessingTasks(prev => prev.map(t =>
              t.taskId === taskId
                ? { ...t, status: 'error', errorMessage: reason }
                : t
            ))
          } else {
            // Success - mark completed with claim count
            setProcessingTasks(prev => prev.map(t =>
              t.taskId === taskId
                ? { ...t, status: 'completed', claimsCount }
                : t
            ))

            // Refresh builder data after 2 seconds
            setTimeout(() => {
              console.log('Refreshing builder data...')
              onRefreshStory()
              // Remove from processing tasks after 3 seconds
              setTimeout(() => {
                setProcessingTasks(prev => prev.filter(t => t.taskId !== taskId))
              }, 3000)
            }, 2000)
          }
        } else if (task.status === 'failed') {
          const interval = pollingIntervalsRef.current.get(taskId)
          if (interval) {
            clearInterval(interval)
            pollingIntervalsRef.current.delete(taskId)
          }
          setProcessingTasks(prev => prev.map(t =>
            t.taskId === taskId
              ? { ...t, status: 'error', errorMessage: task.error || 'Extraction failed' }
              : t
          ))
        }
      } catch (err) {
        console.error('Polling error for task:', taskId, err)
        // Stop polling on network error
        const interval = pollingIntervalsRef.current.get(taskId)
        if (interval) {
          clearInterval(interval)
          pollingIntervalsRef.current.delete(taskId)
        }
        setProcessingTasks(prev => prev.map(t =>
          t.taskId === taskId
            ? { ...t, status: 'error', errorMessage: 'Lost connection' }
            : t
        ))
      }
    }, 3000) // Poll every 3 seconds

    // Store interval for cleanup
    pollingIntervalsRef.current.set(taskId, interval)
  }

  return (
    <div>
      {/* Add Evidence Input */}
      <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-teal-700 font-bold">📎</span>
          <p className="text-sm font-semibold text-teal-900">Add new evidence source</p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={addEvidenceUrl}
            onChange={(e) => setAddEvidenceUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddEvidence()
              }
            }}
            placeholder="Paste article URL (e.g., https://example.com/article)..."
            className="flex-1 px-4 py-2.5 border border-teal-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={handleAddEvidence}
            disabled={!addEvidenceUrl.trim()}
            className={`px-6 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm ${
              !addEvidenceUrl.trim()
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            Add
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          💡 Paste multiple URLs one at a time - they'll process simultaneously
        </p>
      </div>

      {/* Processing Tasks - Show temp cards */}
      {processingTasks.length > 0 && (
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-semibold text-slate-700">Processing ({processingTasks.length})</h3>
          {processingTasks.map(task => (
            <div
              key={task.taskId}
              data-task-id={task.taskId}
              className={`border-2 rounded-lg p-4 transition-all ${
                task.status === 'processing' ? 'border-blue-300 bg-blue-50/50' :
                task.status === 'completed' ? 'border-green-300 bg-green-50/50' :
                'border-red-300 bg-red-50/50'
              }`}
            >
              <div className="flex items-start gap-3">
                {task.preview?.image && (
                  <img
                    src={task.preview.image}
                    alt={task.preview.title}
                    className="w-16 h-16 object-cover rounded flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {task.status === 'processing' && (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                    )}
                    {task.status === 'completed' && (
                      <div className="text-green-600 flex-shrink-0">✓</div>
                    )}
                    {task.status === 'error' && (
                      <div className="text-red-600 flex-shrink-0">✗</div>
                    )}
                    <div className="text-xs font-semibold text-blue-600">
                      {task.preview?.domain || new URL(task.url).hostname}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-900 line-clamp-2 mb-1">
                    {task.preview?.title || 'Loading...'}
                  </div>
                  <div className="text-xs text-slate-600">
                    {task.status === 'processing' && task.stage && (
                      <span>{task.stage}...</span>
                    )}
                    {task.status === 'completed' && task.claimsCount !== undefined && (
                      <span className="text-green-700 font-medium">
                        ✓ Extracted {task.claimsCount} claims
                      </span>
                    )}
                    {task.status === 'error' && (
                      <span className="text-red-700">{task.errorMessage || 'Failed'}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    {task.taskId}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
