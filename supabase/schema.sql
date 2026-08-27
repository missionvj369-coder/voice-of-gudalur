-- ============================================
-- ONE GUDALUR - SUPABASE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM (
  'RESIDENT',
  'LOCAL_MEMBER',
  'LOCAL_MODERATOR',
  'LOCAL_ADMIN',
  'CORE_ADMIN',
  'VERIFIER',
  'PLATFORM_ADMIN'
);

CREATE TYPE verification_level AS ENUM (
  'REGISTERED',
  'PHONE_VERIFIED',
  'LOCALITY_VERIFIED',
  'TRUSTED_MEMBER',
  'LOCAL_ADMIN',
  'CORE_ADMIN',
  'PLATFORM_ADMIN'
);

CREATE TYPE issue_category AS ENUM (
  'roads',
  'water',
  'electricity',
  'sanitation',
  'wildlife',
  'ghat_safety',
  'health',
  'other'
);

CREATE TYPE issue_status AS ENUM (
  'REPORTED',
  'RECEIVED',
  'VERIFICATION',
  'ASSIGNED',
  'ACTION',
  'OFFICIAL_RESPONSE',
  'COMMUNITY_REVIEW',
  'RESOLVED'
);

CREATE TYPE alert_category AS ENUM (
  'WILDLIFE',
  'WEATHER',
  'TRAFFIC',
  'CIVIC',
  'wildlife',
  'weather',
  'road',
  'emergency',
  'health',
  'public_safety',
  'government',
  'infrastructure'
);

CREATE TYPE alert_severity AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
  'INFO',
  'NOTICE',
  'WARNING',
  'URGENT'
);

CREATE TYPE wildlife_type AS ENUM (
  'ELEPHANT',
  'TIGER',
  'LEOPARD',
  'GAUR',
  'SAMBAR',
  'WILD_BOAR',
  'SNAKE',
  'OTHER'
);

CREATE TYPE threat_level AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE petition_status AS ENUM (
  'DRAFT',
  'ACTIVE',
  'SUBMITTED',
  'IN_REVIEW',
  'RESPONDED',
  'RESOLVED',
  'CLOSED'
);

-- ============================================
-- TABLES
-- ============================================

-- Users / Resident Profiles
CREATE TABLE users (
  uid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  locality_id TEXT NOT NULL,
  locality_name TEXT NOT NULL,
  custom_place_name TEXT,
  pincode TEXT NOT NULL DEFAULT '643212',
  gudalur_id TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'LOCAL_MEMBER',
  verification_level verification_level NOT NULL DEFAULT 'REGISTERED',
  is_blood_donor BOOLEAN NOT NULL DEFAULT FALSE,
  blood_group TEXT,
  avatar_url TEXT,
  bio TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issues_reported INTEGER NOT NULL DEFAULT 0,
  issues_supported INTEGER NOT NULL DEFAULT 0,
  representations_created INTEGER NOT NULL DEFAULT 0,
  alerts_acknowledged INTEGER NOT NULL DEFAULT 0
);

-- Civic Issues
CREATE TABLE civic_issues (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category issue_category NOT NULL,
  photo_url TEXT,
  locality_id TEXT NOT NULL,
  locality_name TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  address TEXT,
  reporter_id TEXT NOT NULL REFERENCES users(uid),
  reporter_name TEXT NOT NULL,
  reporter_gudalur_id TEXT NOT NULL,
  status issue_status NOT NULL DEFAULT 'REPORTED',
  assigned_authority TEXT,
  official_grievance_id TEXT,
  upvotes_count INTEGER NOT NULL DEFAULT 0,
  upvoted_by TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);