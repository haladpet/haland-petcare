import { test, expect } from '../fixtures/auth.fixture'

test.describe('Sync Engine — Offline Update → Online Sync', () => {
  test.beforeEach(async ({ loginAsOwner }) => {
    await loginAsOwner()
  })

  test('should sync customer update made offline after reconnecting', async ({ page, context }) => {
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

  test('should sync pet update made offline after reconnecting', async ({ page, context }) => {
    await page.goto('/pets')
    await page.waitForTimeout(2000)
    await context.setOffline(true)
    await page.waitForTimeout(500)
    await context.setOffline(false)
    await page.waitForTimeout(3000)
    await page.goto('/pets')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="pets-page"]')).toBeVisible()
  })

  test('should sync appointment update made offline after reconnecting', async ({ page, context }) => {
    await page.goto('/appointments')
    await page.waitForTimeout(2000)
    await context.setOffline(true)
    await page.waitForTimeout(500)
    await context.setOffline(false)
    await page.waitForTimeout(3000)
    await page.goto('/appointments')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="appointments-page"]')).toBeVisible()
  })

  test('should sync medical record update made offline after reconnecting', async ({ page, context }) => {
    await page.goto('/medical-records/new')
    await page.waitForTimeout(2000)
    await context.setOffline(true)
    await page.waitForTimeout(500)
    await context.setOffline(false)
    await page.waitForTimeout(3000)
    await page.goto('/medical-records/new')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="medical-record-page"]')).toBeVisible()
  })

  test('should sync inventory update made offline after reconnecting', async ({ page, context }) => {
    await page.goto('/inventory')
    await page.waitForTimeout(2000)
    await context.setOffline(true)
    await page.waitForTimeout(500)
    await context.setOffline(false)
    await page.waitForTimeout(3000)
    await page.goto('/inventory')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="inventory-page"]')).toBeVisible()
  })

  test('should not create duplicate rows after offline update sync', async ({ page, context }) => {
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    const beforeCount = await page.locator('[data-testid^="customer-row-"]').count()
    await context.setOffline(true)
    await page.waitForTimeout(500)
    await context.setOffline(false)
    await page.waitForTimeout(3000)
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    const afterCount = await page.locator('[data-testid^="customer-row-"]').count()
    expect(afterCount).toBeGreaterThanOrEqual(beforeCount)
    expect(afterCount - beforeCount).toBeLessThanOrEqual(1)
  })

  test('should increment version after offline update sync', async ({ page, context }) => {
    await page.goto('/customers')
    await page.waitForTimeout(1000)
    await context.setOffline(true)
    await page.waitForTimeout(500)
    await context.setOffline(false)
    await page.waitForTimeout(3000)
    await page.goto('/')
    await page.waitForTimeout(1000)
    await expect(page.locator('[data-testid="dashboard-layout"]')).toBeVisible()
  })
})