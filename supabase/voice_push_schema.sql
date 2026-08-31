-- ──────────────────────────────────────────────────────────────────────
-- voice_push_schema.sql
-- Self-hosted Web Push notifications for the Voice Notification feature.
-- Run ONCE in Supabase SQL Editor.
-- ──────────────────────────────────────────────────────────────────────

-- 1. Stores browser push subscriptions (one row per subscriber device).
create table if not exists push_subscriptions (
  id              uuid         primary key default gen_random_uuid(),
  endpoint        text         not null unique,           -- browser push endpoint URL (acts as identity key)
  keys_auth       text         not null,                  -- P-256 auth key (base64)
  keys_p256dh     text         not null,                  -- P-256 ECDH key (base64)
  user_agent      text,                                    -- optional: browser/device info
  locality_id     text,                                    -- optional: filter push to a locality
  created_at      timestamptz  not null default now(),
  last_seen       timestamptz  not null default now()
);

-- index for realtime dedupe + locality-scoped broadcasts
create unique index if not exists push_subscriptions_endpoint_idx on push_subscriptions (endpoint);
create index if not exists push_subscriptions_locality_idx on push_subscriptions (locality_id);

-- 2. Lightweight audit log of every broadcast (for analytics / debugging).
create table if not exists push_log (
  id          bigint      generated always as identity primary key,
  title       text        not null,
  body        text        not null,
  sent_to     integer     not null default  0,
  delivered   integer     not null default  0,
  failures    integer     not null default  0,
  created_at  timestamptz not null default now()
);

-- Enable realtime on both tables
alter publication supabase_realtime add table push_subscriptions, push_log;

-- ── Row Level Security (public read/write for this demo — tighten before production) ──
alter table push_subscriptions enable row level security;
create policy "public insert" on push_subscriptions for insert with check (true);
create policy "public update" on push_subscriptions for update using (true);
create policy "public select" on push_subscriptions for select using (true);

-- ── Helpful RPC: count active subscriptions ──
create or replace function get_push_subscriber_count()
returns integer language sql stable as $$
  select count(*)::integer from push_subscriptions;
$$;