const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../server/ai.js'), 'utf8');
function load(env = {}) {
  const clients = [], calls = [];
  class MockAnthropic {
    constructor(options) { clients.push(options); this.messages = { create: async body => { calls.push(body); return { content: [{ type: 'text', text: JSON.stringify({ ok: false, corrected: 'Сәлем!', issues: [{ from: 'Салем', to: 'Сәлем', reason: 'Ә әрпі жазылады.' }], reply: 'Сәлем! Қалың қалай?', summary: 'Сводка', actions: ['Повторить тему'], caveats: ['Связь не доказывает причину'] }) }] }; } }; }
  }
  const module = { exports: {} };
  vm.runInNewContext(source, { module, process: { env }, Date, console, require: name => name === '@anthropic-ai/sdk' ? MockAnthropic : name === 'node:fs' ? { existsSync: () => false } : require(name) });
  return { api: module.exports, clients, calls };
}
test('AI stays off without credentials and explicit off overrides gateway', () => {
  assert.equal(load().api.aiReady(), false);
  assert.equal(load({ JAZ_AI: 'off', AI_GATEWAY_API_KEY: 'test', AI_GATEWAY_MODEL: 'test/model' }).api.aiReady(), false);
});
test('gateway uses a fresh request token, structured JSON and bounded requests', async () => {
  const h = load({ VERCEL: '1', AI_GATEWAY_MODEL: 'anthropic/claude-sonnet-4.6' });
  const req = { headers: { 'x-vercel-oidc-token': 'request-one' } };
  assert.equal(h.api.aiReady(req), true);
  assert.equal(h.api.aiReady(), false);
  const result = await h.api.correct({ text: 'Салем!' }, req);
  assert.equal(result.source, 'ai');
  assert.equal(result.corrected, 'Сәлем!');
  await h.api.summarize({ topics: [] }, { headers: { 'x-vercel-oidc-token': 'request-two' } });
  assert.equal(h.clients[0].authToken, 'request-one');
  assert.equal(h.clients[1].authToken, 'request-two');
  assert.equal(h.clients[0].apiKey, null);
  assert.equal(h.clients[0].baseURL, 'https://ai-gateway.vercel.sh');
  assert.equal(h.calls[0].output_config.format.type, 'json_schema');
  assert.equal(h.calls[0].model, 'anthropic/claude-sonnet-4.6');
  assert.equal(h.calls[0].betas, undefined);
  assert.equal(h.calls[0].max_tokens, 1536);
});
test('untrusted local headers cannot enable AI; direct provider credentials still work', async () => {
  assert.equal(load({ AI_GATEWAY_MODEL: 'test/model' }).api.aiReady({ headers: { 'x-vercel-oidc-token': 'untrusted' } }), false);
  const h = load({ ANTHROPIC_API_KEY: 'test', ANTHROPIC_MODEL: 'configured-model' });
  assert.equal(h.api.aiReady(), true);
  await h.api.correct({ text: 'Сәлем!' });
  assert.equal(h.calls[0].model, 'configured-model');
  assert.equal(h.clients[0].authToken, undefined);
});
