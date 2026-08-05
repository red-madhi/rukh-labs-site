"use client";

import dynamic from "next/dynamic";

const Demo = dynamic(
  () =>
    import("@/components/services/career-portfolios/fictional-portfolio-demo").then(
      (module) => module.FictionalPortfolioDemo,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        aria-label="Loading fictional career portfolio demo"
        className="min-h-[34rem] animate-pulse rounded-[1.6rem] border border-[#16c8ff]/18 bg-[linear-gradient(145deg,rgba(9,25,35,0.72),rgba(10,8,18,0.74))]"
      />
    ),
  },
);

export function LazyFictionalPortfolioDemo() {
  return <Demo />;
}
