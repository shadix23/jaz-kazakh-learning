// Jaz! backend API — one handler used by the local dev server and by the Vercel function.
//
// A school workspace links the methodist and the learners across devices:
//   methodist creates a workspace with a roster → gets an admin key and a 6-digit code per class;
//   a learner joins with the class code + own pseudonymous code → gets a signed token;
//   learner answers (lessons, game, assignments) are stored as FORMATIVE data;
//   the methodist pulls them and creates assignments for support groups.
// No names or passwords are stored: student IDs are the school's pseudonymous codes.
'use strict';
const crypto = require('node:crypto');
const { createStore } = require('./store');
const ai = require('./ai');

const LIMITS = { classes: 60, students: 80, id: 40, answersPerPost: 300, answersTotal: 50000, assignments: 300, text: 300 };
let store = null;
const db = () => (store = store || createStore());
function useStore(s) { store = s; }

const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const rid = (n = 9) => crypto.randomBytes(n).toString('base64url');
const sign = (secret, ws, cls, sid) => crypto.createHmac('sha256', secret).update(`${ws}|${cls}|${sid}`).digest('base64url').slice(0, 22);
const clean = (v, max = LIMITS.text) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };

function normalizeRoster(roster) {
  if (!roster || typeof roster !== 'object') fail(400, 'roster: ожидается объект {класс: [коды учеников]}');
  const out = {};
  const entries = Object.entries(roster).slice(0, LIMITS.classes);
  for (const [cls, ids] of entries) {
    const c = clean(cls, 20); if (!c) continue;
    out[c] = [...new Set((Array.isArray(ids) ? ids : []).map(x => clean(x, LIMITS.id)).filter(Boolean))].slice(0, LIMITS.students);
  }
  if (!Object.keys(out).length) fail(400, 'roster пустой');
  return out;
}
async function newClassCode() {
  for (let i = 0; i < 20; i++) {
    const code = String(crypto.randomInt(100000, 999999));
    if (!(await db().get('code:' + code))) return code;
  }
  fail(500, 'не удалось выдать код класса');
}
async function admin(req, url) {
  const ws = clean(req.headers['x-jaz-ws'] || url.searchParams.get('ws'), 40);
  const key = String(req.headers['x-jaz-admin'] || '');
  const w = ws && await db().get('ws:' + ws);
  if (!w || !key || sha(key) !== w.adminHash) fail(401, 'нужен ключ методиста');
  return w;
}
async function student(req) {
  const token = String(req.headers['x-jaz-student'] || '');
  const [ws, cls, sid, sig] = token.split('.').map(x => { try { return decodeURIComponent(x); } catch (_) { return ''; } });
  const w = ws && await db().get('ws:' + ws);
  if (!w || !sig || sign(w.secret, ws, cls, sid) !== sig || !(w.classes[cls] && w.classes[cls].students.includes(sid))) fail(401, 'нужно войти по коду класса');
  return { w, cls, sid };
}
const publicWs = w => ({ id: w.id, name: w.name, createdAt: w.createdAt, classes: Object.fromEntries(Object.entries(w.classes).map(([c, v]) => [c, { code: v.code, students: v.students.length }])) });

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body; // Vercel parses JSON already
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', ch => { raw += ch; if (raw.length > 300000) { reject(new HttpError(413, 'слишком большой запрос')); req.destroy(); } });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (_) { reject(new HttpError(400, 'неверный JSON')); } });
    req.on('error', reject);
  });
}
function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

