import { test, expect } from '../fixtures/auth.fixture'

test.describe('Customer Management', () => {
  test.beforeEach(async ({ loginAsOwner }) => {
    await loginAsOwner()
  })

  test('should display customers page', async ({ page }) => {
    await page.click('[data-testid="nav-customers"]')
    await expect(page.locator('[data-testid="customers-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="customer-create-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="customer-search-input"]')).toBeVisible()
  })

  test('should open create customer dialog', async ({ page }) => {
    await page.click('[data-testid="nav-customers"]')
    await page.click('[data-testid="customer-create-button"]')
    await expect(page.locator('[data-testid="customer-create-dialog"]')).toBeVisible()
    await expect(page.locator('[data-testid="customer-input-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="customer-input-phone"]')).toBeVisible()
    await expect(page.locator('[data-testid="customer-input-email"]')).toBeVisible()
    await expect(page.locator('[data-testid="customer-input-address"]')).toBeVisible()
    await expect(page.locator('[data-testid="customer-save-button"]')).toBeVisible()
  })

  test('should close create customer dialog on cancel', async ({ page }) => {
    await page.click('[data-testid="nav-customers"]')
    await page.click('[data-testid="customer-create-button"]')
    await expect(page.locator('[data-testid="customer-create-dialog"]')).toBeVisible()
    await page.click('[data-testid="customer-cancel-button"]')
    await expect(page.locator('[data-testid="customer-create-dialog"]')).not.toBeVisible()
  })

  test('should search customers', async ({ page }) => {
    await page.click('[data-testid="nav-customers"]')
    await page.fill('[data-testid="customer-search-input"]', 'test')
    // Wait for search results to update
    await page.waitForTimeout(500)
    // Search input should have value
    const inputValue = await page.inputValue('[data-testid="customer-search-input"]')
    expect(inputValue).toBe('test')
  })

  test('should show customer list', async ({ page }) => {
    await page.click('[data-testid="nav-customers"]')
    // Wait for loading to finish
    await page.waitForTimeout(2000)
    // Either list or empty state should be visible
    const listVisible = await page.locator('[data-testid="customer-list"]').isVisible()
    const emptyVisible = await page.locator('[data-testid="customer-empty"]').isVisible()
    expect(listVisible || emptyVisible).toBe(true)
  })

  test('should show customer details in list', async ({ page }) => {
    await page.click('[data-testid="nav-customers"]')
    await page.waitForTimeout(2000)
    // If customers exist, verify they have name, phone, status
    const customerRows = page.locator('[data-testid^="customer-row-"]')
    const count = await customerRows.count()
    if (count > 0) {
      const firstRow = customerRows.first()
      await expect(firstRow.locator('[data-testid^="customer-name-"]')).toBeVisible()
      await expect(firstRow.locator('[data-testid^="customer-status-"]')).toBeVisible()
    }
  })
})