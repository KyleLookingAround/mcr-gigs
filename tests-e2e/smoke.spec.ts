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
  await expect(page.getByText("Free")).toBeVisible();

  await page.fill("#search-box", "punk");
  await expect(page.locator("#visible-count")).toHaveText("1");
  await expect(page.getByRole("heading", { name: "Local Punk Night" })).toBeVisible();
});

test("map view plots venues and suggests a walkable gig crawl", async ({ page }) => {
  const night = iso(2);
  // Three Northern Quarter venues, same night, staggered doors, all within a
  // few hundred metres — should chain into one 3-stop crawl.
  await page.route("**/api/skiddle*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        totalcount: 3,
        results: [
          {
            id: 10,
            eventname: "Opener at Night & Day",
            venue: { name: "Night & Day Cafe", latitude: 53.4847, longitude: -2.2356 },
            openingtimes: { doorsopen: "19:00:00" },
            date: night,
            link: "https://example.com/10",
          },
          {
            id: 11,
            eventname: "Middle at Soup Kitchen",
            venue: { name: "Soup Kitchen", latitude: 53.4849, longitude: -2.2377 },
            openingtimes: { doorsopen: "20:00:00" },
            date: night,
            link: "https://example.com/11",
          },
          {
            id: 12,
            eventname: "Closer at Gullivers",
            venue: { name: "Gullivers", latitude: 53.4861, longitude: -2.2369 },
            openingtimes: { doorsopen: "21:00:00" },
            date: night,
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

  const crawl = page.locator(".crawl-item").first();
  await expect(crawl).toBeVisible();
  await expect(crawl).toContainText("3 stops");
});
