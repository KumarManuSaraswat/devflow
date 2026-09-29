const { Prisma } = require('@prisma/client');
const { activeMembershipWhere } = require('../assistant/context');

const PAGE_SIZE = 20;

// Values are bound parameters, never interpolated SQL strings. Pre-aggregate tasks
// separately from people so a task with several assignees is counted only once.
function deliveryQuery(teamId, userId, page, now) {
  return Prisma.sql`
    WITH page_projects AS (
      SELECT p.id, p.name
      FROM "Team" team
      INNER JOIN "Project" p ON p."teamId" = team.id
      INNER JOIN "TeamMember" viewer ON viewer."teamId" = team.id
        AND viewer."userId" = ${userId} AND viewer."isActive" = true
        AND viewer."startsAt" <= ${now}
        AND (viewer."expiresAt" IS NULL OR viewer."expiresAt" > ${now})
      WHERE team.id = ${teamId}
      ORDER BY p.name, p.id
      LIMIT ${PAGE_SIZE + 1} OFFSET ${(page - 1) * PAGE_SIZE}
    ), task_stats AS (
      SELECT p.id,
        COUNT(t.id)::int AS "totalTasks",
        COUNT(t.id) FILTER (WHERE t.status = 'COMPLETED')::int AS "completedTasks",
        COUNT(t.id) FILTER (WHERE t.status = 'BLOCKED')::int AS "blockedTasks",
        COUNT(t.id) FILTER (WHERE t.status <> 'COMPLETED' AND NOT EXISTS (
          SELECT 1 FROM "TaskAssignee" a
          INNER JOIN "TeamMember" m ON m."userId" = a."userId" AND m."teamId" = ${teamId}
            AND m."isActive" = true AND m."startsAt" <= ${now}
            AND (m."expiresAt" IS NULL OR m."expiresAt" > ${now})
          WHERE a."taskId" = t.id
        ))::int AS "unassignedOpenTasks",
        COALESCE(SUM(t."estimatedHours") FILTER (WHERE t.status <> 'COMPLETED'), 0)::double precision AS "estimatedOpenHours",
        COUNT(t.id) FILTER (WHERE t.status <> 'COMPLETED' AND t."estimatedHours" IS NULL)::int AS "missingEstimates"
      FROM page_projects p
      LEFT JOIN "Task" t ON t."projectId" = p.id
      GROUP BY p.id
    ), people_stats AS (
      SELECT t."projectId", COUNT(DISTINCT u.id)::int AS "activeAssignees"
      FROM page_projects p
      INNER JOIN "Task" t ON t."projectId" = p.id
      INNER JOIN "TaskAssignee" a ON a."taskId" = t.id
      INNER JOIN "User" u ON u.id = a."userId"
      INNER JOIN "TeamMember" m ON m."userId" = u.id AND m."teamId" = ${teamId}
        AND m."isActive" = true AND m."startsAt" <= ${now}
        AND (m."expiresAt" IS NULL OR m."expiresAt" > ${now})
      WHERE t.status <> 'COMPLETED'
      GROUP BY t."projectId"
    )
    SELECT p.id, p.name, s."totalTasks", s."completedTasks", s."blockedTasks",
      s."unassignedOpenTasks", s."estimatedOpenHours", s."missingEstimates",
      COALESCE(people."activeAssignees", 0)::int AS "activeAssignees"
    FROM page_projects p
    LEFT JOIN task_stats s ON s.id = p.id
    LEFT JOIN people_stats people ON people."projectId" = p.id
    ORDER BY p.name, p.id
  `;
}

async function loadDeliveryReport(db, teamId, userId, page = 1, now = new Date()) {
  if (!Number.isInteger(page) || page < 1 || page > 10000) throw { statusCode: 400, message: 'Invalid report page' };
  const membership = await db.teamMember.findFirst({
    where: { ...activeMembershipWhere(teamId, now), userId },
    select: { team: { select: { id: true, name: true } } },
  });
  if (!membership) throw { statusCode: 403, message: 'You do not have access to this team' };
  // Membership is also checked inside the SQL statement, before exposing any project rows.
  const rows = await db.$queryRaw(deliveryQuery(teamId, userId, page, now));
  return { team: membership.team, projects: rows.slice(0, PAGE_SIZE), page, pageSize: PAGE_SIZE,
    hasMore: rows.length > PAGE_SIZE, generatedAt: now.toISOString() };
}

module.exports = { PAGE_SIZE, deliveryQuery, loadDeliveryReport };
