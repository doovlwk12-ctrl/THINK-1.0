import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('loads and shows packages section', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /باقات الخدمة|Service Packages/i })).toBeVisible({ timeout: 15000 })
  })

  test('packages section has content or loading state', async ({ page }) => {
    await page.goto('/')
    const packagesSection = page.locator('#packages').or(page.getByText(/باقات الخدمة|اختر الباقة/)).first()
    await expect(packagesSection).toBeVisible({ timeout: 15000 })
  })
})
