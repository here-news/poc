import { test, expect } from '@playwright/test'

const storyId = 'story-123'
const storyResponse = {
  story: {
    id: storyId,
    title: 'City Council Approves Climate Action Plan',
    description: 'City leaders approved a sweeping climate plan with new emissions targets and funding for public transit.',
    category: 'Climate',
    artifact_count: 12,
    claim_count: 8,
    people_count: 5,
    locations: ['Seattle, WA'],
    last_updated_human: '2 hours ago',
    cover_image: 'https://cdn.example.com/story-cover.jpg',
    health_indicator: 'healthy',
    entropy: 0.42,
    verified_claims: 6,
    total_claims: 10,
    confidence: 78,
    revision: 'v2 – field reporting added'
  }
}

test.describe('Story page', () => {
  test('renders hero, metrics, and CTAs', async ({ page, baseURL }) => {
    await page.route('**/api/stories/story-123', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(storyResponse)
      })
    })

    await page.goto(`${baseURL || ''}/story/${storyId}`)

    await expect(page.getByRole('heading', { level: 1, name: storyResponse.story.title })).toBeVisible()
    await expect(page.locator('img[alt="Story evidence"]')).toBeVisible()

    await expect(page.getByText('DEVELOPING STORY')).toBeVisible()
    await expect(page.getByText('Entropy')).toBeVisible()
    await expect(page.getByText(`${storyResponse.story.last_updated_human}`)).toBeVisible()

    const investLink = page.getByRole('link', { name: 'Contribute to Investigation' })
    await expect(investLink).toHaveAttribute('href', `/build/${storyId}`)

    await expect(page.getByRole('button', { name: 'Support $5' })).toBeVisible()
    await expect(page.getByText('Support This Story')).toBeVisible()
  })

  test('opens and closes story chat sidebar', async ({ page, baseURL }) => {
    await page.route('**/api/stories/story-123', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(storyResponse)
      })
    })

    await page.goto(`${baseURL || ''}/story/${storyId}`)

    const openChatButton = page.getByRole('button', { name: 'Open chat' })
    await openChatButton.click()

    await expect(page.getByRole('heading', { name: 'Story Chat' })).toBeVisible()

    const closeChatButton = page.getByRole('button', { name: 'Close chat' })
    await closeChatButton.click()

    await expect(page.getByRole('heading', { name: 'Story Chat' })).not.toBeVisible()
  })
})
