-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('CONTROL', 'TREATMENT');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('PRE_TEST', 'POST_TEST');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Mode" ADD VALUE 'FEYNMAN';
ALTER TYPE "Mode" ADD VALUE 'CODE';
ALTER TYPE "Mode" ADD VALUE 'CHALLENGE';

-- AlterTable
ALTER TABLE "Interaction" ADD COLUMN     "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiLatencyMs" INTEGER,
ADD COLUMN     "aiMisconceptionCategory" TEXT,
ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "bottomedOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "counterfactualText" TEXT,
ADD COLUMN     "feedbackText" TEXT,
ADD COLUMN     "hintIndexAtResolve" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hintText" TEXT,
ADD COLUMN     "promptVersion" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "condition" "Condition",
ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "participantCode" TEXT,
ADD COLUMN     "withdrawnAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TopicMastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "algorithmTopicId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "conceptualScore" INTEGER NOT NULL,
    "proceduralScore" INTEGER NOT NULL,
    "totalPredictions" INTEGER NOT NULL,
    "correctPredictions" INTEGER NOT NULL,
    "lastPracticedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicMastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssessmentType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "responseValue" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TopicMastery_userId_algorithmTopicId_key" ON "TopicMastery"("userId", "algorithmTopicId");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_name_key" ON "Assessment"("name");

-- CreateIndex
CREATE INDEX "AssessmentResponse_userId_idx" ON "AssessmentResponse"("userId");

-- CreateIndex
CREATE INDEX "AssessmentResponse_assessmentId_idx" ON "AssessmentResponse"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_participantCode_key" ON "User"("participantCode");

-- AddForeignKey
ALTER TABLE "TopicMastery" ADD CONSTRAINT "TopicMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicMastery" ADD CONSTRAINT "TopicMastery_algorithmTopicId_fkey" FOREIGN KEY ("algorithmTopicId") REFERENCES "AlgorithmTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

