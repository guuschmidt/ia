const functions = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sqrt: Math.sqrt, ln: Math.log, log: Math.log10, abs: Math.abs, exp: Math.exp };

// A bounded expression parser. Expressions are never evaluated as JavaScript.
export function calculate(input, degrees = true) {
  const source = input.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-').replaceAll(',', '.').replaceAll('π', 'pi');
  if (source.length > 500) throw new Error('Expressão muito longa.');
  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[a-z]+|[+\-*/^()%!]/g) || [];
  if (tokens.join('') !== source.replace(/\s/g, '')) throw new Error('Expressão inválida.');
  let pos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];
  const require = (s) => { if (take() !== s) throw new Error('Confira os parênteses.'); };
  function primary() {
    const token = take();
    let value;
    if (token === '(') { value = sum(); require(')'); }
    else if (token === 'pi') value = Math.PI;
    else if (token === 'e') value = Math.E;
    else if (functions[token]) {
      require('('); let arg = sum(); require(')');
      if (degrees && ['sin', 'cos', 'tan'].includes(token)) arg *= Math.PI / 180;
      if (token === 'tan' && Math.abs(Math.cos(arg)) < 1e-14) throw new Error('Tangente indefinida neste ângulo.');
      value = functions[token](arg);
      if (degrees && ['asin', 'acos', 'atan'].includes(token)) value *= 180 / Math.PI;
    } else if (token && /^(\d|\.)/.test(token)) value = Number(token);
    else throw new Error('Complete a expressão.');
    while (peek() === '%' || peek() === '!') {
      if (take() === '%') value /= 100;
      else {
        if (!Number.isInteger(value) || value < 0 || value > 170) throw new Error('Fatorial aceita inteiros de 0 a 170.');
        let product = 1; for (let n = 2; n <= value; n++) product *= n; value = product;
      }
    }
    return value;
  }
  function power() { const value = primary(); return peek() === '^' ? (take(), value ** unary()) : value; }
  function unary() { if (peek() === '+') { take(); return unary(); } if (peek() === '-') { take(); return -unary(); } return power(); }
  function product() { let value = unary(); while (peek() === '*' || peek() === '/') { const op = take(); const right = unary(); if (op === '/' && right === 0) throw new Error('Não é possível dividir por zero.'); value = op === '*' ? value * right : value / right; } return value; }
  function sum() { let value = product(); while (peek() === '+' || peek() === '-') { const op = take(); const right = product(); value = op === '+' ? value + right : value - right; } return value; }
  const result = sum();
  if (pos !== tokens.length) throw new Error('Use um operador entre os valores.');
  if (!Number.isFinite(result)) throw new Error('Resultado fora do domínio ou do limite numérico.');
  return Object.is(result, -0) ? 0 : result;
}

export function finance({ mode, principal, rate, months, contribution = 0 }) {
  if (![principal, rate, months, contribution].every(Number.isFinite) || principal < 0 || contribution < 0 || rate < 0 || rate > 100 || !Number.isInteger(months) || months < 1 || months > 1200) throw new Error('Informe valores positivos, taxa de 0 a 100% e prazo de 1 a 1.200 meses.');
  const r = rate / 100;
  let total, invested, payment = 0;
  if (mode === 'loan') {
    payment = r === 0 ? principal / months : principal * r / (1 - (1 + r) ** -months);
    total = payment * months; invested = principal;
  } else if (mode === 'simple') {
    invested = principal; total = principal * (1 + r * months);
  } else {
    invested = principal + contribution * months;
    total = r === 0 ? invested : principal * (1 + r) ** months + contribution * (((1 + r) ** months - 1) / r);
  }
  if (![total, invested, payment].every(Number.isFinite)) throw new Error('Os valores excedem o limite de cálculo.');
  return { total, invested, interest: total - invested, payment };
}

export const units = {
  length: { label: 'Comprimento', units: { m: ['Metro', 1], km: ['Quilômetro', 1000], cm: ['Centímetro', .01], mm: ['Milímetro', .001], in: ['Polegada', .0254], ft: ['Pé', .3048], yd: ['Jarda', .9144], mi: ['Milha', 1609.344] } },
  mass: { label: 'Massa', units: { kg: ['Quilograma', 1], g: ['Grama', .001], mg: ['Miligrama', .000001], t: ['Tonelada', 1000], lb: ['Libra', .45359237], oz: ['Onça', .028349523125] } },
  temperature: { label: 'Temperatura', units: { C: ['Celsius', 1], F: ['Fahrenheit', 1], K: ['Kelvin', 1] } },
  area: { label: 'Área', units: { m2: ['Metro quadrado', 1], km2: ['Quilômetro quadrado', 1e6], ha: ['Hectare', 1e4], acre: ['Acre', 4046.8564224], ft2: ['Pé quadrado', .09290304] } },
  volume: { label: 'Volume', units: { L: ['Litro', 1], mL: ['Mililitro', .001], m3: ['Metro cúbico', 1000], gal: ['Galão americano', 3.785411784] } },
  speed: { label: 'Velocidade', units: { 'km/h': ['Quilômetros por hora', 1], 'm/s': ['Metros por segundo', 3.6], mph: ['Milhas por hora', 1.609344], kn: ['Nó', 1.852] } },
  time: { label: 'Tempo', units: { s: ['Segundo', 1], min: ['Minuto', 60], h: ['Hora', 3600], d: ['Dia', 86400], week: ['Semana', 604800] } },
  data: { label: 'Dados', units: { B: ['Byte', 1], KB: ['Kilobyte (decimal)', 1000], MB: ['Megabyte (decimal)', 1e6], GB: ['Gigabyte (decimal)', 1e9], KiB: ['Kibibyte', 1024], MiB: ['Mebibyte', 1048576], GiB: ['Gibibyte', 1073741824] } }
};

export function convert(value, category, from, to) {
  if (!Number.isFinite(value)) throw new Error('Informe um valor válido.');
  const group = units[category]?.units;
  if (!group?.[from] || !group?.[to]) throw new Error('Unidade inválida.');
  if (category === 'temperature') {
    const c = from === 'F' ? (value - 32) * 5 / 9 : from === 'K' ? value - 273.15 : value;
    if (c < -273.15 - 1e-10) throw new Error('Temperatura abaixo do zero absoluto.');
    return to === 'F' ? c * 9 / 5 + 32 : to === 'K' ? c + 273.15 : c;
  }
  const result = value * group[from][1] / group[to][1];
  if (!Number.isFinite(result)) throw new Error('O valor excede o limite de cálculo.');
  return result;
}

export function convertCurrency(amount, from, to, rates, side = 'sell') {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Informe um valor positivo.');
  const a = from === 'BRL' ? 1 : rates[from]?.[side];
  const b = to === 'BRL' ? 1 : rates[to]?.[side];
  if (!(a > 0) || !(b > 0)) throw new Error('Cotação indisponível para a moeda selecionada.');
  const result = amount * a / b;
  if (!Number.isFinite(result)) throw new Error('O valor excede o limite de cálculo.');
  return result;
}
