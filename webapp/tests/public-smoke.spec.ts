import { expect, test } from "@playwright/test";

test("QueueMaster is the production entry point", async ({ request }) => {
  const response = await request.get("/", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("/queue");
});

test("former Fourth Canal pages are no longer published", async ({ request }) => {
  for (const route of [
    "/about",
    "/admin",
    "/calendar",
    "/games",
    "/grade-calculator",
    "/guides",
    "/home",
    "/support",
  ]) {
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe("/queue");
  }
});

test("required legal and extension privacy pages remain published", async ({ page }) => {
  await page.goto("/legal");
  await expect(page.getByRole("heading", { name: /legal center/i })).toBeVisible();

  await page.goto("/visilearn/privacy");
  await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
});

test("robots and sitemap reflect the pilot publication boundary", async ({ request }) => {
  const [robots, sitemap] = await Promise.all([request.get("/robots.txt"), request.get("/sitemap.xml")]);
  await expect(robots).toBeOK();
  await expect(sitemap).toBeOK();

  const robotsText = await robots.text();
  expect(robotsText).toContain("Disallow: /");

  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("https://fourthcanal.com/legal");
  expect(sitemapText).toContain("https://fourthcanal.com/visilearn/privacy");
  expect(sitemapText).not.toContain("https://fourthcanal.com/support");
  expect(sitemapText).not.toContain("https://fourthcanal.com/games");
  expect(sitemapText).not.toContain("https://fourthcanal.com/guides");
});
