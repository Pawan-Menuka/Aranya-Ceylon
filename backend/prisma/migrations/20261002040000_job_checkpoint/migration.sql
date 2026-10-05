-- One fixed scheduler checkpoint permits fair resumable low-stock batches.
CREATE TABLE "JobCheckpoint" (
  "name" TEXT PRIMARY KEY,
  "cycle" TEXT NOT NULL,
  "cursor" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
