// A modeling exercise only. No MongoDB client, credentials, persistence or network.
const shortText = maxLength => ({ bsonType: 'string', minLength: 1, maxLength, pattern: '\\S' });
export const mongoDraftSchema = {
  bsonType: 'object', additionalProperties: false,
  required: ['schemaVersion', 'teamId', 'authorId', 'title', 'summary', 'category', 'tags', 'actions'],
  properties: {
    schemaVersion: { bsonType: 'int', enum: [1] },
    teamId: { bsonType: 'string', pattern: '^c[a-z0-9]{24}$' },
    authorId: { bsonType: 'string', pattern: '^c[a-z0-9]{24}$' },
    title: shortText(120), summary: shortText(3000),
    category: { bsonType: 'string', enum: ['WIN', 'IMPROVEMENT', 'DECISION'] },
    tags: { bsonType: 'array', maxItems: 5, uniqueItems: true, items: shortText(24) },
    actions: { bsonType: 'array', maxItems: 8, items: {
      bsonType: 'object', additionalProperties: false, required: ['text', 'done'],
      properties: { text: shortText(240), done: { bsonType: 'bool' } },
    } },
  },
};

// MongoDB adds _id, so an additionalProperties:false collection MUST allow it.
// Dates are optional in this teaching model; an application would set them.
export const mongoCollectionSchema = {
  ...mongoDraftSchema,
  properties: { ...mongoDraftSchema.properties, _id: { bsonType: 'objectId' },
    createdAt: { bsonType: 'date' }, updatedAt: { bsonType: 'date' } },
};

export function exampleRetrospective() {
  return { schemaVersion: 1, teamId: 'c000000000000000000000010', authorId: 'c000000000000000000000001',
    title: 'Make reviews easier', summary: 'Keep pull requests smaller and add context before review.',
    category: 'IMPROVEMENT', tags: ['review'],
    actions: [{ text: 'Add a review checklist', done: false }, { text: 'Agree on a review window', done: true }] };
}

// This small checker implements ONLY the keywords used by mongoDraftSchema.
// It checks JSON drafts, not BSON, and is not a MongoDB validator/emulator.
export function validateMongoDraft(text) {
  if (typeof text !== 'string' || text.length > 16000) return { valid: false, errors: ['Use a JSON draft of at most 16,000 characters.'] };
  let value;
  try { value = JSON.parse(text); }
  catch { return { valid: false, errors: ['Invalid JSON. Check quotes, commas and brackets.'] }; }
  const errors = [];
  const error = (path, message) => { if (errors.length < 40) errors.push(`${path}: ${message}`); };
  const check = (item, schema, path) => {
    const types = {
      object: item !== null && typeof item === 'object' && !Array.isArray(item),
      array: Array.isArray(item), string: typeof item === 'string', bool: typeof item === 'boolean',
      int: Number.isInteger(item) && item >= -2147483648 && item <= 2147483647,
    };
    if (!types[schema.bsonType]) { error(path, `expected ${schema.bsonType}`); return; }
    if (schema.enum && !schema.enum.includes(item)) error(path, `choose ${schema.enum.join(', ')}`);
    if (schema.bsonType === 'object') {
      for (const key of schema.required || []) if (!Object.hasOwn(item, key)) error(`${path}.${key}`, 'required');
      for (const key of Object.keys(item)) {
        if (!Object.hasOwn(schema.properties, key)) error(`${path}.${key}`, 'unknown field in this draft');
        else check(item[key], schema.properties[key], `${path}.${key}`);
      }
    }
    if (schema.bsonType === 'array') {
      if (item.length > schema.maxItems) error(path, `at most ${schema.maxItems} items`);
      if (schema.uniqueItems && new Set(item.map(entry => JSON.stringify(entry))).size !== item.length) error(path, 'items must be unique');
      // Lists are bounded: do not traverse thousands of items from an invalid draft.
      item.slice(0, schema.maxItems).forEach((entry, index) => check(entry, schema.items, `${path}[${index}]`));
    }
    if (schema.bsonType === 'string') {
      const length = [...item].length;
      if (length < (schema.minLength || 0) || length > (schema.maxLength || Infinity)) error(path, `use ${schema.minLength || 0}–${schema.maxLength} characters`);
      if (schema.pattern && !new RegExp(schema.pattern).test(item)) error(path, 'does not match the required format');
    }
  };
  check(value, mongoDraftSchema, 'document');
  return { valid: errors.length === 0, errors, document: errors.length ? undefined : value };
}

export const mongoSetupExample = `// Interview example only. DevFlow does not execute these commands.
db.createCollection("retrospectives", {
  validator: { $jsonSchema: ${JSON.stringify(mongoCollectionSchema, null, 2)} },
  validationLevel: "strict",
  validationAction: "error"
});
db.retrospectives.createIndex({ teamId: 1, _id: -1 });
db.retrospectives.createIndex({ teamId: 1, category: 1, _id: -1 });`;
