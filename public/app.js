import { calculate, finance, convert, convertCurrency, units } from './math.js';
import { marketRates, ptaxRates, validDate, brazilDate } from './rates.js';

const $ = (id) => document.getElementById(id);
const number = (n, max = 10) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: max }).format(n);
const money = (n, currency = 'BRL', digits = 2) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
const dateLabel = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
$('today').textContent = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
$('reference-date').value = today;
$('reference-date').max = today;
let activeTab = 'normal', degrees = true, finished = false, history = [], currencyRequest = 0;
try { const stored = JSON.parse(localStorage.getItem('orbita.history') || '[]'); if (Array.isArray(stored)) history = stored.filter(item => typeof item.expression === 'string' && typeof item.result === 'number' && Number.isFinite(item.result)).slice(0, 25); } catch { /* Private browsing may disable storage. */ }

let toastTimer;
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2600); }
function saveHistory() { try { localStorage.setItem('orbita.history', JSON.stringify(history)); } catch { /* Calculation remains usable without storage. */ } }
function renderHistory() {
  $('history-list').replaceChildren();
  if (!history.length) { $('history-list').innerHTML = '<div class="history-empty"><span class="empty-icon">↶</span><p>Suas contas ficam por aqui.</p><small>Faça um cálculo para começar.</small></div>'; return; }
  history.forEach(item => {
    const button = document.createElement('button'); button.className = 'history-item'; button.title = 'Usar este resultado';
    const expression = document.createElement('span'); expression.textContent = item.expression + ' =';
    const result = document.createElement('strong'); result.textContent = number(item.result);
    button.append(expression, result); button.addEventListener('click', () => { $('expression').value = String(item.result).replace('.', ','); finished = true; $('calculator-error').textContent = 'Resultado recuperado do histórico.'; $('calculator-error').classList.remove('has-error'); }); $('history-list').append(button);
  });
}
renderHistory();
$('clear-history').addEventListener('click', () => { history = []; saveHistory(); renderHistory(); });

function showTab(name) {
  activeTab = name;
  document.querySelectorAll('.tab').forEach(button => { const selected = button.dataset.tab === name; button.classList.toggle('active', selected); button.setAttribute('aria-selected', selected); button.tabIndex = selected ? 0 : -1; });
  document.querySelectorAll('.tool-panel').forEach(panel => { panel.hidden = true; });
  const calculator = ['normal', 'scientific'].includes(name);
  $(calculator ? 'calculator-panel' : `${name}-panel`).hidden = false;
  if (calculator) {
    $('calculator-panel').setAttribute('aria-labelledby', `tab-${name}`);
    $('calculator-title').textContent = name === 'normal' ? 'Calculadora normal' : 'Calculadora científica';
    $('calculator-mode').textContent = name === 'normal' ? 'O ESSENCIAL, BEM FEITO' : 'VÁ ALÉM DO BÁSICO';
    $('scientific-keys').hidden = name !== 'scientific'; $('angle-mode').hidden = name !== 'scientific';
  }
}
document.querySelectorAll('.tab').forEach((button, index, list) => {
  button.addEventListener('click', () => showTab(button.dataset.tab));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
    showTab(list[next].dataset.tab); list[next].focus();
  });
});
showTab('normal');
function clearError() { $('calculator-error').textContent = 'Porcentagem: x% equivale a x ÷ 100.'; $('calculator-error').classList.remove('has-error'); }
function appendKey(key) {
  const input = $('expression');
  if ((finished && !['+', '-', '−', '*', '×', '/', '÷', '^', '%', '!'].includes(key)) || (input.value === '0' && /^[0-9a-zπ(]/.test(key))) input.value = '';
  if (input.value.length + key.length <= 500) input.value += key;
  finished = false; clearError(); input.scrollLeft = input.scrollWidth;
}
function runCalculation() {
  try {
    const expression = $('expression').value; const result = calculate(expression, degrees);
    $('expression').value = String(Number(result.toPrecision(14))).replace('.', ',');
    $('expression-label').textContent = `${expression} =`;
    history.unshift({ expression, result }); history = history.slice(0, 25); saveHistory(); renderHistory();
    finished = true; clearError();
  } catch (error) { $('calculator-error').textContent = error.message; $('calculator-error').classList.add('has-error'); }
}
function action(name) {
  if (name === 'equals') return runCalculation();
  if (name === 'clear') { $('expression').value = '0'; $('expression-label').textContent = 'VAMOS FAZER AS CONTAS?'; }
  if (name === 'backspace') $('expression').value = $('expression').value.slice(0, -1) || '0';
  if (name === 'sign') $('expression').value = `-(${$('expression').value})`;
  finished = false; clearError();
}
document.querySelectorAll('[data-key]').forEach(button => button.addEventListener('click', () => appendKey(button.dataset.key)));
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => action(button.dataset.action)));
$('expression').addEventListener('input', () => { finished = false; clearError(); });
document.addEventListener('keydown', event => {
  if (!['normal', 'scientific'].includes(activeTab) || event.ctrlKey || event.metaKey || event.altKey) return;
  const tag = event.target.tagName;
  if (tag === 'INPUT' && event.target.id !== 'expression') return;
  if (tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (event.key === 'Enter' && tag !== 'BUTTON' || event.key === '=') { event.preventDefault(); runCalculation(); }
  else if (event.key === 'Escape') { event.preventDefault(); action('clear'); }
  else if (tag !== 'INPUT') {
    if (/^[0-9.+\-*/()%!^]$/.test(event.key)) { event.preventDefault(); appendKey(event.key); }
    else if (event.key === 'Backspace') { event.preventDefault(); action('backspace'); }
  }
});
$('angle-mode').addEventListener('click', () => { degrees = !degrees; $('angle-mode').textContent = degrees ? 'DEG' : 'RAD'; });
$('copy-result').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('expression').value); toast('Resultado copiado.'); } catch { $('expression').focus(); $('expression').select(); toast('Selecione e copie o resultado com Ctrl+C.'); } });

