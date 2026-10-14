-- Mastery rubric (Phase 7B): per-answer inputs and the stored rubric.
ALTER TABLE "Interaction" ADD COLUMN IF NOT EXISTS "attemptIndex" INTEGER;
ALTER TABLE "Interaction" ADD COLUMN IF NOT EXISTS "inputHash" TEXT;
ALTER TABLE "TopicMastery" ADD COLUMN IF NOT EXISTS "criteriaMet" JSONB;
ALTER TABLE "TopicMastery" ADD COLUMN IF NOT EXISTS "masteredAt" TIMESTAMP(3);

-- Backfill attemptIndex on answers logged before it existed, from the
-- client's wrong-attempt counter (hintIndexAtResolve): a right answer after
-- k misses carries k, a wrong one carries its own number.
UPDATE "Interaction"
SET "attemptIndex" = CASE
  WHEN "predictionCorrect" THEN "hintIndexAtResolve" + 1
  ELSE GREATEST("hintIndexAtResolve", 1)
END
WHERE "attemptIndex" IS NULL
  AND "predictionCorrect" IS NOT NULL
  AND "interactionType" IN ('PREDICTION', 'COMPLEXITY_PREDICTION');
