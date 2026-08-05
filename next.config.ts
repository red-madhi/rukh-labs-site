import type { NextConfig } from "next";

const privatePortfolioBase = "/portfolio/brett-gallaher/site";
const privatePortfolioRoutes = [
  "",
  "/about",
  "/contact",
  "/dashboards",
  "/lab",
  "/privacy",
  "/resume",
  "/work",
  "/work/advanced-dax-laboratory",
  "/work/capital-portfolio-scenario-studio",
  "/work/contact-center-pulse",
  "/work/fabric-resource-forecast",
  "/work/factory-intelligence-system",
  "/work/field-service-network",
  "/work/global-workforce-mobility-strategy-lab",
  "/work/security-governance-laboratory",
];

const nextConfig: NextConfig = {
  trailingSlash: false,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.rukhlabs.com" }],
        destination: "https://rukhlabs.com/:path*",
        permanent: true,
      },
      { source: "/farzin", destination: "/products/farzin", permanent: true },
      { source: "/farzin-chess", destination: "/products/farzin", permanent: true },
      { source: "/apps/farzin", destination: "/products/farzin", permanent: true },
      { source: "/products/farzin-chess", destination: "/products/farzin", permanent: true },
      { source: "/farzin/privacy", destination: "/products/farzin/privacy", permanent: true },
      { source: "/legal/farzin-privacy", destination: "/products/farzin/privacy", permanent: true },
      { source: "/rukh-os", destination: "/products/glass-squares-os", permanent: true },
      { source: "/products/rukh-os", destination: "/products/glass-squares-os", permanent: true },
    ];
  },
  async rewrites() {
    return privatePortfolioRoutes.map((path) => ({
      source: privatePortfolioBase + path,
      destination: privatePortfolioBase + path + "/index.html",
    }));
  },
  async headers() {
    return [
      {
        source: "/portfolio/brett-gallaher/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet",
          },
          {
            key: "Referrer-Policy",
            value: "no-referrer",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