function updateFinance() {
  const mode = $('finance-mode').value;
  $('contribution-label').hidden = mode !== 'compound'; $('contribution').disabled = mode !== 'compound'; $('payment-row').hidden = mode !== 'loan';
  try {
    const result = finance({ mode, principal: $('principal').valueAsNumber, rate: $('interest-rate').valueAsNumber, months: $('months').valueAsNumber, contribution: mode === 'compound' ? $('contribution').valueAsNumber : 0 });
    $('finance-total').textContent = money(result.total); $('finance-invested').textContent = money(result.invested); $('finance-interest').textContent = money(result.interest); $('finance-payment').textContent = money(result.payment);
    $('finance-result-label').textContent = mode === 'loan' ? 'Total pago ao final do prazo' : 'Saldo ao final do período';
    $('invested-label').textContent = mode === 'loan' ? 'Valor financiado' : 'Total investido';
    $('finance-note').textContent = mode === 'loan' ? 'Parcelas fixas pela tabela Price, primeira parcela após um mês. Sem IOF, seguros, tarifas ou outros componentes do CET.' : mode === 'simple' ? 'Juros calculados sobre o capital inicial. Simulação bruta, sem impostos, taxas ou inflação.' : 'Aportes ao final de cada mês. Simulação bruta, sem impostos, taxas ou inflação.';
    $('finance-error').textContent = '';
  } catch (error) { $('finance-error').textContent = error.message; ['finance-total', 'finance-invested', 'finance-interest', 'finance-payment'].forEach(id => { $(id).textContent = '—'; }); }
}
$('finance-form').addEventListener('submit', event => { event.preventDefault(); updateFinance(); });
$('finance-form').addEventListener('input', updateFinance);
updateFinance();

