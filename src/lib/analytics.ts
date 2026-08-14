import { track } from "@vercel/analytics";

type EventProperties = Record<string, string | number | boolean | null | undefined>;

type AnalyticsEvents = {
  website_package_click: { package_id: string; source_page: string };
  career_package_click: { package_id: string; source_page: string };
  contact_form_start: { inquiry_type: string; source_page: string };
  contact_form_submitted: { inquiry_type: string; source_page: string };
  contact_email_draft_opened: { inquiry_type: string; source_page: string };
  email_click: { source_page: string };
  google_play_click: { product: "farzin"; source_page: string };
  glass_squares_waitlist_submit: { product: "glass-squares-os"; source_page: string };
  sample_site_open: { design_direction: string; source_page: string };
  career_demo_open: { source_page: string };
  work_project_open: { project_slug: string; source_page: string };
  insight_article_open: { article_slug: string; source_page: string };
  insight_service_cta_click: { article_slug: string; destination: string };
  work_service_cta_click: { project_slug: string; destination: string };
  related_content_click: { source_page: string; destination: string };
  project_brief_start: { source_page: string };
  project_brief_complete: {
    project_type: string;
    selected_budget_range: string;
    selected_timeline_range: string;
    number_of_selected_pages: number;
    number_of_selected_features: number;
    source_page: string;
  };
  project_brief_copy: { project_type: string; source_page: string };
  project_brief_download: {
    project_type: string;
    format: "markdown" | "text";
    source_page: string;
  };
  project_brief_print: { project_type: string; source_page: string };
  project_brief_contact_click: { project_type: string; source_page: string };
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
