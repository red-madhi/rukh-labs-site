import { track } from "@vercel/analytics";

type EventProperties = Record<string, string | number | boolean | null | undefined>;

type AnalyticsEvents = {
  website_package_click: { package_id: string; source_page: string };
  career_package_click: { package_id: string; source_page: string };
  contact_form_start: { inquiry_type: string; source_page: string };
  contact_form_submit: { inquiry_type: string; source_page: string };
  email_click: { source_page: string };
  google_play_click: { product: "farzin"; source_page: string };
  glass_squares_waitlist_submit: { product: "glass-squares-os"; source_page: string };
  sample_site_open: { design_direction: string; source_page: string };
  career_demo_open: { source_page: string };
};

export type AnalyticsEventName = keyof AnalyticsEvents;

export function trackEvent<Name extends AnalyticsEventName>(
  name: Name,
  properties: AnalyticsEvents[Name] & EventProperties,
) {
  try {
    track(name, properties);
  } catch {
    // Analytics must never interrupt navigation or form behavior.
  }
}
