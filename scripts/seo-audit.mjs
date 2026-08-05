import { spawn } from "node:child_process";
import { once } from "node:events";
import http from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { seoRoutes, seoRedirects } = await import(
  pathToFileURL(path.join(root, "src/lib/seo-routes.ts")).href
);
const port = Number(process.env.SEO_AUDIT_PORT || 3417);
const localOrigin = `http://127.0.0.1:${port}`;
const canonicalOrigin = "https://rukhlabs.com";
const nextBin = path.join(root, "node_modules/next/dist/bin/next");
const checks = [];
const pages = new Map();
let serverOutput = "";

function check(condition, message) {
  checks.push({ passed: Boolean(condition), message });
}

function attrs(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([:\w-]+)=(?:"([^"]*)"|'([^']*)')/g)].map((match) => [
      match[1].toLowerCase(),
      match[2] ?? match[3] ?? "",
    ]),
  );
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function getMeta(html, key, value) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = attrs(tag);
    if (attributes[key] === value) return decodeHtml(attributes.content ?? "");
  }
  return "";
}

function getCanonical(html) {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attributes = attrs(tag);
    if (attributes.rel === "canonical") return decodeHtml(attributes.href ?? "");
  }
  return "";
}

function titleValues(html) {
  return [...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)].map((match) =>
    decodeHtml(match[1].trim()),
  );
}

function jsonLdValues(html) {
  return [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(
    (match) => match[1],
  );
}

function internalAnchorUrls(html) {
  const urls = new Set();
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = decodeHtml(attrs(tag).href ?? "");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const url = new URL(href, canonicalOrigin);
      if (url.origin === canonicalOrigin) urls.add(url.pathname + url.search);
    } catch {
      check(false, `Parsable internal link: ${href}`);
    }
  }
  return urls;
}

