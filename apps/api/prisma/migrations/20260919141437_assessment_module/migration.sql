-- CreateEnum
CREATE TYPE "AssessmentPhase" AS ENUM ('PRE', 'POST');

-- CreateEnum
CREATE TYPE "AssessmentItemType" AS ENUM ('MULTIPLE_CHOICE', 'TRACE');

-- DropForeignKey
ALTER TABLE "AssessmentResponse" DROP CONSTRAINT "AssessmentResponse_assessmentId_fkey";

-- DropForeignKey
ALTER TABLE "AssessmentResponse" DROP CONSTRAINT "AssessmentResponse_userId_fkey";

-- DropIndex
DROP INDEX "Assessment_name_key";

-- DropIndex
DROP INDEX "AssessmentResponse_assessmentId_idx";

-- DropIndex
DROP INDEX "AssessmentResponse_userId_idx";

-- AlterTable
ALTER TABLE "Assessment" DROP COLUMN "name",
DROP COLUMN "type",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "phase" "AssessmentPhase" NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "topicSlugs" TEXT[],
ADD COLUMN     "version" TEXT NOT NULL DEFAULT '1.0';

-- AlterTable
ALTER TABLE "AssessmentResponse" DROP COLUMN "assessmentId",
DROP COLUMN "responseValue",
DROP COLUMN "userId",
ADD COLUMN     "attemptId" TEXT NOT NULL,
ADD COLUMN     "response" TEXT NOT NULL,
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "timeSpentSeconds" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "AssessmentType";

-- CreateTable
CREATE TABLE "AssessmentItem" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "itemType" "AssessmentItemType" NOT NULL,
    "stem" TEXT NOT NULL,
    "options" JSONB,
    "correctOptionId" TEXT,
    "conceptTag" TEXT NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AssessmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalScore" INTEGER,

    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentItem_assessmentId_idx" ON "AssessmentItem"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAttempt_userId_assessmentId_key" ON "AssessmentAttempt"("userId", "assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_code_key" ON "Assessment"("code");

-- CreateIndex
CREATE INDEX "AssessmentResponse_attemptId_idx" ON "AssessmentResponse"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResponse_attemptId_itemId_key" ON "AssessmentResponse"("attemptId", "itemId");

-- AddForeignKey
ALTER TABLE "AssessmentItem" ADD CONSTRAINT "AssessmentItem_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "AssessmentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

