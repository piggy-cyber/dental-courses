import { expect, test, type Page } from "@playwright/test";

async function mockAnonymousSecurityCheck(page: Page) {
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `
        (() => {
          const callbacks = new Map();
          let nextId = 1;
          window.turnstile = {
            render(_element, options) {
              const id = String(nextId++);
              callbacks.set(id, options.callback);
              setTimeout(() => options.callback("playwright-turnstile-token"), 0);
              return id;
            },
            reset(id) {
              const callback = callbacks.get(String(id));
              if (callback) setTimeout(() => callback("playwright-turnstile-token-reset"), 0);
            }
          };
        })();
      `,
    });
  });
}

const initialEntries = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    studentName: "Ari",
    issue: "Border molding",
    benchSeat: "9",
    professor: "Dr. Berns",
    createdAt: "2026-08-18T16:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    studentName: "Mina",
    issue: null,
    benchSeat: "19",
    professor: "Dr. LaSalvia",
    createdAt: "2026-08-18T16:01:00.000Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    studentName: "Noor",
    issue: "Occlusion check",
    benchSeat: "22",
    professor: "Dr. Berns",
    createdAt: "2026-08-18T16:02:00.000Z",
  },
];

test("standalone lab queue exposes the stable form and independently grouped lines", async ({ page }) => {
  await mockAnonymousSecurityCheck(page);
  await page.route("**/api/lab-help-queue**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        entries: initialEntries,
        refreshedAt: "2026-08-18T16:03:00.000Z",
        submissionToken: "playwright-submission-token",
      }),
    });
  });

  await page.goto("/lab-help-queue");

  await expect(page).toHaveTitle(/Lab Help Queue/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex.*nofollow.*noarchive/i);
  await expect(page.getByRole("heading", { name: "Lab Help Queue", level: 1 })).toBeVisible();
  await expect(page.getByText("No account is required.", { exact: false })).toBeVisible();
  await expect(page.locator("nav")).toHaveCount(0);
  await expect(page.locator("a")).toHaveCount(0);

  const form = page.locator("[data-fc-lab-queue-form]");
  await expect(form).toHaveAttribute("data-fc-lab-queue-version", "1");
  await expect(form.locator('[data-fc-lab-queue-field="name"]')).toBeVisible();
  await expect(form.locator('[data-fc-lab-queue-field="issue"]')).toBeVisible();
  await expect(form.locator('[data-fc-lab-queue-field="benchSeat"]')).toBeVisible();
  await expect(form.locator('[data-fc-lab-queue-field="professor"]')).toBeVisible();
  const honeypot = form.locator('input[name="website"]');
  await expect(honeypot).toHaveCount(1);
  await expect(honeypot).toHaveAttribute("tabindex", "-1");
  await expect(honeypot).toHaveValue("");
  expect(await honeypot.evaluate((element) => {
    const bounds = element.parentElement?.getBoundingClientRect();
    return bounds ? Math.max(bounds.width, bounds.height) : Number.POSITIVE_INFINITY;
  })).toBeLessThanOrEqual(1);
  await expect(form.locator("[data-fc-lab-queue-submit]")).toBeVisible();
  await expect(form.locator("[data-fc-lab-queue-submit]")).toHaveAttribute("data-security-ready", "true");
  await expect(form.getByText("No account or login is required.", { exact: false })).toBeVisible();
  await expect(form.locator("[data-fc-lab-queue-status]")).toHaveAttribute("data-state", "idle");

  await expect(form.locator('[data-fc-lab-queue-field="professor"] option')).toHaveText([
    "Select professor",
    "Dr. T",
    "Dr. J",
    "Dr. Berns",
    "Dr. LaSalvia",
    "Dr. Markarian",
    "Dr. Zakhary",
    "Dr. Ali",
    "Dr. Tarik",
  ]);

  const bernsGroup = page.getByRole("heading", { name: "Dr. Berns", level: 3 }).locator("..");
  await expect(bernsGroup.getByText("#1Ari", { exact: true })).toBeVisible();
  await expect(bernsGroup.getByText("#2Noor", { exact: true })).toBeVisible();
  const lasalviaGroup = page.getByRole("heading", { name: "Dr. LaSalvia", level: 3 }).locator("..");
  await expect(lasalviaGroup.getByText("#1Mina", { exact: true })).toBeVisible();
  await expect(lasalviaGroup.getByText("Bench 19", { exact: true })).toBeVisible();
  await expect(lasalviaGroup.getByText("Border molding", { exact: true })).toHaveCount(0);
});

