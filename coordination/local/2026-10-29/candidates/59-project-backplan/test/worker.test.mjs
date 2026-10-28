import test from 'node:test';
import assert from 'node:assert/strict';
import { runCalculation } from '../public/js/planner-worker.js';
import { project, task } from './helpers.mjs';

const request = (input = project(), locale = 'en') => ({ type: 'calculate', generation: 7, input, locale });
test('Node protocol only: exact four-field request, actual phase counts, real pair contents', () => {
  const messages = [];
  runCalculation(request(project([task('A', 2), task('B', 3, ['A'])])), message => messages.push(message));
  assert.ok(messages.every(m => m.generation === 7));
  assert.deepEqual(messages.slice(0, 3).map(m => [m.phase, m.completed, m.unit]), [['validate', 2, 'tasks'], ['graph', 2, 'tasks'], ['calendar', 5, 'civilDays']]);
  assert.deepEqual(messages.filter(m => m.phase === 'forward').map(m => m.completed), [1, 2]);
  assert.deepEqual(messages.filter(m => m.phase === 'backward').map(m => m.completed), [1, 2]);
  const result = messages.at(-1);
  assert.equal(result.type, 'result');
  assert.equal(result.plan.anchor, '2026-10-19');
  assert.equal(JSON.parse(result.output.json.text).tasks[1].EF, '2026-10-23');
  assert.equal(messages.at(-2).completed, Buffer.byteLength(result.output.json.text) + Buffer.byteLength(result.output.txt.text));
  assert.equal(messages.at(-2).phase, 'serialize');
  assert.ok(result.output.txt.text.startsWith('Deadline Back-Planner\n'));
});
test('required locale protocol: omitted, unsupported or unknown fields are not guessed', () => {
  const noLocale = request();
  delete noLocale.locale;
  const messages = [];
  for (const raw of [noLocale, { ...request(), locale: 'fr' }, { ...request(), extra: true }, { ...request(), generation: 0 }, { ...request(), type: 'other' }]) runCalculation(raw, message => messages.push(message));
  assert.deepEqual(messages, []);
  runCalculation(request(project(), 'zh-Hant'), message => messages.push(message));
  assert.ok(messages.at(-1).output.txt.text.startsWith('專案期限倒排\n'));
});
test('Node protocol only: graph and validation failures contain no plan or output', () => {
  for (const raw of [project(undefined, { workweek: [] }), project([task('A', 1, ['A'])]), project([task('A', '2.0')])]) {
    const messages = [];
    runCalculation(request(raw), message => messages.push(message));
    const end = messages.at(-1);
    assert.equal(end.type, 'failure');
    assert.ok(end.errors.length > 0);
    assert.equal(Object.hasOwn(end, 'plan'), false);
    assert.equal(Object.hasOwn(end, 'output'), false);
    assert.equal(messages.some(m => m.phase === 'calendar'), false);
  }
});
