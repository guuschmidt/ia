import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate, finance, convert, convertCurrency } from '../public/math.js';
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≠ ${b}`);

test('aritmética, precedência, vírgulas e porcentagem', () => {
  assert.equal(calculate('2 + 3 × 4'), 14);
  assert.equal(calculate('(2 + 3) × 4'), 20);
  assert.equal(calculate('1,5 + 2,5'), 4);
  assert.equal(calculate('200 × 10%'), 20);
  assert.equal(calculate('-2^2'), -4);
  assert.equal(calculate('2^3^2'), 512);
  assert.equal(calculate('2^-2'), .25);
  assert.equal(calculate('1e-7 * 10'), .000001);
});
test('funções científicas em graus e radianos', () => {
  near(calculate('sin(30)'), .5);
  near(calculate('cos(π)', false), -1);
  near(calculate('asin(0,5)'), 30);
  assert.equal(calculate('sqrt(144)+log(100)+5!'), 134);
  near(calculate('ln(e)'), 1);
});
test('expressões inválidas e domínios são rejeitados', () => {
  for (const input of ['1/0', 'sqrt(-1)', 'tan(90)', '171!', '2(3)', 'sin(', '2+','globalThis.process.exit()', '1;alert(1)', '(-2)!', '9^999']) assert.throws(() => calculate(input), input);
});
test('juros compostos com aportes no fim do mês', () => {
  const result = finance({ mode: 'compound', principal: 1000, rate: 10, months: 2, contribution: 100 });
  near(result.total, 1420); assert.equal(result.invested, 1200); near(result.interest, 220);
});
test('juros simples e taxas zero', () => {
  near(finance({ mode: 'simple', principal: 1000, rate: 2, months: 12 }).total, 1240);
  assert.equal(finance({ mode: 'compound', principal: 1000, rate: 0, months: 12, contribution: 100 }).total, 2200);
  assert.equal(finance({ mode: 'loan', principal: 1200, rate: 0, months: 12 }).payment, 100);
});
test('financiamento Price e entradas inválidas', () => {
  near(finance({ mode: 'loan', principal: 10000, rate: 1, months: 12 }).payment, 888.4878867834, 1e-7);
  assert.throws(() => finance({ mode: 'compound', principal: 100, rate: 1, months: 0 }));
  assert.throws(() => finance({ mode: 'compound', principal: -100, rate: 1, months: 12 }));
});
test('conversões dimensionais e dados decimais/binários', () => {
  near(convert(1, 'length', 'mi', 'km'), 1.609344);
  near(convert(1, 'mass', 'lb', 'kg'), .45359237);
  assert.equal(convert(1, 'area', 'ha', 'm2'), 10000);
  near(convert(1, 'volume', 'gal', 'L'), 3.785411784);
  assert.equal(convert(36, 'speed', 'km/h', 'm/s'), 10);
  assert.equal(convert(1, 'time', 'd', 's'), 86400);
  assert.equal(convert(1, 'data', 'MiB', 'B'), 1048576);
  assert.equal(convert(1, 'data', 'MB', 'B'), 1000000);
});
test('temperaturas e zero absoluto', () => {
  near(convert(32, 'temperature', 'F', 'C'), 0);
  near(convert(100, 'temperature', 'C', 'F'), 212);
  near(convert(0, 'temperature', 'K', 'C'), -273.15);
  assert.throws(() => convert(-1, 'temperature', 'K', 'C'));
});
test('PTAX: compra, venda, BRL e conversão cruzada', () => {
  const rates = { USD: { buy: 5, sell: 5.1 }, EUR: { buy: 6, sell: 6.1 } };
  near(convertCurrency(100, 'USD', 'BRL', rates), 510);
  near(convertCurrency(100, 'USD', 'BRL', rates, 'buy'), 500);
  near(convertCurrency(510, 'BRL', 'USD', rates), 100);
  near(convertCurrency(100, 'USD', 'EUR', rates), 510 / 6.1);
  assert.throws(() => convertCurrency(100, 'GBP', 'BRL', rates));
  assert.throws(() => convertCurrency(-1, 'USD', 'BRL', rates));
});
