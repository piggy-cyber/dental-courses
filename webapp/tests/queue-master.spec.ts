import { expect, test, type Locator, type Page } from "@playwright/test";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import type { QueueEntry } from "@/lib/queue-master";

const lobby = { id: "10000000-0000-4000-8000-000000000001", name: "Demo Classroom", slug: "demo-lobby", ownerProfileId: "20000000-0000-4000-8000-000000000001", revision: 7, createdAt: "2026-09-01T12:00:00.000Z", closedAt: null };
const owner = { id: "30000000-0000-4000-8000-000000000001", lobbyId: lobby.id, profileId: lobby.ownerProfileId, role: "owner", displayName: "Owner One", acceptingGuests: true, lastSeenAt: "2099-01-01T00:00:00.000Z", isOnline: true, isAvailable: true, revokedAt: null };
const candidate = { id: "40000000-0000-4000-8000-000000000001", lobbyId: lobby.id, profileId: "20000000-0000-4000-8000-000000000002", displayName: "Candidate One", email: "candidate@example.com", joinedAt: "2026-09-01T12:00:00.000Z", lastSeenAt: "2099-01-01T00:00:00.000Z", leftAt: null, isOnline: true };
const request = { id: "50000000-0000-4000-8000-000000000001", lobbyId: lobby.id, lobbyName: lobby.name, lobbySlug: lobby.slug, candidateId: candidate.id, candidateProfileId: candidate.profileId, candidateName: candidate.displayName, candidateEmail: candidate.email, requestedByOwnerProfileId: owner.profileId, status: "pending", expiresAt: "2099-01-02T00:00:00.000Z", respondedAt: null, cancelledAt: null, createdAt: "2026-09-01T12:00:00.000Z" };

const staffCard = { id: owner.id, displayName: owner.displayName, acceptingGuests: true, isOnline: true, isAvailable: true, waitingCount: 1, activeEntry: null };
const waitingEntry: QueueEntry = { id: "60000000-0000-4000-8000-000000000001", lobbyId: lobby.id, guestFirstName: "Alex", location: "Desk 12", assignedMembershipId: owner.id, assignedStaffName: owner.displayName, status: "waiting", sortPosition: 1000, createdAt: "2026-09-01T12:00:00.000Z", calledAt: null, helpingAt: null, finishedAt: null };

type RecordedAction = { path: string; body: Record<string, unknown> };
type MockQueueOptions = {
  adminEntries?: QueueEntry[];
  guestCurrentEntry?: QueueEntry | null;
  staffState?: Partial<typeof owner>;
};

async function decodeQr(locator: Locator) {
  const image = PNG.sync.read(await locator.getByRole("img").screenshot());
  const pixels = new Uint8ClampedArray(image.data.buffer, image.data.byteOffset, image.data.byteLength);
  return jsQR(pixels, image.width, image.height)?.data ?? null;
}

async function mockQueueApi(
  page: Page,
  actions: RecordedAction[] = [],
  options: MockQueueOptions = {},
) {
  await page.route("**/api/queue/r/demo-lobby/**", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() !== "GET") {
      let body: Record<string, unknown> = {};
      try {
        const parsed = route.request().postDataJSON() as unknown;
        if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
      } catch {
        // Heartbeats intentionally have no request body.
      }
      actions.push({
        path: url.pathname,
        body,
      });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, redirectTo: null }) });
    }
    const view = url.searchParams.get("view");
    const adminEntries = options.adminEntries ?? [waitingEntry];
    const effectiveOwner = { ...owner, ...options.staffState };
    const activeEntry = adminEntries.find((entry) => entry.status === "called" || entry.status === "helping") ?? null;
    const dynamicStaffCard = {
      ...staffCard,
      displayName: effectiveOwner.displayName,
      acceptingGuests: effectiveOwner.acceptingGuests,
      isOnline: effectiveOwner.isOnline,
      isAvailable: effectiveOwner.isAvailable,
      waitingCount: adminEntries.filter((entry) => entry.status === "waiting").length,
      activeEntry,
    };
    const guestStaffCard = {
      id: dynamicStaffCard.id,
      displayName: dynamicStaffCard.displayName,
      acceptingGuests: dynamicStaffCard.acceptingGuests,
      isOnline: dynamicStaffCard.isOnline,
      isAvailable: dynamicStaffCard.isAvailable,
      waitingCount: dynamicStaffCard.waitingCount,
    };
    const snapshot = view === "admin"
      ? { kind: "admin", lobby, me: effectiveOwner, memberships: [effectiveOwner], candidates: [candidate], promotionRequests: [], entries: adminEntries }
      : view === "staff"
        ? { kind: "staff", lobby, candidate, membership: null, promotionRequests: [request] }
        : view === "display"
          ? { kind: "display", lobby, staff: [dynamicStaffCard], waiting: adminEntries.filter((entry) => entry.status === "waiting") }
          : { kind: "guest", lobby, staff: [guestStaffCard], currentEntry: options.guestCurrentEntry ?? null, waitingAhead: 0 };
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
  for (const [name, href] of [
    ["Features", "/queue/features"],
    ["Use Cases", "/queue/use-cases"],
    ["Pricing", "/queue/pricing"],
    ["Instructions", "/queue/instructions"],
    ["Start Free", "/queue/dashboard"],
    ["Create a Classroom Lobby", "/queue/dashboard"],
    ["About", "/queue/about"],
    ["Support", "/queue/support"],
    ["Privacy Policy", "/queue/privacy"],
    ["Terms of Service", "/queue/terms"],
  ] as const) {
    await expect(page.getByRole("link", { name, exact: true }).first()).toHaveAttribute("href", href);
  }
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
  const actions: RecordedAction[] = [];
  await mockQueueApi(page, actions);
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
  await page.getByRole("button", { name: "Accepting guests" }).click();
  await page.getByRole("button", { name: "Call", exact: true }).click();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "No show", exact: true }).click();
  await expect.poll(() => actions.map((action) => action.body.type)).toEqual(expect.arrayContaining([
    "request_promotion",
    "set_accepting",
    "call",
    "cancel",
    "no_show",
  ]));
});