function requestWithHost(pathname, host) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      { hostname: "127.0.0.1", port, path: pathname, headers: { Host: host } },
      (response) => {
        response.resume();
        response.on("end", () =>
          resolve({ status: response.statusCode, location: response.headers.location ?? "" }),
        );
      },
    );
    request.on("error", reject);
    request.end();
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(localOrigin, { redirect: "manual" });
      if (response.status > 0) return;
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Local production server did not start.\n${serverOutput}`);
}

const server = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], {
  cwd: root,
  env: { ...process.env, NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

try {
  await waitForServer();

  const sitemapResponse = await fetch(`${localOrigin}/sitemap.xml`);
  const sitemapXml = await sitemapResponse.text();
  const sitemapUrls = new Set(
    [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => decodeHtml(match[1])),
  );
  check(sitemapResponse.status === 200, "/sitemap.xml returns 200");
  check(sitemapXml.startsWith("<?xml"), "/sitemap.xml is XML");
  check(!sitemapXml.includes("localhost") && !sitemapXml.includes("www.rukhlabs.com"), "Sitemap uses only the canonical production host");

  const robotsResponse = await fetch(`${localOrigin}/robots.txt`);
  const robotsText = await robotsResponse.text();
  check(robotsResponse.status === 200, "/robots.txt returns 200");
  check(robotsText.includes("Sitemap: https://rukhlabs.com/sitemap.xml"), "robots.txt declares the sitemap");
  check(!robotsText.includes("portfolio/brett-gallaher"), "robots.txt does not hide the portfolio noindex directive");

  for (const route of seoRoutes) {
    const response = await fetch(localOrigin + route.path, { redirect: "manual" });
    const html = await response.text();
    const titles = titleValues(html);
    const description = getMeta(html, "name", "description");
    const canonical = getCanonical(html);
    const robots = getMeta(html, "name", "robots").toLowerCase();
    const h1Count = (html.match(/<h1\b/gi) ?? []).length;
    const expectedCanonical = route.path === "/" ? canonicalOrigin : canonicalOrigin + route.path;
    const sitemapCanonical = new URL(route.path, canonicalOrigin).toString();
    const jsonLd = jsonLdValues(html);

    pages.set(route.path, { html, titles, description, canonical, robots, response, jsonLd });
    check(response.status === 200, `${route.path} returns 200`);
    check(titles.length === 1 && titles[0].length > 0, `${route.path} has one nonempty title`);
    if (route.classification !== "private-noindex-nofollow") {
      check(h1Count === 1, `${route.path} has one H1`);
    }
    check(canonical === expectedCanonical, `${route.path} has its canonical URL`);
    check(!canonical.includes("localhost") && !canonical.includes("www.rukhlabs.com"), `${route.path} canonical uses rukhlabs.com`);

    if (route.indexable) {
      check(description.length > 0, `${route.path} has a meta description`);
      check(!robots.includes("noindex"), `${route.path} is indexable`);
      check(sitemapUrls.has(sitemapCanonical), `${route.path} is included in the sitemap`);
    } else {
      check(robots.includes("noindex"), `${route.path} emits noindex`);
      check(!sitemapUrls.has(sitemapCanonical), `${route.path} is excluded from the sitemap`);
      if (route.follow) check(!robots.includes("nofollow"), `${route.path} allows link following`);
      if (!route.follow) check(robots.includes("nofollow"), `${route.path} emits nofollow`);
    }

    for (const value of jsonLd) {
      try {
        JSON.parse(value);
        check(true, `${route.path} JSON-LD parses`);
      } catch {
        check(false, `${route.path} JSON-LD parses`);
      }
    }
  }

  const titleOwners = new Map();
  for (const route of seoRoutes.filter((item) => item.indexable)) {
    const title = pages.get(route.path)?.titles[0];
    if (!title) continue;
    check(!titleOwners.has(title), `${route.path} has a unique indexable title`);
    titleOwners.set(title, route.path);
  }

  const privatePage = pages.get("/portfolio/brett-gallaher");
  const privateHeader = privatePage?.response.headers.get("x-robots-tag")?.toLowerCase() ?? "";
  for (const directive of ["noindex", "nofollow", "noarchive", "nosnippet"]) {
    check(privatePage?.robots.includes(directive), `Portfolio page meta includes ${directive}`);
    check(privateHeader.includes(directive), `Portfolio response header includes ${directive}`);
  }
  check(!sitemapXml.includes("/portfolio/brett-gallaher"), "Private portfolio is absent from the sitemap");
  check(!sitemapXml.includes("/sample"), "Fictional sample sites are absent from the sitemap");
  check(pages.get("/legal/terms")?.robots.includes("noindex"), "Interim terms are noindex");
  check(pages.has("/products/farzin"), "First-party Farzin page exists");

  const socialRoutes = [
    "/",
    "/services/web-development",
    "/services/career-portfolios",
    "/products/farzin",
    "/products/glass-squares-os",
  ];
  const socialImages = new Set();
  for (const route of socialRoutes) {
    const page = pages.get(route);
    const image = getMeta(page.html, "property", "og:image");
    const twitterImage = getMeta(page.html, "name", "twitter:image");
    check(Boolean(image && twitterImage), `${route} has Open Graph and Twitter images`);
    socialImages.add(image);
  }
  check(socialImages.size === socialRoutes.length, "Primary landing pages use unique social images");

  for (const redirect of seoRedirects) {
    const response = await fetch(localOrigin + redirect.source, { redirect: "manual" });
    const location = response.headers.get("location") ?? "";
    const resolved = new URL(location, canonicalOrigin).pathname;
    check(response.status === redirect.status, `${redirect.source} returns ${redirect.status}`);
    check(resolved === redirect.destination, `${redirect.source} redirects directly to ${redirect.destination}`);
  }

  const hostRedirect = await requestWithHost("/products/farzin?source=seo", "www.rukhlabs.com");
  check(hostRedirect.status === 308, "www host returns a permanent redirect");
  check(
    hostRedirect.location === "https://rukhlabs.com/products/farzin?source=seo",
    "www host redirect preserves path and query",
  );

  const checkedLinks = new Set();
  for (const route of seoRoutes.filter((item) => item.classification !== "private-noindex-nofollow")) {
    const hrefs = internalAnchorUrls(pages.get(route.path)?.html ?? "");
    check(
      [...hrefs].every((href) => !href.startsWith("/portfolio/brett-gallaher")),
      `${route.path} does not expose the unlisted portfolio`,
    );
    for (const href of hrefs) {
      if (checkedLinks.has(href)) continue;
      checkedLinks.add(href);
      const response = await fetch(localOrigin + href, { redirect: "manual" });
      check(response.status >= 200 && response.status < 300, `Internal link ${href} resolves without a redirect`);
    }
  }
} finally {
  server.kill("SIGTERM");
  await Promise.race([
    once(server, "exit"),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
}

const failed = checks.filter((item) => !item.passed);
for (const item of checks) {
  console.log(`${item.passed ? "PASS" : "FAIL"}  ${item.message}`);
}
console.log(`\nSEO audit: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length > 0) {
  console.error(`\n${failed.length} critical SEO check(s) failed.`);
  if (serverOutput) console.error(serverOutput.trim());
  process.exitCode = 1;
}
