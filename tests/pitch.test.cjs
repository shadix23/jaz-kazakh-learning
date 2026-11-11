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

test('pitch has one formation section per scene and no invented percentages', () => {
  const fs_ = [...html.matchAll(/data-f="(\w+)"/g)].map(m => m[1]);
  assert.deepStrictEqual(fs_, ['hero', 'parade', 'steps', 'grid', 'ring', 'party']);
  const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  assert.doesNotMatch(text, /\d+\s?%/, 'no metric claims on the pitch');
});

test('links from the pitch open the right app mode', () => {
  assert.match(html, /href="\.\/\?mode=method"/);
  assert.match(html, /href="\.\/\?mode=student"/);
  assert.match(fs.readFileSync(path.join(dist, 'app.js'), 'utf8'), /get\('mode'\)/);
});
