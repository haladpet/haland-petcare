import { test, expect } from '../fixtures/auth.fixture'

test.describe('POS & Payment', () => {
  test.beforeEach(async ({ loginAsOwner }) => {
    await loginAsOwner()
  })

  test('should display POS page', async ({ page }) => {
    await page.click('[data-testid="nav-pos"]')
    await expect(page.locator('[data-testid="pos-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="pos-invoice-list"]')).toBeVisible()
  })

  test('should show invoice list', async ({ page }) => {
    await page.click('[data-testid="nav-pos"]')
    await page.waitForTimeout(2000)
    const noInvoices = await page.locator('[data-testid="pos-no-invoices"]').isVisible()
    const invoiceButtons = page.locator('[data-testid^="pos-invoice-"]')
    const count = await invoiceButtons.count()
    expect(noInvoices || count > 0).toBe(true)
  })

  test('should show payment methods', async ({ page }) => {
    await page.click('[data-testid="nav-pos"]')
    await page.waitForTimeout(2000)
    // Payment methods should be visible when an invoice is selected
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

  test('should show numpad when invoice selected', async ({ page }) => {
    await page.click('[data-testid="nav-pos"]')
    await page.waitForTimeout(2000)
    const invoiceButtons = page.locator('[data-testid^="pos-invoice-"]')
    const count = await invoiceButtons.count()
    if (count > 0) {
      await invoiceButtons.first().click()
      await expect(page.locator('[data-testid="pos-numpad"]')).toBeVisible()
      await expect(page.locator('[data-testid="pos-numpad-1"]')).toBeVisible()
      await expect(page.locator('[data-testid="pos-numpad-0"]')).toBeVisible()
      await expect(page.locator('[data-testid="pos-numpad-clear"]')).toBeVisible()
    }
  })

  test('should show pay button when invoice selected', async ({ page }) => {
    await page.click('[data-testid="nav-pos"]')
    await page.waitForTimeout(2000)
    const invoiceButtons = page.locator('[data-testid^="pos-invoice-"]')
    const count = await invoiceButtons.count()
    if (count > 0) {
      await invoiceButtons.first().click()
      await expect(page.locator('[data-testid="pos-pay-button"]')).toBeVisible()
    }
  })

  test('should show total amount when invoice selected', async ({ page }) => {
    await page.click('[data-testid="nav-pos"]')
    await page.waitForTimeout(2000)
    const invoiceButtons = page.locator('[data-testid^="pos-invoice-"]')
    const count = await invoiceButtons.count()
    if (count > 0) {
      await invoiceButtons.first().click()
      await expect(page.locator('[data-testid="pos-total-amount"]')).toBeVisible()
    }
  })

  test('should show quick amount buttons', async ({ page }) => {
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
})