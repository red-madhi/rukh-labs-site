CREATE TABLE IF NOT EXISTS oauth_state (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS oauth_session (
  did text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
  did text PRIMARY KEY,
  handle text,
  display_name text,
  avatar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  last_graph_sync_at timestamptz,
  last_scan_at timestamptz
);
CREATE TABLE IF NOT EXISTS settings (
  owner_did text PRIMARY KEY REFERENCES users(did) ON DELETE CASCADE,
  inactive_days integer NOT NULL DEFAULT 90,
  bot_threshold integer NOT NULL DEFAULT 70,
  auto_unfollow boolean NOT NULL DEFAULT true,
  filters jsonb NOT NULL DEFAULT '{"rightWing":true,"antiPalestine":true,"islamophobia":true,"xenophobia":true}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS relationships (
  owner_did text NOT NULL REFERENCES users(did) ON DELETE CASCADE,
  did text NOT NULL,
  handle text,
  display_name text,
  avatar text,
  description text,
  followers_count integer,
  follows_count integer,
  posts_count integer,
  account_created_at timestamptz,
  was_follower boolean NOT NULL DEFAULT false,
  is_follower boolean NOT NULL DEFAULT false,
  is_following boolean NOT NULL DEFAULT false,
  follow_uri text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz,
  unfollowed_me_at timestamptz,
  PRIMARY KEY(owner_did, did)
);
CREATE TABLE IF NOT EXISTS scans (
  id text PRIMARY KEY,
  owner_did text NOT NULL REFERENCES users(did) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  total integer NOT NULL DEFAULT 0,
  processed integer NOT NULL DEFAULT 0,
  flagged integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS assessments (
  owner_did text NOT NULL REFERENCES users(did) ON DELETE CASCADE,
  did text NOT NULL,
  scan_id text REFERENCES scans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  score integer NOT NULL DEFAULT 0,
  categories text[] NOT NULL DEFAULT ARRAY[]::text[],
  confidence text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_activity_at timestamptz,
  assessed_at timestamptz,
  dismissed_at timestamptz,
  blocked_at timestamptz,
  PRIMARY KEY(owner_did, did)
);
CREATE TABLE IF NOT EXISTS suppressions (
  owner_did text NOT NULL REFERENCES users(did) ON DELETE CASCADE,
  did text NOT NULL,
  handle text,
  reason text NOT NULL,
  source text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_did, did)
);
CREATE TABLE IF NOT EXISTS actions (
  id bigserial PRIMARY KEY,
  owner_did text NOT NULL REFERENCES users(did) ON DELETE CASCADE,
  target_did text NOT NULL,
  action text NOT NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_relationships_owner_follower ON relationships(owner_did, is_follower);
CREATE INDEX IF NOT EXISTS idx_assessments_scan_status ON assessments(owner_did, scan_id, status);
CREATE INDEX IF NOT EXISTS idx_assessments_review ON assessments(owner_did, status, assessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_suppressions_active ON suppressions(owner_did, active);
CREATE INDEX IF NOT EXISTS idx_actions_owner_created ON actions(owner_did, created_at DESC);
