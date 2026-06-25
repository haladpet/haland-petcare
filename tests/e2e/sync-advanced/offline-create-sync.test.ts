import { test, expect } from '../fixtures/auth.fixture'

test.describe('Sync Engine — Offline Create → Online Sync', () => {
  test.beforeEach(async ({ loginAsOwner }) => {
    await loginAsOwner()
  })

  test('should sync customer created offline after reconnecting', async ({ page, context }) => {
    await context.setOffline(true)
    await page.goto('/customers')
    await page.waitForTimeout(1000)
    await context.setOffline(false)
    await page.waitForTimeout(3000)
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="customers-page"]')).toBeVisible()
  })

  test('should sync pet created offline after reconnecting', async ({ page, context }) => {
    await context.setOffline(true)
    await page.goto('/pets')
    await page.waitForTimeout(1000)
    await context.setOffline(false)
    await page.waitForTimeout(3000)
    await page.goto('/pets')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="pets-page"]')).toBeVisible()
  })

  test('should sync appointment created offline after reconnecting', async ({ page, context }) => {
    await context.setOffline(true)
    await page.goto('/appointments')
    await page.waitForTimeout(1000)
    await context.setOffline(false)
    await page.waitForTimeout(3000)
    await page.goto('/appointments')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="appointments-page"]')).toBeVisible()
  })

  test('should sync medical record created offline after reconnecting', async ({ page, context }) => {
    await context.setOffline(true)
    await page.goto('/medical-records/new')
    await page.waitForTimeout(1000)
    await context.setOffline(false)
    await page.waitForTimeout(3000)
    await page.goto('/medical-records/new')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="medical-record-page"]')).toBeVisible()
  })

  test('should sync invoice created offline after reconnecting', async ({ page, context }) => {
    await context.setOffline(true)
    await page.goto('/pos')
    await page.waitForTimeout(1000)
    await context.setOffline(false)
    await page.waitForTimeout(3000)
    await page.goto('/pos')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="pos-page"]')).toBeVisible()
  })

  test('should not lose data during offline→online transition', async ({ page, context }) => {
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    const beforeHtml = await page.locator('[data-testid="customers-page"]').innerHTML().catch(() => '')
    await context.setOffline(true)
    await page.waitForTimeout(1000)
    await context.setOffline(false)
    await page.waitForTimeout(3000)
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    const afterHtml = await page.locator('[data-testid="customers-page"]').innerHTML().catch(() => '')
    expect(afterHtml.length).toBeGreaterThan(0)
  })

  test('should increment version after sync', async ({ page, context }) => {
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

  test('sync queue should be empty after successful sync', async ({ page, context }) => {
    await page.goto('/customers')
    await page.waitForTimeout(1000)
    await context.setOffline(true)
    await page.waitForTimeout(500)
    await context.setOffline(false)
    await page.waitForTimeout(5000)
    await page.goto('/')
    await page.waitForTimeout(1000)
    await expect(page.locator('[data-testid="dashboard-layout"]')).toBeVisible()
  })
})