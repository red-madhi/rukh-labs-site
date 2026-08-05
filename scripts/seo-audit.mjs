import { spawn } from "node:child_process";
import { once } from "node:events";
import http from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { seoRoutes, seoRedirects } = await import(
  pathToFileURL(path.join(root, "src/lib/seo-routes.ts")).href
);
const { insights } = await import(
  pathToFileURL(path.join(root, "src/lib/insights.ts")).href
);
const { shouldShowUpdatedDate } = await import(
  pathToFileURL(path.join(root, "src/lib/publication.ts")).href
);
const { workProjects } = await import(
  pathToFileURL(path.join(root, "src/lib/work.ts")).href
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

function renderedText(html) {
  return decodeHtml(html.replace(/<[^>]*>/g, "").replace(/\s+/g, " "));
}

function parsedJsonLd(values) {
  return values.flatMap((value) => {
    try {
      return [JSON.parse(value)];
    } catch {
      return [];
    }
  });
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

  const phaseTwoSocialRoutes = [
    "/work",
    ...workProjects.map((project) => `/work/${project.slug}`),
    "/insights",
    ...insights.map((insight) => `/insights/${insight.slug}`),
    "/tools/website-project-brief",
    "/services/career-portfolios/data-analysts",
    "/services/career-portfolios/bi-developers",
    "/services/web-development/small-business",
    "/services/web-development/professional-services",
  ];
  for (const route of phaseTwoSocialRoutes) {
    const page = pages.get(route);
    const image = getMeta(page?.html ?? "", "property", "og:image");
    const twitterImage = getMeta(page?.html ?? "", "name", "twitter:image");
    check(Boolean(image && twitterImage), `${route} has Phase 2 Open Graph and Twitter images`);
    if (image) {
      const response = await fetch(image.replace(canonicalOrigin, localOrigin));
      check(response.status === 200, `${route} Open Graph image returns 200`);
    }
  }

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

  const publicRoutes = seoRoutes.filter((item) => item.classification !== "private-noindex-nofollow");
  for (const route of publicRoutes) {
    const html = pages.get(route.path)?.html ?? "";
    check(!/brett\s+gallaher/i.test(html), `${route.path} does not expose a personal name`);
    check(!/rukh\.labs@gmail\.com/i.test(html), `${route.path} does not expose the internal Gmail address`);
    check(!/\bTODO\b|Lorem ipsum|Coming soon/iu.test(html), `${route.path} contains no placeholder production copy`);
  }

  check(
    (pages.get("/contact")?.html ?? "").includes("hello@rukhlabs.com"),
    "Contact page exposes the public hello@rukhlabs.com address",
  );
  check(!shouldShowUpdatedDate("2026-08-05", "2026-08-05"), "Publication meta hides the Updated label when dates match");
  check(shouldShowUpdatedDate("2026-08-05", "2026-08-20"), "Publication meta shows the Updated label when dates differ");

  const fictionalDemoHeading = "Fictional working website demonstrations";
  const fictionalDemoDisclosure = "All names, businesses, addresses, audiences, testimonials, and results shown in these demonstrations are invented for design and functionality examples.";
  const indexableDemoRoutes = [
    "/",
    "/services/web-development",
    ...seoRoutes
      .filter((route) => route.indexable && /^\/services\/web-development\/designs\/[^/]+$/.test(route.path))
      .map((route) => route.path),
  ];
  const fictionalPreviewNames = ["NORTHSTAR", "CEDAR/STRATEGY", "Mara Bell", "Juniper &amp; Pine", "Mika Rowe", "Lena Ortiz"];
  const fictionalPreviewPerformance = [
    "Growth engagements",
    "Median client return",
    "184 Pine Street",
    "1.8M views",
    "842K views",
    "614K views",
  ];

  for (const route of seoRoutes.filter((item) => item.indexable)) {
    const page = pages.get(route.path);
    const html = page?.html ?? "";
    const hasFictionalDemoDisclosure = html.includes(fictionalDemoHeading) && html.includes(fictionalDemoDisclosure);
    check(
      fictionalPreviewPerformance.every((value) => !html.includes(value) || hasFictionalDemoDisclosure),
      `${route.path} only permits known fictional preview performance content with an explicit demonstration disclosure`,
    );
    check(
      fictionalPreviewNames.every((value) => !html.includes(value) || hasFictionalDemoDisclosure),
      `${route.path} gives fictional preview identities an explicit demonstration disclosure`,
    );

    const structuredData = (page?.jsonLd ?? []).join("\n");
    check(
      [...fictionalPreviewNames, ...fictionalPreviewPerformance].every((value) => !structuredData.includes(value)),
      `${route.path} structured data excludes fictional preview content`,
    );
  }

  for (const route of indexableDemoRoutes) {
    const html = pages.get(route)?.html ?? "";
    check(
      html.includes(fictionalDemoHeading) && html.includes(fictionalDemoDisclosure),
      `${route} visibly labels its fictional website demonstrations`,
    );
  }

  const termsPage = pages.get("/legal/terms")?.html ?? "";
  check(!/Placeholder|Pre-launch|Temporary production copy|Professional review pending|reviewed by qualified counsel/iu.test(termsPage), "Terms page avoids visible placeholder or unreviewed-document language");
  check(termsPage.includes("Project services") && termsPage.includes("hello@rukhlabs.com"), "Terms page contains limited website-use and project-agreement guidance");
  check(!(pages.get("/")?.html ?? "").includes('href="/legal/terms"'), "Public footer does not link to the noindex terms page");

  const costGuide = pages.get("/insights/small-business-website-cost-guide")?.html ?? "";
  for (const value of [
    "Current cost ranges: treat them as planning references",
    "Recurring costs to model separately",
    "Where Rukh Labs’ current packages fit",
    "$2,000–$100,000",
    "2.9% + 30¢",
    "https://www.upwork.com/hire/web-designers/cost/",
    "https://stripe.com/pricing",
  ]) {
    check(costGuide.includes(value), `Cost guide visibly includes current sourced reference: ${value}`);
  }

  for (const insight of insights) {
    const route = `/insights/${insight.slug}`;
    const page = pages.get(route);
    const jsonLd = parsedJsonLd(page?.jsonLd ?? []);
    check(
      new RegExp(`dateTime=\"${insight.publishedOn}\"`, "i").test(page?.html ?? ""),
      `${route} exposes its publication date`,
    );
    const updatedDateMarkup = `<time dateTime="${insight.modifiedOn}">Updated`;
    if (insight.modifiedOn === insight.publishedOn) {
      check(!page?.html.includes(updatedDateMarkup), `${route} hides its same-day Updated label`);
    } else {
      check(page?.html.includes(updatedDateMarkup), `${route} exposes its later Updated date`);
    }
    check(jsonLd.some((value) => value?.["@type"] === insight.schemaType), `${route} emits ${insight.schemaType} structured data`);
    check(renderedText(page?.html ?? "").includes("By Rukh Labs"), `${route} visibly uses the Rukh Labs byline`);
    check(getMeta(page?.html ?? "", "name", "author") === "Rukh Labs", `${route} metadata author is Rukh Labs`);
    const article = jsonLd.find((value) => value?.["@type"] === insight.schemaType);
    check(
      Array.isArray(article?.image) &&
        article.image.length === 1 &&
        article.image[0] === `${canonicalOrigin}/insights/${insight.slug}/opengraph-image` &&
        article.inLanguage === "en-US" &&
        article.isPartOf?.["@id"] === `${canonicalOrigin}/#website`,
      `${route} structured data includes image, language, and website membership`,
    );
    for (const role of ["author", "publisher"]) {
      check(
        article?.[role]?.["@type"] === "Organization" &&
          article?.[role]?.["@id"] === "https://rukhlabs.com/#organization" &&
          article?.[role]?.name === "Rukh Labs" &&
          article?.[role]?.url === "https://rukhlabs.com/about",
        `${route} ${role} structured data uses the Rukh Labs Organization`,
      );
    }
  }

  for (const project of workProjects) {
    const route = `/work/${project.slug}`;
    check((pages.get(route)?.html ?? "").includes(project.projectType), `${route} clearly identifies its project type`);
  }

  const briefTool = pages.get("/tools/website-project-brief")?.html ?? "";
  check(briefTool.includes("does not submit, store, email, or send your brief text"), "Project brief privacy wording matches the browser-only implementation");
  check(briefTool.includes("Website Project Brief Generator"), "Project brief tool exists and is indexable");
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
