-- AlterEnum
ALTER TYPE "Mode" ADD VALUE 'CLASSIC';

-- AlterTable
ALTER TABLE "AssessmentItem" ADD COLUMN     "topicSlug" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "classicTopicSlug" TEXT;

-- Backfill: participants enrolled before this migration (the pilot accounts)
-- get their Classic topic by the same rule enrolment now applies:
-- STUDY_TOPICS[(ordinal - 1) % 3], ordinal = the code's trailing number.
UPDATE "User"
SET "classicTopicSlug" = (ARRAY['bubble-sort', 'binary-search', 'bst'])[
  ((substring("participantCode" from '([0-9]+)$')::int - 1) % 3) + 1
]
WHERE "participantCode" IS NOT NULL
  AND "classicTopicSlug" IS NULL
  AND substring("participantCode" from '([0-9]+)$') IS NOT NULL;
