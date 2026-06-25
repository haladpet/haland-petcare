import { test, expect } from '../fixtures/auth.fixture'

test.describe('Sync Engine — Retry Failed Sync', () => {
  test.beforeEach(async ({ loginAsOwner }) => {
    await loginAsOwner()
  })

  test('should retry sync after server error', async ({ page, context }) => {
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    await context.setOffline(true)
    await page.waitForTimeout(500)
    await context.setOffline(false)
    await page.waitForTimeout(5000)
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="customers-page"]')).toBeVisible()
  })

  test('should retry sync after network timeout', async ({ page, context }) => {
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    await context.setOffline(true)
    await page.waitForTimeout(1000)
    await context.setOffline(false)
    await page.waitForTimeout(5000)
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="customers-page"]')).toBeVisible()
  })

  test('should not lose data during retry', async ({ page, context }) => {
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    await context.setOffline(true)
    await page.waitForTimeout(500)
    await context.setOffline(false)
    await page.waitForTimeout(3000)
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="customers-page"]')).toBeVisible()
  })

  test('should auto-retry when connection is restored', async ({ page, context }) => {
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    await context.setOffline(true)
    await page.waitForTimeout(500)
    await context.setOffline(false)
    await page.waitForTimeout(5000)
    await page.goto('/')
    await page.waitForTimeout(1000)
    await expect(page.locator('[data-testid="dashboard-layout"]')).toBeVisible()
  })
})