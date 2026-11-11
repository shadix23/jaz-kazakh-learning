// End-to-end API test over real HTTP (in-memory store). Run with: npm test
process.env.JAZ_STORE = 'memory';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../dev-server.cjs');

let server, base;
test.before(async () => { server = createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${server.address().port}`; });
test.after(() => new Promise(r => server.close(r)));

async function call(method, path, body, headers = {}) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json() };
}

test('status, static files and unknown routes', async () => {
  const s = await call('GET', '/api/status');
  assert.equal(s.status, 200);
  assert.equal(s.data.api, true);
  assert.equal(s.data.store, 'memory');
  const page = await fetch(base + '/');
  assert.match(await page.text(), /Jaz!/);
  assert.equal((await call('GET', '/api/nope')).status, 404);
  if (!s.data.ai) assert.equal((await call('POST', '/api/hint', { kind: 'rule', topic: 'Модуль числа' })).status, 503, 'hint endpoint exists and is off without AI');
  assert.equal((await fetch(base + '/assistant.js')).status, 200);
});

test('school workflow: workspace → join → answers → assignment → tasks → methodist pull', async () => {
  const ws = await call('POST', '/api/workspaces', { name: 'Демо-школа', roster: { '6А': ['S-0001', 'S-0002'], '6Б': ['S-0030'] } });
  assert.equal(ws.status, 200);
  const { id, adminKey, classes } = ws.data;
  assert.match(classes['6А'].code, /^\d{6}$/);
  assert.notEqual(classes['6А'].code, classes['6Б'].code);
  const A = { 'x-jaz-ws': id, 'x-jaz-admin': adminKey };

  // Wrong codes are rejected with clear messages.
  assert.equal((await call('POST', '/api/join', { code: '000000', studentId: 'S-0001' })).status, 404);
  assert.equal((await call('POST', '/api/join', { code: classes['6А'].code, studentId: 'S-9999' })).status, 404);

  const joined = await call('POST', '/api/join', { code: classes['6А'].code, studentId: 'S-0001' });
  assert.equal(joined.status, 200);
  const S = { 'x-jaz-student': joined.data.token };

  // Methodist assigns a topic to a support group.
  const asg = await call('POST', '/api/assignments', { subject: 'Математика', topic: 'Модуль числа', topicId: 'm-abs', cls: '6А', students: ['S-0001', 'S-XXXX'], size: 6 }, A);
  assert.equal(asg.status, 200);
  assert.deepEqual(asg.data.students, ['S-0001']);

  const tasks = await call('GET', '/api/student/tasks', null, S);
  assert.equal(tasks.data.tasks.length, 1);
  assert.equal(tasks.data.tasks[0].topic, 'Модуль числа');
  assert.equal(tasks.data.tasks[0].students, undefined, 'group list is not exposed to learners');

  const items = [1, 0, 1].map((c, i) => ({ id: 'a' + i, subject: 'Математика', topic: 'Модуль числа', questionId: 'q' + i, correct: c, source: 'assignment', assignmentId: asg.data.id }));
  assert.equal((await call('POST', '/api/answers', { items }, S)).data.saved, 3);
  assert.equal((await call('POST', '/api/answers', { items }, S)).data.saved, 0, 'duplicates are ignored');

  const after = await call('GET', '/api/student/tasks', null, S);
  assert.equal(after.data.tasks[0].done, 3);
  assert.equal(after.data.tasks[0].correct, 2);

  const pulled = await call('GET', '/api/answers', null, A);
  assert.equal(pulled.data.answers.length, 3);
  assert.equal(pulled.data.answers[0].studentId, 'S-0001');
  assert.equal(pulled.data.answers[0].cls, '6А');

  // Another class does not see the 6А assignment.
  const other = await call('POST', '/api/join', { code: classes['6Б'].code, studentId: 'S-0030' });
  assert.equal((await call('GET', '/api/student/tasks', null, { 'x-jaz-student': other.data.token })).data.tasks.length, 0);

  assert.equal((await call('DELETE', '/api/assignments?id=' + asg.data.id, null, A)).status, 200);
  assert.equal((await call('GET', '/api/assignments', null, A)).data.assignments.length, 0);
});

test('security: admin key and student token are required and verified', async () => {
  const ws = await call('POST', '/api/workspaces', { roster: { '7А': ['A1'] } });
  assert.equal((await call('GET', '/api/answers', null, { 'x-jaz-ws': ws.data.id, 'x-jaz-admin': 'wrong' })).status, 401);
  assert.equal((await call('POST', '/api/answers', { items: [] }, { 'x-jaz-student': 'forged.token' })).status, 401);
  const joined = await call('POST', '/api/join', { code: ws.data.classes['7А'].code, studentId: 'A1' });
  const forged = joined.data.token.replace(/A1/, 'A2');
  assert.equal((await call('GET', '/api/student/tasks', null, { 'x-jaz-student': forged })).status, 401);
  assert.equal((await call('POST', '/api/workspaces', { roster: {} })).status, 400);
});

test('Vercel entry handles rewritten /api/index?route=… paths', async () => {
  const http = require('node:http');
  const vercel = require('../api/index.js');
  const srv = http.createServer((req, res) => vercel(req, res));
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  const res = await fetch(`http://127.0.0.1:${port}/api/index?route=status`);
  assert.equal((await res.json()).api, true);
  const ws = await fetch(`http://127.0.0.1:${port}/api/index?route=workspaces`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roster: { '8А': ['X1'] } }) });
  assert.equal(ws.status, 200);
  const data = await ws.json();
  const me = await fetch(`http://127.0.0.1:${port}/api/index?route=workspaces/me&ws=${data.id}`, { headers: { 'x-jaz-admin': data.adminKey } });
  assert.equal((await me.json()).classes['8А'].students, 1);
  await new Promise(r => srv.close(r));
});
