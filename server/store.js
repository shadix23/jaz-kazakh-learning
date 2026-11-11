// Storage adapter for the Jaz! backend.
// - Upstash Redis / Vercel KV over REST when UPSTASH_REDIS_REST_URL + _TOKEN
//   (or KV_REST_API_URL + KV_REST_API_TOKEN) are set — works on Vercel serverless.
// - JSON file (server/.data/db.json) locally — persists between restarts.
// - In-memory when JAZ_STORE=memory (tests).
// Interface: get(key) → value | null, set(key, value), push(listKey, item), list(listKey) → items.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

function redisStore(url, token) {
  async function cmd(args) {
    const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
    if (!res.ok) throw new Error('redis ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.result;
  }
  return {
    kind: 'redis',
    async get(key) { const v = await cmd(['GET', key]); return v == null ? null : JSON.parse(v); },
    async set(key, value) { await cmd(['SET', key, JSON.stringify(value)]); },
    async push(key, item) { await cmd(['RPUSH', key, JSON.stringify(item)]); },
    async list(key) { const v = await cmd(['LRANGE', key, '0', '-1']); return (v || []).map(x => JSON.parse(x)); }
  };
}

function fileStore(file) {
  let db = null;
  function load() {
    if (db) return db;
    try { db = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { db = { kv: {}, lists: {} }; }
    return db;
  }
  let timer = null;
  function persist() {
    clearTimeout(timer);
    timer = setTimeout(() => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(db)); }, 50);
  }
  return {
    kind: 'file',
    async get(key) { const d = load(); return key in d.kv ? d.kv[key] : null; },
    async set(key, value) { load().kv[key] = value; persist(); },
    async push(key, item) { const d = load(); (d.lists[key] = d.lists[key] || []).push(item); persist(); },
    async list(key) { return (load().lists[key] || []).slice(); }
  };
}

function memoryStore() {
  const kv = new Map(), lists = new Map();
  return {
    kind: 'memory',
    async get(key) { return kv.has(key) ? structuredClone(kv.get(key)) : null; },
    async set(key, value) { kv.set(key, structuredClone(value)); },
    async push(key, item) { if (!lists.has(key)) lists.set(key, []); lists.get(key).push(structuredClone(item)); },
    async list(key) { return (lists.get(key) || []).map(x => structuredClone(x)); }
  };
}

function createStore(env = process.env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (env.JAZ_STORE === 'memory') return memoryStore();
  if (url && token) return redisStore(url, token);
  if (env.VERCEL) return memoryStore(); // no writable disk on Vercel without a database
  return fileStore(env.JAZ_DB_FILE || path.join(__dirname, '.data', 'db.json'));
}

module.exports = { createStore, memoryStore };
