-- AlterTable
ALTER TABLE "User" ADD COLUMN     "susResponses" JSONB,
ADD COLUMN     "susScore" INTEGER,
ADD COLUMN     "susSubmittedAt" TIMESTAMP(3);

