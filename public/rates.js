// Shared by the HTTP server and the standalone browser version.
const cache = new Map();
const currencyCodes = ['USD', 'EUR', 'GBP'];

async function upstream(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Fonte respondeu HTTP ${response.status}`);
  return response.json();
}

export async function marketRates() {
  const key = 'market'; const cached = cache.get(key);
  if (cached && Date.now() - cached.time < 60000) return cached.value;
  const data = await upstream('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL');
  const rates = {};
  for (const code of currencyCodes) {
    const quote = data[`${code}BRL`];
    if (!quote || !(Number(quote.bid) > 0) || !(Number(quote.ask) > 0) || !Number.isFinite(Number(quote.pctChange))) throw new Error('Cotação inválida');
    rates[code] = { buy: Number(quote.bid), sell: Number(quote.ask), change: Number(quote.pctChange), timestamp: new Date(Number(quote.timestamp) * 1000).toISOString() };
  }
  const value = { source: 'AwesomeAPI', fetchedAt: new Date().toISOString(), rates };
  cache.set(key, { time: Date.now(), value }); return value;
}

function bcbDate(iso) { const [y, m, d] = iso.split('-'); return `${m}-${d}-${y}`; }
export function validDate(date) { return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date; }
export function brazilDate() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }

export async function ptaxRates(date, latest = false) {
  const key = `ptax:${date}:${latest}`; const cached = cache.get(key);
  if (cached && Date.now() - cached.time < 300000) return cached.value;
  const start = new Date(`${date}T12:00:00Z`); start.setUTCDate(start.getUTCDate() - 10);
  const quotes = await Promise.all(currencyCodes.map(async code => {
    const endpoint = latest ? 'CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)' : 'CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)';
    const params = new URLSearchParams({ '@moeda': `'${code}'`, '$format': 'json', '$top': '100', '$orderby': 'dataHoraCotacao desc' });
    if (latest) { params.set('@dataInicial', `'${bcbDate(start.toISOString().slice(0, 10))}'`); params.set('@dataFinalCotacao', `'${bcbDate(date)}'`); }
    else params.set('@dataCotacao', `'${bcbDate(date)}'`);
    const data = await upstream(`https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/${endpoint}?${params}`);
    const quote = data.value?.find(item => item.tipoBoletim === 'Fechamento');
    if (!quote) { const error = new Error('Sem boletim de fechamento para a data. Escolha um dia útil anterior ou aguarde a publicação do Banco Central.'); error.status = 404; throw error; }
    if (!(quote.cotacaoCompra > 0) || !(quote.cotacaoVenda > 0)) throw new Error('Cotação PTAX inválida');
    return [code, { buy: quote.cotacaoCompra, sell: quote.cotacaoVenda, timestamp: quote.dataHoraCotacao, date: quote.dataHoraCotacao.slice(0, 10) }];
  }));
  if (new Set(quotes.map(([, quote]) => quote.date)).size !== 1) throw new Error('Boletins com datas diferentes. Tente novamente.');
  const value = { source: 'Banco Central do Brasil', date: quotes[0][1].date, requestedDate: date, bulletin: 'Fechamento', rates: Object.fromEntries(quotes), fetchedAt: new Date().toISOString() };
  cache.set(key, { time: Date.now(), value }); return value;
}

