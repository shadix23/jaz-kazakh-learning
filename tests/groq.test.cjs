const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../server/ai.js'), 'utf8');
const correction = { ok: false, corrected: 'Сәлем!', issues: [{ from: 'Салем', to: 'Сәлем', reason: 'Ә әрпі жазылады.' }], reply: 'Сәлем! Қалың қалай?' };
function load({ env = { GROQ_API_KEY: 'test-key' }, fetchResult, fetchError } = {}) {
  const calls = [], anthropic = [], logs = [];
  let now = 100000;
  class A { constructor() { this.beta = { messages: { create: async body => { anthropic.push(body); return { content: [{ type: 'text', text: JSON.stringify(correction) }] }; } } }; } }
  A.AuthenticationError = class extends Error {}; A.PermissionDeniedError = class extends Error {};
  const module = { exports: {} };
  vm.runInNewContext(source, { module, process: { env }, Date: { now: () => now, parse: Date.parse }, AbortSignal,
    console: { warn: (...args) => logs.push(args) }, require: name => name === '@anthropic-ai/sdk' ? A : name === 'node:fs' ? { existsSync: () => false } : require(name),
    fetch: async (url, options) => { calls.push({ url, ...options, body: JSON.parse(options.body) }); if (fetchError) throw fetchError; return fetchResult || { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(correction) } }] }) }; } });
  return { ai: module.exports, calls, anthropic, logs, advance: value => { now += value; } };
}
test('Groq returns the existing correction contract using strict schema and bounded output', async () => {
  const h = load();
  assert.equal(h.ai.aiReady(), true);
  const result = await h.ai.correct({ text: 'Салем!' });
  assert.equal(result.corrected, 'Сәлем!'); assert.equal(result.source, 'ai');
  assert.equal(h.calls[0].url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(h.calls[0].headers.Authorization, 'Bearer test-key');
  assert.equal(h.calls[0].body.response_format.json_schema.strict, true);
  assert.equal(h.calls[0].body.model, 'openai/gpt-oss-120b');
  assert.equal(h.calls[0].body.max_completion_tokens, 1536);
  assert.equal(h.calls[0].body.reasoning_effort, 'low');
  assert.ok(h.calls[0].signal instanceof AbortSignal);
  assert.equal(h.anthropic.length, 0);
});
test('summary keeps aggregate input and validates the output structure', async () => {
  const result = { summary: 'Сводка', actions: ['Повторить тему'], caveats: ['Связь не доказывает причину'] };
  const h = load({ fetchResult: { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }] }) } });
  assert.equal((await h.ai.summarize({ topics: [] })).summary, result.summary);
  assert.equal(h.calls[0].body.max_completion_tokens, 2500);
  assert.equal(h.calls[0].body.response_format.json_schema.name, 'methodist_summary');
});
test('rate limits honor a bounded retry delay and never call a paid fallback', async () => {
  const h = load({ env: { GROQ_API_KEY: 'test-key', ANTHROPIC_API_KEY: 'paid-key' }, fetchResult: { ok: false, status: 429, headers: { get: () => '2' } } });
  await assert.rejects(h.ai.correct({ text: 'Сәлем!' }), error => { h.ai.aiFailed(error); return error.status === 429; });
  assert.equal(h.ai.aiReady(), false); h.advance(2001); assert.equal(h.ai.aiReady(), true);
  assert.equal(h.anthropic.length, 0);
  assert.doesNotMatch(JSON.stringify(h.logs), /test-key|paid-key/);
});
test('bad credentials and huge retry headers cannot trigger repeated calls or unbounded cooldown', async () => {
  const h = load({ fetchResult: { ok: false, status: 429, headers: { get: () => '99999999' } } });
  await assert.rejects(h.ai.correct({}), error => { h.ai.aiFailed(error); return error.retryAfter === 300; });
  assert.equal(h.ai.aiReady(), false); h.advance(300001); assert.equal(h.ai.aiReady(), true);
  h.ai.aiFailed({ status: 401 }); assert.equal(h.ai.aiReady(), false);
});
test('malformed, refused, truncated and wrongly typed output is rejected', async () => {
  for (const message of [ { content: '{' }, { content: JSON.stringify({ ...correction, issues: {} }) }, { content: JSON.stringify({ ...correction, ok: 'true' }) }, { refusal: 'No', content: '' } ]) {
    const h = load({ fetchResult: { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message }] }) } });
    await assert.rejects(h.ai.correct({}));
  }
  const h = load({ fetchResult: { ok: true, json: async () => ({ choices: [{ finish_reason: 'length', message: { content: '{}' } }] }) } });
  await assert.rejects(h.ai.correct({}));
});
test('network timeout rejects without paid fallback; unconfigured and disabled modes stay off', async () => {
  const h = load({ fetchError: new DOMException('Timed out', 'TimeoutError') });
  await assert.rejects(h.ai.correct({}), { name: 'TimeoutError' }); assert.equal(h.anthropic.length, 0);
  assert.equal(load({ env: {} }).ai.aiReady(), false);
  assert.equal(load({ env: { GROQ_API_KEY: 'test', GROQ_MODEL: 'unknown-model', ANTHROPIC_API_KEY: 'paid' } }).ai.aiReady(), false);
  assert.equal(load({ env: { GROQ_API_KEY: 'test', JAZ_AI: 'off' } }).ai.aiReady(), false);
});
test('direct Anthropic compatibility is preserved only without a Groq key', async () => {
  const h = load({ env: { ANTHROPIC_API_KEY: 'test' } });
  assert.equal((await h.ai.correct({ text: 'Салем!' })).source, 'ai');
  assert.equal(h.calls.length, 0); assert.equal(h.anthropic.length, 1);
});
