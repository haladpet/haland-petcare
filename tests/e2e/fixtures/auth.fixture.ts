import { test as base, type Page } from '@playwright/test'

export interface AuthFixtures {
  loginAsOwner: () => Promise<void>
  loginAsStaff: () => Promise<void>
  loginAsCustomer: () => Promise<void>
  logout: () => Promise<void>
}

export const test = base.extend<AuthFixtures>({
  loginAsOwner: async ({ page }, use) => {
    await use(async () => {
      await page.goto('/login')
      await page.fill('[data-testid="email-input"]', 'owner@halandpetcare.com')
      await page.fill('[data-testid="password-input"]', 'owner123')
      await page.click('[data-testid="login-submit-button"]')
      await page.waitForURL('**/dashboard')
    })
  },
  loginAsStaff: async ({ page }, use) => {
    await use(async () => {
      await page.goto('/login')
      await page.fill('[data-testid="email-input"]', 'staff@halandpetcare.com')
      await page.fill('[data-testid="password-input"]', 'staff123')
      await page.click('[data-testid="login-submit-button"]')
      await page.waitForURL('**/dashboard')
    })
  },
  loginAsCustomer: async ({ page }, use) => {
    await use(async () => {
      await page.goto('/login')
      await page.fill('[data-testid="email-input"]', 'customer@halandpetcare.com')
      await page.fill('[data-testid="password-input"]', 'customer123')
      await page.click('[data-testid="login-submit-button"]')
      await page.waitForURL('**/dashboard')
    })
  },
  logout: async ({ page }, use) => {
    await use(async () => {
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      await page.goto('/login')
    })
  },
})

export { expect } from '@playwright/test'