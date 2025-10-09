import { test, expect } from '@playwright/test'

const taskId = 'test-task'
const baseTaskResponse = {
  task_id: taskId,
  url: 'https://example.com/article',
  status: 'completed',
  created_at: '2025-10-08T20:50:00Z',
  completed_at: '2025-10-08T20:55:00Z',
  result: {
    url: 'https://example.com/article',
    canonical_url: 'https://example.com/article',
    domain: 'example.com',
    is_readable: true,
    status: 'completed',
    title: 'Example Article Title',
    content_text: 'Paragraph one.\n\nParagraph two.',
    meta_description: 'Example description',
    author: 'Reporter Name',
    publish_date: '2025-10-08T08:00:00Z',
    word_count: 420,
    reading_time_minutes: 2.1,
    extraction_timestamp: '2025-10-08T20:54:00Z',
    processing_time_ms: 1800,
    error_message: '',
    language: 'en',
    language_confidence: 0.98,
    screenshot_url: 'https://cdn.example.com/screenshot.png'
  }
}

const previewResponse = {
  title: 'Example Article Title',
  description: 'Example description',
  preview_image: {
    url: 'https://cdn.example.com/preview.jpg',
    secure_url: 'https://cdn.example.com/preview.jpg',
    width: 1200,
    height: 630
  },
  url: 'https://example.com/article',
  domain: 'example.com',
  publisher: {
    name: 'Example News',
    favicon: 'https://example.com/favicon.ico',
    facebook: 'https://facebook.com/example',
    twitter: '@example'
  },
  author: {
    name: 'Reporter Name',
    facebook: '',
    twitter: '@reporter'
  },
  metadata: {
    language: 'en',
    language_name: 'English',
    locale: 'en_US',
    publish_date: '2025-10-08T08:00:00Z',
    section: 'Politics',
    tags: ['Election', 'Policy'],
    content_type: 'article'
  },
  metrics: {
    word_count: 420,
    reading_time_minutes: 2.1,
    language_confidence: 0.98
  },
  quality: {
    flags: ['clean_content'],
    is_readable: true,
    status: 'completed'
  }
}

const blockedTaskResponse = {
  ...baseTaskResponse,
  status: 'blocked',
  result: {
    ...baseTaskResponse.result,
    status: 'blocked',
    is_readable: false
  }
}

test.describe('Result page', () => {
  test('renders completed task with preview and metadata', async ({ page, baseURL }) => {
    await page.route('**/api/task/test-task', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(baseTaskResponse)
      })
    })

    await page.route('**/api/task/test-task/preview', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(previewResponse)
      })
    })

    await page.goto(`${baseURL || ''}/tasks/${taskId}`)

    await expect(page.getByRole('heading', { level: 1, name: baseTaskResponse.result.title })).toBeVisible()
    await expect(page.getByText(`Word Count: ${baseTaskResponse.result.word_count} words`)).toBeVisible()

    const previewImage = page.locator(`img[alt="${previewResponse.title}"]`)
    await expect(previewImage).toBeVisible()

    const domainText = page.getByText(`Domain: ${baseTaskResponse.result.domain}`)
    await expect(domainText).toBeVisible()
  })

  test('hides screenshot/preview section for blocked tasks', async ({ page, baseURL }) => {
    await page.route('**/api/task/test-task', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(blockedTaskResponse)
      })
    })

    await page.route('**/api/task/test-task/preview', async (route) => {
      await route.fulfill({
        status: 404,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'not found' })
      })
    })

    await page.goto(`${baseURL || ''}/tasks/${taskId}`)

    await expect(page.getByRole('heading', { level: 1, name: blockedTaskResponse.result.title })).toBeVisible()

    const blockedPreview = page.locator(`img[alt="${previewResponse.title}"]`)
    await expect(blockedPreview).toHaveCount(0)
  })
})
