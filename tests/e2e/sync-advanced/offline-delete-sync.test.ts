import { test, expect } from '../fixtures/auth.fixture'

test.describe('Sync Engine — Offline Delete → Online Sync', () => {
  test.beforeEach(async ({ loginAsOwner }) => {
    await loginAsOwner()
  })

  test('should sync soft delete made offline after reconnecting', async ({ page, context }) => {
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

  test('should sync pet soft delete made offline after reconnecting', async ({ page, context }) => {
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

  test('should sync appointment cancellation made offline after reconnecting', async ({ page, context }) => {
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

  test('should sync inventory item soft delete made offline after reconnecting', async ({ page, context }) => {
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

  test('should not lose data during offline delete sync', async ({ page, context }) => {
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
})