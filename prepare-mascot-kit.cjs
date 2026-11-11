const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const kit = path.resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Pass the complete mascot kit directory.');
const manifest = JSON.parse(fs.readFileSync(path.join(kit, 'manifest.json'), 'utf8'));
if (manifest.items.length !== 12) throw new Error('The approved kit requires 12 mascot poses.');
const assetDir = path.join(__dirname, 'dist/assets/mascot-kit');
fs.mkdirSync(assetDir, { recursive: true });
const files = manifest.items.map(item => item.file).concat(['logo-horizontal.png', 'logo-stacked.png', 'logo-white.png']);
for (const file of files) {
  if (!/^[a-z0-9-]+\.png$/.test(file)) throw new Error('Unsafe asset filename.');
  const source = path.join(kit, file);
  if (!fs.statSync(source).isFile()) throw new Error('Missing ' + file);
  const destination = path.join(assetDir, file);
  fs.copyFileSync(source, destination);
  const size = file.startsWith('01-') || file.startsWith('09-') || file.startsWith('logo-') ? 960 : file.startsWith('02-') || file.startsWith('03-') ? 384 : 640;
  execFileSync('/usr/bin/sips', ['-Z', String(size), destination, '--out', destination], { stdio: 'ignore' });
}
let gallery = fs.readFileSync(path.join(kit, 'gallery.html'), 'utf8');
for (const file of files) gallery = gallery.replaceAll('"' + file + '"', '"./assets/mascot-kit/' + file + '"');
gallery = gallery.replace("url('./Comfortaa.ttf')", "url('./fonts/Comfortaa.ttf')");
gallery = gallery.replace('Открой gallery.html в браузере.', 'Набор маскота Jaz!.');
fs.writeFileSync(path.join(__dirname, 'dist/mascot-kit.html'), gallery);
console.log(JSON.stringify({ poses: manifest.items.length, logos: 3, webGallery: 'dist/mascot-kit.html' }));
