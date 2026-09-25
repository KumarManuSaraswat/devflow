// In-memory fixture for discussion service/HTTP tests. Never imported by the application.
const id = n => `c${String(n).padStart(24, "0")}`;
const users = [1, 2, 3, 4, 5, 6].map(n => ({ id: id(n), name: `Demo member ${n}`, avatarUrl: null }));
const uniqueError = () => Object.assign(new Error("Unique constraint"), { code: "P2002" });
function matches(row, where) {
  return Object.entries(where || {}).every(([key, value]) => {
    if (key === "OR") return value.some(clause => matches(row, clause));
    if (value instanceof Date) return row[key]?.getTime() === value.getTime();
    if (value && typeof value === "object") return Object.entries(value).every(([op, expected]) => {
      if (op === "lt") return row[key] < expected;
      if (op === "gt") return row[key] > expected;
      if (op === "lte") return row[key] <= expected;
      return false;
    });
    return row[key] === value;
  });
}
const project = (row, select) => row && Object.fromEntries(Object.keys(select || row).map(key => [key, row[key]]));
function memoryDiscussionDb() {
  let state = { topics: [], messages: [], memberships: users.map((user, index) => ({ teamId: id(10), userId: user.id,
    role: ["OWNER", "DEVELOPER", "ADMIN", "REVIEWER", "TRAINEE", "DEVELOPER"][index], isActive: index !== 5,
    startsAt: new Date("2020-01-01"), expiresAt: null })), counter: 100 };
  let queue = Promise.resolve();
  const viewTopic = (row, select) => row && project({ ...row, createdBy: users.find(u => u.id === row.createdById),
    resolvedBy: users.find(u => u.id === row.resolvedById) || null,
    messages: state.messages.filter(m => m.topicId === row.id && m.sequence === 1).map(m => ({ body: m.body })),
  }, select);
  const viewMessage = (row, select) => row && project({ ...row, author: users.find(u => u.id === row.authorId) }, select);
  const db = {
    state: () => state,
    team: { findUnique: async () => ({ name: "Demo workspace" }) },
    teamMember: { findFirst: async ({ where }) => state.memberships.find(m => matches(m, where)) || null },
    discussionTopic: {
      findFirst: async ({ where, select }) => viewTopic(state.topics.find(t => matches(t, where)), select) || null,
      findUnique: async ({ where, select }) => viewTopic(state.topics.find(t => matches(t, where.teamId_createdById_clientTopicId)), select) || null,
      findMany: async ({ where, take, select }) => state.topics.filter(t => matches(t, where)).sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)).slice(0, take).map(t => viewTopic(t, select)),
      groupBy: async ({ where }) => ["OPEN", "RESOLVED"].map(status => ({ status, _count: { _all: state.topics.filter(t => matches(t, where) && t.status === status).length } })),
      create: async ({ data, select }) => {
        if (state.topics.some(t => t.teamId === data.teamId && t.createdById === data.createdById && t.clientTopicId === data.clientTopicId)) throw uniqueError();
        const topic = { id: id(++state.counter), createdAt: new Date(Date.now() + state.counter), updatedAt: new Date(), status: "OPEN", resolvedById: null, resolvedAt: null, ...data };
        delete topic.messages;
        state.topics.push(topic);
        state.messages.push({ id: id(++state.counter), topicId: topic.id, createdAt: new Date(), ...data.messages.create });
        return viewTopic(topic, select);
      },
      updateMany: async ({ where, data }) => {
        const topic = state.topics.find(t => matches(t, where));
        if (!topic) return { count: 0 };
        for (const [key, value] of Object.entries(data)) topic[key] = value && typeof value === "object" && "increment" in value ? topic[key] + value.increment : value;
        topic.updatedAt = new Date();
        return { count: 1 };
      },
    },
    discussionMessage: {
      findUnique: async ({ where, select }) => viewMessage(state.messages.find(m => matches(m, where.topicId_authorId_clientMessageId)), select) || null,
      findMany: async ({ where, orderBy, take, select }) => state.messages.filter(m => matches(m, where)).sort((a, b) => orderBy.sequence === "asc" ? a.sequence - b.sequence : b.sequence - a.sequence).slice(0, take).map(m => viewMessage(m, select)),
      create: async ({ data, select }) => {
        if (state.messages.some(m => m.topicId === data.topicId && (m.sequence === data.sequence || (m.authorId === data.authorId && m.clientMessageId === data.clientMessageId)))) throw uniqueError();
        const message = { id: id(++state.counter), createdAt: new Date(), ...data };
        state.messages.push(message);
        return viewMessage(message, select);
      },
    },
    $transaction(callback) {
      const work = queue.then(async () => {
        const backup = structuredClone(state);
        try { return await callback(db); }
        catch (error) { state = backup; throw error; }
      });
      queue = work.catch(() => {});
      return work;
    },
  };
  return db;
}
module.exports = { memoryDiscussionDb, id };
