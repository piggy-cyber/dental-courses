import { expect, test } from "@playwright/test";

test("the former standalone lab queue is no longer published", async ({ request }) => {
  const response = await request.get("/lab-help-queue", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("/");
});
