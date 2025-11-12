import { useState, useCallback, useRef } from 'react'
import { URLPreview } from '../types/chat'
import { parseInput } from '../utils/inputParser'
import { getPreviewFromTask, checkCachedUrl } from '../utils/extractionAdapter'

export interface Submission {
  id: string
  input: string
  task_id?: string
  status: 'pending' | 'extracting' | 'completed' | 'failed' | 'blocked'
  preview?: URLPreview
  story_match?: {
    story_id: string
    is_new: boolean
    match_score: number
    matched_story_title: string
  }
  created_at: Date
  error_message?: string
}

interface UseSubmissionsReturn {
  submissions: Submission[]
  submitInput: (input: string) => Promise<void>
  clearSubmissions: () => void
}

/**
 * Hook for managing URL/text submissions and tracking their extraction status
 */
export function useSubmissions(userId: string): UseSubmissionsReturn {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const pollingRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const updateSubmission = useCallback((id: string, updates: Partial<Submission>) => {
    setSubmissions((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub))
    )
  }, [])

  const startPolling = useCallback((submissionId: string, taskId: string) => {
    let pollAttempts = 0
    const maxAttempts = 120 // 120 seconds = 2 minutes (extraction can take 30-60s)
    let previewReceived = false

    const interval = setInterval(async () => {
      pollAttempts++

      try {
        const taskResponse = await fetch(`/storychat/api/task/${taskId}`)
        const taskData = await taskResponse.json()

        console.log(`[Submission ${submissionId}] Poll ${pollAttempts}: status=${taskData.status}, has_preview=${!!taskData.preview_meta}, has_story_match=${!!taskData.story_match}`)

        // Update preview if available (can arrive late from iFramely)
        if (taskData.preview_meta && !previewReceived) {
          previewReceived = true
          const preview = getPreviewFromTask(taskData)
          if (preview) {
            updateSubmission(submissionId, {
              status: 'extracting',
              preview
            })
          }
        }

        // Check for preview in result if not received yet (fallback)
        if (!previewReceived && taskData.result && taskData.status === 'completed') {
          const preview = getPreviewFromTask(taskData)
          if (preview) {
            previewReceived = true
            updateSubmission(submissionId, {
              status: 'extracting',
              preview
            })
          }
        }

        // Check for story match (extraction completed)
        if (taskData.status === 'completed' && taskData.story_match) {
          clearInterval(interval)
          pollingRefs.current.delete(submissionId)

          // Get final preview if we didn't have one yet
          const finalPreview = previewReceived
            ? undefined
            : getPreviewFromTask(taskData)

          updateSubmission(submissionId, {
            status: 'completed',
            story_match: taskData.story_match,
            ...(finalPreview && { preview: finalPreview })
          })

          console.log(`✅ Submission ${submissionId} completed with story_match`)
          return
        }

        // Fallback: completed but no story_match
        if (taskData.status === 'completed' && !taskData.story_match) {
          clearInterval(interval)
          pollingRefs.current.delete(submissionId)

          console.warn(`Submission ${submissionId} completed but no story_match`)

          // Get final preview if we didn't have one yet
          const finalPreview = previewReceived
            ? undefined
            : getPreviewFromTask(taskData)

          updateSubmission(submissionId, {
            status: 'completed',
            error_message: 'Story matching not available yet',
            ...(finalPreview && { preview: finalPreview })
          })
          return
        }

        // Handle failures
        if (taskData.status === 'failed' || taskData.status === 'blocked') {
          clearInterval(interval)
          pollingRefs.current.delete(submissionId)

          updateSubmission(submissionId, {
            status: taskData.status,
            error_message: taskData.status === 'blocked'
              ? 'Unable to access this article (paywall or blocked)'
              : 'Extraction failed'
          })
          return
        }

        // Long running extraction notice (after 60 seconds)
        if (pollAttempts === 60 && !previewReceived) {
          updateSubmission(submissionId, {
            error_message: 'Extraction taking longer than usual... still processing'
          })
        }

        // Timeout
        if (pollAttempts >= maxAttempts) {
          clearInterval(interval)
          pollingRefs.current.delete(submissionId)

          updateSubmission(submissionId, {
            status: 'failed',
            error_message: 'Extraction timeout - please try again or check URL'
          })
        }
      } catch (error) {
        console.error(`Polling error for submission ${submissionId}:`, error)
      }
    }, 1000) // Poll every second

    pollingRefs.current.set(submissionId, interval)
  }, [updateSubmission])

  const submitInput = useCallback(async (input: string) => {
    const submissionId = `sub_${Date.now()}`
    const parsed = parseInput(input)

    // Create submission record
    const newSubmission: Submission = {
      id: submissionId,
      input,
      status: 'pending',
      created_at: new Date()
    }

    setSubmissions((prev) => [newSubmission, ...prev])

    try {
      // Check if URL detected
      if (parsed.urls && parsed.urls.length > 0) {
        const url = parsed.urls[0]

        // Check cache first
        const cached = await checkCachedUrl(url)

        if (cached) {
          console.log(`💾 Cache hit for submission ${submissionId}`)

          updateSubmission(submissionId, {
            task_id: cached.task_id,
            status: 'completed',
            preview: cached.preview,
            error_message: 'Using cached extraction. Story matching will be available soon.'
          })

          return
        }

        // No cache - create new task
        updateSubmission(submissionId, { status: 'extracting' })

        const response = await fetch('/storychat/api/seed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId
          },
          body: JSON.stringify({
            content: input,
            user_id: userId
          })
        })

        const seedResponse = await response.json()

        if (seedResponse.task_id) {
          updateSubmission(submissionId, {
            task_id: seedResponse.task_id
          })

          // Start polling for this task
          startPolling(submissionId, seedResponse.task_id)
        } else {
          updateSubmission(submissionId, {
            status: 'failed',
            error_message: 'Failed to create extraction task'
          })
        }
      } else {
        // Text-only input (no URL)
        updateSubmission(submissionId, {
          status: 'failed',
          error_message: 'Please submit a valid news article URL'
        })
      }
    } catch (error) {
      console.error(`Submission error for ${submissionId}:`, error)
      updateSubmission(submissionId, {
        status: 'failed',
        error_message: 'Something went wrong. Please try again.'
      })
    }
  }, [userId, updateSubmission, startPolling])

  const clearSubmissions = useCallback(() => {
    // Clear all polling intervals
    pollingRefs.current.forEach((interval) => clearInterval(interval))
    pollingRefs.current.clear()

    setSubmissions([])
  }, [])

  return {
    submissions,
    submitInput,
    clearSubmissions
  }
}
