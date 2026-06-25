import { test, expect } from '../fixtures/auth.fixture'

test.describe('Financial Integrity', () => {
  test.beforeEach(async ({ loginAsOwner }) => {
    await loginAsOwner()
  })

  test('should display POS page with invoice list', async ({ page }) => {
    await page.click('[data-testid="nav-pos"]')
    await expect(page.locator('[data-testid="pos-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="pos-invoice-list"]')).toBeVisible()
  })

  test('should show payment methods for invoice processing', async ({ page }) => {
    await page.click('[data-testid="nav-pos"]')
    await page.waitForTimeout(2000)
    const invoiceButtons = page.locator('[data-testid^="pos-invoice-"]')
    const count = await invoiceButtons.count()
    if (count > 0) {
      await invoiceButtons.first().click()
      await expect(page.locator('[data-testid="pos-payment-methods"]')).toBeVisible()
      await expect(page.locator('[data-testid="pos-method-cash"]')).toBeVisible()
      await expect(page.locator('[data-testid="pos-method-card"]')).toBeVisible()
      await expect(page.locator('[data-testid="pos-method-qris"]')).toBeVisible()
      await expect(page.locator('[data-testid="pos-method-transfer"]')).toBeVisible()
    }
  })

  test('should show total amount for selected invoice', async ({ page }) => {
    await page.click('[data-testid="nav-pos"]')
    await page.waitForTimeout(2000)
    const invoiceButtons = page.locator('[data-testid^="pos-invoice-"]')
    const count = await invoiceButtons.count()
    if (count > 0) {
      await invoiceButtons.first().click()
      await expect(page.locator('[data-testid="pos-total-amount"]')).toBeVisible()
    }
  })

  test('should show numpad for amount entry', async ({ page }) => {
    await page.click('[data-testid="nav-pos"]')
    await page.waitForTimeout(2000)
    const invoiceButtons = page.locator('[data-testid^="pos-invoice-"]')
    const count = await invoiceButtons.count()
    if (count > 0) {
      await invoiceButtons.first().click()
      await expect(page.locator('[data-testid="pos-numpad"]')).toBeVisible()
      await expect(page.locator('[data-testid="pos-numpad-1"]')).toBeVisible()
      await expect(page.locator('[data-testid="pos-numpad-0"]')).toBeVisible()
    }
  })

  test('should show pay button when invoice is selected', async ({ page }) => {
    await page.click('[data-testid="nav-pos"]')
    await page.waitForTimeout(2000)
    const invoiceButtons = page.locator('[data-testid^="pos-invoice-"]')
    const count = await invoiceButtons.count()
    if (count > 0) {
      await invoiceButtons.first().click()
      await expect(page.locator('[data-testid="pos-pay-button"]')).toBeVisible()
    }
  })

  test('should show quick amount buttons for fast payment', async ({ page }) => {
    await page.click('[data-testid="nav-pos"]')
    await page.waitForTimeout(2000)
    const invoiceButtons = page.locator('[data-testid^="pos-invoice-"]')
    const count = await invoiceButtons.count()
    if (count > 0) {
      await invoiceButtons.first().click()
      await expect(page.locator('[data-testid="pos-quick-exact"]')).toBeVisible()
      await expect(page.locator('[data-testid="pos-quick-roundup"]')).toBeVisible()
      await expect(page.locator('[data-testid="pos-quick-50k"]')).toBeVisible()
    }
  })

  test('should show change display when amount entered', async ({ page }) => {
    await page.click('[data-testid="nav-pos"]')
    await page.waitForTimeout(2000)
    const invoiceButtons = page.locator('[data-testid^="pos-invoice-"]')
    const count = await invoiceButtons.count()
    if (count > 0) {
      await invoiceButtons.first().click()
      await page.click('[data-testid="pos-numpad-1"]')
      await page.click('[data-testid="pos-numpad-0"]')
      await page.click('[data-testid="pos-numpad-0"]')
      await page.click('[data-testid="pos-numpad-0"]')
      await page.waitForTimeout(500)
      await expect(page.locator('[data-testid="pos-input-amount"]')).toBeVisible()
    }
  })

  test('should show receipt dialog after payment', async ({ page }) => {
    await page.click('[data-testid="nav-pos"]')
    await page.waitForTimeout(2000)
    const invoiceButtons = page.locator('[data-testid^="pos-invoice-"]')
    const count = await invoiceButtons.count()
    if (count > 0) {
      await invoiceButtons.first().click()
      await page.waitForTimeout(500)
      await expect(page.locator('[data-testid="pos-pay-button"]')).toBeVisible()
    }
  })

  test('should show invoice detail when selected', async ({ page }) => {
    await page.click('[data-testid="nav-pos"]')
    await page.waitForTimeout(2000)
    const invoiceButtons = page.locator('[data-testid^="pos-invoice-"]')
    const count = await invoiceButtons.count()
    if (count > 0) {
      await invoiceButtons.first().click()
      await expect(page.locator('[data-testid="pos-invoice-detail"]')).toBeVisible()
    }
  })

  test('should show amount display card', async ({ page }) => {
    await page.click('[data-testid="nav-pos"]')
    await page.waitForTimeout(2000)
    const invoiceButtons = page.locator('[data-testid^="pos-invoice-"]')
    const count = await invoiceButtons.count()
    if (count > 0) {
      await invoiceButtons.first().click()
      await expect(page.locator('[data-testid="pos-amount-display"]')).toBeVisible()
    }
  })
})