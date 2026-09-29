const { z } = require('zod');

// Provider schemas constrain shape; local validation also bounds content and rejects extras.
const structuredAdviceSchema = z.object({
  summary: z.string().trim().min(1).max(2800),
  nextSteps: z.array(z.string().trim().min(1).max(500)).max(6),
  questions: z.array(z.string().trim().min(1).max(300)).max(4),
}).strict();

const adviceJsonSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Concise advice, including assumptions and uncertainty.' },
    nextSteps: { type: 'array', items: { type: 'string' }, description: 'Up to 6 short, actionable suggestions. Never claim actions were executed.' },
    questions: { type: 'array', items: { type: 'string' }, description: 'Up to 4 questions for missing information; empty when none are needed.' },
  },
  required: ['summary', 'nextSteps', 'questions'],
  additionalProperties: false,
};

function parseStructuredAdvice(text) {
  // Never repair/extract JSON from prose or execute model-produced code.
  if (typeof text !== 'string' || text.length > 10000) throw new Error('Invalid structured advice');
  try { return structuredAdviceSchema.parse(JSON.parse(text)); }
  catch { throw new Error('Invalid structured advice'); }
}

function adviceAsText(advice) {
  return [advice.summary,
    advice.nextSteps.length ? `Next steps:\n${advice.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}` : '',
    advice.questions.length ? `Questions:\n${advice.questions.map(question => `- ${question}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
}

module.exports = { structuredAdviceSchema, adviceJsonSchema, parseStructuredAdvice, adviceAsText };
