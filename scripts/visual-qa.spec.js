const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const baseURL = process.env.QA_BASE_URL || "http://127.0.0.1:8080";
const outDir = path.join(process.cwd(), ".qa", "screenshots");
fs.mkdirSync(outDir, { recursive: true });

const pages = [
  ["home", "/"],
  ["pomoc", "/pomoc/"],
  ["audit", "/audit/"],
  ["cermat-5", "/cermat/5-trida/"],
  ["guide", "/pruvodce/dite-nejde-matematika/"],
  ["situation", "/situace/zapis-do-1-tridy/"],
  ["skill-reading", "/dovednost/plynule-cteni-s-porozumenim/"],
  ["plan", "/plan/"]
];

const viewports = [
  ["mobile", { width: 390, height: 844 }],
  ["desktop", { width: 1365, height: 900 }]
];

for (const [pageName, url] of pages) {
  for (const [viewportName, viewport] of viewports) {
    test(`${pageName} ${viewportName}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(baseURL + url, { waitUntil: "networkidle" });
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("body")).toContainText("Mapa učení");
      const metrics = await page.evaluate(() => ({
        width: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyText: document.body.innerText.trim().length,
        manifest: !!document.querySelector('link[rel="manifest"]'),
        navLinks: document.querySelectorAll("nav a").length
      }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width + 2);
      expect(metrics.bodyText).toBeGreaterThan(500);
      expect(metrics.manifest).toBeTruthy();
      expect(metrics.navLinks).toBeGreaterThan(5);
      await page.screenshot({
        path: path.join(outDir, `${pageName}-${viewportName}.png`),
        fullPage: true
      });
    });
  }
}

test("pwa assets", async ({ request }) => {
  const manifest = await request.get(baseURL + "/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const sw = await request.get(baseURL + "/sw.js");
  expect(sw.ok()).toBeTruthy();
  expect(await sw.text()).toContain("self.registration.scope");
});
