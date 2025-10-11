import { test, expect } from '@playwright/test'

test.describe('Page detail', () => {
  test('renders page summary and entity chips', async ({ page, baseURL }) => {
    const pageId = 'page-123'
    const response = {
      id: pageId,
      title: 'Example Page Title',
      canonical_url: 'https://example.com/article',
      domain: 'example.com',
      publish_date: '2025-10-10T12:00:00Z',
      word_count: 512,
      screenshot_url: 'https://cdn.example.com/screenshot.png',
      entities: {
        people: [{ id: 'person_1', name: 'Jane Doe' }],
        organizations: [{ id: 'org_1', name: 'OpenAI' }],
        locations: [{ id: 'loc_1', name: 'San Francisco' }]
      }
    }

    await page.route('**/api/pages/page-123', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(response)
      })
    })

    await page.goto(`${baseURL || ''}/page/${pageId}`)

    await expect(page.getByRole('heading', { name: response.title })).toBeVisible()
    await expect(page.getByText(`Domain: ${response.domain}`)).toBeVisible()
    await expect(page.getByText('Jane Doe')).toBeVisible()
    await expect(page.getByText('OpenAI')).toBeVisible()
    await expect(page.getByText('San Francisco')).toBeVisible()
  })
})

