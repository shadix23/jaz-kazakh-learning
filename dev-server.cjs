// Jaz! local server: static files from dist/ + the backend API (server/api.js).
// Same API runs on Vercel (api/index.js). Data: server/.data/db.json locally,
// Upstash Redis / Vercel KV when UPSTASH_REDIS_REST_URL + _TOKEN are set.
// Optional AI: ANTHROPIC_API_KEY (or `ant auth login`) — the key never reaches the browser.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const api = require('./server/api');
const ai = require('./server/ai');

const root = path.resolve(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 4174;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };

function createServer() {
  return http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
    if (pathname.startsWith('/api/')) return api.handle(req, res);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, bytes) => {
      if (error) { res.writeHead(404).end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(bytes);
    });
  });
}

if (require.main === module) {
  createServer().listen(PORT, '127.0.0.1', () => console.log(`Jaz! Local: http://127.0.0.1:${PORT}  ·  API: on  ·  AI mentor: ${ai.hasClient() ? 'on (Claude)' : 'off — set ANTHROPIC_API_KEY to enable'}`));
}
module.exports = { createServer };
