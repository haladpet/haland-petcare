import { test, expect } from '../fixtures/auth.fixture'

test.describe('Offline Mode', () => {
  test.beforeEach(async ({ loginAsOwner }) => {
    await loginAsOwner()
  })

  test('should show offline banner when offline', async ({ page, context }) => {
    await context.setOffline(true)
    await page.goto('/login')
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible()
    await context.setOffline(false)
  })

  test('should still display dashboard when offline', async ({ page, context }) => {
    await context.setOffline(true)
    await page.goto('/')
    await page.waitForTimeout(1000)
    // Dashboard layout should still be visible (cached/local data)
    const layoutVisible = await page.locator('[data-testid="dashboard-layout"]').isVisible()
    expect(layoutVisible).toBe(true)
    await context.setOffline(false)
  })

  test('should show customers page from local data when offline', async ({ page, context }) => {
    // First load data while online
    await page.click('[data-testid="nav-customers"]')
    await page.waitForTimeout(2000)

    // Then go offline
    await context.setOffline(true)
    await page.goto('/customers')
    await page.waitForTimeout(2000)

    // Page should still render (from local cache)
    const pageVisible = await page.locator('[data-testid="customers-page"]').isVisible()
    expect(pageVisible).toBe(true)
    await context.setOffline(false)
  })

  test('should show pets page from local data when offline', async ({ page, context }) => {
    await page.click('[data-testid="nav-pets"]')
    await page.waitForTimeout(2000)

    await context.setOffline(true)
    await page.goto('/pets')
    await page.waitForTimeout(2000)

    const pageVisible = await page.locator('[data-testid="pets-page"]').isVisible()
    expect(pageVisible).toBe(true)
    await context.setOffline(false)
  })

  test('should show queue page from local data when offline', async ({ page, context }) => {
    await page.click('[data-testid="nav-queue"]')
    await page.waitForTimeout(2000)

    await context.setOffline(true)
    await page.goto('/queue')
    await page.waitForTimeout(2000)

    const pageVisible = await page.locator('[data-testid="queue-page"]').isVisible()
    expect(pageVisible).toBe(true)
    await context.setOffline(false)
  })

  test('should show inventory page from local data when offline', async ({ page, context }) => {
    await page.click('[data-testid="nav-inventory"]')
    await page.waitForTimeout(2000)

    await context.setOffline(true)
    await page.goto('/inventory')
    await page.waitForTimeout(2000)

    const pageVisible = await page.locator('[data-testid="inventory-page"]').isVisible()
    expect(pageVisible).toBe(true)
    await context.setOffline(false)
  })

  test('should show appointments page from local data when offline', async ({ page, context }) => {
    await page.click('[data-testid="nav-appointments"]')
    await page.waitForTimeout(2000)

    await context.setOffline(true)
    await page.goto('/appointments')
    await page.waitForTimeout(2000)

    const pageVisible = await page.locator('[data-testid="appointments-page"]').isVisible()
    expect(pageVisible).toBe(true)
    await context.setOffline(false)
  })

  test('should show medical record page from local data when offline', async ({ page, context }) => {
    await page.click('[data-testid="nav-new-record"]')
    await page.waitForTimeout(2000)

    await context.setOffline(true)
    await page.goto('/medical-records/new')
    await page.waitForTimeout(2000)

    const pageVisible = await page.locator('[data-testid="medical-record-page"]').isVisible()
    expect(pageVisible).toBe(true)
    await context.setOffline(false)
  })
})