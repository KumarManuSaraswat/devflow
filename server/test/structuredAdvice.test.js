const test = require('node:test');
const assert = require('node:assert/strict');
const { parseStructuredAdvice, adviceJsonSchema, adviceAsText } = require('../src/assistant/structuredAdvice');
const { callProvider, respond } = require('../src/assistant/providers');
const valid = { summary: 'Confirm scope before assigning work.', nextSteps: ['Estimate each task.'], questions: ['When is delivery?'] };
const reply = (provider, text, finish = provider === 'gemini' ? 'STOP' : 'stop', refusal) => new Response(JSON.stringify(provider === 'gemini'
  ? { candidates: [{ finishReason: finish, content: { parts: [{ text }] } }] }
  : { choices: [{ finish_reason: finish, message: { content: text, refusal } }] }));

test('structured output contract accepts bounded plain text and rejects malformed, extra or missing fields', () => {
  assert.deepEqual(parseStructuredAdvice(JSON.stringify(valid)), valid);
  for (const value of [null, [], {}, { ...valid, summary: 5 }, { ...valid, summary: '  ' },
    { ...valid, summary: 'x'.repeat(2801) }, { ...valid, nextSteps: ['x'.repeat(501)] },
    { ...valid, nextSteps: Array(7).fill('x') }, { ...valid, questions: Array(5).fill('x') },
    { ...valid, questions: [null] }, { ...valid, assignments: [{ userId: 'invented' }] }]) {
    assert.throws(() => parseStructuredAdvice(JSON.stringify(value)), /Invalid structured advice/);
  }
  for (const value of ['not JSON', '```json\n{}\n```', 'x'.repeat(10001)]) assert.throws(() => parseStructuredAdvice(value));
  assert.match(adviceAsText(valid), /Next steps:/);
  assert.match(adviceAsText(valid), /Questions:/);
});

test('Gemini and Groq receive an actual JSON schema; completed responses are validated', async () => {
  for (const provider of ['gemini', 'groq']) {
    const result = await callProvider(provider, 'fake-test-key', '{}', async (url, options) => {
      const body = JSON.parse(options.body);
      if (provider === 'gemini') {
        assert.equal(body.generationConfig.responseMimeType, 'application/json');
        assert.deepEqual(body.generationConfig.responseJsonSchema, adviceJsonSchema);
      } else {
        assert.equal(body.response_format.type, 'json_schema');
        assert.equal(body.response_format.json_schema.strict, true);
        assert.deepEqual(body.response_format.json_schema.schema, adviceJsonSchema);
        assert.equal(body.reasoning_effort, 'none');
      }
      assert.equal(body.tools, undefined);
      return reply(provider, JSON.stringify(valid));
    });
    assert.deepEqual(result, valid);
  }
});

test('truncation, refusals and schema-invalid provider responses never reach the UI as cloud advice', async () => {
  for (const provider of ['gemini', 'groq']) {
    for (const makeResponse of [() => reply(provider, JSON.stringify(valid), 'length'),
      () => reply(provider, '{"summary": "partial"}'), () => reply(provider, 'prose only')]) {
      await assert.rejects(callProvider(provider, 'test-key', '{}', async () => makeResponse()), { providerStatus: 502 });
    }
  }
  await assert.rejects(callProvider('groq', 'test', '{}', async () => reply('groq', JSON.stringify(valid), 'stop', 'refused')), { providerStatus: 502 });
});

test('invalid Gemini output falls through once to Groq then built-in without relaxing validation or changing rankings', async () => {
  const context = { members: [], projects: [], tasks: [], selectedTask: null };
  const input = { message: 'How should we divide work?', intent: 'breakdown', allowCloud: true };
  const env = { ASSISTANT_CLOUD_ENABLED: 'true', ASSISTANT_FREE_TIER_CONFIRMED: 'true', GEMINI_API_KEY: 'test', GROQ_API_KEY: 'test' };
  for (const groqValid of [true, false]) {
    const reservations = []; const blocked = [];
    const result = await respond({ context, input, env,
      quota: { reserve: async provider => { reservations.push(provider); return true; }, block: async provider => blocked.push(provider) },
      fetchImpl: async url => url.includes('googleapis') ? reply('gemini', '{}') : reply('groq', groqValid ? JSON.stringify(valid) : '{}'),
    });
    assert.deepEqual(reservations, ['gemini', 'groq']);
    assert.equal(result.source, groqValid ? 'groq' : 'builtin');
    assert.deepEqual(result.recommendations, []);
    assert.equal(result.teamSize, null);
    assert.ok(result.structuredAdvice.summary);
    assert.deepEqual(blocked, groqValid ? ['gemini'] : ['gemini', 'groq']);
  }
});
