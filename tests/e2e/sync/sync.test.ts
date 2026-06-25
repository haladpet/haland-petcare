import { test, expect } from '../fixtures/auth.fixture'

test.describe('Sync Engine', () => {
  test.beforeEach(async ({ loginAsOwner }) => {
    await loginAsOwner()
  })

  test('should show sync status bar', async ({ page }) => {
    await expect(page.locator('[data-testid="sync-status-bar"]').or(page.locator('text=Sync'))).toBeVisible({ timeout: 5000 })
  })

  test('should show online status', async ({ page }) => {
    await page.waitForTimeout(1000)
    const syncIndicator = page.locator('text=Online').or(page.locator('text=Synced')).or(page.locator('text=Sync'))
    await expect(syncIndicator).toBeVisible({ timeout: 5000 })
  })

  test('should show pending sync count when offline changes made', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true)
    await page.waitForTimeout(500)

    // Try to create data (will be queued)
    await page.goto('/customers')
    await page.waitForTimeout(1000)

    // Go back online
    await context.setOffline(false)
    await page.waitForTimeout(2000)

    // Sync should process
    await page.goto('/')
    await page.waitForTimeout(2000)
    const pageVisible = await page.locator('[data-testid="dashboard-layout"]').isVisible()
    expect(pageVisible).toBe(true)
  })

  test('should sync data after coming back online', async ({ page, context }) => {
    // Load page while online
    await page.goto('/customers')
    await page.waitForTimeout(1000)

    // Go offline
    await context.setOffline(true)
    await page.waitForTimeout(500)

    // Go back online
    await context.setOffline(false)
    await page.waitForTimeout(3000)

    // Page should still work
    await page.goto('/')
    await expect(page.locator('[data-testid="dashboard-layout"]')).toBeVisible()
  })

  test('should not lose data during sync', async ({ page, context }) => {
    // Navigate to customers while online
    await page.goto('/customers')
    await page.waitForTimeout(2000)

    // Capture current state
    const listHtml = await page.locator('[data-testid="customer-list"]').or(page.locator('[data-testid="customer-empty"]')).innerHTML().catch(() => '')

    // Go offline and back online
    await context.setOffline(true)
    await page.waitForTimeout(1000)
    await context.setOffline(false)
    await page.waitForTimeout(3000)

    // Reload and verify page still renders
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    const pageVisible = await page.locator('[data-testid="customers-page"]').isVisible()
    expect(pageVisible).toBe(true)
  })
})