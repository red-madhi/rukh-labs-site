import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const moduleRoot = process.env.GLASS_BROWSER_MODULES;
if (!moduleRoot) throw new Error("GLASS_BROWSER_MODULES must point to isolated Playwright node_modules.");
const { chromium } = await import(pathToFileURL(path.join(moduleRoot, "playwright/index.mjs")).href);
const base = "http://127.0.0.1:3100";
const route = "/products/glass-squares-os";
const art = "/products/glass-squares/concepts-20260906.avif";
const output = "artifacts/glass-page";
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3100"], { stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
let browser;
const results = [];
const pageErrors = [];
try {
  let ready = false;
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try { const response = await fetch(base + route); if (response.ok) { ready = true; break; } } catch { /* Wait for the local read-only test server. */ }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert(ready, "Next.js server did not become ready");
  const assetResponse = await fetch(base + art);
  assert.equal(assetResponse.status, 200);
  assert.match(assetResponse.headers.get("content-type") || "", /image\/avif/);
  const bytes = Buffer.from(await assetResponse.arrayBuffer());
  assert.equal(bytes.length, 18970, "Concept asset byte length changed");
  const blobHash = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  assert.equal(blobHash, "4b8b8248d3445eab13875c281c7d81689a0efa78", "Concept asset provenance mismatch");
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ reducedMotion: "reduce" });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 960 });
    const response = await page.goto(base + route, { waitUntil: "domcontentloaded" });
    assert.equal(response?.status(), 200);
    await page.locator("#glass-title").waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("h1").count(), 1, "Page must have one h1");
    assert.match(await page.locator("#glass-title").innerText(), /A more human\s*computer/);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://rukhlabs.com/products/glass-squares-os");
    const images = page.locator(`img[src="${art}"]`);
    assert.equal(await images.count(), 5, "Expected hero plus four concept previews");
    for (let index = 0; index < 5; index += 1) {
      const image = images.nth(index);
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(async (element) => { await element.decode(); });
      assert(await image.evaluate((element) => element.naturalWidth === 600 && element.naturalHeight === 700), "Concept artwork failed to decode");
      assert.match((await image.getAttribute("alt")) || "", /concept/i);
    }
    const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, scroll: document.documentElement.scrollWidth }));
    assert(dimensions.scroll <= dimensions.viewport + 1, `Horizontal overflow at ${width}px: ${JSON.stringify(dimensions)}`);
    assert.equal(await page.locator("#apps article").count(), 6);
    assert.equal(await page.locator("#roadmap article").count(), 4);
    const text = await page.locator("main").innerText();
    assert.match(text, /not screenshots of the current build/);
    assert.match(text, /September 6, 2026/);
    assert.match(text, /No public OS download is available/);
    assert(!text.includes("ACTUAL DEVELOPMENT SCREENSHOTS"));
    for (const id of ["build-state", "preview", "apps", "roadmap"]) assert.equal(await page.locator(`#${id}`).count(), 1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${output}/glass-squares-${width}.png`, fullPage: true });
    results.push({ width, status: "PASS", images: 5, horizontalOverflow: false, coreApps: 6 });
  }
  const summary = page.locator("#roadmap details summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  assert.notEqual(await page.locator("#roadmap details").getAttribute("open"), null, "Keyboard disclosure failed");
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#roadmap details").getAttribute("open"), null);
  await page.getByRole("link", { name: "Explore the desktop", exact: true }).click();
  assert(page.url().endsWith("#preview"), "Hero anchor failed");
  assert.equal(await page.getByRole("link", { name: "Get release updates", exact: true }).getAttribute("href"), "/download");
  const download = await fetch(base + "/download");
  assert.equal(download.status, 200);
  const catalogue = await fetch(base + "/products");
  assert.equal(catalogue.status, 200);
  assert.match(await catalogue.text(), /first integrated desktop milestone/);
  const sitemap = await fetch(base + "/sitemap.xml");
  assert.equal(sitemap.status, 200);
  const sitemapText = await sitemap.text();
  assert.match(sitemapText, /products\/glass-squares-os<\/loc>\s*<lastmod>2026-09-06/);
  assert.deepEqual(pageErrors, [], "Uncaught browser errors");
  console.log("Glass Squares public-page checks: PASS", JSON.stringify(results));
  await writeFile(`${output}/results.json`, JSON.stringify({ status: "PASS", results, assetGitBlob: blobHash, checks: ["canonical", "images", "responsive layout", "concept labels", "six apps", "roadmap", "keyboard disclosure", "anchor navigation", "registration destination", "catalogue", "sitemap date"], pageErrors }, null, 2));
} catch (error) {
  await writeFile(`${output}/failure.txt`, String(error.stack || error));
  throw error;
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
