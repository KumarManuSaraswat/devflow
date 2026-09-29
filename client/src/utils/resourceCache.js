// Session-memory only: never persist team data on a shared device.
export function createResourceCache({ maxEntries = 60, ttl = 5 * 60 * 1000, now = Date.now } = {}) {
  const entries = new Map();
  let owner = null;
  let generation = 0;
  return {
    scope(id) { if (owner !== id) { owner = id; this.clear(); } },
    clear() { entries.clear(); generation++; },
    ticket() { return generation; },
    read(key) {
      const entry = entries.get(key);
      if (!owner || !entry || now() - entry.time >= ttl) { entries.delete(key); return null; }
      entries.delete(key); entries.set(key, entry);
      return entry.value;
    },
    write(key, value, ticket = generation) {
      if (!owner || !key || ticket !== generation) return;
      if (value == null) { entries.delete(key); return; }
      entries.delete(key); entries.set(key, { value, time: now() });
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value);
    },
  };
}
export const resourceCache = createResourceCache();
