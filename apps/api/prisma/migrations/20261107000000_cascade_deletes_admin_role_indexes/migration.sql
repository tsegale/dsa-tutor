-- schema.prisma gained these in 47e8220 without a migration, so no
-- database had them: the ADMIN role, ON DELETE CASCADE on every relation
-- that hangs off a user, and two composite indexes for the educator
-- analytics queries.

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "Interaction" DROP CONSTRAINT "Interaction_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "MisconceptionRating" DROP CONSTRAINT "MisconceptionRating_interactionId_fkey";

-- DropForeignKey
ALTER TABLE "UserBadge" DROP CONSTRAINT "UserBadge_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserBadge" DROP CONSTRAINT "UserBadge_badgeId_fkey";

-- DropForeignKey
ALTER TABLE "TopicMastery" DROP CONSTRAINT "TopicMastery_userId_fkey";

-- DropForeignKey
ALTER TABLE "AssessmentAttempt" DROP CONSTRAINT "AssessmentAttempt_userId_fkey";

-- DropForeignKey
ALTER TABLE "AssessmentResponse" DROP CONSTRAINT "AssessmentResponse_attemptId_fkey";

-- DropForeignKey
ALTER TABLE "MisconceptionEvent" DROP CONSTRAINT "MisconceptionEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "Remediation" DROP CONSTRAINT "Remediation_eventId_fkey";

-- DropForeignKey
ALTER TABLE "MisconceptionProbe" DROP CONSTRAINT "MisconceptionProbe_eventId_fkey";

-- CreateIndex
CREATE INDEX "Session_userId_mode_idx" ON "Session"("userId", "mode");

-- CreateIndex
CREATE INDEX "Interaction_sessionId_interactionType_idx" ON "Interaction"("sessionId", "interactionType");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MisconceptionRating" ADD CONSTRAINT "MisconceptionRating_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicMastery" ADD CONSTRAINT "TopicMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MisconceptionEvent" ADD CONSTRAINT "MisconceptionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remediation" ADD CONSTRAINT "Remediation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "MisconceptionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MisconceptionProbe" ADD CONSTRAINT "MisconceptionProbe_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "MisconceptionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
