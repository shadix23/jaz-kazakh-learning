// The scroll-story pitch page must only reference files that exist in dist/ and reuse the game's Barys model.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const dist = path.join(__dirname, '..', 'dist');
const html = fs.readFileSync(path.join(dist, 'pitch.html'), 'utf8');

test('pitch importmap and module imports point to vendored files', () => {
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  assert.ok(fs.existsSync(path.join(dist, map.three)), 'three is vendored');
  for (const m of html.matchAll(/from '(three\/addons\/[^']+|\.\/[^']+)'/g)) {
    const rel = m[1].startsWith('three/addons/') ? m[1].replace('three/addons/', map['three/addons/']) : m[1];
    assert.ok(fs.existsSync(path.join(dist, rel)), `${m[1]} exists`);
  }
});

test('barys3d.js exports the model and pose for the pitch', () => {
  const src = fs.readFileSync(path.join(dist, 'barys3d.js'), 'utf8');
  assert.match(src, /export \{ buildLeopard, pose \}/);
});

test('pitch slides: ten numbered pages and every statistic has a source link', () => {
  const pages = [...html.matchAll(/<span class="pg">Бет<b>(\d\d)\/10<\/b><\/span>/g)].map(m => m[1]);
  assert.deepStrictEqual(pages, ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']);
  const stats = [...html.matchAll(/<div class="card stat[^"]*">([\s\S]*?)<\/div>\s*(?=<div class="card stat|<\/div>)/g)];
  assert.ok(stats.length >= 4, 'evidence cards present');
  for (const m of stats) assert.match(m[1], /class="src">[\s\S]*<a href="https:\/\//, 'each statistic cites a source');
  assert.match(html, /болжам/, 'the cost estimate is labelled as an assumption');
  assert.match(html, /Shadil Nurmukhammed/);
  assert.match(html, /Amangeldiev Kaisar/);
});

test('pitch screenshots and downloads exist', () => {
  for (const m of html.matchAll(/(?:src|href)="((?:assets\/pitch|downloads)\/[^"]+)"/g)) assert.ok(fs.existsSync(path.join(dist, m[1])), m[1]);
  for (const m of html.matchAll(/url\((assets\/pitch\/[^)]+)\)/g)) assert.ok(fs.existsSync(path.join(dist, m[1])), m[1]);
});

test('links from the pitch open the right app mode', () => {
  assert.match(html, /href="(?:\.|https:\/\/jaz-kazakh-learning\.vercel\.app)\/\?mode=method"/);
  assert.match(html, /href="(?:\.|https:\/\/jaz-kazakh-learning\.vercel\.app)\/\?mode=student"/);
  assert.match(fs.readFileSync(path.join(dist, 'app.js'), 'utf8'), /get\('mode'\)/);
});
