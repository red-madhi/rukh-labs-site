import type { DesignDirectionSlug } from "@/lib/web-development";
import { AtelierSampleSite } from "./atelier-sample-site";
import { DispatchSampleSite } from "./dispatch-sample-site";
import { MainStreetSampleSite } from "./main-street-sample-site";
import { ObsidianSampleSite } from "./obsidian-sample-site";
import { SignalSampleSite } from "./signal-sample-site";
import { SpotlightSampleSite } from "./spotlight-sample-site";

export function FullSampleSite({ slug }: { slug: DesignDirectionSlug }) {
  const samples = {
    obsidian: <ObsidianSampleSite />,
    signal: <SignalSampleSite />,
    atelier: <AtelierSampleSite />,
    "main-street": <MainStreetSampleSite />,
    spotlight: <SpotlightSampleSite />,
    dispatch: <DispatchSampleSite />,
  } satisfies Record<DesignDirectionSlug, React.ReactNode>;

  return samples[slug];
}
