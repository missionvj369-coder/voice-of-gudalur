-- Migration: init
-- Voice of Gudalur â€” one identity = one signature petition system
-- Target: CockroachDB (PostgreSQL-compatible). Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "Identity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" STRING NOT NULL,
    "provider_subject_hash" STRING NOT NULL,
    "identity_key" STRING NOT NULL,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_e164_hash" STRING,
    "assurance_level" STRING NOT NULL DEFAULT 'low',
    "status" STRING NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Identity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Petition" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" STRING NOT NULL,
    "description" STRING NOT NULL,
    "consent_version" STRING NOT NULL,
    "status" STRING NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Petition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Signature" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "petition_id" UUID NOT NULL REFERENCES "Petition"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "identity_id" UUID NOT NULL REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "public_reference" STRING NOT NULL,
    "public_display_mode" STRING NOT NULL DEFAULT 'anonymous',
    "display_name" STRING,
    "area" STRING,
    "status" STRING NOT NULL DEFAULT 'SIGNING_PENDING',
    "consent_version" STRING NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ValidationLink" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "signature_id" UUID NOT NULL REFERENCES "Signature"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "token_hash" STRING NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "status" STRING NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ValidationLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Validation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "petition_id" UUID NOT NULL REFERENCES "Petition"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "signature_id" UUID NOT NULL REFERENCES "Signature"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "witness_identity_id" UUID NOT NULL REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "status" STRING NOT NULL DEFAULT 'accepted',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Validation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: IdempotencyKey (single canonical definition)
CREATE TABLE IF NOT EXISTS "IdempotencyKey" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identity_id" UUID NOT NULL REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "endpoint" STRING NOT NULL,
    "key_hash" STRING NOT NULL,
    "request_hash" STRING NOT NULL,
    "response_status" INT NOT NULL,
    "response_body_redacted" STRING NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RiskEvent (single canonical definition)
CREATE TABLE IF NOT EXISTS "RiskEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identity_id" UUID REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "event_type" STRING NOT NULL,
    "risk_level" STRING NOT NULL,
    "redacted_metadata" STRING NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AuditEvent (single canonical definition)
CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" STRING NOT NULL,
    "event_type" STRING NOT NULL,
    "actor_type" STRING NOT NULL,
    "actor_id" UUID REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "object_type" STRING NOT NULL,
    "object_id" STRING,
    "request_id" STRING,
    "metadata" STRING,
    "previous_hash" STRING,
    "event_hash" STRING NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- AlterTable: AuditEvent (idempotent metadata column add)
ALTER TABLE IF EXISTS "AuditEvent" ADD COLUMN IF NOT EXISTS "metadata" STRING;

-- CreateTable: AdminReview (single canonical definition)
CREATE TABLE IF NOT EXISTS "AdminReview" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "object_type" STRING NOT NULL,
    "object_id" STRING NOT NULL,
    "reviewer_id" STRING,
    "action" STRING NOT NULL,
    "reason" STRING NOT NULL,
    "status" STRING NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "AdminReview_pkey" PRIMARY KEY ("id")
);

-- Duplicate table definitions removed; canonical CREATE TABLE IF NOT EXISTS blocks above are authoritative.

-- Foreign keys (added separately so an existing DB can be migrated incrementally)
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_petition_id_fkey" FOREIGN KEY ("petition_id") REFERENCES "Petition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ValidationLink" ADD CONSTRAINT "ValidationLink_signature_id_fkey" FOREIGN KEY ("signature_id") REFERENCES "Signature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_petition_id_fkey" FOREIGN KEY ("petition_id") REFERENCES "Petition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_signature_id_fkey" FOREIGN KEY ("signature_id") REFERENCES "Signature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_witness_identity_id_fkey" FOREIGN KEY ("witness_identity_id") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskEvent" ADD CONSTRAINT "RiskEvent_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Unique constraints: one identity = one signature / one validation
CREATE UNIQUE INDEX IF NOT EXISTS "Identity_identity_key_key" ON "Identity"("identity_key");
CREATE UNIQUE INDEX IF NOT EXISTS "Identity_provider_subject_key" ON "Identity"("provider", "provider_subject_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "Identity_phone_e164_hash_key" ON "Identity"("phone_e164_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "Signature_public_reference_key" ON "Signature"("public_reference");
CREATE UNIQUE INDEX IF NOT EXISTS "Signature_petition_identity_key" ON "Signature"("petition_id", "identity_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ValidationLink_token_hash_key" ON "ValidationLink"("token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "Validation_sig_witness_key" ON "Validation"("signature_id", "witness_identity_id");
CREATE UNIQUE INDEX IF NOT EXISTS "Validation_witness_petition_key" ON "Validation"("witness_identity_id", "petition_id");
CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyKey_key_hash_key" ON "IdempotencyKey"("key_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "AuditEvent_event_id_key" ON "AuditEvent"("event_id");

-- Lookup indexes (IF NOT EXISTS keeps the migration idempotent)
CREATE INDEX IF NOT EXISTS "Identity_identity_key_idx" ON "Identity"("identity_key");
CREATE INDEX IF NOT EXISTS "Identity_status_idx" ON "Identity"("status");
CREATE INDEX IF NOT EXISTS "Petition_status_idx" ON "Petition"("status");
CREATE INDEX IF NOT EXISTS "Signature_petition_status_idx" ON "Signature"("petition_id", "status");
CREATE INDEX IF NOT EXISTS "Signature_reference_idx" ON "Signature"("public_reference");
CREATE INDEX IF NOT EXISTS "Signature_signed_at_idx" ON "Signature"("signed_at");
CREATE INDEX IF NOT EXISTS "ValidationLink_token_idx" ON "ValidationLink"("token_hash");
CREATE INDEX IF NOT EXISTS "ValidationLink_sig_idx" ON "ValidationLink"("signature_id");
CREATE INDEX IF NOT EXISTS "ValidationLink_status_idx" ON "ValidationLink"("status");
CREATE INDEX IF NOT EXISTS "Validation_petition_idx" ON "Validation"("petition_id");
CREATE INDEX IF NOT EXISTS "Validation_status_idx" ON "Validation"("status");
CREATE INDEX IF NOT EXISTS "IdempotencyKey_hash_idx" ON "IdempotencyKey"("key_hash");
CREATE INDEX IF NOT EXISTS "IdempotencyKey_expires_idx" ON "IdempotencyKey"("expires_at");
CREATE INDEX IF NOT EXISTS "RiskEvent_identity_idx" ON "RiskEvent"("identity_id");
CREATE INDEX IF NOT EXISTS "RiskEvent_type_idx" ON "RiskEvent"("event_type");
CREATE INDEX IF NOT EXISTS "RiskEvent_created_idx" ON "RiskEvent"("created_at");
CREATE INDEX IF NOT EXISTS "AuditEvent_type_idx" ON "AuditEvent"("event_type");
CREATE INDEX IF NOT EXISTS "AuditEvent_object_idx" ON "AuditEvent"("object_type", "object_id");
CREATE INDEX IF NOT EXISTS "AuditEvent_created_idx" ON "AuditEvent"("created_at");
CREATE INDEX IF NOT EXISTS "AdminReview_status_idx" ON "AdminReview"("status");
CREATE INDEX IF NOT EXISTS "AdminReview_object_idx" ON "AdminReview"("object_type", "object_id");

