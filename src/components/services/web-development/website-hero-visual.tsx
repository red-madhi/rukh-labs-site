import { DesignPreview } from "@/components/services/web-development/design-preview";
import { FictionalDemoDisclosure } from "@/components/services/web-development/fictional-demo-disclosure";

export function WebsiteHeroVisual() {
  return (
    <div className="relative mx-auto min-h-[25rem] w-full max-w-2xl sm:min-h-[31rem] lg:min-h-[36rem]">
      <FictionalDemoDisclosure className="absolute left-3 right-3 top-3 z-30 sm:left-6 sm:right-auto sm:max-w-sm" compact />
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute inset-[8%_4%_2%] rounded-[2rem] border border-[color:var(--brand-red)]/16 bg-[radial-gradient(circle_at_50%_25%,rgba(240,0,28,0.15),transparent_52%)]" />
        <div className="absolute left-0 top-[18%] hidden w-[58%] -rotate-[5deg] opacity-72 sm:block">
          <DesignPreview slug="atelier" size="mini" />
        </div>
        <div className="absolute right-0 top-[4%] hidden w-[56%] rotate-[5deg] opacity-78 sm:block">
          <DesignPreview slug="spotlight" size="mini" />
        </div>
        <div className="absolute inset-x-[2%] bottom-[4%] z-10 sm:inset-x-[8%]">
          <DesignPreview
            slug="dispatch"
            size="card"
            className="shadow-[0_38px_100px_rgba(0,0,0,0.6)]"
          />
        </div>
        <div className="absolute bottom-0 right-[2%] z-20 rounded-full border border-white/14 bg-[#0d0b0d]/92 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/66 shadow-xl backdrop-blur sm:right-[4%] sm:text-xs">
          Six curated directions
        </div>
      </div>
    </div>
  );
}
