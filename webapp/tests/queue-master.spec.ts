import { expect, test, type Locator, type Page } from "@playwright/test";
import jsQR from "jsqr";
import { PNG } from "pngjs";

const lobby = { id: "10000000-0000-4000-8000-000000000001", name: "Demo Classroom", slug: "demo-lobby", ownerProfileId: "20000000-0000-4000-8000-000000000001", revision: 7, createdAt: "2026-09-01T12:00:00.000Z", closedAt: null };
const owner = { id: "30000000-0000-4000-8000-000000000001", lobbyId: lobby.id, profileId: lobby.ownerProfileId, role: "owner", displayName: "Owner One", acceptingGuests: true, lastSeenAt: "2099-01-01T00:00:00.000Z", isOnline: true, isAvailable: true, revokedAt: null };
const candidate = { id: "40000000-0000-4000-8000-000000000001", lobbyId: lobby.id, profileId: "20000000-0000-4000-8000-000000000002", displayName: "Candidate One", email: "candidate@example.com", joinedAt: "2026-09-01T12:00:00.000Z", lastSeenAt: "2099-01-01T00:00:00.000Z", leftAt: null, isOnline: true };
const request = { id: "50000000-0000-4000-8000-000000000001", lobbyId: lobby.id, lobbyName: lobby.name, lobbySlug: lobby.slug, candidateId: candidate.id, candidateProfileId: candidate.profileId, candidateName: candidate.displayName, candidateEmail: candidate.email, requestedByOwnerProfileId: owner.profileId, status: "pending", expiresAt: "2099-01-02T00:00:00.000Z", respondedAt: null, cancelledAt: null, createdAt: "2026-09-01T12:00:00.000Z" };

const staffCard = { id: owner.id, displayName: owner.displayName, acceptingGuests: true, isOnline: true, isAvailable: true, waitingCount: 1, activeEntry: null };
const waitingEntry = { id: "60000000-0000-4000-8000-000000000001", lobbyId: lobby.id, guestFirstName: "Alex", location: "Desk 12", assignedMembershipId: owner.id, assignedStaffName: owner.displayName, status: "waiting", sortPosition: 1000, createdAt: "2026-09-01T12:00:00.000Z", calledAt: null, helpingAt: null, finishedAt: null };

async function decodeQr(locator: Locator) {
  const image = PNG.sync.read(await locator.getByRole("img").screenshot());
  const pixels = new Uint8ClampedArray(image.data.buffer, image.data.byteOffset, image.data.byteLength);
  return jsQR(pixels, image.width, image.height)?.data ?? null;
}

async function mockQueueApi(page: Page) {
  await page.route("**/api/queue/r/demo-lobby/**", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() !== "GET") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, redirectTo: null }) });
    const view = url.searchParams.get("view");
    const snapshot = view === "admin"
      ? { kind: "admin", lobby, me: owner, memberships: [owner], candidates: [candidate], promotionRequests: [], entries: [waitingEntry] }
      : view === "staff"
        ? { kind: "staff", lobby, candidate, membership: null, promotionRequests: [request] }
        : view === "display"
          ? { kind: "display", lobby, staff: [staffCard], waiting: [waitingEntry] }
          : { kind: "guest", lobby, staff: [staffCard], currentEntry: null, waitingAhead: 0 };
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(snapshot) });
  });
}

test("every QueueMaster product and legal route is real and internally linked", async ({ page }) => {
  for (const [path, heading] of [
    ["/", "Stop writing names"],
    ["/queue/about", "A calmer way to manage a line"],
    ["/queue/instructions", "Start in a few steps"],
    ["/queue/support", "Tell us what needs attention"],
    ["/queue/features", "Features Built for Educators"],
    ["/queue/use-cases", "Who uses QueueMaster?"],
    ["/queue/pricing", "Simple Pilot Pricing"],
    ["/queue/privacy", "QueueMaster Privacy Policy"],
    ["/queue/terms", "QueueMaster Terms of Service"],
    ["/queue/dashboard", "Your classroom lobbies"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: new RegExp(heading, "i") }).first()).toBeVisible();
  }
  await page.goto("/");
  const internalHrefs = await page.locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href")).filter(Boolean));
  expect(internalHrefs.every((href) => href === "/" || href!.startsWith("/queue"))).toBe(true);
});

test("pricing and future features cannot imply working billing, SMS, or analytics", async ({ page }) => {
  await page.goto("/queue/pricing");
  const upgrade = page.getByRole("button", { name: /upgrade to pro.*coming soon/i });
  await expect(upgrade).toBeDisabled();
  await page.goto("/queue/features");
  await expect(page.getByText("Coming soon")).toHaveCount(2);
});

test("lobby view switcher, owner staff pool, QR controls, and return paths work", async ({ page, context, baseURL }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await mockQueueApi(page);
  await page.goto("/queue/r/demo-lobby/admin");
  await expect(page.getByRole("heading", { name: lobby.name })).toBeVisible();
  for (const label of ["Back to dashboard", "Admin controls", "Guest check-in", "Classroom display", "Staff join"]) await expect(page.getByRole("link", { name: new RegExp(label, "i") }).first()).toBeVisible();
  const guestQr = page.getByTestId("guest-qr");
  const staffQr = page.getByTestId("staff-qr");
  const guestDestination = `${baseURL}/queue/r/demo-lobby/join`;
  const staffDestination = `${baseURL}/queue/r/demo-lobby/staff`;
  await expect(guestQr).toHaveAttribute("data-qr-destination", guestDestination);
  await expect(staffQr).toHaveAttribute("data-qr-destination", staffDestination);
  expect(await decodeQr(guestQr)).toBe(guestDestination);
  expect(await decodeQr(staffQr)).toBe(staffDestination);
  await guestQr.getByRole("button", { name: "Copy link" }).click();
  await expect(guestQr.getByRole("status")).toHaveText("Link copied");
  await guestQr.getByRole("button", { name: "Full screen" }).click();
  await expect(page.getByRole("dialog", { name: /guest qr code full screen/i })).toBeVisible();
  await page.getByRole("button", { name: "Close full screen QR" }).click();
  const downloadPromise = page.waitForEvent("download");
  await guestQr.getByRole("button", { name: "Download PNG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("guest-qr.png");
  await expect(page.getByText(candidate.email)).toBeVisible();
  await page.getByRole("button", { name: "Request as admin" }).click();
});

test("guest, staff, and display views expose deterministic navigation and actions", async ({ page, baseURL }) => {
  await mockQueueApi(page);
  await page.goto("/queue/r/demo-lobby/join");
  await expect(page.getByRole("heading", { name: lobby.name })).toBeVisible();
  await expect(page.getByRole("button", { name: owner.displayName })).toBeEnabled();
  await page.goto("/queue/r/demo-lobby/staff");
  await expect(page.getByRole("heading", { name: "You are in the staff pool" })).toBeVisible();
  await expect(page.getByRole("button", { name: /accept and open admin/i })).toBeVisible();
  await page.goto("/queue/r/demo-lobby/display");
  await expect(page.getByRole("link", { name: "Exit display" })).toHaveAttribute("href", "/queue/r/demo-lobby/admin");
  await expect(page.getByTestId("display-guest-qr")).toHaveAttribute("data-qr-destination", `${baseURL}/queue/r/demo-lobby/join`);
  await expect(page.getByText("Alex")).toBeVisible();
});
