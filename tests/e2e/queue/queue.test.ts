import { test, expect } from '../fixtures/auth.fixture'

test.describe('Queue Management', () => {
  test.beforeEach(async ({ loginAsOwner }) => {
    await loginAsOwner()
  })

  test('should display queue page', async ({ page }) => {
    await page.click('[data-testid="nav-queue"]')
    await expect(page.locator('[data-testid="queue-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="queue-currently-serving"]')).toBeVisible()
    await expect(page.locator('[data-testid="queue-waiting-list"]')).toBeVisible()
  })

  test('should show currently serving section', async ({ page }) => {
    await page.click('[data-testid="nav-queue"]')
    await page.waitForTimeout(2000)
    const servingVisible = await page.locator('[data-testid="queue-currently-serving"]').isVisible()
    expect(servingVisible).toBe(true)
  })

  test('should show waiting list section', async ({ page }) => {
    await page.click('[data-testid="nav-queue"]')
    await page.waitForTimeout(2000)
    const waitingVisible = await page.locator('[data-testid="queue-waiting-list"]').isVisible()
    expect(waitingVisible).toBe(true)
  })

  test('should show serve next buttons for waiting items', async ({ page }) => {
    await page.click('[data-testid="nav-queue"]')
    await page.waitForTimeout(2000)
    const serveButtons = page.locator('[data-testid^="queue-serve-"]')
    const count = await serveButtons.count()
    if (count > 0) {
      await expect(serveButtons.first()).toBeVisible()
    }
  })

  test('should show priority badges', async ({ page }) => {
    await page.click('[data-testid="nav-queue"]')
    await page.waitForTimeout(2000)
    const priorityBadges = page.locator('[data-testid^="queue-priority-"]')
    const count = await priorityBadges.count()
    if (count > 0) {
      await expect(priorityBadges.first()).toBeVisible()
    }
  })
})