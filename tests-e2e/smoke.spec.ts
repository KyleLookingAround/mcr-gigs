import { test, expect } from "@playwright/test";

function iso(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

test("renders gigs from the API and filters by search", async ({ page }) => {
  await page.route("**/api/skiddle*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        totalcount: 2,
        results: [
          {
            id: 1,
            eventname: "Radiohead",
            venue: { name: "O2 Apollo", capacity: 3500 },
            openingtimes: { doorsopen: "19:30:00" },
            entryprice: "£25",
            date: iso(2),
            link: "https://example.com/1",
          },
          {
            id: 2,
            eventname: "Local Punk Night",
            venue: { name: "Gullivers" },
            entryprice: "Free",
            date: iso(3),
            link: "https://example.com/2",
          },
        ],
      }),
    });
  });

  await page.goto("/");

  await expect(page.locator("#visible-count")).toHaveText("2");
  await expect(page.getByRole("heading", { name: "Radiohead" })).toBeVisible();
  // Scope to the gig card so the "Free only" filter chip doesn't also match.
  await expect(
    page.locator("article.gig", { hasText: "Local Punk Night" }).locator(".gig-price"),
  ).toContainText("Free");

  await page.fill("#search-box", "punk");
  await expect(page.locator("#visible-count")).toHaveText("1");
  await expect(page.getByRole("heading", { name: "Local Punk Night" })).toBeVisible();
});

test("map view plots venues and lists them with gig counts", async ({ page }) => {
  await page.route("**/api/skiddle*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        totalcount: 3,
        results: [
          {
            id: 10,
            eventname: "Show at Night & Day",
            venue: { name: "Night & Day Cafe", latitude: 53.4847, longitude: -2.2356 },
            openingtimes: { doorsopen: "19:00:00" },
            date: iso(2),
            link: "https://example.com/10",
          },
          {
            id: 11,
            eventname: "Another at Night & Day",
            venue: { name: "Night & Day Cafe", latitude: 53.4847, longitude: -2.2356 },
            openingtimes: { doorsopen: "20:00:00" },
            date: iso(3),
            link: "https://example.com/11",
          },
          {
            id: 12,
            eventname: "Show at Gullivers",
            venue: { name: "Gullivers", latitude: 53.4861, longitude: -2.2369 },
            openingtimes: { doorsopen: "21:00:00" },
            date: iso(2),
            link: "https://example.com/12",
          },
        ],
      }),
    });
  });

  await page.goto("/");
  await expect(page.locator("#visible-count")).toHaveText("3");

  await page.click("#view-map");
  await expect(page.locator("#map-el")).toBeVisible();
  // Leaflet renders circle markers as interactive SVG paths.
  await expect(page.locator(".leaflet-interactive").first()).toBeVisible();

  // Two distinct venues, one with two gigs.
  await expect(page.locator(".venue-item")).toHaveCount(2);
  await expect(page.getByRole("button", { name: /Night & Day Cafe/ })).toContainText("2 gigs");

  // Clicking a venue flies to it and opens the popup.
  await page.getByRole("button", { name: /Gullivers/ }).click();
  await expect(page.locator(".leaflet-popup")).toBeVisible();
});
