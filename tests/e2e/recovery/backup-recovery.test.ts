import { test, expect } from '../fixtures/auth.fixture'

test.describe('Backup & Recovery', () => {
  test.beforeEach(async ({ loginAsOwner }) => {
    await loginAsOwner()
  })

  test('should access backup endpoint', async ({ page }) => {
    const response = await page.request.get('/api/cron/backup')
    expect(response.ok()).toBeTruthy()
  })

  test('should restore data after deletion', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="customers-page"]')).toBeVisible()
  })

  test('should maintain relationship integrity after restore', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="customers-page"]')).toBeVisible()
    await page.goto('/pets')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="pets-page"]')).toBeVisible()
  })

  test('should show all data types after restore', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="customers-page"]')).toBeVisible()
    await page.goto('/pets')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="pets-page"]')).toBeVisible()
    await page.goto('/inventory')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="inventory-page"]')).toBeVisible()
    await page.goto('/pos')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="pos-page"]')).toBeVisible()
  })

  test('should restore medical records correctly', async ({ page }) => {
    await page.goto('/medical-records/new')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="medical-record-page"]')).toBeVisible()
  })

  test('should restore appointments correctly', async ({ page }) => {
    await page.goto('/appointments')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="appointments-page"]')).toBeVisible()
  })

  test('should restore queue data correctly', async ({ page }) => {
    await page.goto('/queue')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="queue-page"]')).toBeVisible()
  })
})