import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
import { marketRates, ptaxRates, validDate, brazilDate } from './public/rates.js';
export { marketRates, ptaxRates, validDate, brazilDate };

export const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(405, { error: 'Método não permitido.' });
  if (url.pathname.startsWith('/api/')) {
    try {
      if (url.pathname === '/api/health') return json(200, { ok: true });
      if (url.pathname === '/api/market') return json(200, await marketRates());
      if (url.pathname === '/api/ptax') {
        const date = url.searchParams.get('date') || brazilDate();
        if (!validDate(date) || date > brazilDate()) return json(400, { error: 'Selecione uma data válida, até hoje.' });
        return json(200, await ptaxRates(date, url.searchParams.get('latest') === 'true'));
      }
      return json(404, { error: 'Rota não encontrada.' });
    } catch (error) {
      console.error(`[câmbio] ${error.message}`);
      return json(error.status || 503, { error: error.status === 404 ? error.message : 'Não foi possível consultar a fonte de câmbio. Tente novamente em instantes.', sourceUnavailable: !error.status });
    }
  }
  try {
    const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(root)) return json(403, { error: 'Acesso negado.' });
    const content = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'" });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { json(404, { error: 'Arquivo não encontrado.' }); }
});

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  server.listen(port, '0.0.0.0', () => console.log(`Órbita disponível na porta ${port}`));
}
