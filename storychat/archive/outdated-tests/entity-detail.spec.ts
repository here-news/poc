import { test, expect } from '@playwright/test'

test.describe('Entity detail', () => {
  test('renders canonical entity and related items', async ({ page, baseURL }) => {
    const type = 'person'
    const id = 'person_1'
    const response = {
      id,
      type,
      canonical_name: 'Jane Doe',
      wikidata_qid: 'Q12345',
      aliases: ['J. Doe'],
      mentions: [{ page_id: 'page-123', text: 'Jane Doe said...' }],
      related_stories: [{ id: 'story-1', title: 'Example Story' }]
    }

    await page.route('**/api/entities/person/person_1', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(response)
      })
    })

    await page.goto(`${baseURL || ''}/entity/${type}/${id}`)

    await expect(page.getByRole('heading', { name: response.canonical_name })).toBeVisible()
    await expect(page.getByText('Q12345')).toBeVisible()
    await expect(page.getByText('Example Story')).toBeVisible()
  })
})

