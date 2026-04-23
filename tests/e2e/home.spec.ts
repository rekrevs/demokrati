import { test, expect } from "@playwright/test";

test.describe("home page localisation", () => {
  test("Swedish locale: LTR, correct heading", async ({ page }) => {
    await page.goto("/sv");
    await expect(page.locator("html")).toHaveAttribute("lang", "sv");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("heading", { name: "demokrati" })).toBeVisible();
    await expect(page.getByText(/Akt I — AI som demokratisk lins/)).toBeVisible();
  });

  test("English locale: LTR, English content", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByText(/Act I — AI as a democratic lens/)).toBeVisible();
  });

  test("Arabic locale: RTL direction", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByText(/الفصل الأول/)).toBeVisible();
  });

  test("root path redirects into a locale", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(sv|en|ar)(\/|$)/);
  });

  test("language switcher navigates between locales", async ({ page }) => {
    await page.goto("/sv");
    const switcher = page.getByTestId("language-switcher");
    await expect(switcher).toBeVisible();

    await switcher.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await switcher.getByRole("link", { name: "العربية" }).click();
    await expect(page).toHaveURL(/\/ar/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
});
