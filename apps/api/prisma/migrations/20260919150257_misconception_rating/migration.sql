-- AlterTable
ALTER TABLE "Interaction" ADD COLUMN     "dataStructureStateSnapshot" JSONB;

-- CreateTable
CREATE TABLE "MisconceptionRating" (
    "id" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,
    "raterCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MisconceptionRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MisconceptionRating_interactionId_idx" ON "MisconceptionRating"("interactionId");

-- CreateIndex
CREATE UNIQUE INDEX "MisconceptionRating_interactionId_raterCode_key" ON "MisconceptionRating"("interactionId", "raterCode");

-- AddForeignKey
ALTER TABLE "MisconceptionRating" ADD CONSTRAINT "MisconceptionRating_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

