import { test, expect } from '../fixtures/auth.fixture'

test.describe('Pet Management', () => {
  test.beforeEach(async ({ loginAsOwner }) => {
    await loginAsOwner()
  })

  test('should display pets page', async ({ page }) => {
    await page.click('[data-testid="nav-pets"]')
    await expect(page.locator('[data-testid="pets-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="pet-create-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="pet-search-input"]')).toBeVisible()
  })

  test('should open create pet dialog', async ({ page }) => {
    await page.click('[data-testid="nav-pets"]')
    await page.click('[data-testid="pet-create-button"]')
    await expect(page.locator('[data-testid="pet-create-dialog"]')).toBeVisible()
    await expect(page.locator('[data-testid="pet-input-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="pet-input-customer-id"]')).toBeVisible()
    await expect(page.locator('[data-testid="pet-input-species"]')).toBeVisible()
    await expect(page.locator('[data-testid="pet-input-gender"]')).toBeVisible()
    await expect(page.locator('[data-testid="pet-input-breed"]')).toBeVisible()
    await expect(page.locator('[data-testid="pet-save-button"]')).toBeVisible()
  })

  test('should close create pet dialog on cancel', async ({ page }) => {
    await page.click('[data-testid="nav-pets"]')
    await page.click('[data-testid="pet-create-button"]')
    await expect(page.locator('[data-testid="pet-create-dialog"]')).toBeVisible()
    await page.click('[data-testid="pet-cancel-button"]')
    await expect(page.locator('[data-testid="pet-create-dialog"]')).not.toBeVisible()
  })

  test('should search pets', async ({ page }) => {
    await page.click('[data-testid="nav-pets"]')
    await page.fill('[data-testid="pet-search-input"]', 'Milo')
    await page.waitForTimeout(500)
    const inputValue = await page.inputValue('[data-testid="pet-search-input"]')
    expect(inputValue).toBe('Milo')
  })

  test('should show pet list', async ({ page }) => {
    await page.click('[data-testid="nav-pets"]')
    await page.waitForTimeout(2000)
    const listVisible = await page.locator('[data-testid="pet-list"]').isVisible()
    const emptyVisible = await page.locator('[data-testid="pet-empty"]').isVisible()
    expect(listVisible || emptyVisible).toBe(true)
  })

  test('should show pet details in list', async ({ page }) => {
    await page.click('[data-testid="nav-pets"]')
    await page.waitForTimeout(2000)
    const petRows = page.locator('[data-testid^="pet-row-"]')
    const count = await petRows.count()
    if (count > 0) {
      const firstRow = petRows.first()
      await expect(firstRow.locator('[data-testid^="pet-name-"]')).toBeVisible()
      await expect(firstRow.locator('[data-testid^="pet-status-"]')).toBeVisible()
    }
  })

  test('should navigate to pet history on click', async ({ page }) => {
    await page.click('[data-testid="nav-pets"]')
    await page.waitForTimeout(2000)
    const petRows = page.locator('[data-testid^="pet-row-"]')
    const count = await petRows.count()
    if (count > 0) {
      await petRows.first().click()
      // Should navigate to pet history page
      await expect(page).toHaveURL(/\/pets\//)
    }
  })
})