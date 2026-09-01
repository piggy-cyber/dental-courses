import { expect, test } from "@playwright/test";

test("QueueMaster is the production entry point", async ({ request }) => {
  const response = await request.get("/", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  const legacy = await request.get("/queue", { maxRedirects: 0 });
  expect(legacy.status()).toBe(308);
  expect(legacy.headers().location).toBe("/");
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
    expect(response.headers().location).toBe("/");
  }
});

test("required legal and extension privacy pages remain published", async ({ page }) => {
  await page.goto("/legal");
  await expect(page).toHaveURL(/\/queue\/privacy$/);
  await expect(page.getByRole("heading", { name: /queuemaster privacy policy/i })).toBeVisible();

  await page.goto("/queue/terms");
  await expect(page.getByRole("heading", { name: /queuemaster terms of service/i })).toBeVisible();

  await page.goto("/visilearn/privacy");
  await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
});

test("robots and sitemap reflect the pilot publication boundary", async ({ request }) => {
  const [robots, sitemap] = await Promise.all([request.get("/robots.txt"), request.get("/sitemap.xml")]);
  await expect(robots).toBeOK();
  await expect(sitemap).toBeOK();

  const robotsText = await robots.text();
  expect(robotsText).toContain("Disallow: /queue/dashboard");
  expect(robotsText).toContain("Disallow: /queue/r/");

  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("https://fourthcanal.com/queue/privacy");
  expect(sitemapText).toContain("https://fourthcanal.com/queue/terms");
  expect(sitemapText).toContain("https://fourthcanal.com/queue/about");
  expect(sitemapText).toContain("https://fourthcanal.com/queue/instructions");
  expect(sitemapText).not.toContain("https://fourthcanal.com/legal");
  expect(sitemapText).toContain("https://fourthcanal.com/visilearn/privacy");
  expect(sitemapText).not.toContain("https://fourthcanal.com/support");
  expect(sitemapText).not.toContain("https://fourthcanal.com/games");
  expect(sitemapText).not.toContain("https://fourthcanal.com/guides");
});
