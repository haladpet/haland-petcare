import { test, expect } from '../fixtures/auth.fixture'

test.describe('RBAC — Role-Based Access Control', () => {
  test.describe('OWNER access', () => {
    test('should see all navigation items', async ({ page, loginAsOwner }) => {
      await loginAsOwner()
      const navItems = [
        'nav-dashboard', 'nav-customers', 'nav-pets', 'nav-queue',
        'nav-appointments', 'nav-new-record', 'nav-cages', 'nav-pos',
        'nav-inventory', 'nav-reports', 'nav-audit-log', 'nav-conflicts',
        'nav-devices',
      ]
      for (const item of navItems) {
        await expect(page.locator(`[data-testid="${item}"]`)).toBeVisible()
      }
    })

    test('should access customers page', async ({ page, loginAsOwner }) => {
      await loginAsOwner()
      await page.click('[data-testid="nav-customers"]')
      await expect(page.locator('[data-testid="customers-page"]')).toBeVisible()
    })

    test('should access inventory page', async ({ page, loginAsOwner }) => {
      await loginAsOwner()
      await page.click('[data-testid="nav-inventory"]')
      await expect(page.locator('[data-testid="inventory-page"]')).toBeVisible()
    })

    test('should access POS page', async ({ page, loginAsOwner }) => {
      await loginAsOwner()
      await page.click('[data-testid="nav-pos"]')
      await expect(page.locator('[data-testid="pos-page"]')).toBeVisible()
    })

    test('should access appointments page', async ({ page, loginAsOwner }) => {
      await loginAsOwner()
      await page.click('[data-testid="nav-appointments"]')
      await expect(page.locator('[data-testid="appointments-page"]')).toBeVisible()
    })

    test('should access queue page', async ({ page, loginAsOwner }) => {
      await loginAsOwner()
      await page.click('[data-testid="nav-queue"]')
      await expect(page.locator('[data-testid="queue-page"]')).toBeVisible()
    })

    test('should access medical records page', async ({ page, loginAsOwner }) => {
      await loginAsOwner()
      await page.click('[data-testid="nav-new-record"]')
      await expect(page.locator('[data-testid="medical-record-page"]')).toBeVisible()
    })
  })

  test.describe('STAFF restricted access', () => {
    test('should NOT see admin-only nav items', async ({ page, loginAsStaff }) => {
      await loginAsStaff()
      // Staff should not see these
      await expect(page.locator('[data-testid="nav-audit-log"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="nav-conflicts"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="nav-devices"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="nav-new-record"]')).not.toBeVisible()
    })

    test('should see operational nav items', async ({ page, loginAsStaff }) => {
      await loginAsStaff()
      await expect(page.locator('[data-testid="nav-customers"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-pets"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-queue"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-inventory"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-pos"]')).toBeVisible()
    })

    test('should access inventory page', async ({ page, loginAsStaff }) => {
      await loginAsStaff()
      await page.click('[data-testid="nav-inventory"]')
      await expect(page.locator('[data-testid="inventory-page"]')).toBeVisible()
    })

    test('should access POS page', async ({ page, loginAsStaff }) => {
      await loginAsStaff()
      await page.click('[data-testid="nav-pos"]')
      await expect(page.locator('[data-testid="pos-page"]')).toBeVisible()
    })

    test('should access queue page', async ({ page, loginAsStaff }) => {
      await loginAsStaff()
      await page.click('[data-testid="nav-queue"]')
      await expect(page.locator('[data-testid="queue-page"]')).toBeVisible()
    })
  })

  test.describe('CUSTOMER restricted access', () => {
    test('should NOT see any nav items except dashboard', async ({ page, loginAsCustomer }) => {
      await loginAsCustomer()
      // Customer should not see operational items
      await expect(page.locator('[data-testid="nav-customers"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="nav-pets"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="nav-queue"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="nav-inventory"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="nav-pos"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="nav-new-record"]')).not.toBeVisible()
    })

    test('should be redirected when accessing protected page directly', async ({ page, loginAsCustomer }) => {
      await loginAsCustomer()
      await page.goto('/inventory')
      // Should redirect or show 403
      await expect(page).not.toHaveURL(/\/inventory/)
    })
  })

  test.describe('HTTP 403 enforcement', () => {
    test('API returns 403 for unauthorized role', async ({ page, loginAsStaff }) => {
      await loginAsStaff()
      const response = await page.request.post('/api/medical-records', {
        data: { clinic_id: 'test', customer_id: 'test', pet_id: 'test' },
      })
      expect(response.status()).toBe(403)
    })

    test('API returns 403 for customer accessing admin endpoint', async ({ page, loginAsCustomer }) => {
      await loginAsCustomer()
      const response = await page.request.get('/api/inventory')
      expect(response.status()).toBe(403)
    })
  })
})