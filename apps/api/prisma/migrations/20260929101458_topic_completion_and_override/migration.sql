-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "reachedFinalStep" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "posttestOverrideAt" TIMESTAMP(3),
ADD COLUMN     "posttestOverrideIncompleteTopics" TEXT[] DEFAULT ARRAY[]::TEXT[];
