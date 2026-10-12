import { test, expect } from "@playwright/test";

// Main user flow: landing -> analyze -> history.
// Uses static routes only (no live RPC) so CI stays deterministic.

test("landing renders hero and address form", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /every contract/i })).toBeVisible();
  await expect(page.getByLabel(/contract address/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /analyze contract/i }).first()).toBeVisible();
});

test("invalid address shows client-side error", async ({ page }) => {
  await page.goto("/analyze");
  await page.getByLabel(/contract address/i).fill("not-an-address");
  await page.getByRole("button", { name: /analyze contract/i }).click();
  await expect(page.getByText(/valid 0x/i)).toBeVisible();
});

test("docs and about render", async ({ page }) => {
  await page.goto("/docs");
  await expect(page.getByRole("heading", { name: /how opveil works/i })).toBeVisible();
  await page.goto("/about");
  await expect(page.getByText(/not a security audit/i).first()).toBeVisible();
});

test("health endpoint returns envelope", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.ok).toBe(true);
  expect(json.data.networks.bsc.chainId).toBe(56);
});
