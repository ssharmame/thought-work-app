-- Drop fact column from ThoughtEntry
ALTER TABLE "ThoughtEntry"
DROP COLUMN IF EXISTS "fact";
