import { expect, test } from "@playwright/test"

test("login/register page loads", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveURL(/\/$/)
})

test("home page is reachable", async ({ page }) => {
  await page.goto("/home")
  await expect(page).toHaveURL(/\/home$/)
})
