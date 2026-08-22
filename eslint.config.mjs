import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/components/tools/bluesky-network-explorer.tsx"],
    rules: {
      // Resetting paginated results when filters change is intentional UI synchronization.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: [
      "src/app/leads/leads-dashboard.tsx",
      "src/app/leads/outreach-playbook.tsx",
      "src/app/leads/outreach/outreach-campaign.tsx",
      "src/app/leads/power-bi/power-bi-dashboard.tsx",
      "src/app/leads/statuses/lead-status-dashboard.tsx",
    ],
    rules: {
      // These established private dashboards intentionally load remote state on mount
      // and reset local editor state when the selected database record changes.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/app/leads/power-bi/power-bi-dashboard.tsx"],
    rules: {
      // The freshness counter is display-only and deliberately evaluated at render time.
      "react-hooks/purity": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/portfolio/brett-gallaher/site/_next/**",
  ]),
]);

export default eslintConfig;