async function api(path) {
  if (document.documentElement.dataset.standalone === 'true') {
    const url = new URL(path, 'https://orbita.invalid');
    try {
      if (url.pathname === '/api/market') return await marketRates();
      if (url.pathname === '/api/ptax') {
        const date = url.searchParams.get('date') || brazilDate();
        if (!validDate(date) || date > brazilDate()) throw new Error('Selecione uma data válida, até hoje.');
        return await ptaxRates(date, url.searchParams.get('latest') === 'true');
      }
      throw new Error('Consulta desconhecida.');
    } catch (error) {
      if (error instanceof TypeError || error.name === 'TimeoutError') throw new Error('Não foi possível acessar a fonte de câmbio. Verifique sua conexão. A fonte também pode bloquear consultas pelo navegador.');
      throw error;
    }
  }
  const response = await fetch(path, { signal: AbortSignal.timeout(16000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'A fonte não está disponível.');
  return data;
}
let marketLoading = false, marketData;
async function refreshRates() {
  if (marketLoading) return; marketLoading = true; $('refresh-rates').disabled = true;
  await Promise.allSettled([
    (async () => {
      try {
        const data = await api('/api/market'); marketData = data;
        for (const [code, quote] of Object.entries(data.rates)) {
          $(`rate-${code}`).textContent = money(quote.buy, 'BRL', 4);
          $(`change-${code}`).textContent = `${quote.change >= 0 ? '↗ +' : '↘ '}${number(quote.change, 2)}%`;
          $(`change-${code}`).classList.toggle('negative', quote.change < 0);
          const stamp = new Date(quote.timestamp);
          $(`stamp-${code}`).textContent = `${stamp.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · ${stamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })} BRT`;
        }
        $('market-note').textContent = 'Compra comercial: AwesomeAPI · Consulta a cada 60 s, conforme disponibilidade da fonte · PTAX: Banco Central';
      } catch {
        for (const code of ['USD', 'EUR', 'GBP']) $(`stamp-${code}`).textContent = marketData ? 'Sem atualização · última cotação recebida' : 'Fonte temporariamente indisponível';
        $('market-note').textContent = 'Não foi possível atualizar o câmbio. Os valores não são estimados. As calculadoras continuam disponíveis.';
      }
    })(),
    (async () => {
      try {
        const data = await api(`/api/ptax?date=${today}&latest=true`);
        $('rate-PTAX').textContent = money(data.rates.USD.sell, 'BRL', 4); $('stamp-PTAX').textContent = `Último fechamento · ${dateLabel(data.date)}`;
      } catch { $('rate-PTAX').textContent = '—'; $('stamp-PTAX').textContent = 'Fechamento indisponível · tente novamente'; }
    })()
  ]);
  marketLoading = false; $('refresh-rates').disabled = false;
}
$('refresh-rates').addEventListener('click', refreshRates);
refreshRates(); setInterval(() => { if (!document.hidden) refreshRates(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshRates(); });

function invalidateCurrency() { currencyRequest++; ['currency-result', 'currency-unit-rate', 'currency-date'].forEach(id => { $(id).textContent = '—'; }); $('currency-error').textContent = ''; $('convert-currency').disabled = false; }
$('currency-form').addEventListener('input', invalidateCurrency);
$('swap-currencies').addEventListener('click', () => { const from = $('currency-from').value; $('currency-from').value = $('currency-to').value; $('currency-to').value = from; invalidateCurrency(); });
$('currency-form').addEventListener('submit', async event => {
  event.preventDefault(); invalidateCurrency(); const request = currencyRequest;
  const amount = $('currency-amount').valueAsNumber, from = $('currency-from').value, to = $('currency-to').value, side = $('quote-side').value, date = $('reference-date').value;
  $('convert-currency').disabled = true; $('currency-result-label').textContent = 'Consultando boletim oficial…';
  try {
    const data = await api(`/api/ptax?date=${encodeURIComponent(date)}`);
    if (request !== currencyRequest) return;
    const result = convertCurrency(amount, from, to, data.rates, side);
    $('currency-result').textContent = money(result, to);
    $('currency-unit-rate').textContent = `1 ${from} = ${number(convertCurrency(1, from, to, data.rates, side), 6)} ${to}`;
    $('currency-date').textContent = `${dateLabel(data.date)} · ${side === 'sell' ? 'Venda' : 'Compra'}`;
  } catch (error) { if (request === currencyRequest) $('currency-error').textContent = error.name === 'TimeoutError' ? 'A consulta demorou mais que o esperado. Tente novamente.' : error.message; }
  finally { if (request === currencyRequest) { $('convert-currency').disabled = false; $('currency-result-label').textContent = 'Valor convertido'; } }
});

Object.entries(units).forEach(([id, item]) => $('measure-category').add(new Option(item.label, id)));
function populateUnits() {
  $('measure-from').replaceChildren(); $('measure-to').replaceChildren();
  Object.entries(units[$('measure-category').value].units).forEach(([id, item]) => { $('measure-from').add(new Option(`${item[0]} (${id})`, id)); $('measure-to').add(new Option(`${item[0]} (${id})`, id)); });
  $('measure-to').selectedIndex = 1; updateMeasures();
}
function updateMeasures() {
  const category = $('measure-category').value, from = $('measure-from').value, to = $('measure-to').value;
  try {
    const result = convert($('measure-amount').valueAsNumber, category, from, to);
    $('measure-result').textContent = `${number(result)} ${to}`;
    $('measure-result-label').textContent = `${number($('measure-amount').valueAsNumber)} ${from} equivalem a`;
    $('measure-equivalence').textContent = category === 'temperature' ? (to === 'F' ? '°F = °C × 9/5 + 32' : to === 'K' ? 'K = °C + 273,15' : 'Conversão para graus Celsius') : `1 ${from} = ${number(convert(1, category, from, to))} ${to}`;
    $('measure-category-label').textContent = units[category].label; $('measure-error').textContent = '';
  } catch (error) { $('measure-result').textContent = '—'; $('measure-equivalence').textContent = '—'; $('measure-error').textContent = error.message; }
}
$('measure-category').addEventListener('change', populateUnits);
['measure-amount', 'measure-from', 'measure-to'].forEach(id => $(id).addEventListener('input', updateMeasures));
$('measures-form').addEventListener('submit', event => { event.preventDefault(); updateMeasures(); });
$('swap-measures').addEventListener('click', () => { const from = $('measure-from').value; $('measure-from').value = $('measure-to').value; $('measure-to').value = from; updateMeasures(); });
populateUnits();
