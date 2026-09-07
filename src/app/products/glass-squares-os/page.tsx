import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppWindow, ArrowDown, ArrowRight, Cable, Check, Grid2X2, HardDrive, Layers3, MonitorCog, PackageCheck, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { StructuredData } from "@/components/seo/structured-data";
import { createPageMetadata, siteConfig } from "@/lib/site-config";
import styles from "./glass-squares.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Glass Squares OS: A More Human Linux Desktop",
  description: "Explore Glass Squares OS, an independent Linux desktop in development. See the VM-tested desktop milestone, six core apps, visual direction, and next steps.",
  path: "/products/glass-squares-os",
});

const artwork = "/products/glass-squares/concepts-20260906.avif";
const principles = [
  { title: "Distinctive", copy: "Glass, depth, and a shared visual language.", icon: Sparkles },
  { title: "Familiar", copy: "Launch, switch, search. Keep your bearings.", icon: Grid2X2 },
  { title: "Modular", copy: "Connected surfaces. Separately built tools.", icon: Layers3 },
  { title: "Native", copy: "Building on Linux, Plasma, and KWin.", icon: MonitorCog },
];
const previews = [
  { title: "Login", copy: "A calm beginning to your session.", crop: styles.login, alt: "Concept preview of a Glass Squares login screen over a blue planetary landscape" },
  { title: "Desktop shell", copy: "A clear space for the work in front of you.", crop: styles.desktop, alt: "Concept preview of the Glass Squares desktop with a translucent bottom shelf" },
  { title: "Start", copy: "Your applications, within reach.", crop: styles.start, alt: "Concept preview of the Glass Squares Start menu with a search field and application grid" },
  { title: "Quick settings", copy: "System controls, in one place.", crop: styles.settings, alt: "Concept preview of Glass Squares quick settings; deeper system integration is planned" },
];
const apps = [
  { name: "Welcome", copy: "First-run guidance and a way into your desktop.", icon: Sparkles },
  { name: "Store", copy: "Application discovery and clearer software choices.", icon: PackageCheck },
  { name: "Update", copy: "A dedicated home for system-update information.", icon: RefreshCw },
  { name: "Drive Center", copy: "A focused interface for storage and connected drives.", icon: HardDrive },
  { name: "Bridge", copy: "Tools for connecting workflows across environments.", icon: Cable },
  { name: "Windows Workspace", copy: "A place to develop practical Windows workflow options.", icon: AppWindow },
];
const roadmap = [
  { phase: "01", status: "Accepted in a VM", title: "Desktop fundamentals", copy: "Fresh login, Start, Store, Shelf, Spotlight, and repeat-session behavior.", done: true },
  { phase: "02", status: "Next phase", title: "Deeper system integration", copy: "Audio, network, power, notifications, and session controls. This phase has not started.", done: false },
  { phase: "03", status: "Still ahead", title: "Hardware & compatibility", copy: "Validate this candidate on physical hardware and test complete application workflows.", done: false },
  { phase: "04", status: "Not yet released", title: "Public preview", copy: "Open testing after the relevant quality and release gates pass. No release date announced.", done: false },
];

