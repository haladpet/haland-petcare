import { test, expect } from '../fixtures/auth.fixture'

test.describe('Appointment Management', () => {
  test.beforeEach(async ({ loginAsOwner }) => {
    await loginAsOwner()
  })

  test('should display appointments page', async ({ page }) => {
    await page.click('[data-testid="nav-appointments"]')
    await expect(page.locator('[data-testid="appointments-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="appointment-create-button"]')).toBeVisible()
  })

  test('should open create appointment dialog', async ({ page }) => {
    await page.click('[data-testid="nav-appointments"]')
    await page.click('[data-testid="appointment-create-button"]')
    await expect(page.locator('[data-testid="appointment-create-dialog"]')).toBeVisible()
    await expect(page.locator('[data-testid="appointment-input-customer-id"]')).toBeVisible()
    await expect(page.locator('[data-testid="appointment-input-datetime"]')).toBeVisible()
    await expect(page.locator('[data-testid="appointment-input-reason"]')).toBeVisible()
    await expect(page.locator('[data-testid="appointment-save-button"]')).toBeVisible()
  })

  test('should close create dialog on cancel', async ({ page }) => {
    await page.click('[data-testid="nav-appointments"]')
    await page.click('[data-testid="appointment-create-button"]')
    await expect(page.locator('[data-testid="appointment-create-dialog"]')).toBeVisible()
    await page.click('[data-testid="appointment-cancel-button"]')
    await expect(page.locator('[data-testid="appointment-create-dialog"]')).not.toBeVisible()
  })

  test('should show appointment list', async ({ page }) => {
    await page.click('[data-testid="nav-appointments"]')
    await page.waitForTimeout(2000)
    const listVisible = await page.locator('[data-testid="appointment-list"]').isVisible()
    const emptyVisible = await page.locator('[data-testid="appointment-empty"]').isVisible()
    expect(listVisible || emptyVisible).toBe(true)
  })

  test('should show appointment status badges', async ({ page }) => {
    await page.click('[data-testid="nav-appointments"]')
    await page.waitForTimeout(2000)
    const rows = page.locator('[data-testid^="appointment-row-"]')
    const count = await rows.count()
    if (count > 0) {
      const firstRow = rows.first()
      await expect(firstRow.locator('[data-testid^="appointment-status-"]')).toBeVisible()
    }
  })
})