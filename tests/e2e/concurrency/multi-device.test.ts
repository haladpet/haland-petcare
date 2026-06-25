import { test, expect } from '../fixtures/auth.fixture'

test.describe('Multi-Device Concurrency', () => {
  test('Device A and Device B can login simultaneously', async ({ browser }) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    await pageA.goto('/login')
    await pageA.fill('[data-testid="email-input"]', 'owner@halandpetcare.com')
    await pageA.fill('[data-testid="password-input"]', 'owner123')
    await pageA.click('[data-testid="login-submit-button"]')
    await pageA.waitForURL('**/dashboard')

    await pageB.goto('/login')
    await pageB.fill('[data-testid="email-input"]', 'staff@halandpetcare.com')
    await pageB.fill('[data-testid="password-input"]', 'staff123')
    await pageB.click('[data-testid="login-submit-button"]')
    await pageB.waitForURL('**/dashboard')

    await expect(pageA.locator('[data-testid="dashboard-layout"]')).toBeVisible()
    await expect(pageB.locator('[data-testid="dashboard-layout"]')).toBeVisible()

    await contextA.close()
    await contextB.close()
  })

  test('Device A and Device B can view customers simultaneously', async ({ browser }) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    await pageA.goto('/login')
    await pageA.fill('[data-testid="email-input"]', 'owner@halandpetcare.com')
    await pageA.fill('[data-testid="password-input"]', 'owner123')
    await pageA.click('[data-testid="login-submit-button"]')
    await pageA.waitForURL('**/dashboard')

    await pageB.goto('/login')
    await pageB.fill('[data-testid="email-input"]', 'staff@halandpetcare.com')
    await pageB.fill('[data-testid="password-input"]', 'staff123')
    await pageB.click('[data-testid="login-submit-button"]')
    await pageB.waitForURL('**/dashboard')

    await pageA.goto('/customers')
    await pageB.goto('/customers')
    await pageA.waitForTimeout(2000)
    await pageB.waitForTimeout(2000)

    await expect(pageA.locator('[data-testid="customers-page"]')).toBeVisible()
    await expect(pageB.locator('[data-testid="customers-page"]')).toBeVisible()

    await contextA.close()
    await contextB.close()
  })

  test('Device A and Device B can view inventory simultaneously', async ({ browser }) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    await pageA.goto('/login')
    await pageA.fill('[data-testid="email-input"]', 'owner@halandpetcare.com')
    await pageA.fill('[data-testid="password-input"]', 'owner123')
    await pageA.click('[data-testid="login-submit-button"]')
    await pageA.waitForURL('**/dashboard')

    await pageB.goto('/login')
    await pageB.fill('[data-testid="email-input"]', 'staff@halandpetcare.com')
    await pageB.fill('[data-testid="password-input"]', 'staff123')
    await pageB.click('[data-testid="login-submit-button"]')
    await pageB.waitForURL('**/dashboard')

    await pageA.goto('/inventory')
    await pageB.goto('/inventory')
    await pageA.waitForTimeout(2000)
    await pageB.waitForTimeout(2000)

    await expect(pageA.locator('[data-testid="inventory-page"]')).toBeVisible()
    await expect(pageB.locator('[data-testid="inventory-page"]')).toBeVisible()

    await contextA.close()
    await contextB.close()
  })

  test('Device A and Device B can view appointments simultaneously', async ({ browser }) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    await pageA.goto('/login')
    await pageA.fill('[data-testid="email-input"]', 'owner@halandpetcare.com')
    await pageA.fill('[data-testid="password-input"]', 'owner123')
    await pageA.click('[data-testid="login-submit-button"]')
    await pageA.waitForURL('**/dashboard')

    await pageB.goto('/login')
    await pageB.fill('[data-testid="email-input"]', 'staff@halandpetcare.com')
    await pageB.fill('[data-testid="password-input"]', 'staff123')
    await pageB.click('[data-testid="login-submit-button"]')
    await pageB.waitForURL('**/dashboard')

    await pageA.goto('/appointments')
    await pageB.goto('/appointments')
    await pageA.waitForTimeout(2000)
    await pageB.waitForTimeout(2000)

    await expect(pageA.locator('[data-testid="appointments-page"]')).toBeVisible()
    await expect(pageB.locator('[data-testid="appointments-page"]')).toBeVisible()

    await contextA.close()
    await contextB.close()
  })

  test('Device A and Device B can view queue simultaneously', async ({ browser }) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    await pageA.goto('/login')
    await pageA.fill('[data-testid="email-input"]', 'owner@halandpetcare.com')
    await pageA.fill('[data-testid="password-input"]', 'owner123')
    await pageA.click('[data-testid="login-submit-button"]')
    await pageA.waitForURL('**/dashboard')

    await pageB.goto('/login')
    await pageB.fill('[data-testid="email-input"]', 'staff@halandpetcare.com')
    await pageB.fill('[data-testid="password-input"]', 'staff123')
    await pageB.click('[data-testid="login-submit-button"]')
    await pageB.waitForURL('**/dashboard')

    await pageA.goto('/queue')
    await pageB.goto('/queue')
    await pageA.waitForTimeout(2000)
    await pageB.waitForTimeout(2000)

    await expect(pageA.locator('[data-testid="queue-page"]')).toBeVisible()
    await expect(pageB.locator('[data-testid="queue-page"]')).toBeVisible()

    await contextA.close()
    await contextB.close()
  })
})