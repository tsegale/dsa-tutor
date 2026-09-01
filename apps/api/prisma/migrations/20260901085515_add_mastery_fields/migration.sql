-- AlterTable
ALTER TABLE "Interaction" ADD COLUMN     "criticalJunctionType" TEXT,
ADD COLUMN     "junctionDifficulty" TEXT,
ADD COLUMN     "masteryScoreAtTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scaffoldingLevelAtTime" TEXT NOT NULL DEFAULT 'MEDIUM';
