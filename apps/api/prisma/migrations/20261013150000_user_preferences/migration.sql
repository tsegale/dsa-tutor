-- Learning preferences (Phase 6D): one nullable JSON column, so every
-- existing row keeps working with the defaults. Additive only.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferences" JSONB;
