-- CreateTable
CREATE TABLE "MisconceptionEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "algorithmTopicId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectedInteractionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "remediationCount" INTEGER NOT NULL DEFAULT 0,
    "probeCount" INTEGER NOT NULL DEFAULT 0,
    "consecutiveCorrect" INTEGER NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3),
    "junctionsSinceDetection" INTEGER NOT NULL DEFAULT 0,
    "bottomedOut" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MisconceptionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Remediation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "presentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "correct" BOOLEAN,
    "skipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Remediation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MisconceptionProbe" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,
    "junctionType" TEXT NOT NULL,
    "optionCount" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "hintUsed" BOOLEAN NOT NULL,
    "probedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MisconceptionProbe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MisconceptionEvent_userId_category_status_idx" ON "MisconceptionEvent"("userId", "category", "status");

-- AddForeignKey
ALTER TABLE "MisconceptionEvent" ADD CONSTRAINT "MisconceptionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MisconceptionEvent" ADD CONSTRAINT "MisconceptionEvent_algorithmTopicId_fkey" FOREIGN KEY ("algorithmTopicId") REFERENCES "AlgorithmTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remediation" ADD CONSTRAINT "Remediation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "MisconceptionEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MisconceptionProbe" ADD CONSTRAINT "MisconceptionProbe_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "MisconceptionEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

