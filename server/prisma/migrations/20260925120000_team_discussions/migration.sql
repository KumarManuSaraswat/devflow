CREATE TYPE "DiscussionStatus" AS ENUM ('OPEN', 'RESOLVED');
CREATE TYPE "DiscussionCategory" AS ENUM ('PROBLEM', 'FEEDBACK', 'DISCUSSION');

CREATE TABLE "DiscussionTopic" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" "DiscussionCategory" NOT NULL DEFAULT 'DISCUSSION',
  "status" "DiscussionStatus" NOT NULL DEFAULT 'OPEN',
  "createdById" TEXT NOT NULL,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "messageCount" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "clientTopicId" TEXT NOT NULL,
  CONSTRAINT "DiscussionTopic_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiscussionTopic_title_check" CHECK (char_length("title") BETWEEN 1 AND 160),
  CONSTRAINT "DiscussionTopic_resolution_check" CHECK (
    ("status" = 'OPEN' AND "resolvedAt" IS NULL AND "resolvedById" IS NULL) OR
    ("status" = 'RESOLVED' AND "resolvedAt" IS NOT NULL AND "resolvedById" IS NOT NULL)
  )
);
CREATE TABLE "DiscussionMessage" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "clientMessageId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscussionMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiscussionMessage_body_check" CHECK (char_length("body") BETWEEN 1 AND 4000),
  CONSTRAINT "DiscussionMessage_sequence_check" CHECK ("sequence" > 0)
);
CREATE UNIQUE INDEX "DiscussionTopic_teamId_createdById_clientTopicId_key" ON "DiscussionTopic"("teamId", "createdById", "clientTopicId");
CREATE INDEX "DiscussionTopic_teamId_createdAt_id_idx" ON "DiscussionTopic"("teamId", "createdAt", "id");
CREATE INDEX "DiscussionTopic_teamId_status_category_idx" ON "DiscussionTopic"("teamId", "status", "category");
CREATE UNIQUE INDEX "DiscussionMessage_topicId_sequence_key" ON "DiscussionMessage"("topicId", "sequence");
CREATE UNIQUE INDEX "DiscussionMessage_topicId_authorId_clientMessageId_key" ON "DiscussionMessage"("topicId", "authorId", "clientMessageId");
ALTER TABLE "DiscussionTopic" ADD CONSTRAINT "DiscussionTopic_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionTopic" ADD CONSTRAINT "DiscussionTopic_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiscussionTopic" ADD CONSTRAINT "DiscussionTopic_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiscussionMessage" ADD CONSTRAINT "DiscussionMessage_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "DiscussionTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionMessage" ADD CONSTRAINT "DiscussionMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
