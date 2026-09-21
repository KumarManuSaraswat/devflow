ALTER TABLE "TeamMember" ADD COLUMN "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "weeklyHours" INTEGER;
ALTER TABLE "Task" ADD COLUMN "requiredSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "estimatedHours" DOUBLE PRECISION;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_weeklyHours_check"
CHECK ("weeklyHours" IS NULL OR "weeklyHours" BETWEEN 0 AND 80);
ALTER TABLE "Task" ADD CONSTRAINT "Task_estimatedHours_check"
CHECK ("estimatedHours" IS NULL OR ("estimatedHours" > 0 AND "estimatedHours" <= 10000));
CREATE TABLE "AssistantQuota" (
  "id" TEXT NOT NULL,
  "used" INTEGER NOT NULL DEFAULT 0,
  "blockedUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssistantQuota_pkey" PRIMARY KEY ("id")
);
