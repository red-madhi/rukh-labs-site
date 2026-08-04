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
