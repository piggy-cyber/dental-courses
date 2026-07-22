import { expect, test } from "@playwright/test";

test("public navigation and grade calculator are usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /look closer/i })).toBeVisible();
  await page.getByRole("link", { name: /grade calculator/i }).first().click();
  await expect(page.getByRole("heading", { name: /know where you stand/i })).toBeVisible();
});

test("Living Atlas has a public preview while its workspace stays protected", async ({ page }) => {
  await page.goto("/games/living-atlas");
  await expect(page.getByRole("heading", { name: /study the detail/i })).toBeVisible();
  await expect(page.getByText(/the working question library is not/i)).toBeVisible();

  await page.goto("/games/living-atlas/performance");
  await expect(page).toHaveURL(/\/games\/living-atlas\?access=founder$/);
});

test("404 recovery, robots, and sitemap expose only public routes", async ({ page, request }) => {
  await page.goto("/not-a-real-route");
  await expect(page.getByRole("heading", { name: /this page is missing/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /return home/i })).toBeVisible();

  const [robots, sitemap] = await Promise.all([request.get("/robots.txt"), request.get("/sitemap.xml")]);
  await expect(robots).toBeOK();
  await expect(sitemap).toBeOK();
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("https://fourthcanal.com/support");
  expect(sitemapText).toContain("https://fourthcanal.com/games/living-atlas");
  expect(sitemapText).not.toContain("/admin");
  expect(sitemapText).not.toContain("?view=");
});

test("protected pages redirect without a session", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/$/);
});