const routes = {
  'GET /api/status': async () => ({ api: true, ai: ai.aiReady(), store: db().kind }),

  // Methodist: create a school workspace from the roster (class → student codes).
  'POST /api/workspaces': async (req) => {
    const body = await readBody(req);
    const roster = normalizeRoster(body.roster);
    const id = rid(6), adminKey = rid(18), secret = rid(24);
    const classes = {};
    for (const [cls, students] of Object.entries(roster)) { const code = await newClassCode(); classes[cls] = { code, students }; await db().set('code:' + code, { ws: id, cls }); }
    const w = { id, name: clean(body.name, 120) || 'Школа', createdAt: new Date().toISOString(), adminHash: sha(adminKey), secret, classes };
    await db().set('ws:' + id, w); await db().set('asg:' + id, []);
    return { ...publicWs(w), adminKey };
  },
  'GET /api/workspaces/me': async (req, url) => publicWs(await admin(req, url)),
  'PUT /api/workspaces/roster': async (req, url) => {
    const w = await admin(req, url); const roster = normalizeRoster((await readBody(req)).roster);
    for (const [cls, students] of Object.entries(roster)) {
      if (w.classes[cls]) w.classes[cls].students = students;
      else { const code = await newClassCode(); w.classes[cls] = { code, students }; await db().set('code:' + code, { ws: w.id, cls }); }
    }
    await db().set('ws:' + w.id, w);
    return publicWs(w);
  },

  // Learner: join with the class code and own pseudonymous code.
  'POST /api/join': async (req) => {
    const body = await readBody(req);
    const code = clean(body.code, 12).replace(/\D/g, ''), sid = clean(body.studentId, LIMITS.id);
    const link = code && await db().get('code:' + code);
    if (!link) fail(404, 'Такого кода класса нет. Проверьте 6 цифр у учителя.');
    const w = await db().get('ws:' + link.ws);
    if (!w || !w.classes[link.cls] || !w.classes[link.cls].students.includes(sid)) fail(404, 'Код ученика не найден в этом классе.');
    const token = [w.id, link.cls, sid, sign(w.secret, w.id, link.cls, sid)].map(encodeURIComponent).join('.');
    return { token, ws: w.id, school: w.name, cls: link.cls, studentId: sid };
  },
  'GET /api/student/tasks': async (req) => {
    const { w, cls, sid } = await student(req);
    const all = (await db().get('asg:' + w.id)) || [];
    const mine = all.filter(a => a.cls === cls && (!a.students.length || a.students.includes(sid)));
    const answers = (await db().list('ans:' + w.id)).filter(x => x.studentId === sid && x.assignmentId);
    return { tasks: mine.map(a => { const own = answers.filter(x => x.assignmentId === a.id); return { ...a, students: undefined, done: own.length, correct: own.filter(x => x.correct).length }; }) };
  },
  'POST /api/answers': async (req) => {
    const { w, cls, sid } = await student(req);
    const body = await readBody(req);
    const items = (Array.isArray(body.items) ? body.items : []).slice(0, LIMITS.answersPerPost);
    const existing = await db().list('ans:' + w.id);
    if (existing.length + items.length > LIMITS.answersTotal) fail(507, 'хранилище школы заполнено');
    const seen = new Set(existing.map(x => x.id));
    let saved = 0;
    for (const it of items) {
      const id = clean(it.id, 60) || rid(8);
      if (seen.has(id)) continue;
      const row = { id, studentId: sid, cls, subject: clean(it.subject, 60), topic: clean(it.topic, 120), questionId: clean(it.questionId, 80), questionText: clean(it.questionText), correct: it.correct ? 1 : 0, answer: clean(it.answer, 120), correctAnswer: clean(it.correctAnswer, 120), source: ['lesson', 'game', 'assignment'].includes(it.source) ? it.source : 'lesson', assignmentId: clean(it.assignmentId, 30) || null, ts: clean(it.ts, 30) || new Date().toISOString() };
      if (!row.subject || !row.topic) continue;
      await db().push('ans:' + w.id, row); seen.add(id); saved++;
    }
    return { saved };
  },

  // Methodist: formative answers and assignments.
  'GET /api/answers': async (req, url) => { const w = await admin(req, url); return { answers: await db().list('ans:' + w.id) }; },
  'GET /api/assignments': async (req, url) => { const w = await admin(req, url); return { assignments: (await db().get('asg:' + w.id)) || [] }; },
  'POST /api/assignments': async (req, url) => {
    const w = await admin(req, url); const b = await readBody(req);
    const cls = clean(b.cls, 20);
    if (!w.classes[cls]) fail(400, 'нет такого класса в пространстве школы');
    const list = (await db().get('asg:' + w.id)) || [];
    if (list.length >= LIMITS.assignments) fail(507, 'слишком много заданий');
    const a = { id: rid(6), title: clean(b.title, 160) || clean(b.topic, 120), subject: clean(b.subject, 60), topic: clean(b.topic, 120), topicId: clean(b.topicId, 40), cls, students: (Array.isArray(b.students) ? b.students : []).map(x => clean(x, LIMITS.id)).filter(x => w.classes[cls].students.includes(x)).slice(0, LIMITS.students), size: Math.min(20, Math.max(3, Number(b.size) || 8)), createdAt: new Date().toISOString() };
    if (!a.subject || !a.topic) fail(400, 'нужны предмет и тема');
    list.push(a); await db().set('asg:' + w.id, list);
    return a;
  },
  'DELETE /api/assignments': async (req, url) => {
    const w = await admin(req, url); const id = clean(url.searchParams.get('id'), 30);
    const list = ((await db().get('asg:' + w.id)) || []).filter(a => a.id !== id);
    await db().set('asg:' + w.id, list); return { ok: true };
  },

  // Optional AI (needs ANTHROPIC_API_KEY on the server).
  'POST /api/correct': async (req) => { if (!ai.aiReady()) fail(503, 'ai unavailable'); try { return await ai.correct(await readBody(req)); } catch (e) { ai.aiFailed(e); fail(502, 'ai failed'); } },
  'POST /api/summary': async (req) => { if (!ai.aiReady()) fail(503, 'ai unavailable'); try { return await ai.summarize(await readBody(req)); } catch (e) { ai.aiFailed(e); fail(502, 'ai failed'); } }
};

async function handle(req, res, pathOverride) {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch (_) { return send(res, 400, { error: 'bad url' }); }
  const pathname = pathOverride || url.pathname;
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  const route = routes[`${req.method} ${pathname.replace(/\/+$/, '')}`];
  if (!route) return send(res, 404, { error: 'not found' });
  try { send(res, 200, await route(req, url)); }
  catch (e) { send(res, e.status || 500, { error: e.status ? e.message : 'server error' }); if (!e.status) console.error('[api]', e); }
}

module.exports = { handle, useStore, sign, LIMITS };
