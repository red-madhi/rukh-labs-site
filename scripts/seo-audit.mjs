import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import http from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { seoRoutes, seoRedirects, SEO_PHASE_TWO_DEPLOYMENT_DATE, SEO_NETWORK_EXPLORER_DEPLOYMENT_DATE } = await import(
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
const { products } = await import(
  pathToFileURL(path.join(root, "src/lib/products.ts")).href
);
const { focusedServices } = await import(
  pathToFileURL(path.join(root, "src/lib/focused-services.ts")).href
);
const sourceFiles = {
  seoRoutes: await readFile(path.join(root, "src/lib/seo-routes.ts"), "utf8"),
  insights: await readFile(path.join(root, "src/lib/insights.ts"), "utf8"),
  briefForm: await readFile(path.join(root, "src/components/tools/website-project-brief-form.tsx"), "utf8"),
  analytics: await readFile(path.join(root, "src/lib/analytics.ts"), "utf8"),
  home: await readFile(path.join(root, "src/app/page.tsx"), "utf8"),
  workPage: await readFile(path.join(root, "src/app/work/[slug]/page.tsx"), "utf8"),
  notFound: await readFile(path.join(root, "src/app/not-found.tsx"), "utf8"),
  notFoundFocus: await readFile(path.join(root, "src/components/seo/not-found-focus.tsx"), "utf8"),
};
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

function jsonLdNodes(values) {
  return parsedJsonLd(values).flatMap((value) =>
    Array.isArray(value?.["@graph"]) ? value["@graph"] : [value],
  );
}

function jsonLdTypes(value) {
  const type = value?.["@type"];
  return Array.isArray(type) ? type : type ? [type] : [];
}

function hasJsonLdType(value, type) {
  return jsonLdTypes(value).includes(type);
}

function anchorValues(html) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => ({
    attributes: attrs(`<a ${match[1]}>`),
    text: renderedText(match[2]).trim(),
  }));
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
  const descriptionOwners = new Map();
  const checkedSocialImages = new Set();
  for (const route of seoRoutes.filter((item) => item.indexable)) {
    const page = pages.get(route.path);
    const title = page?.titles[0];
    const description = page?.description ?? "";
    if (!title) continue;
    check(!titleOwners.has(title), `${route.path} has a unique indexable title`);
    titleOwners.set(title, route.path);
    check(!descriptionOwners.has(description), `${route.path} has a unique indexable description`);
    descriptionOwners.set(description, route.path);

    const html = page?.html ?? "";
    const openGraphImage = getMeta(html, "property", "og:image");
    const twitterImage = getMeta(html, "name", "twitter:image");
    check(getMeta(html, "property", "og:title") === title, `${route.path} Open Graph title matches its page title`);
    check(getMeta(html, "property", "og:description") === description, `${route.path} Open Graph description matches its meta description`);
    check(getMeta(html, "property", "og:url") === page?.canonical, `${route.path} Open Graph URL matches its canonical`);
    check(getMeta(html, "property", "og:type").length > 0, `${route.path} has an Open Graph type`);
    check(openGraphImage.startsWith(canonicalOrigin), `${route.path} has an absolute Open Graph image`);
    check(getMeta(html, "property", "og:image:width") === "1200", `${route.path} Open Graph image declares a 1200px width`);
    check(getMeta(html, "property", "og:image:height") === "630", `${route.path} Open Graph image declares a 630px height`);
    check(getMeta(html, "property", "og:image:alt").length > 0, `${route.path} Open Graph image has meaningful alternative text`);
    check(getMeta(html, "name", "twitter:card") === "summary_large_image", `${route.path} uses a large Twitter card`);
    check(getMeta(html, "name", "twitter:title") === title, `${route.path} Twitter title matches its page title`);
    check(getMeta(html, "name", "twitter:description") === description, `${route.path} Twitter description matches its meta description`);
    check(twitterImage.startsWith(canonicalOrigin), `${route.path} has an absolute Twitter image`);
    check(getMeta(html, "name", "twitter:image:alt").length > 0, `${route.path} Twitter image has meaningful alternative text`);

    for (const imageUrl of [openGraphImage, twitterImage]) {
      if (!imageUrl || checkedSocialImages.has(imageUrl)) continue;
      checkedSocialImages.add(imageUrl);
      const imageResponse = await fetch(imageUrl.replace(canonicalOrigin, localOrigin));
      const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
      const isPng =
        imageBytes.length >= 24 &&
        imageBytes.subarray(1, 4).toString("ascii") === "PNG";
      const width = isPng ? imageBytes.readUInt32BE(16) : 0;
      const height = isPng ? imageBytes.readUInt32BE(20) : 0;
      check(imageResponse.status === 200, `${imageUrl} returns 200`);
      check(imageResponse.headers.get("content-type")?.startsWith("image/"), `${imageUrl} returns image content`);
      check(width === 1200 && height === 630, `${imageUrl} renders at 1200 by 630 pixels`);
    }
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

  for (const route of ["/work/farzin", "/work/glass-squares-os"]) {
    const page = pages.get(route);
    check(page?.response.status === 200, `${route} remains publicly accessible`);
    check(page?.robots.includes("noindex") && !page?.robots.includes("nofollow"), `${route} is noindex/follow`);
    check(page?.canonical === `${canonicalOrigin}${route}`, `${route} keeps a self-referencing canonical`);
    check(!sitemapUrls.has(`${canonicalOrigin}${route}`), `${route} is absent from the sitemap`);
  }
  for (const route of ["/products/farzin", "/products/glass-squares-os"]) {
    const page = pages.get(route);
    check(!page?.robots.includes("noindex"), `${route} remains indexable`);
    check(page?.canonical === `${canonicalOrigin}${route}`, `${route} remains self-canonical`);
    check(sitemapUrls.has(`${canonicalOrigin}${route}`), `${route} remains in the sitemap`);
  }

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

  const missingPath = "/seo-hardening-unknown-route-20260805";
  const missingResponse = await fetch(localOrigin + missingPath, { redirect: "manual" });
  const missingHtml = await missingResponse.text();
  const missingRobots = getMeta(missingHtml, "name", "robots").toLowerCase();
  check(missingResponse.status === 404, "Unknown routes return a real 404 response");
  check((missingHtml.match(/<h1\b/gi) ?? []).length === 1, "The 404 page has one clear H1");
  check(missingRobots.includes("noindex") && !missingRobots.includes("nofollow"), "The 404 page is noindex and allows link following");
  check(getCanonical(missingHtml) === "", "The 404 page does not emit a canonical URL");
  check(!missingHtml.includes(missingPath), "The 404 page does not render the invalid URL");
  for (const href of ["/", "/services/web-development", "/services/career-portfolios", "/products", "/work", "/contact"]) {
    check(missingHtml.includes(`href="${href}"`), `The 404 page links to ${href}`);
  }
  check(
    !/trackEvent|TrackedAnchor|TrackedLink/.test(sourceFiles.notFound + sourceFiles.notFoundFocus),
    "The 404 page defines no custom analytics event for invalid URLs",
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
    check(!/localhost(?::\d+)?/i.test(html), `${route.path} contains no localhost URL`);
  }

  const focusedEvidence = new Map([
    ["/services/career-portfolios/data-analysts", "What an analyst portfolio should prove."],
    ["/services/career-portfolios/bi-developers", "How to present BI architecture and delivery."],
    ["/services/web-development/small-business", "What a small-business website needs to make clear."],
    ["/services/web-development/professional-services", "How to explain complex services to decision-makers."],
  ]);
  const focusedScenarioTitles = new Set();
  for (const service of focusedServices) {
    const html = pages.get(service.path)?.html ?? "";
    const exampleSource = [service.exampleDescription, ...service.exampleItems.map((item) => `${item.label} ${item.value}`)].join(" ");
    check(html.includes(focusedEvidence.get(service.path)), `${service.path} has its unique evidence heading`);
    check(!html.includes("What the portfolio or site can hold"), `${service.path} removes the shared evidence eyebrow`);
    check(!html.includes("A structure built around the real work"), `${service.path} removes the shared evidence heading`);
    check(html.includes("Fictional planning example"), `${service.path} visibly labels its fictional planning example`);
    check(html.includes(service.exampleTitle), `${service.path} renders its page-specific planning scenario`);
    check(/not client work/i.test(service.exampleDescription), `${service.path} says the planning example is not client work`);
    check(!/[\$€£]|\b\d+(?:\.\d+)?\s*(?:%|stars?|customers?|clients?|views?|revenue)\b/i.test(exampleSource), `${service.path} planning example contains no fabricated commercial or performance metric`);
    check(!/\b\d{1,5}\s+[A-Z][\w.-]+\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?)\b/.test(exampleSource), `${service.path} planning example contains no fictional address`);
    check(!/rating\s*[:=]|testimonial\s*[:=]/i.test(exampleSource), `${service.path} planning example contains no fabricated rating or testimonial`);
    focusedScenarioTitles.add(service.exampleTitle);
  }
  check(focusedScenarioTitles.size === focusedServices.length, "Every focused service uses unique planning-example content");

  const analystGuide = renderedText(pages.get("/insights/data-analyst-career-portfolio-guide")?.html ?? "");
  for (const value of [
    "A fictional worked example",
    "Fictional example built by Rukh Labs",
    "Resolution Rate",
    "Fact Tickets",
    "synthetic",
    "Assumptions and limitations",
    "Technical appendix",
  ]) {
    check(analystGuide.includes(value), `Data analyst guide includes worked-example requirement: ${value}`);
  }
  const analystGuideHtml = pages.get("/insights/data-analyst-career-portfolio-guide")?.html ?? "";
  for (const href of [
    "/services/career-portfolios/data-analysts",
    "/services/career-portfolios/bi-developers",
    "/insights/show-confidential-work-in-career-portfolio",
    "/work/career-portfolio-demo",
  ]) {
    check(analystGuideHtml.includes(`href="${href}"`), `Data analyst guide links contextually to ${href}`);
  }

  const homeHtml = pages.get("/")?.html ?? "";
  const homeText = renderedText(homeHtml);
  const workText = renderedText(pages.get("/work")?.html ?? "");
  check(homeText.includes("Selected work from the lab."), "Homepage uses the approved selected-work heading");
  check(homeText.includes("Rukh Labs platform") && homeText.includes("fictional career-portfolio demonstration"), "Homepage selected-work copy matches its platform, product, and demonstration cards");
  check(homeHtml.includes('href="/work/rukh-labs-website"') && homeHtml.includes('href="/work/career-portfolio-demo"') && homeHtml.includes('href="/products/farzin"'), "Homepage explicitly features the platform, career demonstration, and a primary product route");
  check(!sourceFiles.home.includes("workProjects.slice(0, 3)"), "Homepage featured work does not depend on array order");
  check(sourceFiles.home.includes('["rukh-labs-website", "career-portfolio-demo"]'), "Homepage featured Work slugs are selected explicitly");
  check(!homeText.includes("First-party work, labeled plainly."), "Homepage removes the old selected-work heading");
  check(!/brings to client work/i.test(homeText), "Homepage does not imply unverified client work");
  check(workText.includes("Selected product, platform, and demonstration work."), "Work hub uses the approved H1");
  check(!workText.includes("Work with a clear source and an honest label."), "Work hub removes the old H1");
  check(pages.get("/work")?.titles[0] === "Selected Product, Platform & Website Work | Rukh Labs", "Work hub has descriptive metadata title");

  const careerPage = renderedText(pages.get("/services/career-portfolios")?.html ?? "");
  for (const value of ["Designed for several levels of review", "At a glance", "Quick review", "Project review", "Technical deep dive"]) {
    check(careerPage.includes(value), `Career portfolio page includes review-depth label: ${value}`);
  }
  for (const value of ["10 sec", "60 sec", "5 min"]) {
    check(!careerPage.includes(value), `Career portfolio page removes unsupported timing label: ${value}`);
  }

  check(
    (pages.get("/contact")?.html ?? "").includes("hello@rukhlabs.com"),
    "Contact page exposes the public hello@rukhlabs.com address",
  );

  const homeNodes = jsonLdNodes(pages.get("/")?.jsonLd ?? []);
  const organizations = homeNodes.filter((value) => hasJsonLdType(value, "Organization"));
  const websites = homeNodes.filter((value) => hasJsonLdType(value, "WebSite"));
  const organization = organizations[0];
  const website = websites[0];
  check(organizations.length === 1, "Homepage exposes one primary Organization entity");
  check(websites.length === 1, "Homepage exposes one primary WebSite entity");
  check(organization?.["@id"] === `${canonicalOrigin}/#organization`, "Homepage Organization keeps its stable identifier");
  check(website?.["@id"] === `${canonicalOrigin}/#website`, "Homepage WebSite keeps its stable identifier");
  check(website?.publisher?.["@id"] === organization?.["@id"], "Homepage WebSite publisher references the Organization");
  check(organization?.email === "hello@rukhlabs.com", "Homepage Organization uses the public contact email");
  check(
    organization?.contactPoint?.["@type"] === "ContactPoint" &&
      organization?.contactPoint?.contactType === "customer support" &&
      organization?.contactPoint?.email === "hello@rukhlabs.com" &&
      organization?.contactPoint?.availableLanguage?.includes("English"),
    "Homepage Organization exposes the visible public support contact",
  );
  check(
    JSON.stringify(organization?.sameAs) === JSON.stringify(["https://patreon.com/rukhlabs"]),
    "Homepage Organization sameAs contains only the approved public profile",
  );
  check(!homeNodes.some((value) => hasJsonLdType(value, "Person")), "Homepage structured data does not identify a Person or founder");
  check(!Object.hasOwn(organization ?? {}, "founder"), "Homepage Organization exposes no founder property");

  const collectionExpectations = new Map([
    [
      "/work",
      [
        `${canonicalOrigin}/work/rukh-labs-website`,
        `${canonicalOrigin}/work/career-portfolio-demo`,
      ],
    ],
    [
      "/insights",
      insights.map((insight) => `${canonicalOrigin}/insights/${insight.slug}`),
    ],
    [
      "/products",
      products.map((product) => `${canonicalOrigin}${product.href}`),
    ],
  ]);
  for (const [route, expectedUrls] of collectionExpectations) {
    const nodes = jsonLdNodes(pages.get(route)?.jsonLd ?? []);
    const collection = nodes.find((value) => hasJsonLdType(value, "CollectionPage"));
    const list = collection?.mainEntity;
    const elements = list?.itemListElement ?? [];
    const urls = elements.map((element) => element?.item?.url);
    check(list?.["@type"] === "ItemList", `${route} CollectionPage includes an ItemList`);
    check(JSON.stringify(urls) === JSON.stringify(expectedUrls), `${route} ItemList matches the visible indexable collection in stable order`);
    check(
      elements.every((element, index) => element?.["@type"] === "ListItem" && element?.position === index + 1),
      `${route} ItemList uses sequential ListItem positions`,
    );
    for (const expectedUrl of expectedUrls) {
      const expectedPath = new URL(expectedUrl).pathname;
      const expectedRoute = seoRoutes.find((entry) => entry.path === expectedPath);
      check(expectedRoute?.indexable, `${route} ItemList URL ${expectedPath} is classified as indexable`);
      check(pages.get(expectedPath)?.response.status === 200, `${route} ItemList URL ${expectedPath} returns 200`);
      check(sitemapUrls.has(expectedUrl), `${route} ItemList URL ${expectedPath} is present in the sitemap`);
      check((pages.get(route)?.html ?? "").includes(`href="${expectedPath}"`), `${route} visibly links to its ItemList URL ${expectedPath}`);
    }
  }
  const workCollectionJson = JSON.stringify(jsonLdNodes(pages.get("/work")?.jsonLd ?? []));
  check(!workCollectionJson.includes("/work/farzin") && !workCollectionJson.includes("/work/glass-squares-os"), "Work ItemList excludes noindex product-work routes");
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
  const costGuideText = renderedText(costGuide);
  for (const value of [
    "Current cost ranges: treat them as planning references",
    "Recurring costs to model separately",
    "Where Rukh Labs’ current packages fit",
    "$2,000–$100,000",
    "2.9% + 30¢",
    "https://www.upwork.com/hire/web-designers/cost/",
    "https://stripe.com/pricing",
  ]) {
    check((value.startsWith("http") ? costGuide : costGuideText).includes(value), `Cost guide visibly includes current sourced reference: ${value}`);
  }
  check(!costGuideText.includes("Official platform examples run from $0"), "Cost guide removes the misleading Wix upper-limit sentence");
  check(costGuideText.includes("Examples include WordPress.com’s free plan and Wix Business at $39 per month with annual billing."), "Cost guide uses the corrected Wix example wording");
  check(costGuideText.includes("Wix also publishes a wider annual-billing range of $17 to $159 per month."), "Cost guide keeps the wider Wix range separate");
  for (const supportedReference of ["$20–$50+/hour", "$45–$75+/hour", "$29–$299/month", "$4/month", "$17–$159/month", "without a registrar markup"]) {
    check(costGuideText.includes(supportedReference), `Cost guide retains verified reference: ${supportedReference}`);
  }
  for (const factor of ["Scope", "provider", "geography", "billing term", "content readiness", "integrations", "maintenance", "platform fees"]) {
    check(costGuideText.toLowerCase().includes(factor.toLowerCase()), `Cost guide variability disclaimer includes ${factor}`);
  }

  for (const insight of insights) {
    const route = `/insights/${insight.slug}`;
    for (const anchor of anchorValues(pages.get(route)?.html ?? "")) {
      const href = decodeHtml(anchor.attributes.href ?? "");
      if (!/^https?:\/\//.test(href) || href.startsWith(canonicalOrigin)) continue;
      check(Boolean(new URL(href)), `${route} external citation uses an absolute URL`);
      check(anchor.text.length >= 4, `${route} external citation has descriptive anchor text`);
      check(anchor.attributes.target !== "_blank" || (anchor.attributes.rel ?? "").split(/\s+/).includes("noopener"), `${route} new-tab citation includes noopener`);
      check(anchor.attributes.target !== "_blank" || (anchor.attributes.rel ?? "").split(/\s+/).includes("noreferrer"), `${route} new-tab citation includes noreferrer`);
      check(!(anchor.attributes.rel ?? "").split(/\s+/).includes("nofollow"), `${route} editorial citation does not use nofollow`);
    }
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
    check(jsonLd.some((value) => hasJsonLdType(value, insight.schemaType)), `${route} emits ${insight.schemaType} structured data`);
    if (insight.schemaType === "TechArticle") {
      check(jsonLd.some((value) => hasJsonLdType(value, "Article") && hasJsonLdType(value, "TechArticle")), `${route} makes the Article parent type explicit`);
    }
    check(renderedText(page?.html ?? "").includes("By Rukh Labs"), `${route} visibly uses the Rukh Labs byline`);
    check(getMeta(page?.html ?? "", "name", "author") === "Rukh Labs", `${route} metadata author is Rukh Labs`);
    const article = jsonLd.find((value) => hasJsonLdType(value, insight.schemaType));
    check(
      Array.isArray(article?.image) &&
        article.image.length === 1 &&
        article.image[0] === `${canonicalOrigin}/insights/${insight.slug}/opengraph-image` &&
        article.inLanguage === "en-US" &&
        article.isPartOf?.["@id"] === `${canonicalOrigin}/#website`,
      `${route} structured data includes image, language, and website membership`,
    );
    check(article?.url === page?.canonical && article?.mainEntityOfPage?.["@id"] === page?.canonical, `${route} structured-data URL and main entity match the canonical URL`);
    for (const role of ["author", "publisher"]) {
      check(
        article?.[role]?.["@type"] === "Organization" &&
          article?.[role]?.["@id"] === "https://rukhlabs.com/#organization" &&
          article?.[role]?.name === "Rukh Labs" &&
          article?.[role]?.url === "https://rukhlabs.com/about",
        `${route} ${role} structured data uses the Rukh Labs Organization`,
      );
    }
    check(!jsonLd.some((value) => JSON.stringify(value).includes('"@type":"Person"')), `${route} structured data contains no Person schema`);
  }

  for (const project of workProjects) {
    const route = `/work/${project.slug}`;
    check((pages.get(route)?.html ?? "").includes(project.projectType), `${route} clearly identifies its project type`);
  }

  const deploymentDatedRoutes = [
    "/services/web-development",
    "/services/career-portfolios",
    "/services/web-development/small-business",
    "/services/web-development/professional-services",
    "/services/career-portfolios/data-analysts",
    "/services/career-portfolios/bi-developers",
    "/products/farzin",
    "/products/farzin/privacy",
    "/products/glass-squares-os",
    "/work",
    "/work/rukh-labs-website",
    "/work/farzin",
    "/work/glass-squares-os",
    "/work/career-portfolio-demo",
    "/insights",
    ...insights.map((insight) => `/insights/${insight.slug}`),
    "/tools/website-project-brief",
    "/legal/terms",
    "/services/web-development/designs/obsidian",
    "/services/web-development/designs/signal",
    "/services/web-development/designs/atelier",
    "/services/web-development/designs/main-street",
    "/services/web-development/designs/spotlight",
    "/services/web-development/designs/dispatch",
  ];
  for (const route of deploymentDatedRoutes) {
    const manifestRoute = seoRoutes.find((entry) => entry.path === route);
    check(manifestRoute?.lastModified === SEO_PHASE_TWO_DEPLOYMENT_DATE, `${route} uses the stable Phase 2 deployment date`);
    if (manifestRoute?.indexable) {
      const sitemapUrl = new URL(route, canonicalOrigin).toString();
      const escapedSitemapUrl = sitemapUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const sitemapEntry = new RegExp(`<loc>${escapedSitemapUrl}<\\/loc>[\\s\\S]*?<lastmod>${SEO_PHASE_TWO_DEPLOYMENT_DATE}<\\/lastmod>`);
      check(sitemapEntry.test(sitemapXml), `${route} exposes the intended lastModified date in the sitemap`);
    }
  }
  for (const insight of insights) {
    check(insight.publishedOn === SEO_PHASE_TWO_DEPLOYMENT_DATE, `${insight.slug} uses the Phase 2 publication date`);
    check(insight.modifiedOn === insight.publishedOn, `${insight.slug} starts with matching publication and modification dates`);
  }
  check(seoRoutes.every((route) => route.lastModified <= SEO_NETWORK_EXPLORER_DEPLOYMENT_DATE), "No route date is later than the intended deployment date");
  check(!sourceFiles.seoRoutes.includes("new Date("), "Route dates are not generated with new Date()");
  check(!sourceFiles.insights.includes("new Date("), "Article dates are not generated with new Date()");
  check(renderedText(pages.get("/legal/privacy")?.html ?? "").includes("Last updated: August 14, 2026"), "General Privacy Policy shows August 14, 2026");
  check(renderedText(pages.get("/products/farzin/privacy")?.html ?? "").includes("Last updated: August 5, 2026"), "Farzin Privacy Policy shows August 5, 2026");

  const briefTool = pages.get("/tools/website-project-brief")?.html ?? "";
  check(briefTool.includes("does not submit, store, email, or send your brief text"), "Project brief privacy wording matches the browser-only implementation");
  check(briefTool.includes("Website Project Brief Generator"), "Project brief tool exists and is indexable");
  check(briefTool.includes("See an example project brief"), "Project brief includes the static fictional example output");
  check(sourceFiles.briefForm.includes("Download Markdown") && sourceFiles.briefForm.includes("Download plain text"), "Project brief offers separate Markdown and plain-text controls");
  check(sourceFiles.briefForm.includes('"website-project-brief.md"') && sourceFiles.briefForm.includes('"website-project-brief.txt"'), "Project brief supports .md and .txt filenames");
  check(sourceFiles.briefForm.includes('"text/markdown;charset=utf-8"') && sourceFiles.briefForm.includes('"text/plain;charset=utf-8"'), "Project brief uses the required export MIME types");
  const downloadType = sourceFiles.analytics.match(/project_brief_download:\s*\{([\s\S]*?)\};/)?.[1] ?? "";
  const downloadTypeKeys = [...downloadType.matchAll(/^\s*(\w+):/gm)].map((match) => match[1]).sort();
  check(JSON.stringify(downloadTypeKeys) === JSON.stringify(["format", "project_type", "source_page"]), "Download analytics type includes only project_type, format, and source_page");
  check(downloadType.includes('"markdown" | "text"'), "Download analytics format is limited to markdown or text");
  const downloadCall = sourceFiles.briefForm.match(/trackEvent\("project_brief_download",\s*\{([\s\S]*?)\}\);/)?.[1] ?? "";
  check(["project_type", "format", "source_page"].every((key) => downloadCall.includes(key)), "Download event sends each approved property");
  check(!/(generatedBrief|projectName|description|audience|notes|references|competitors|email|phone)/i.test(downloadCall), "Download event sends no user-entered text or personal information");
  check(sourceFiles.workPage.includes("getSeoRoute(path)") && sourceFiles.workPage.includes("index: seoRoute.indexable"), "Dynamic Work metadata derives indexing from the central route manifest");
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
