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
      if (op === "not") return row[key] !== expected;
      if (op === "in") return expected.includes(row[key]);
      return false;
    });
    return row[key] === value;
  });
}
const project = (row, select) => row && Object.fromEntries(Object.keys(select || row).map(key => [key, row[key]]));
function memoryDiscussionDb() {
  let state = { topics: [], messages: [], notifications: [], devices: [], deliveries: [], memberships: users.map((user, index) => ({ teamId: id(10), userId: user.id,
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
    teamMember: { findFirst: async ({ where }) => state.memberships.find(m => matches(m, where)) || null,
      findMany: async ({ where }) => state.memberships.filter(m => matches(m, where)) },
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
  const notificationMatches = (row, where) => {
    const { team, ...plain } = where;
    return matches(row, plain) && (!team || state.memberships.some(m => m.teamId === row.teamId && matches(m, team.members.some)));
  };
  db.notification = {
    createMany: async ({ data }) => {
      for (const row of data) if (!state.notifications.some(n => n.userId === row.userId && n.eventKey === row.eventKey)) {
        state.notifications.push({ id: id(++state.counter), createdAt: new Date(), readAt: null, ...row });
      }
    },
    findMany: async ({ where, take, select }) => state.notifications.filter(n => notificationMatches(n, where))
      .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)).slice(0, take).map(n => project(n, select)),
    findFirst: async ({ where, select }) => project(state.notifications.find(n => notificationMatches(n, where)), select) || null,
    count: async ({ where }) => state.notifications.filter(n => notificationMatches(n, where)).length,
    updateMany: async ({ where, data }) => {
      const rows = state.notifications.filter(n => notificationMatches(n, where)); rows.forEach(n => Object.assign(n, data)); return { count: rows.length };
    },
  };
  db.pushDevice = {
    findMany: async ({ where, select }) => state.devices.filter(d => matches(d, where)).map(d => project(d, select)),
    findUnique: async ({ where }) => state.devices.find(d => matches(d, where)) || null,
    count: async ({ where }) => state.devices.filter(d => matches(d, where)).length,
    upsert: async ({ where, create, update, select }) => {
      let row = state.devices.find(d => matches(d, where));
      if (row) Object.assign(row, update);
      else { row = { id: id(++state.counter), ...create }; state.devices.push(row); }
      return project(row, select);
    },
    deleteMany: async ({ where }) => {
      const rows = state.devices.filter(d => matches(d, where)); state.devices = state.devices.filter(d => !rows.includes(d));
      state.deliveries = state.deliveries.filter(d => !rows.some(device => d.deviceId === device.id)); return { count: rows.length };
    },
  };
  db.pushDelivery = {
    createMany: async ({ data }) => { for (const row of data) if (!state.deliveries.some(d => d.notificationId === row.notificationId && d.deviceId === row.deviceId)) {
      state.deliveries.push({ id: id(++state.counter), state: "PENDING", attempts: 0, lockedUntil: null, nextAttemptAt: new Date(), ...row });
    } },
    findMany: async ({ where, take, select }) => state.deliveries.filter(d => matches(d, where)).slice(0, take).map(d => project(d, select)),
    findUnique: async ({ where }) => {
      const row = state.deliveries.find(d => matches(d, where));
      return row && { ...row, notification: state.notifications.find(n => n.id === row.notificationId), device: state.devices.find(d => d.id === row.deviceId) };
    },
    updateMany: async ({ where, data }) => {
      const rows = state.deliveries.filter(d => matches(d, where));
      rows.forEach(row => Object.entries(data).forEach(([key, value]) => { row[key] = value && typeof value === "object" && "increment" in value ? row[key] + value.increment : value; }));
      return { count: rows.length };
    },
    deleteMany: async ({ where }) => { state.deliveries = state.deliveries.filter(d => !matches(d, where)); },
  };
  return db;
}
module.exports = { memoryDiscussionDb, id };
