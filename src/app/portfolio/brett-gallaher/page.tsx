import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brett Gallaher — Analytics Systems Portfolio",
  description:
    "Private recruiter portfolio for Brett Gallaher, BI Developer and Analytics Engineer.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-image-preview": "none",
      "max-snippet": 0,
      "max-video-preview": 0,
    },
  },
};

export default function BrettGallaherPortfolioPage() {
  return (
    <div className="fixed inset-0 z-[60] bg-[#06090c]">
      <iframe
        title="Brett Gallaher analytics systems portfolio"
        src="/portfolio/brett-gallaher/site"
        className="size-full border-0 bg-[#06090c]"
        allow="fullscreen"
      />
    </div>
  );
}
