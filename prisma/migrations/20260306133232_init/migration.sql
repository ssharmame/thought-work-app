-- CreateTable
CREATE TABLE "ThoughtEntry" (
    "id" TEXT NOT NULL,
    "thought" TEXT NOT NULL,
    "fact" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "emotion" TEXT NOT NULL,
    "reflectionQuestion" TEXT NOT NULL,
    "balancedThought" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThoughtEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ThoughtEntry_createdAt_idx" ON "ThoughtEntry"("createdAt");
