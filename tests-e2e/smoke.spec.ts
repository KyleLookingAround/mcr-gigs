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
