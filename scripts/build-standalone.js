import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const [html, css, icon, math, rates, app] = await Promise.all([
  'public/index.html', 'public/style.css', 'public/favicon.svg',
  'public/math.js', 'public/rates.js', 'public/app.js'
].map(read));

// Bundle our own modules without external dependencies or a runtime server.
const javascript = [math, rates, app].map(source => source
  .replace(/^import .* from ['"].*['"];\r?\n/gm, '')
  .replace(/^export /gm, '')).join('\n\n');
const bundled = html
  .replace('<html lang="pt-BR">', '<html lang="pt-BR" data-standalone="true">')
  .replace('<link rel="icon" href="/favicon.svg" type="image/svg+xml">', () => `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(icon)}" type="image/svg+xml">`)
  .replace('<link rel="stylesheet" href="/style.css">', () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`)
  .replace('<script type="module" src="/app.js"></script>', '')
  .replaceAll('href="/"', 'href="#"')
  .replace('</body>', () => `<script>\n'use strict';\n${javascript.replace(/<\/script/gi, '<\\/script')}\n</script>\n</body>`);

await writeFile(new URL('ABRIR_ORBITA.html', root), bundled);
console.log('ABRIR_ORBITA.html atualizado: abra o arquivo diretamente no navegador, sem instalar programas.');
