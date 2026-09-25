const person = { id: true, name: true, avatarUrl: true };
const topicSelect = { id: true, teamId: true, title: true, category: true, status: true,
  createdById: true, createdBy: { select: person }, resolvedBy: { select: person }, resolvedAt: true,
  createdAt: true, updatedAt: true, messageCount: true, version: true };
const messageSelect = { id: true, topicId: true, body: true, sequence: true, createdAt: true, author: { select: person } };
const fail = (statusCode, message) => { throw { statusCode, message }; };
const mayResolve = (membership, userId, topic) => membership.role === "OWNER" || topic.createdById === userId;

async function requireMembership(db, teamId, userId) {
  const now = new Date();
  const membership = await db.teamMember.findFirst({ where: { teamId, userId, isActive: true,
    startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, select: { role: true } });
  if (!membership) fail(403, "You no longer have access to this team's discussions.");
  return membership;
}
async function requireTopic(db, teamId, topicId) {
  const topic = await db.discussionTopic.findFirst({ where: { id: topicId, teamId }, select: topicSelect });
  if (!topic) fail(404, "Discussion not found in this team.");
  return topic;
}

function createDiscussionService(db) {
  return {
    async list(teamId, userId, query) {
      await requireMembership(db, teamId, userId);
      return db.$transaction(async tx => {
        const where = { teamId };
        if (query.status !== "ALL") where.status = query.status;
        if (query.category !== "ALL") where.category = query.category;
        if (query.cursor) {
          const cursor = await requireTopic(tx, teamId, query.cursor);
          where.OR = [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }];
        }
        // An interactive transaction owns one connection; do not issue concurrent pg queries.
        const rows = await tx.discussionTopic.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21, select: topicSelect });
        const counts = await tx.discussionTopic.groupBy({ by: ["status"], where: { teamId }, _count: { _all: true } });
        const team = await tx.team.findUnique({ where: { id: teamId }, select: { name: true } });
        const topics = rows.slice(0, 20);
        const open = counts.find(c => c.status === "OPEN")?._count._all || 0;
        const resolved = counts.find(c => c.status === "RESOLVED")?._count._all || 0;
        return { topics, team, counts: { open, resolved, total: open + resolved }, nextCursor: rows.length > 20 ? topics.at(-1).id : null };
      }, { isolationLevel: "RepeatableRead" });
    },
    async create(teamId, userId, input) {
      await requireMembership(db, teamId, userId);
      const key = { teamId_createdById_clientTopicId: { teamId, createdById: userId, clientTopicId: input.clientTopicId } };
      const replay = async () => {
        const existing = await db.discussionTopic.findUnique({ where: key, select: { ...topicSelect,
          messages: { where: { sequence: 1 }, select: { body: true } } } });
        if (!existing) return null;
        if (existing.title !== input.title || existing.category !== input.category || existing.messages[0]?.body !== input.body) {
          fail(409, "This request was already used for a different topic. Please start a new topic.");
        }
        const { messages, ...topic } = existing;
        return { topic, replayed: true };
      };
      const existing = await replay();
      if (existing) return existing;
      try {
        const topic = await db.discussionTopic.create({ data: { teamId, createdById: userId,
          title: input.title, category: input.category, clientTopicId: input.clientTopicId, messageCount: 1, version: 1,
          messages: { create: { authorId: userId, body: input.body, sequence: 1, clientMessageId: input.clientTopicId } },
        }, select: topicSelect });
        return { topic, replayed: false };
      } catch (error) {
        if (error.code === "P2002") { const found = await replay(); if (found) return found; }
        throw error;
      }
    },
    async read(teamId, userId, topicId, query) {
      const membership = await requireMembership(db, teamId, userId);
      return db.$transaction(async tx => {
        const topic = await requireTopic(tx, teamId, topicId);
        const incremental = query.after !== undefined;
        const where = { topicId };
        if (incremental) where.sequence = { gt: query.after };
        else if (query.before !== undefined) where.sequence = { lt: query.before };
        const rows = await tx.discussionMessage.findMany({ where, orderBy: { sequence: incremental ? "asc" : "desc" }, take: 51, select: messageSelect });
        const messages = rows.slice(0, 50);
        if (!incremental) messages.reverse();
        return { topic, messages, hasOlder: !incremental && rows.length > 50, hasMore: incremental && rows.length > 50,
          canResolve: mayResolve(membership, userId, topic) };
      }, { isolationLevel: "RepeatableRead" });
    },
    async message(teamId, userId, topicId, input) {
      await requireMembership(db, teamId, userId);
      await requireTopic(db, teamId, topicId);
      const key = { topicId_authorId_clientMessageId: { topicId, authorId: userId, clientMessageId: input.clientMessageId } };
      const replay = async store => {
        const message = await store.discussionMessage.findUnique({ where: key, select: messageSelect });
        if (!message) return null;
        if (message.body !== input.body) fail(409, "This request was already used for a different message.");
        return { message, replayed: true };
      };
      try {
        return await db.$transaction(async tx => {
          const existing = await replay(tx);
          if (existing) return existing;
          // A conditional UPDATE locks this topic until commit. Sending and resolving serialize;
          // message sequences cannot be skipped by clients polling during concurrent sends.
          const updated = await tx.discussionTopic.updateMany({ where: { id: topicId, teamId, status: "OPEN" },
            data: { messageCount: { increment: 1 }, version: { increment: 1 } } });
          if (!updated.count) fail(409, "This topic is resolved. Its creator or team owner can reopen it to continue.");
          const topic = await requireTopic(tx, teamId, topicId);
          const message = await tx.discussionMessage.create({ data: { topicId, authorId: userId, body: input.body,
            clientMessageId: input.clientMessageId, sequence: topic.messageCount }, select: messageSelect });
          return { message, replayed: false };
        });
      } catch (error) {
        // A simultaneous retry may win the unique key. Its extra counter increment is rolled back.
        if (error.code === "P2002") { const found = await replay(db); if (found) return found; }
        throw error;
      }
    },
    async status(teamId, userId, topicId, input) {
      const membership = await requireMembership(db, teamId, userId);
      return db.$transaction(async tx => {
        const topic = await requireTopic(tx, teamId, topicId);
        if (!mayResolve(membership, userId, topic)) fail(403, "Only the topic creator or team owner can resolve or reopen this discussion.");
        if (topic.status === input.status) return { topic };
        const updated = await tx.discussionTopic.updateMany({ where: { id: topicId, teamId, version: input.version },
          data: { status: input.status, resolvedById: input.status === "RESOLVED" ? userId : null,
            resolvedAt: input.status === "RESOLVED" ? new Date() : null, version: { increment: 1 } } });
        if (!updated.count) fail(409, "This discussion changed. Read the latest messages, then try again.");
        return { topic: await requireTopic(tx, teamId, topicId) };
      });
    },
  };
}
module.exports = { createDiscussionService, requireMembership, mayResolve };
