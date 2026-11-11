/*
 * Jaz! sync client — links the learner trainer and the methodist across devices
 * through the backend (server/api.js). Without a server (static hosting, offline)
 * everything keeps working inside one browser; learner answers wait in a queue
 * and are sent when the server becomes reachable.
 */
(function (global) {
  'use strict';
  const BASE = './api';
  const K = { admin: 'jaz.sync.admin.v1', student: 'jaz.sync.student.v1', queue: 'jaz.sync.queue.v1' };
  const read = (k, d) => { try { const v = JSON.parse(global.localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (_) { return d; } };
  const write = (k, v) => { try { if (v == null) global.localStorage.removeItem(k); else global.localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  let statusCache = null, statusAt = 0;

  async function req(method, path, body, headers) {
    const res = await global.fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(headers || {}) }, body: body ? JSON.stringify(body) : undefined });
    let data = null; try { data = await res.json(); } catch (_) {}
    if (!res.ok) { const e = new Error((data && data.error) || ('HTTP ' + res.status)); e.status = res.status; throw e; }
    return data;
  }
  async function status(force) {
    if (!force && statusCache && Date.now() - statusAt < 30000) return statusCache;
    try { statusCache = await req('GET', '/status'); } catch (_) { statusCache = { api: false, ai: false }; }
    statusAt = Date.now(); return statusCache;
  }
  const adminHeaders = () => { const a = read(K.admin, null); return a ? { 'x-jaz-ws': a.id, 'x-jaz-admin': a.adminKey } : {}; };
  const studentHeaders = () => { const s = read(K.student, null); return s ? { 'x-jaz-student': s.token } : {}; };

  const api = {
    status,
    admin: () => read(K.admin, null),
    student: () => read(K.student, null),
    // Methodist
    async createWorkspace(name, roster) { const w = await req('POST', '/workspaces', { name, roster }); write(K.admin, w); return w; },
    async refreshWorkspace() { const w = await req('GET', '/workspaces/me', null, adminHeaders()); const a = read(K.admin, {}); write(K.admin, { ...a, ...w }); return w; },
    async updateRoster(roster) { const w = await req('PUT', '/workspaces/roster', { roster }, adminHeaders()); const a = read(K.admin, {}); write(K.admin, { ...a, ...w }); return w; },
    disconnectAdmin() { write(K.admin, null); },
    async answers() { return (await req('GET', '/answers', null, adminHeaders())).answers; },
    async assignments() { return (await req('GET', '/assignments', null, adminHeaders())).assignments; },
    async createAssignment(a) { return req('POST', '/assignments', a, adminHeaders()); },
    async deleteAssignment(id) { return req('DELETE', '/assignments?id=' + encodeURIComponent(id), null, adminHeaders()); },
    // Learner
    async join(code, studentId) { const s = await req('POST', '/join', { code, studentId }); write(K.student, s); flush(); return s; },
    logoutStudent() { write(K.student, null); },
    async tasks() { return (await req('GET', '/student/tasks', null, studentHeaders())).tasks; },
    queue(item) { if (!read(K.student, null)) return; const q = read(K.queue, []); q.push(item); write(K.queue, q.slice(-2000)); flush(); },
    pending: () => read(K.queue, []).length
  };
  let flushing = false;
  async function flush() {
    if (flushing || !read(K.student, null)) return;
    const q = read(K.queue, []); if (!q.length) return;
    flushing = true;
    try { await req('POST', '/answers', { items: q.slice(0, 300) }, studentHeaders()); write(K.queue, read(K.queue, []).slice(Math.min(q.length, 300))); }
    catch (e) { if (e.status === 401) write(K.student, null); }
    finally { flushing = false; if (read(K.queue, []).length && read(K.student, null)) setTimeout(flush, 4000); }
  }
  api.flush = flush;
  if (global.addEventListener) global.addEventListener('online', flush);
  global.JazSync = api;
})(window);
