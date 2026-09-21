const { SKILLS } = require("./schemas");

function activeMembershipWhere(teamId, now = new Date()) {
  return { teamId, isActive: true, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

async function loadContext(db, teamId, userId, selection = {}, now = new Date()) {
  const membership = await db.teamMember.findFirst({ where: { ...activeMembershipWhere(teamId, now), userId } });
  if (!membership) throw { statusCode: 403, message: "You do not have access to this team" };
  // Fetch only scoped records. Refuse oversized contexts instead of silently undercounting workload.
  const [members, projects, tasks] = await Promise.all([
    db.teamMember.findMany({ where: activeMembershipWhere(teamId, now), take: 201, orderBy: { id: "asc" },
      select: { id: true, userId: true, role: true, skills: true, weeklyHours: true,
        user: { select: { name: true } } } }),
    db.project.findMany({ where: { teamId }, take: 201, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.task.findMany({ where: { project: { teamId }, status: { not: "COMPLETED" } }, take: 2001,
      orderBy: { createdAt: "asc" }, select: { id: true, projectId: true, title: true, status: true,
        requiredSkills: true, estimatedHours: true, dueDate: true,
        assignees: { select: { userId: true } }, reviewers: { select: { userId: true } } } }),
  ]);
  if (members.length > 200 || projects.length > 200 || tasks.length > 2000) {
    throw { statusCode: 422, message: "This team exceeds the assistant's current capacity (200 members/projects or 2,000 open tasks)." };
  }
  if (selection.projectId && !projects.some(p => p.id === selection.projectId)) {
    throw { statusCode: 404, message: "Project not found in this team" };
  }
  const selectedTask = selection.taskId ? tasks.find(t => t.id === selection.taskId) : null;
  if (selection.taskId && (!selectedTask || (selection.projectId && selectedTask.projectId !== selection.projectId))) {
    throw { statusCode: 404, message: "Open task not found in this project/team" };
  }
  return { members, projects, tasks, selectedTask, skills: SKILLS };
}

function canEditProfile(actor, target) {
  return actor.userId === target.userId || actor.role === "OWNER" ||
    (actor.role === "ADMIN" && target.role !== "OWNER");
}

module.exports = { activeMembershipWhere, loadContext, canEditProfile };
