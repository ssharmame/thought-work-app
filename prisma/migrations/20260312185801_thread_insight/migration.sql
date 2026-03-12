-- AlterTable
ALTER TABLE "ThoughtEntry" ADD COLUMN     "automaticThought" TEXT,
ADD COLUMN     "coreBelief" TEXT,
ADD COLUMN     "situation" TEXT;

-- CreateTable
CREATE TABLE "ThreadInsight" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "dominantPattern" TEXT,
    "dominantEmotion" TEXT,
    "dominantBelief" TEXT,
    "thoughtCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreadInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThreadInsight_threadId_key" ON "ThreadInsight"("threadId");

-- AddForeignKey
ALTER TABLE "ThreadInsight" ADD CONSTRAINT "ThreadInsight_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
