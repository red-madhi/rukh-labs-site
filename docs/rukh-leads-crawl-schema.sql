CREATE TABLE IF NOT EXISTS public.lead_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_key text NOT NULL,
  organization_name text NOT NULL,
  alternate_name text,
  category text,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  country_code text NOT NULL DEFAULT 'US',
  contact_name text,
  phone text,
  email text,
  website_url text,
  source_url text,
  formed_at date,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'domain-pending',
  priority_seed smallint NOT NULL DEFAULT 0 CHECK (priority_seed BETWEEN 0 AND 100),
  domain_confidence smallint NOT NULL DEFAULT 0 CHECK (domain_confidence BETWEEN 0 AND 100),
  attempts smallint NOT NULL DEFAULT 0,
  next_action_at timestamptz NOT NULL DEFAULT now(),
  last_checked_at timestamptz,
  last_error text,
  audit jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at timestamptz,
  CONSTRAINT lead_candidates_source_key_unique UNIQUE (source, source_key),
  CONSTRAINT lead_candidates_status_check CHECK (
    status = ANY (ARRAY[
      'domain-pending','domain-working','audit-pending','audit-working',
      'audited','qualified','no-website','rejected','error'
    ])
  )
);

CREATE INDEX IF NOT EXISTS lead_candidates_work_queue_idx
  ON public.lead_candidates (status, next_action_at, priority_seed DESC, discovered_at)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS lead_candidates_website_idx
  ON public.lead_candidates (website_url)
  WHERE website_url IS NOT NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS lead_candidates_location_idx
  ON public.lead_candidates (state, city)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS lead_candidates_source_idx
  ON public.lead_candidates (source, discovered_at DESC)
  WHERE archived_at IS NULL;
