-- ============================================
-- ONE GUDALUR - SUPABASE DATABASE SCHEMA (Part 2)
-- ============================================

-- Urgent Alerts
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_ta TEXT NOT NULL,
  description TEXT NOT NULL,
  description_ta TEXT NOT NULL,
  category alert_category NOT NULL,
  severity alert_severity NOT NULL,
  affected_localities TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  created_by TEXT REFERENCES users(uid),
  verified_by TEXT REFERENCES users(uid),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  acknowledged_by TEXT[] NOT NULL DEFAULT '{}',
  broadcasted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Wildlife Incidents
CREATE TABLE wildlife_incidents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type wildlife_type NOT NULL,
  locality_id TEXT NOT NULL,
  generalized_area TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  urgency threat_level NOT NULL,
  reported_by TEXT NOT NULL,
  verified_by_forest_dept BOOLEAN NOT NULL DEFAULT FALSE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Petitions
CREATE TABLE petitions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_ta TEXT NOT NULL,
  problem TEXT NOT NULL,
  demand TEXT NOT NULL,
  target_authority TEXT NOT NULL,
  target_authority_ta TEXT,
  evidence_summary TEXT NOT NULL,
  evidence_summary_ta TEXT,
  support_count INTEGER NOT NULL DEFAULT 0,
  supporters TEXT[] NOT NULL DEFAULT '{}',
  status petition_status NOT NULL DEFAULT 'DRAFT',
  created_by TEXT NOT NULL REFERENCES users(uid),
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Government Grievances
CREATE TABLE government_grievances (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(uid),
  user_gudalur_id TEXT NOT NULL,
  authority TEXT NOT NULL,
  complaint_id TEXT NOT NULL,
  title TEXT NOT NULL,
  submission_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Services Directory
CREATE TABLE services (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  phone TEXT NOT NULL,
  locality_id TEXT NOT NULL,
  locality_name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  is_24x7 BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
CREATE TABLE comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  parent_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(uid),
  user_name TEXT NOT NULL,
  user_gudalur_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Market Prices
CREATE TABLE market_prices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  item TEXT NOT NULL,
  item_ta TEXT,
  unit TEXT NOT NULL,
  min_price INTEGER NOT NULL,
  max_price INTEGER NOT NULL,
  market TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Community Posts
CREATE TABLE community_posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(uid),
  user_name TEXT NOT NULL,
  user_gudalur_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Help Requests
CREATE TABLE help_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(uid),
  user_name TEXT NOT NULL,
  user_gudalur_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  urgency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Volunteers
CREATE TABLE volunteers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(uid),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  locality_id TEXT NOT NULL,
  locality_name TEXT NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  availability TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Manifesto Stats
CREATE TABLE manifesto_stats (
  id TEXT PRIMARY KEY DEFAULT 'global',
  count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Manifesto Signatures
CREATE TABLE manifesto_signatures (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  locality TEXT NOT NULL,
  contact TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);