test("one explicit form submission reports confirmation and can leave the queue", async ({ page }) => {
  await mockAnonymousSecurityCheck(page);
  const submittedBodies: Record<string, unknown>[] = [];
  const deletedBodies: Record<string, unknown>[] = [];
  const mutatingHeaders: Record<string, string>[] = [];
  const submittedEntry = {
    id: "44444444-4444-4444-8444-444444444444",
    studentName: "Rick",
    issue: "Tooth pain",
    benchSeat: "88",
    professor: "Dr. LaSalvia",
    createdAt: "2026-08-18T16:05:00.000Z",
  };
  let entries = [...initialEntries];
  const issuedClientIds: string[] = [];

  await page.route("**/api/lab-help-queue**", async (route) => {
    const method = route.request().method();
    if (method === "POST") {
      submittedBodies.push(route.request().postDataJSON() as Record<string, unknown>);
      mutatingHeaders.push(route.request().headers());
      entries = [...entries, submittedEntry];
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, entry: submittedEntry, position: 2 }),
      });
      return;
    }
    if (method === "DELETE") {
      deletedBodies.push(route.request().postDataJSON() as Record<string, unknown>);
      mutatingHeaders.push(route.request().headers());
      entries = entries.filter((entry) => entry.id !== submittedEntry.id);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
      return;
    }
    const clientId = new URL(route.request().url()).searchParams.get("clientId");
    if (clientId) issuedClientIds.push(clientId);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        entries,
        refreshedAt: new Date().toISOString(),
        submissionToken: "playwright-submission-token",
      }),
    });
  });

  await page.goto("/lab-help-queue");
  const form = page.locator("[data-fc-lab-queue-form]");
  await form.locator('[data-fc-lab-queue-field="name"]').fill("Rick");
  await form.locator('[data-fc-lab-queue-field="issue"]').fill("Tooth pain");
  await form.locator('[data-fc-lab-queue-field="benchSeat"]').fill("#88");
  await form.locator('[data-fc-lab-queue-field="professor"]').selectOption("Dr. LaSalvia");
  await form.evaluate((element: HTMLFormElement) => element.requestSubmit());

  const status = form.locator("[data-fc-lab-queue-status]");
  await expect(status).toHaveAttribute("data-state", "success");
  await expect(status).toHaveAttribute("data-entry-id", submittedEntry.id);
  await expect(status).toHaveAttribute("data-position", "2");
  await expect(status).toContainText("You are #2 in Dr. LaSalvia's queue.");
  expect(submittedBodies).toHaveLength(1);
  expect(submittedBodies[0]).toMatchObject({
    studentName: "Rick",
    issue: "Tooth pain",
    benchSeat: "#88",
    professor: "Dr. LaSalvia",
    submissionToken: "playwright-submission-token",
    turnstileToken: "playwright-turnstile-token",
    website: "",
  });
  expect(submittedBodies[0].clientId).toMatch(/^[0-9a-f-]{36}$/i);
  expect(submittedBodies[0].idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
  expect(issuedClientIds).toContain(submittedBodies[0].clientId);
  expect(mutatingHeaders[0].origin).toBe("http://127.0.0.1:3100");
  expect(mutatingHeaders[0]["content-type"]).toContain("application/json");

  await page.getByRole("button", { name: "Leave queue" }).click();
  await expect(status).toHaveAttribute("data-state", "success");
  await expect(status).toContainText("You left the queue.");
  expect(deletedBodies).toHaveLength(1);
  expect(deletedBodies[0]).toMatchObject({ entryId: submittedEntry.id });
  expect(deletedBodies[0].clientId).toBe(submittedBodies[0].clientId);
  expect(mutatingHeaders[1].origin).toBe("http://127.0.0.1:3100");
  expect(mutatingHeaders[1]["content-type"]).toContain("application/json");
});
