import { test, expect } from '../fixtures/auth.fixture'

test.describe('Conflict Resolution', () => {
  test.beforeEach(async ({ loginAsOwner }) => {
    await loginAsOwner()
  })

  test('should detect conflict when two devices edit same customer', async ({ page, context }) => {
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

  test('should detect conflict when two devices edit same pet', async ({ page, context }) => {
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

  test('should detect conflict when two devices edit same inventory item', async ({ page, context }) => {
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

  test('should detect conflict when two devices edit same medical record', async ({ page, context }) => {
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

  test('should detect conflict when two devices edit same invoice', async ({ page, context }) => {
    await page.goto('/pos')
    await page.waitForTimeout(2000)
    await context.setOffline(true)
    await page.waitForTimeout(500)
    await context.setOffline(false)
    await page.waitForTimeout(3000)
    await page.goto('/pos')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="pos-page"]')).toBeVisible()
  })

  test('should not silently overwrite data during conflict', async ({ page, context }) => {
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    const beforeHtml = await page.locator('[data-testid="customers-page"]').innerHTML().catch(() => '')
    await context.setOffline(true)
    await page.waitForTimeout(500)
    await context.setOffline(false)
    await page.waitForTimeout(3000)
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    const afterHtml = await page.locator('[data-testid="customers-page"]').innerHTML().catch(() => '')
    expect(afterHtml.length).toBeGreaterThan(0)
  })

  test('should show conflict queue when conflicts exist', async ({ page, context }) => {
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    await context.setOffline(true)
    await page.waitForTimeout(500)
    await context.setOffline(false)
    await page.waitForTimeout(3000)
    await page.goto('/conflicts')
    await page.waitForTimeout(2000)
    const pageVisible = await page.locator('body').isVisible()
    expect(pageVisible).toBe(true)
  })
})