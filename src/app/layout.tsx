import type { Metadata, Viewport } from "next";
import { Geist_Mono, Michroma, Space_Grotesk } from "next/font/google";
import { SiteAnalytics } from "@/components/analytics/site-analytics";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { GlowBackground } from "@/components/visuals/glow-background";
import { createPageMetadata, siteConfig } from "@/lib/site-config";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-site-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const michroma = Michroma({
  variable: "--font-rukh-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = createPageMetadata({
  title: siteConfig.name,
  description: siteConfig.description,
});

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#05070b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${geistMono.variable} ${michroma.variable} h-full antialiased`}
    >
      <body className="flex min-h-full w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-background text-foreground">
        <GlowBackground />
        <Header />
        <main id="main-content" className="w-full min-w-0 max-w-full flex-1 overflow-x-hidden">
          {children}
        </main>
        <Footer />
        <SiteAnalytics />
      </body>
    </html>
  );
}
