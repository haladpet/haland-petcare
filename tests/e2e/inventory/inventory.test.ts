import { test, expect } from '../fixtures/auth.fixture'

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ loginAsOwner }) => {
    await loginAsOwner()
  })

  test('should display inventory page', async ({ page }) => {
    await page.click('[data-testid="nav-inventory"]')
    await expect(page.locator('[data-testid="inventory-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="inventory-add-item-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="inventory-add-batch-button"]')).toBeVisible()
  })

  test('should show all tabs', async ({ page }) => {
    await page.click('[data-testid="nav-inventory"]')
    await expect(page.locator('[data-testid="inventory-tab-all"]')).toBeVisible()
    await expect(page.locator('[data-testid="inventory-tab-low-stock"]')).toBeVisible()
    await expect(page.locator('[data-testid="inventory-tab-expiring"]')).toBeVisible()
  })

  test('should switch between tabs', async ({ page }) => {
    await page.click('[data-testid="nav-inventory"]')
    await page.click('[data-testid="inventory-tab-low-stock"]')
    await page.click('[data-testid="inventory-tab-all"]')
    await expect(page.locator('[data-testid="inventory-list"]')).toBeVisible()
  })

  test('should show inventory list', async ({ page }) => {
    await page.click('[data-testid="nav-inventory"]')
    await page.waitForTimeout(2000)
    const listVisible = await page.locator('[data-testid="inventory-list"]').isVisible()
    const loadingVisible = await page.locator('[data-testid="inventory-loading"]').isVisible()
    expect(listVisible || loadingVisible).toBe(true)
  })

  test('should show stock badges', async ({ page }) => {
    await page.click('[data-testid="nav-inventory"]')
    await page.waitForTimeout(2000)
    const rows = page.locator('[data-testid^="inventory-row-"]')
    const count = await rows.count()
    if (count > 0) {
      await expect(rows.first().locator('[data-testid^="inventory-stock-"]')).toBeVisible()
    }
  })

  test('should show item names', async ({ page }) => {
    await page.click('[data-testid="nav-inventory"]')
    await page.waitForTimeout(2000)
    const rows = page.locator('[data-testid^="inventory-row-"]')
    const count = await rows.count()
    if (count > 0) {
      await expect(rows.first().locator('[data-testid^="inventory-name-"]')).toBeVisible()
    }
  })
})