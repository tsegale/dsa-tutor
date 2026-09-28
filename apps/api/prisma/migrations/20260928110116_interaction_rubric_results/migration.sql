-- AlterTable
ALTER TABLE "Interaction" ADD COLUMN     "promptKey" TEXT,
ADD COLUMN     "rubricResults" JSONB,
ADD COLUMN     "rubricScore" INTEGER;
