import assert from "node:assert/strict";

const origin = process.env.COMMERCIAL_VERIFY_ORIGIN ?? "http://localhost:3000";

const commercialRoutes = [
  "/",
  "/visilearn",
  "/transcript",
  "/notion",
  "/pricing",
  "/compatibility",
  "/security",
  "/download",
  "/changelog",
  "/support",
  "/security/report",
  "/account",
  "/account/setup",
  "/account/downloads",
  "/account/devices",
  "/account/billing",
  "/account/support",
  "/legal/privacy",
  "/legal/terms",
  "/legal/eula",
  "/legal/billing",
  "/legal/acceptable-use",
  "/legal/third-party-services",
  "/legal/open-source",
];

const retainedRoutes = [
  "/queue",
  "/queue/about",
  "/queue/features",
  "/queue/how-it-works",
  "/queue/instructions",
  "/queue/pricing",
  "/queue/privacy",
  "/queue/support",
  "/queue/terms",
  "/queue/use-cases",
  "/games/living-atlas",
  "/guides",
  "/grade-calculator",
  "/visilearn/privacy",
];

const privatePrototypeRoutes = new Set([
  "/security/report",
  "/account",
  "/account/setup",
  "/account/downloads",
  "/account/devices",
  "/account/billing",
  "/account/support",
  "/legal/privacy",
  "/legal/terms",
  "/legal/eula",
  "/legal/billing",
  "/legal/acceptable-use",
  "/legal/third-party-services",
  "/legal/open-source",
]);

function matchMeta(html, name) {
  const tag = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>`, "i"))?.[0];
  return tag?.match(/content=["']([^"']*)["']/i)?.[1] ?? "";
}

async function verifyRoute(path) {
  const response = await fetch(new URL(path, origin), { redirect: "follow" });
  assert.equal(response.status, 200, `${path} returned ${response.status}`);

  const html = await response.text();
  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1, `${path} must render exactly one H1`);
  assert(html.match(/<title>[^<]+<\/title>/i), `${path} is missing a page title`);
  assert(matchMeta(html, "description"), `${path} is missing a meta description`);

  if (commercialRoutes.includes(path)) {
    const robots = matchMeta(html, "robots").toLowerCase();
    if (privatePrototypeRoutes.has(path)) {
      assert(robots.includes("noindex"), `${path} must be noindex`);
    } else {
      assert(!robots.includes("noindex"), `${path} must remain indexable`);
    }
  }
}

for (const path of [...commercialRoutes, ...retainedRoutes]) await verifyRoute(path);

console.log(`Verified ${commercialRoutes.length} commercial routes and ${retainedRoutes.length} retained routes at ${origin}.`);
