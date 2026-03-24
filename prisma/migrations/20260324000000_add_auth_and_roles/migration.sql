-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PRACTITIONER', 'CLIENT');

-- CreateTable: UserProfile (id mirrors auth.users.id)
CREATE TABLE "UserProfile" (
    "id"             TEXT         NOT NULL,
    "role"           "Role"       NOT NULL DEFAULT 'CLIENT',
    "name"           TEXT,
    "email"          TEXT,
    "practitionerId" TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- Unique email per user profile
CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");

-- Self-referential: CLIENT → PRACTITIONER
ALTER TABLE "UserProfile"
    ADD CONSTRAINT "UserProfile_practitionerId_fkey"
    FOREIGN KEY ("practitionerId")
    REFERENCES "UserProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Add userId to Thread
ALTER TABLE "Thread" ADD COLUMN "userId" TEXT;

ALTER TABLE "Thread"
    ADD CONSTRAINT "Thread_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "UserProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Thread_userId_idx" ON "Thread"("userId");

-- Add userId to ThoughtEntry
ALTER TABLE "ThoughtEntry" ADD COLUMN "userId" TEXT;

ALTER TABLE "ThoughtEntry"
    ADD CONSTRAINT "ThoughtEntry_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "UserProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ThoughtEntry_userId_idx" ON "ThoughtEntry"("userId");
