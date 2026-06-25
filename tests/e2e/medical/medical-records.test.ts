import { test, expect } from '../fixtures/auth.fixture'

test.describe('Medical Records', () => {
  test.beforeEach(async ({ loginAsOwner }) => {
    await loginAsOwner()
  })

  test('should display medical record page', async ({ page }) => {
    await page.click('[data-testid="nav-new-record"]')
    await expect(page.locator('[data-testid="medical-record-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="medical-record-patient-info"]')).toBeVisible()
  })

  test('should show all tabs', async ({ page }) => {
    await page.click('[data-testid="nav-new-record"]')
    await expect(page.locator('[data-testid="medical-record-tab-physical"]')).toBeVisible()
    await expect(page.locator('[data-testid="medical-record-tab-findings"]')).toBeVisible()
    await expect(page.locator('[data-testid="medical-record-tab-prescription"]')).toBeVisible()
  })

  test('should switch between tabs', async ({ page }) => {
    await page.click('[data-testid="nav-new-record"]')
    await page.click('[data-testid="medical-record-tab-findings"]')
    await expect(page.locator('[data-testid="medical-record-findings"]')).toBeVisible()
    await page.click('[data-testid="medical-record-tab-prescription"]')
    await expect(page.locator('[data-testid="medical-record-prescription"]')).toBeVisible()
    await page.click('[data-testid="medical-record-tab-physical"]')
    await expect(page.locator('[data-testid="medical-record-physical-exam"]')).toBeVisible()
  })

  test('should show physical exam inputs', async ({ page }) => {
    await page.click('[data-testid="nav-new-record"]')
    await expect(page.locator('[data-testid="medical-record-input-bcs"]')).toBeVisible()
    await expect(page.locator('[data-testid="medical-record-input-temperature"]')).toBeVisible()
    await expect(page.locator('[data-testid="medical-record-input-heart-rate"]')).toBeVisible()
    await expect(page.locator('[data-testid="medical-record-input-weight"]')).toBeVisible()
  })

  test('should show findings inputs', async ({ page }) => {
    await page.click('[data-testid="nav-new-record"]')
    await page.click('[data-testid="medical-record-tab-findings"]')
    await expect(page.locator('[data-testid="medical-record-input-complaint"]')).toBeVisible()
    await expect(page.locator('[data-testid="medical-record-input-diagnosis"]')).toBeVisible()
    await expect(page.locator('[data-testid="medical-record-input-treatment"]')).toBeVisible()
    await expect(page.locator('[data-testid="medical-record-input-notes"]')).toBeVisible()
  })

  test('should have save and cancel buttons', async ({ page }) => {
    await page.click('[data-testid="nav-new-record"]')
    await expect(page.locator('[data-testid="medical-record-save-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="medical-record-cancel-button"]')).toBeVisible()
  })

  test('should show patient selection dropdowns', async ({ page }) => {
    await page.click('[data-testid="nav-new-record"]')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="medical-record-select-customer"]')).toBeVisible()
    await expect(page.locator('[data-testid="medical-record-select-pet"]')).toBeVisible()
    await expect(page.locator('[data-testid="medical-record-select-visit-type"]')).toBeVisible()
  })
})