test("guest, staff, and display views expose deterministic navigation and actions", async ({ page, baseURL }) => {
  const actions: RecordedAction[] = [];
  await mockQueueApi(page, actions);
  await page.goto("/queue/r/demo-lobby/join");
  await expect(page.getByRole("heading", { name: lobby.name })).toBeVisible();
  await expect(page.getByRole("button", { name: owner.displayName })).toBeEnabled();
  await page.getByRole("button", { name: owner.displayName }).click();
  await page.getByLabel("First name").fill("Jordan");
  await page.getByLabel("Desk or car location").fill("Desk 22");
  await page.getByRole("button", { name: "Join queue" }).click();
  await page.goto("/queue/r/demo-lobby/staff");
  await expect(page.getByRole("heading", { name: "You are in the staff pool" })).toBeVisible();
  await page.getByRole("button", { name: /accept and open admin/i }).click();
  await page.goto("/queue/r/demo-lobby/display");
  await expect(page.getByRole("link", { name: "Exit display" })).toHaveAttribute("href", "/queue/r/demo-lobby/admin");
  await expect(page.getByTestId("display-guest-qr")).toHaveAttribute("data-qr-destination", `${baseURL}/queue/r/demo-lobby/join`);
  await expect(page.getByText("Alex")).toBeVisible();
  await expect.poll(() => actions.map((action) => action.body.type)).toEqual(expect.arrayContaining(["check_in", "accept"]));
});

test("called and helping controls remain available to the assigned admin and guest", async ({ page }) => {
  const actions: RecordedAction[] = [];
  const calledEntry: QueueEntry = {
    ...waitingEntry,
    status: "called",
    calledAt: "2026-09-01T12:01:00.000Z",
  };
  await mockQueueApi(page, actions, { adminEntries: [calledEntry], guestCurrentEntry: calledEntry });

  await page.goto("/queue/r/demo-lobby/admin");
  await expect(page.getByText("Alex").first()).toBeVisible();
  await page.getByRole("button", { name: "Start helping" }).click();
  await page.getByRole("button", { name: "Finish session" }).click();
  await page.getByRole("button", { name: "No show" }).click();

  await page.goto("/queue/r/demo-lobby/join");
  await expect(page.getByText("You’re being called")).toBeVisible();
  await page.getByRole("button", { name: "Start helping" }).click();
  await page.getByRole("button", { name: "Finish session" }).click();

  await expect.poll(() => actions.map((action) => action.body.type)).toEqual(expect.arrayContaining([
    "start_helping",
    "finish",
    "no_show",
  ]));
});

test("offline staff stop new joins while their existing queue remains visible", async ({ page }) => {
  await mockQueueApi(page, [], {
    adminEntries: [waitingEntry],
    staffState: {
      acceptingGuests: true,
      isOnline: false,
      isAvailable: false,
      lastSeenAt: "2026-09-01T11:00:00.000Z",
    },
  });

  await page.goto("/queue/r/demo-lobby/join");
  await expect(page.getByRole("button", { name: new RegExp(owner.displayName) })).toBeDisabled();
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();

  await page.goto("/queue/r/demo-lobby/admin");
  await expect(page.getByText("Offline with an existing queue. Reassign guests manually.")).toBeVisible();
  await expect(page.getByText("Alex")).toBeVisible();

  await page.goto("/queue/r/demo-lobby/display");
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  await expect(page.getByText("Alex")).toBeVisible();
});

test("owner, staff candidate, guest, and display views render in isolated browser contexts", async ({ browser, baseURL }) => {
  expect(baseURL).toBeTruthy();
  const contexts = await Promise.all(Array.from({ length: 4 }, () => browser.newContext()));
  try {
    const [ownerPage, staffPage, guestPage, displayPage] = await Promise.all(contexts.map((context) => context.newPage()));
    await Promise.all([
      mockQueueApi(ownerPage),
      mockQueueApi(staffPage),
      mockQueueApi(guestPage),
      mockQueueApi(displayPage),
    ]);
    await Promise.all([
      ownerPage.goto(`${baseURL}/queue/r/demo-lobby/admin`),
      staffPage.goto(`${baseURL}/queue/r/demo-lobby/staff`),
      guestPage.goto(`${baseURL}/queue/r/demo-lobby/join`),
      displayPage.goto(`${baseURL}/queue/r/demo-lobby/display`),
    ]);

    await expect(ownerPage.getByText("Staff dashboard")).toBeVisible();
    await expect(staffPage.getByRole("heading", { name: "You are in the staff pool" })).toBeVisible();
    await expect(guestPage.getByRole("paragraph").filter({ hasText: "Guest check-in" })).toBeVisible();
    await expect(displayPage.getByText("QueueMaster · Classroom Display")).toBeVisible();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
