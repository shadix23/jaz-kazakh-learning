// Smoke test against a running or deployed Jaz! site.
// Usage: npm run smoke -- https://your-app.vercel.app   (or http://127.0.0.1:4174)
// Creates a throwaway workspace and walks the learner ↔ methodist loop.
const base = (process.argv[2] || process.env.SMOKE_URL || 'http://127.0.0.1:4174').replace(/\/+$/, '');
let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✖'} ${msg}`); if (!cond) failed++; };

async function call(method, path, body, headers = {}) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch (_) {}
  return { status: res.status, data };
}

console.log(`Smoke test: ${base}`);
const page = await fetch(base + '/');
ok(page.ok && /Jaz!/.test(await page.text()), 'main page is served');
for (const f of ['/curriculum.js', '/metodist.js', '/sync.js', '/game.js', '/barys3d.js', '/vendor/three.module.min.js', '/pitch.html', '/vendor/addons/RoundedBoxGeometry.js', '/downloads/Jaz-pitch.pdf']) {
  const r = await fetch(base + f); ok(r.ok, `static ${f}`);
}
const status = await call('GET', '/api/status');
ok(status.status === 200 && status.data && status.data.api === true, `API status (store: ${status.data && status.data.store}, ai: ${status.data && status.data.ai})`);
if (status.data && status.data.store === 'memory' && !base.includes('127.0.0.1') && !base.includes('localhost')) console.log('  ! store is "memory" in production — connect Upstash Redis (see DEPLOY.md)');

const ws = await call('POST', '/api/workspaces', { name: 'smoke-test', roster: { '6А': ['S-0001'] } });
ok(ws.status === 200 && ws.data && /^\d{6}$/.test(ws.data.classes['6А'].code), 'workspace with a class code');
const A = { 'x-jaz-ws': ws.data.id, 'x-jaz-admin': ws.data.adminKey };
const join = await call('POST', '/api/join', { code: ws.data.classes['6А'].code, studentId: 'S-0001' });
ok(join.status === 200 && join.data.token, 'learner joins with the class code');
const S = { 'x-jaz-student': join.data.token };
const asg = await call('POST', '/api/assignments', { subject: 'Математика', topic: 'Модуль числа', topicId: 'm-abs', cls: '6А', students: ['S-0001'], size: 6 }, A);
ok(asg.status === 200, 'methodist creates an assignment');
const tasks = await call('GET', '/api/student/tasks', null, S);
ok(tasks.status === 200 && tasks.data.tasks.length === 1, 'learner sees the assignment');
const saved = await call('POST', '/api/answers', { items: [{ id: 'smoke-1', subject: 'Математика', topic: 'Модуль числа', questionId: 'q1', correct: 1, source: 'assignment', assignmentId: asg.data.id }] }, S);
ok(saved.status === 200 && saved.data.saved === 1, 'learner answer is stored');
const pulled = await call('GET', '/api/answers', null, A);
ok(pulled.status === 200 && pulled.data.answers.some(a => a.id === 'smoke-1'), 'methodist receives the answer');
ok((await call('GET', '/api/answers', null, { 'x-jaz-ws': ws.data.id, 'x-jaz-admin': 'wrong' })).status === 401, 'wrong admin key is rejected');
await call('DELETE', '/api/assignments?id=' + encodeURIComponent(asg.data.id), null, A);

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