export default function GlassSquaresOSPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${siteConfig.url}/products/glass-squares-os#software`,
    name: "Glass Squares OS",
    description: "An independent Linux desktop in development, with a VM-tested desktop milestone, a modular Plasma/KWin-based shell, and a shared first-party application design language.",
    applicationCategory: "OperatingSystem",
    operatingSystem: "Linux",
    url: `${siteConfig.url}/products/glass-squares-os`,
    publisher: { "@type": "Organization", "@id": `${siteConfig.url}/#organization`, name: siteConfig.name, url: siteConfig.url },
  };

  return (
    <div className={styles.page}>
      <StructuredData data={structuredData} />
      <div className={styles.subnav}>
        <div className={styles.wrap}>
          <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Products", path: "/products" }, { name: "Glass Squares OS", path: "/products/glass-squares-os" }]} />
          <nav aria-label="Glass Squares page sections" className={styles.localLinks}>
            <a href="#build-state">Build state</a><a href="#preview">Design</a><a href="#roadmap">Roadmap</a>
          </nav>
        </div>
      </div>

      <section className={styles.hero} aria-labelledby="glass-title">
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.wordmark}>Glass Squares <span>OS</span></p>
            <p className={styles.badge}><span aria-hidden="true" /> In development</p>
            <h1 id="glass-title">A more human<br /><span>computer.</span></h1>
            <p className={styles.heroLead}>Focused. Calm. Beautiful. Yours.</p>
            <p className={styles.heroBody}>An independent Linux desktop bringing a distinctive glass interface, familiar controls, and a shared visual language to everyday computing.</p>
            <div className={styles.actions}>
              <a className={styles.primary} href="#preview">Explore the desktop <ArrowDown aria-hidden="true" size={17} /></a>
              <a className={styles.secondary} href="#build-state">See build progress <ArrowRight aria-hidden="true" size={17} /></a>
            </div>
            <p className={styles.heroNote}>First desktop milestone passed in VM testing.<br />Public release still ahead.</p>
          </div>
          <figure className={styles.heroFigure}>
            <div className={styles.heroArtwork}>
              <Image src={artwork} alt="Glass Squares concept artwork: illuminated overlapping glass squares above water between dark monoliths and a blue planet" width={600} height={700} priority unoptimized className={styles.heroImage} />
            </div>
            <figcaption>Concept artwork · visual direction</figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.principles} aria-label="Design principles">
        <div className={`${styles.wrap} ${styles.principleGrid}`}>
          {principles.map(({ title, copy, icon: Icon }) => <div className={styles.principle} key={title}><Icon aria-hidden="true" size={25} strokeWidth={1.3} /><div><h2>{title}</h2><p>{copy}</p></div></div>)}
        </div>
      </section>

      <section id="build-state" className={`${styles.section} ${styles.statusSection}`} aria-labelledby="build-title">
        <div className={styles.wrap}>
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>Current build state</p><h2 id="build-title">From concept to a<br />working desktop.</h2></div>
            <div className={styles.statusIntro}><p className={styles.passBadge}><Check aria-hidden="true" size={15} /> First desktop milestone passed</p><p>The integrated desktop passed its first acceptance milestone in a virtual machine. It is a working development build, not a finished OS or a public beta.</p><p className={styles.date}>Latest accepted checkpoint · <time dateTime="2026-09-06">September 6, 2026</time></p></div>
          </div>
          <dl className={styles.stats}>
            <div><dt>Required runtime checks passed</dt><dd>24<span> / 24</span></dd></div>
            <div><dt>Visible first-party app launches passed</dt><dd>6</dd></div>
            <div><dt>Source tests passed</dt><dd>227</dd></div>
          </dl>
          <div className={styles.statusGrid}>
            <article><p className={styles.passed}>Passed · virtual-machine testing</p><h3>Desktop fundamentals</h3><p>Fresh login. Start navigation. Store presentation. Shelf grouping and minimize/restore. Spotlight application launches. Genuine logout and relogin. Normal boot and shutdown.</p></article>
            <article><p className={styles.planned}>Next · not started</p><h3>System integration</h3><p>The next shell phase brings deeper work on audio, networking, power, notifications, and session controls. Full application workflows still need broader validation.</p></article>
            <article><p className={styles.pending}>Ahead · not yet validated</p><h3>Hardware & release</h3><p>This candidate has not completed physical-hardware acceptance. Driver compatibility, release readiness, and public testing remain ahead. No public OS download is available.</p></article>
          </div>
          <p className={styles.footnote}>Based on the final <code>ae47cf5</code> acceptance record. Passing this milestone does not establish that every application feature works.</p>
        </div>
      </section>

      <section id="preview" className={`${styles.section} ${styles.previewSection}`} aria-labelledby="preview-title">
        <div className={styles.wrap}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>The desktop experience</p><h2 id="preview-title">A first look at the direction.</h2></div><p className={styles.headingNote}>These are concept previews inspired by the Glass Squares mockups, <strong>not screenshots of the current build.</strong></p></div>
          <div className={styles.previewGrid}>
            {previews.map((preview) => <figure className={styles.previewCard} key={preview.title}><div className={styles.previewArtwork}><Image src={artwork} width={600} height={700} alt={preview.alt} unoptimized className={`${styles.previewImage} ${preview.crop}`} /></div><figcaption><span className={styles.conceptLabel}>Concept preview</span><h3>{preview.title}</h3><p>{preview.copy}</p></figcaption></figure>)}
          </div>
          <div className={styles.desktopNote}><Layers3 aria-hidden="true" size={23} /><p><strong>One desktop. Distinct parts.</strong> Start, Shelf, and Spotlight are evolving as connected native surfaces on the existing Plasma/KWin foundation—not a monolithic replacement compositor.</p></div>
        </div>
      </section>

      <section id="apps" className={styles.section} aria-labelledby="apps-title">
        <div className={styles.wrap}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Core apps · in development</p><h2 id="apps-title">A shared language.<br />Tools with a purpose.</h2></div><p className={styles.headingNote}>Welcome, Store, Update, Drive Center, Bridge, and Windows Workspace form the core app family. Each is being developed as its own focused tool.</p></div>
          <div className={styles.appGrid}>{apps.map(({ name, copy, icon: Icon }) => <article className={styles.appCard} key={name}><span className={styles.appIcon}><Icon aria-hidden="true" size={24} strokeWidth={1.5} /></span><h3>{name}</h3><p>{copy}</p><span className={styles.appState}>In development</span></article>)}</div>
          <p className={styles.footnote}>Six visible launches passed in the accepted VM. Installation, remote updates, storage operations, and Windows compatibility are not implied by a successful launch.</p>
        </div>
      </section>

      <section id="roadmap" className={`${styles.section} ${styles.roadmapSection}`} aria-labelledby="roadmap-title">
        <div className={styles.wrap}>
          <p className={styles.eyebrow}>What comes next</p><h2 id="roadmap-title">Build the experience.<br />Prove the essentials.</h2>
          <div className={styles.roadmapGrid}>{roadmap.map((item) => <article className={styles.roadmapCard} key={item.phase}><div className={styles.phase}><span>{item.phase}</span>{item.done ? <Check aria-hidden="true" size={18} /> : <ArrowRight aria-hidden="true" size={18} />}</div><p className={item.done ? styles.passed : styles.planned}>{item.status}</p><h3>{item.title}</h3><p>{item.copy}</p></article>)}</div>
          <details className={styles.evidence}><summary>What this checkpoint proves—and what it does not</summary><div><h3>Tested in the accepted VM</h3><p>The September 6 acceptance record covers all 24 required runtime checks, 227 source tests, 23 build-input groups, six visible app launches, and seven installed self-tests. Desktop checks included 1920 × 1080 at 100%, 1366 × 768, and 150% scaling. Essential interactions passed with reduced motion.</p><h3>Known limits</h3><p>Four utilities retain generic window identities. Full suppression of Start’s custom motion remains unproven. Spotlight has cosmetic glyph-encoding issues, and remote Update checks remain incomplete. VM and platform limitations still apply.</p><p>The first disk attempt was interrupted by a builder runtime stall; the recorded recovery reused the validated source and container. Physical-hardware acceptance for this candidate and the next shell phase have not been completed.</p><p className={styles.footnote}>Status source: final Glass Shell Slice 1 acceptance record, <time dateTime="2026-09-06">September 6, 2026</time>, source <code>ae47cf5</code>. Artwork on this page represents design direction only.</p></div></details>
        </div>
      </section>

      <section className={styles.follow} aria-labelledby="follow-title"><div className={`${styles.wrap} ${styles.followGrid}`}><div><p className={styles.eyebrow}>Follow development</p><h2 id="follow-title">See what comes next.</h2><p>Get notified when public testing opens. Glass Squares OS is still in development; there is no public download yet.</p></div><Link className={styles.primary} href="/download">Get release updates <ArrowRight aria-hidden="true" size={18} /></Link></div></section>
      <div className={`${styles.wrap} ${styles.pageEnd}`}><ShieldCheck aria-hidden="true" size={16} /><p>Build status and concept imagery are kept separate. Last substantive update: <time dateTime="2026-09-06">September 6, 2026</time>.</p></div>
    </div>
  );
}
