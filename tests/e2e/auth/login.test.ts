import { test, expect } from '../fixtures/auth.fixture'

test.describe('Authentication', () => {
  test('should display login page with all elements', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('[data-testid="login-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-submit-button"]')).toBeVisible()
  })

  test('should show error on empty form submission', async ({ page }) => {
    await page.goto('/login')
    await page.click('[data-testid="login-submit-button"]')
    // Form submits with empty fields - should show error from API
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 10000 })
  })

  test('should show error with wrong password', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'owner@halandpetcare.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-submit-button"]')
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 10000 })
  })

  test('should show error for non-existent user', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'nonexistent@test.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-submit-button"]')
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 10000 })
  })

  test('should login successfully as owner', async ({ page, loginAsOwner }) => {
    await loginAsOwner()
    await expect(page.locator('[data-testid="dashboard-layout"]')).toBeVisible()
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-role"]')).toContainText('OWNER')
  })

  test('should login successfully as staff', async ({ page, loginAsStaff }) => {
    await loginAsStaff()
    await expect(page.locator('[data-testid="dashboard-layout"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-role"]')).toContainText('STAFF')
  })

  test('should login successfully as customer', async ({ page, loginAsCustomer }) => {
    await loginAsCustomer()
    await expect(page.locator('[data-testid="dashboard-layout"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-role"]')).toContainText('CUSTOMER')
  })

  test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/')
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('should show user name in sidebar after login', async ({ page, loginAsOwner }) => {
    await loginAsOwner()
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-name"]')).not.toBeEmpty()
  })

  test('should persist session across page reload', async ({ page, loginAsOwner }) => {
    await loginAsOwner()
    await page.reload()
    await expect(page.locator('[data-testid="dashboard-layout"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-role"]')).toContainText('OWNER')
  })
})