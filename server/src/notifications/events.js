const enabled = () => process.env.NOTIFICATIONS_ENABLED === "true";
const activeMember = (now = new Date()) => ({ isActive: true, startsAt: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] });
const LABELS = Object.freeze({
  TASK_ASSIGNED: "A task was assigned to you",
  REVIEW_REQUESTED: "A task is ready for your review",
  TASK_FEEDBACK: "There is new feedback on your task",
  DISCUSSION_CREATED: "A new team discussion was started",
  FEEDBACK_CREATED: "A teammate shared feedback",
  DISCUSSION_MESSAGE: "New message in a team discussion",
  DISCUSSION_RESOLVED: "A team discussion was resolved",
});

async function enqueueNotifications(tx, { teamId, actorId, recipientIds, eventKey, kind, href }, isEnabled = enabled()) {
  if (!isEnabled) return;
  if (!LABELS[kind] || !/^\/(tasks\/c[a-z0-9]+|teams\/c[a-z0-9]+\/discussions\/c[a-z0-9]+)$/.test(href)) {
    throw new Error("Invalid notification event");
  }
  const now = new Date();
  const members = await tx.teamMember.findMany({ where: { teamId, ...activeMember(now),
    userId: { not: actorId, ...(recipientIds ? { in: [...new Set(recipientIds)] } : {}) } }, select: { userId: true } });
  const userIds = [...new Set(members.map(member => member.userId))];
  if (!userIds.length) return;
  await tx.notification.createMany({ data: userIds.map(userId => ({ userId, teamId, eventKey, kind, href })), skipDuplicates: true });
  const notifications = await tx.notification.findMany({ where: { eventKey, userId: { in: userIds } }, select: { id: true, userId: true } });
  const devices = await tx.pushDevice.findMany({ where: { userId: { in: userIds }, expiresAt: { gt: now } }, select: { id: true, userId: true } });
  const deliveries = notifications.flatMap(note => devices.filter(device => device.userId === note.userId)
    .map(device => ({ notificationId: note.id, deviceId: device.id })));
  if (deliveries.length) await tx.pushDelivery.createMany({ data: deliveries, skipDuplicates: true });
}

module.exports = { enabled, activeMember, LABELS, enqueueNotifications };
