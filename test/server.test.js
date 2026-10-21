import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { server, validDate, marketRates, ptaxRates } from '../server.js';

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
after(() => new Promise(resolve => server.close(resolve)));
const base = `http://127.0.0.1:${server.address().port}`;
test('servidor entrega página e módulos com tipo correto', async () => {
  const response = await fetch(base); assert.equal(response.status, 200); assert.match(await response.text(), /Calculadora normal/);
  const module = await fetch(`${base}/math.js`); assert.match(module.headers.get('content-type'), /javascript/);
  assert.equal((await fetch(`${base}/not-found`)).status, 404);
  assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { ok: true });
});
test('datas inválidas e futuras são rejeitadas antes de consultar a fonte', async () => {
  assert.equal(validDate('2024-02-29'), true); assert.equal(validDate('2025-02-29'), false);
  for (const date of ['2026-02-30', 'x', '2099-12-31']) assert.equal((await fetch(`${base}/api/ptax?date=${date}`)).status, 400);
});
test('fontes: contratos de mercado, PTAX fechamento e ausência de boletim (respostas simuladas)', async (t) => {
  t.mock.method(globalThis, 'fetch', async url => {
    const text = String(url);
    if (text.includes('awesomeapi')) return { ok: true, json: async () => Object.fromEntries(['USD', 'EUR', 'GBP'].map(code => [`${code}BRL`, { bid: '5', ask: '5.1', pctChange: '-0.1', timestamp: '1774000000' }])) };
    const missing = text.includes('01-03-2026');
    return { ok: true, json: async () => ({ value: missing ? [] : [
      { tipoBoletim: 'Intermediário', cotacaoCompra: 99, cotacaoVenda: 99, dataHoraCotacao: '2026-01-02 12:00:00.000' },
      { tipoBoletim: 'Fechamento', cotacaoCompra: 5, cotacaoVenda: 5.1, dataHoraCotacao: '2026-01-02 13:00:00.000' }
    ] }) };
  });
  const market = await marketRates(); assert.equal(market.rates.USD.buy, 5); assert.equal(market.rates.GBP.change, -.1);
  const ptax = await ptaxRates('2026-01-02'); assert.equal(ptax.rates.USD.sell, 5.1); assert.equal(ptax.date, '2026-01-02');
  await assert.rejects(ptaxRates('2026-01-03'), error => error.status === 404);
});
