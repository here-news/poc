import { useState, useEffect, useRef, useMemo } from 'react'

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
  onRefreshStory: () => Promise<void> | void
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
  const [isSubmitting, setIsSubmitting] = useState(false) // Track submission state
  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const storageKey = `processingTasks_${storyId}`
  const isInitialized = useRef(false) // Track if we've loaded from storage

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

  // Load processing tasks from localStorage on mount or when story changes
  useEffect(() => {
    // Reset initialization flag when story changes
    isInitialized.current = false
    hasResumed.current = false

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const tasks: ProcessingTask[] = JSON.parse(stored)
        // Only restore tasks that were added in the last 10 minutes
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000
        const recentTasks = tasks.filter(t => t.addedAt > tenMinutesAgo)

        if (recentTasks.length > 0) {
          console.log(`Restoring ${recentTasks.length} processing tasks from localStorage`)
          setProcessingTasks(recentTasks)
        } else {
          // Clean up old storage
          localStorage.removeItem(storageKey)
        }
      }
    } catch (err) {
      console.error('Failed to restore processing tasks:', err)
    } finally {
      // Mark as initialized regardless of success/failure
      isInitialized.current = true
    }
  }, [storyId, storageKey])

  // Resume polling for restored tasks (runs after functions are defined)
  const hasResumed = useRef(false)
  useEffect(() => {
    if (!hasResumed.current && processingTasks.length > 0) {
      hasResumed.current = true
      // Use setTimeout to ensure startPollingTask is fully defined
      setTimeout(() => {
        processingTasks.forEach(task => {
          // Only start polling if not already polling and task is still processing
          if (task.status === 'processing' && !pollingIntervalsRef.current.has(task.taskId)) {
            // Check if source already exists before resuming polling
            const taskUrl = task.url
            const urlWithoutProtocol = taskUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
            const sourceAlreadyExists = sources.some(s => {
              const sourceUrlNormalized = s.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
              return sourceUrlNormalized === urlWithoutProtocol || s.url === taskUrl
            })

            if (sourceAlreadyExists) {
              console.log(`🚫 Skipping polling for task ${task.taskId} - source already exists in story`)
              // Mark as completed immediately without polling
              setProcessingTasks(prev => prev.map(t =>
                t.taskId === task.taskId
                  ? { ...t, status: 'completed', claimsCount: 1 }
                  : t
              ))
              // Remove after short delay
              setTimeout(() => {
                console.log(`🗑️ Auto-removing restored task ${task.taskId} (source exists)`)
                setProcessingTasks(prev => prev.filter(t => t.taskId !== task.taskId))
              }, 2000)
            } else {
              console.log(`▶️ Resuming polling for task ${task.taskId}`)
              startPollingTask(task.taskId)
            }
          }
        })
      }, 100)
    }
  }, [processingTasks.length, sources])

  // Save processing tasks to localStorage whenever they change
  useEffect(() => {
    // Only save after initial load to prevent clearing storage on mount
    if (!isInitialized.current) {
      return
    }

    if (processingTasks.length > 0) {
      try {
        console.log(`Saving ${processingTasks.length} tasks to localStorage`)
        localStorage.setItem(storageKey, JSON.stringify(processingTasks))
      } catch (err) {
        console.error('Failed to save processing tasks:', err)
      }
    } else {
      // Only remove from storage when explicitly emptied (after initialization)
      console.log('Removing tasks from localStorage (array is empty)')
      localStorage.removeItem(storageKey)
    }
  }, [processingTasks, storageKey])

  // Watch for sources changes and auto-complete any tasks that are now in the story
  // ONLY trigger on sources changes or when task list changes (not stage updates)
  const processingTaskIds = useMemo(() =>
    processingTasks.map(t => `${t.taskId}:${t.status}`).join(','),
    [processingTasks.map(t => `${t.taskId}:${t.status}`).join(',')]
  )

  useEffect(() => {
    if (processingTasks.length === 0 || sources.length === 0) return

    processingTasks.forEach(task => {
      if (task.status !== 'processing') return

      // DON'T auto-complete if task is actively in a processing stage
      const activeStages = ['preview', 'extraction', 'cleaning', 'resolution', 'semantization']
      const isActivelyProcessing = activeStages.includes(task.stage || '')

      if (isActivelyProcessing) {
        // Task is still being processed, let polling handle completion
        return
      }

      // Only auto-complete if task has been idle for a bit (not freshly added)
      const taskAge = Date.now() - (task.addedAt || 0)
      if (taskAge < 5000) {
        // Task is too new, give it time to start processing
        return
      }

      const taskUrl = task.url
      const urlWithoutProtocol = taskUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
      const sourceExists = sources.some(s => {
        const sourceUrlNormalized = s.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
        return sourceUrlNormalized === urlWithoutProtocol || s.url === taskUrl
      })

      if (sourceExists) {
        console.log(`🎯 Source ${taskUrl} detected in sources list (idle task) - auto-completing task ${task.taskId}`)
        // Stop polling
        const interval = pollingIntervalsRef.current.get(task.taskId)
        if (interval) {
          clearInterval(interval)
          pollingIntervalsRef.current.delete(task.taskId)
        }

        // Mark as completed
        setProcessingTasks(prev => prev.map(t =>
          t.taskId === task.taskId
            ? { ...t, status: 'completed', claimsCount: 1 }
            : t
        ))

        // Remove after short delay
        setTimeout(() => {
          console.log(`🗑️ Removing auto-completed task ${task.taskId}`)
          setProcessingTasks(prev => prev.filter(t => t.taskId !== task.taskId))
        }, 2000)
      }
    })
  }, [sources, processingTaskIds])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      // Clear all polling intervals
      pollingIntervalsRef.current.forEach((interval) => clearInterval(interval))
      pollingIntervalsRef.current.clear()
    }
  }, [])

  const handleAddEvidence = async () => {
    if (!addEvidenceUrl.trim() || !storyId || isSubmitting) return

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

    // Create temporary task ID for optimistic UI
    const tempTaskId = `temp_${Date.now()}`

    // Set submitting state and add optimistic task immediately
    setIsSubmitting(true)
    setAddEvidenceUrl('') // Clear input immediately for better UX

    // Add optimistic task to UI immediately
    console.log(`⚡ Adding optimistic task ${tempTaskId} for URL: ${url}`)
    setProcessingTasks(prev => {
      const optimisticTask = {
        taskId: tempTaskId,
        url,
        normalizedUrl,
        status: 'processing' as const,
        stage: 'preview',
        addedAt: Date.now()
      }
      return [...prev, optimisticTask]
    })

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
        // Remove optimistic task on error
        setProcessingTasks(prev => prev.filter(t => t.taskId !== tempTaskId))
        alert(`Failed to add evidence: ${result.error || result.detail || result.message || 'Unknown error'}`)
        setAddEvidenceUrl(url) // Restore URL for retry
        return
      }

      if (result.task_id) {
        // Replace optimistic task with real task
        console.log(`✅ Replacing temp task ${tempTaskId} with real task ${result.task_id}`)
        setProcessingTasks(prev => prev.map(task =>
          task.taskId === tempTaskId
            ? { ...task, taskId: result.task_id }
            : task
        ))

        // Start polling the real task
        startPollingTask(result.task_id)
      } else {
        console.error('Unexpected result:', result)
        setProcessingTasks(prev => prev.filter(t => t.taskId !== tempTaskId))
        alert('Unexpected response from server')
        setAddEvidenceUrl(url) // Restore URL for retry
      }
    } catch (err) {
      console.error('Error adding evidence:', err)
      // Remove optimistic task on error
      setProcessingTasks(prev => prev.filter(t => t.taskId !== tempTaskId))
      alert(`Network error: ${err instanceof Error ? err.message : 'Please check your connection'}`)
      setAddEvidenceUrl(url) // Restore URL for retry
    } finally {
      setIsSubmitting(false)
    }
  }

  const startPollingTask = (taskId: string) => {
    // Clear existing interval for this task if any
    const existingInterval = pollingIntervalsRef.current.get(taskId)
    if (existingInterval) {
      clearInterval(existingInterval)
    }

    // Track poll count for exponential backoff
    let pollCount = 0
    const maxInterval = 15000 // Max 15 seconds between polls

    const poll = async () => {
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

        // Update task state with current progress - ONLY if something changed
        setProcessingTasks(prev => prev.map(t => {
          if (t.taskId !== taskId) return t

          const newStage = task.current_stage || t.stage
          const newPreview = task.preview_meta ? {
            title: task.preview_meta.title,
            description: task.preview_meta.description,
            image: task.preview_meta.thumbnail_url,
            domain: task.preview_meta.site_name || new URL(task.url).hostname
          } : t.preview

          // Only update if stage or preview actually changed
          if (newStage === t.stage && JSON.stringify(newPreview) === JSON.stringify(t.preview)) {
            return t // No change, return same object to prevent re-render
          }

          return {
            ...t,
            stage: newStage,
            preview: newPreview
          }
        }))

        // Check if task is still actively processing ANY stage
        const isActivelyProcessing = task.status === 'processing' && !task.completed_at

        // Processing stages that should keep polling (not ready for verification yet)
        const activeStages = ['preview', 'extraction', 'cleaning', 'resolution', 'semantization']
        const isInActiveStage = activeStages.includes(task.current_stage || '')

        // IMPORTANT: Check if source already exists in story (might be completed but backend didn't update status)
        const taskUrl = task.url
        const urlWithoutProtocol = taskUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
        const sourceAlreadyInStory = sources.some(s => {
          const sourceUrlNormalized = s.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
          return sourceUrlNormalized === urlWithoutProtocol || s.url === taskUrl
        })

        if (sourceAlreadyInStory) {
          // Source was successfully added! Mark as completed even if backend status isn't updated
          console.log(`✅ Source ${taskUrl} found in story - marking as completed (NO REFRESH NEEDED)`)
          const interval = pollingIntervalsRef.current.get(taskId)
          if (interval) {
            clearInterval(interval)
            pollingIntervalsRef.current.delete(taskId)
          }

          const claimsCount = task.semantic_data?.claims?.length || 1
          setProcessingTasks(prev => prev.map(t =>
            t.taskId === taskId
              ? { ...t, status: 'completed', claimsCount }
              : t
          ))

          // Remove from processing tasks immediately - no need to show success since it's already in list
          setTimeout(() => {
            console.log(`🗑️ Removing completed task ${taskId} from UI (already in story)`)
            setProcessingTasks(prev => prev.filter(t => t.taskId !== taskId))
          }, 1500) // Reduced from 3s
          return
        }

        // If still actively processing OR in any active stage, keep polling
        if (isActivelyProcessing || (isInActiveStage && task.status === 'processing')) {
          console.log(`⏳ Task ${taskId} still processing - stage: ${task.current_stage}, status: ${task.status}`)
          // Update stage in UI
          setProcessingTasks(prev => prev.map(t =>
            t.taskId === taskId
              ? { ...t, stage: task.current_stage }
              : t
          ))
          return // Keep polling
        }

        // Handle completion - ONLY if truly completed or explicitly failed
        const isCompleted = task.status === 'completed' ||
                           (task.completed_at && task.status === 'processing' && !isInActiveStage)

        if (isCompleted) {
          console.log('✅ Task marked as completed:', {
            taskId,
            status: task.status,
            stage: task.current_stage,
            completed_at: task.completed_at,
            has_semantic_data: !!task.semantic_data
          })

          // Check if source already exists in story (re-processing case)
          const taskUrl = task.url
          const urlWithoutProtocol = taskUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
          const sourceAlreadyExists = sources.some(s => {
            const sourceUrlNormalized = s.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
            return sourceUrlNormalized === urlWithoutProtocol || s.url === taskUrl
          })

          if (sourceAlreadyExists) {
            console.log(`✅ Task ${taskId} completed - source already in story, skipping refresh`)
            // Stop polling
            const interval = pollingIntervalsRef.current.get(taskId)
            if (interval) {
              clearInterval(interval)
              pollingIntervalsRef.current.delete(taskId)
            }

            // Mark as completed and remove
            const claimsCount = task.semantic_data?.claims?.length || 1
            setProcessingTasks(prev => prev.map(t =>
              t.taskId === taskId
                ? { ...t, status: 'completed', claimsCount }
                : t
            ))

            setTimeout(() => {
              console.log(`🗑️ Removing re-processed task ${taskId}`)
              setProcessingTasks(prev => prev.filter(t => t.taskId !== taskId))
            }, 2000)
            return
          }

          // Wait for semantic_data to be available before deciding success/failure
          // Sometimes task status is "completed" but semantic_data is still being written
          const hasSemanticData = task.semantic_data !== undefined && task.semantic_data !== null

          if (!hasSemanticData && task.token_costs?.semantization > 0) {
            // Semantization ran but data not available yet, keep polling
            console.log('Waiting for semantic_data to be available...')
            return
          }

          // Stop polling - we have enough info to determine success/failure
          const interval = pollingIntervalsRef.current.get(taskId)
          if (interval) {
            clearInterval(interval)
            pollingIntervalsRef.current.delete(taskId)
          }

          // First refresh story data to get actual claim count from Neo4j
          // This is the source of truth, not task.semantic_data
          console.log('🔄 Refreshing story data to verify NEW claims in Neo4j...')

          // Refresh and check after a longer delay to allow Neo4j to be updated
          setTimeout(async () => {
            try {
              // Trigger story refresh
              await onRefreshStory()

              // After refresh, check if the URL now appears in sources with claims
              // Wait a bit for the refresh to complete
              setTimeout(() => {
                const taskUrl = task.url
                const urlWithoutProtocol = taskUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')

                // Check if this URL now exists in sources
                const sourceExists = sources.some(s => {
                  const sourceUrlNormalized = s.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
                  return sourceUrlNormalized === urlWithoutProtocol || s.url === taskUrl
                })

                // Get claim count from semantic_data if available, otherwise we'll verify from Neo4j after refresh
                const claimsCountFromTask = task.semantic_data?.claims?.length || 0

                console.log(`🔍 Verification for ${taskId}:`, {
                  url: taskUrl,
                  sourceExists,
                  claimsFromTask: claimsCountFromTask,
                  totalSources: sources.length
                })

                // If source was added to story, consider it a success regardless of semantic_data
                if (sourceExists) {
                  console.log(`✅ SUCCESS: Source ${taskUrl} found in story sources`)
                  setProcessingTasks(prev => prev.map(t =>
                    t.taskId === taskId
                      ? { ...t, status: 'completed', claimsCount: claimsCountFromTask || 1 }
                      : t
                  ))

                  // Remove from processing tasks after showing success
                  setTimeout(() => {
                    console.log(`🗑️ Auto-removing completed task ${taskId} from UI`)
                    setProcessingTasks(prev => prev.filter(t => t.taskId !== taskId))
                  }, 3000)
                } else {
                  // Source not in story - BUT might still be processing in background
                  // Be defensive: check if we have evidence that it truly failed
                  const isReadable = task.result?.is_readable !== false
                  const hasContent = task.token_costs?.total > 0
                  const semantizationFailed = task.current_stage === 'semantization' &&
                                             task.token_costs?.semantization === 0 &&
                                             task.completed_at

                  // If no clear failure signals and task was recently completed, give it more time
                  const taskAge = Date.now() - (task.addedAt || 0)
                  if (taskAge < 60000 && !semantizationFailed && hasContent) {
                    console.log(`⏰ Task ${taskId} not in Neo4j yet but looks healthy, will keep polling`)
                    // Don't mark as error yet - might still be writing to Neo4j
                    return
                  }

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

                  console.log(`❌ FAILURE: Source ${taskUrl} not in story - ${reason}`)
                  setProcessingTasks(prev => prev.map(t =>
                    t.taskId === taskId
                      ? { ...t, status: 'error', errorMessage: reason }
                      : t
                  ))
                }
              }, 2000) // Increased from 1s to 2s for Neo4j write delay
            } catch (err) {
              console.error('Error verifying source in story:', err)
              // Fallback to semantic_data check
              const claimsCount = task.semantic_data?.claims?.length || 0
              if (claimsCount > 0) {
                setProcessingTasks(prev => prev.map(t =>
                  t.taskId === taskId
                    ? { ...t, status: 'completed', claimsCount }
                    : t
                ))
                setTimeout(() => {
                  setProcessingTasks(prev => prev.filter(t => t.taskId !== taskId))
                }, 3000)
              } else {
                setProcessingTasks(prev => prev.map(t =>
                  t.taskId === taskId
                    ? { ...t, status: 'error', errorMessage: 'Unable to verify extraction status' }
                    : t
                ))
              }
            }
          }, 500) // Initial delay before refresh
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
        console.error('⚠️ Polling error for task:', taskId, err)
        // Don't immediately give up - just log and continue polling
        // Network errors can be transient
        console.log(`⏳ Will retry polling task ${taskId} on next interval`)
        // Don't stop polling or mark as error on transient network issues
      }

      // Exponential backoff: start at 3s, increase to 5s, 8s, 12s, max 15s
      pollCount++
      const nextInterval = Math.min(
        3000 + (pollCount * 1000), // Add 1s per poll, starting from 3s
        maxInterval
      )

      console.log(`⏰ Next poll for ${taskId} in ${nextInterval/1000}s (poll #${pollCount})`)

      // Schedule next poll
      const timeout = setTimeout(poll, nextInterval)
      pollingIntervalsRef.current.set(taskId, timeout as any)
    }

    // Start first poll immediately
    poll()
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
              if (e.key === 'Enter' && !isSubmitting) {
                handleAddEvidence()
              }
            }}
            placeholder="Paste article URL (e.g., https://example.com/article)..."
            disabled={isSubmitting}
            className={`flex-1 px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
              isSubmitting
                ? 'border-slate-300 bg-slate-50 text-slate-500'
                : 'border-teal-300 focus:ring-teal-500'
            }`}
          />
          <button
            onClick={handleAddEvidence}
            disabled={!addEvidenceUrl.trim() || isSubmitting}
            className={`px-6 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2 ${
              !addEvidenceUrl.trim() || isSubmitting
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Adding...
              </>
            ) : (
              'Add'
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          💡 Paste multiple URLs one at a time - they'll process simultaneously
        </p>
      </div>

      {/* Processing Tasks - Show temp cards */}
      {processingTasks.length > 0 && (
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700">Processing ({processingTasks.length})</h3>
            <button
              onClick={() => {
                console.log('🗑️ Manually clearing all processing tasks')
                // Stop all polling
                pollingIntervalsRef.current.forEach((interval) => clearInterval(interval))
                pollingIntervalsRef.current.clear()
                // Clear tasks
                setProcessingTasks([])
              }}
              className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline"
              title="Clear all processing tasks"
            >
              Clear All
            </button>
          </div>
          {processingTasks.map(task => (
            <div
              key={task.taskId}
              data-task-id={task.taskId}
              className={`border-2 rounded-lg p-4 transition-all relative ${
                task.status === 'processing' ? 'border-blue-300 bg-blue-50/50' :
                task.status === 'completed' ? 'border-green-300 bg-green-50/50' :
                'border-red-300 bg-red-50/50'
              }`}
            >
              {/* Dismiss button for error tasks */}
              {task.status === 'error' && (
                <button
                  onClick={() => {
                    console.log(`Manually dismissing task ${task.taskId}`)
                    setProcessingTasks(prev => prev.filter(t => t.taskId !== task.taskId))
                  }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors"
                  title="Dismiss"
                >
                  ×
                </button>
              )}
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

                  {/* Multi-stage progress pipeline */}
                  {task.status === 'processing' && (
                    <div className="mt-2 mb-2">
                      <div className="flex items-center gap-1 text-xs">
                        {['preview', 'extraction', 'cleaning', 'resolution', 'semantization'].map((stage, idx) => {
                          const isCurrent = task.stage === stage
                          const isPast = ['preview', 'extraction', 'cleaning', 'resolution', 'semantization'].indexOf(task.stage || '') > idx
                          const stageLabels = {
                            preview: 'Preview',
                            extraction: 'Extract',
                            cleaning: 'Clean',
                            resolution: 'Resolve',
                            semantization: 'Analyze'
                          }

                          return (
                            <div key={stage} className="flex items-center">
                              <div
                                className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                                  isCurrent
                                    ? 'bg-blue-600 text-white'
                                    : isPast
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                                title={stage}
                              >
                                {isCurrent && '⏳ '}
                                {isPast && '✓ '}
                                {stageLabels[stage as keyof typeof stageLabels]}
                              </div>
                              {idx < 4 && (
                                <div className={`w-2 h-0.5 ${isPast ? 'bg-green-300' : 'bg-slate-200'}`}></div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-slate-600">
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
