const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Destino de build inválido');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);
const extensions = new Set(['.html', '.css', '.js', '.webmanifest', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico']);
function copy(relative) {
  const source = path.join(root, relative);
  const info = fs.lstatSync(source);
  if (info.isSymbolicLink()) throw new Error('Links simbólicos não são permitidos no build');
  if (info.isDirectory()) {
    for (const name of fs.readdirSync(source)) if (!name.startsWith('.')) copy(path.join(relative, name));
  } else if (extensions.has(path.extname(source).toLowerCase())) {
    fs.mkdirSync(path.dirname(path.join(output, relative)), { recursive: true });
    fs.copyFileSync(source, path.join(output, relative));
  }
}
for (const relative of ['index.html', 'manifest.webmanifest', 'css', 'js', 'pages', 'assets']) copy(relative);
console.log('Build concluído: somente os arquivos públicos foram copiados para dist/.');
