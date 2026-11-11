// The pitch is kept in the repo (docs/pitch), not on the site. Its statistics must cite sources.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, '..', 'docs', 'pitch');
const html = fs.readFileSync(path.join(dir, 'pitch.html'), 'utf8');

test('pitch slides: ten numbered pages and every statistic has a source link', () => {
  const pages = [...html.matchAll(/<span class="pg">Бет<b>(\d\d)\/10<\/b><\/span>/g)].map(m => m[1]);
  assert.deepStrictEqual(pages, ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']);
  const stats = [...html.matchAll(/<div class="card stat[^"]*">([\s\S]*?)<\/div>\s*(?=<div class="card stat|<\/div>)/g)];
  assert.ok(stats.length >= 4, 'evidence cards present');
  for (const m of stats) assert.match(m[1], /class="src">[\s\S]*<a href="https:\/\//, 'each statistic cites a source');
  assert.match(html, /болжам/, 'the cost estimate is labelled as an assumption');
});

test('pitch files exist and are not served by the site', () => {
  for (const f of ['Jaz-pitch.pdf', 'Jaz-pitch.pptx']) assert.ok(fs.existsSync(path.join(dir, f)), f);
  for (const m of html.matchAll(/(?:src)="(assets\/pitch\/[^"]+)"/g)) assert.ok(fs.existsSync(path.join(dir, m[1])), m[1]);
  assert.ok(!fs.existsSync(path.join(__dirname, '..', 'dist', 'pitch.html')));
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8'), /pitch/);
});

test('no long dashes in the site text', () => {
  const dist = path.join(__dirname, '..', 'dist');
  for (const f of fs.readdirSync(dist).filter(f => /\.(js|html|css)$/.test(f))) assert.doesNotMatch(fs.readFileSync(path.join(dist, f), 'utf8'), /[—–]/, f);
});
