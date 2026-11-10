import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { run as salary } from '../work/tools/salary-converter/public/js/core/salary.mjs';
import { run as age } from '../work/tools/age-calculator/public/js/core/age.mjs';
import { run as cook } from '../work/tools/cooking-measurement-converter/public/js/core/convert.mjs';
import { run as days } from '../work/tools/workdays-calculator/public/js/core/core.mjs';
import { createController } from '../work/tools/workdays-calculator/public/js/controller.mjs';

const review = fileURLToPath(new URL('./', import.meta.url));
const workdays = fileURLToPath(new URL('../work/tools/workdays-calculator/', import.meta.url));
const count = { salary: 0, age: 0, cooking: 0, workdays: 0, nodeWorker: 0 };

for (const [bonusMonths, expected] of [['24.55', 'INPUT_LIMIT'], ['0.55', 'DECIMAL_FORMAT'], ['24.1', 'RANGE'], ['24', null], ['24.0', null]]) {
  assert.equal(salary({ sourceBasis: 'monthly', amount: '42000.01', bonusMonths }).error?.code ?? null, expected);
  count.salary++;
}
for (let cents = 1; cents <= 240; cents++) {
  const result = salary({ sourceBasis: 'monthly', amount: (cents / 100).toFixed(2), bonusMonths: '0.1' }).result;
  assert.equal(result.annualBase, Math.floor((cents * 12 + 50) / 100));
  assert.equal(result.annualTotal, Math.floor((cents * 121 + 500) / 1000));
  count.salary++;
}
assert.equal(salary({ sourceBasis: 'monthly', amount: '45000', bonusMonths: '0' }).result.hourly, 188);
count.salary++;

for (const year of [1900, 1999, 2000, 2023, 2024, 2100]) {
  const feb = new Date(Date.UTC(year, 2, 0)).getUTCDate();
  for (const d of [29, 30, 31]) for (const end of [1, 2, 3, 4]) {
    const input = { birthDate: `${year}-01-${d}`, referenceDate: `${year}-03-0${end}` };
    const result = age(input).result;
    const oneBorrow = end - d + feb;
    assert.deepEqual([result.ageYears, result.ageMonths, result.ageDays, result.totalDays], [0, oneBorrow >= 0 ? 1 : 0, oneBorrow >= 0 ? oneBorrow : oneBorrow + 31, (Date.parse(input.referenceDate) - Date.parse(input.birthDate)) / 86_400_000]);
    count.age++;
  }
}

const cooking = fileURLToPath(new URL('../work/tools/cooking-measurement-converter/test/fixtures.json', import.meta.url));
const authority = new URL('../work/docs/specs/cooking-measurement-converter/fixtures.json', import.meta.url);
assert.deepEqual(readFileSync(cooking), readFileSync(authority));
const fixtures = JSON.parse(readFileSync(cooking));
for (const entry of fixtures.cases.filter(item => item.kind === 'core')) {
  assert.deepEqual(cook(entry.input), entry.expected, entry.id);
  count.cooking++;
}
assert.equal(cook({ amount: '1', fromUnit: 'liter', toUnit: 'ml', ingredient: 'none' }).error.code, 'INPUT_LIMIT');
count.cooking++;

const example = { mode: 'count', startDate: '2026-01-05', endDate: '2026-01-09', holidays: '' };
for (const eol of ['\n', '\r\n']) {
  const rows = Array.from({ length: 400 }, (_, i) => new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10));
  const fourHundred = rows.join(eol);
  assert.equal(days({ ...example, holidays: fourHundred }).result.businessDays, 0);
  assert.deepEqual(days({ ...example, holidays: `${fourHundred}${eol}2026-01-01` }).error, { code: 'ROW_LIMIT', field: 'holidays', row: 401 });
  const exact = fourHundred.padEnd(8192, '\n');
  assert(days({ ...example, holidays: exact }).ok);
  assert.equal(days({ ...example, holidays: `${exact}\n` }).error.code, 'INPUT_LIMIT');
  count.workdays += 4;
}
assert.equal(days({ mode: 'shift', startDate: example.startDate, days: '-0', holidays: '' }).error.code, 'INTEGER_FORMAT');
assert.equal(days({ mode: 'shift', startDate: example.startDate, days: '0', holidays: '' }).result.resultDate, example.startDate);
count.workdays += 2;
for (let i = 4; i <= 20; i++) for (let j = 4; j <= 20; j++) {
  const earlier = Math.min(i, j), later = Math.max(i, j);
  let expected = 0;
  for (let d = earlier + 1; d <= later; d++) {
    const weekday = new Date(Date.UTC(2026, 0, d)).getUTCDay();
    if (weekday !== 0 && weekday !== 6 && d !== 7) expected++;
  }
  const date = d => `2026-01-${String(d).padStart(2, '0')}`;
  const result = days({ ...example, startDate: date(i), endDate: date(j), holidays: date(7) }).result;
  assert.equal(result.businessDays, i > j ? -expected : expected);
  count.workdays++;
}
assert.equal(days({ ...example, startDate: '2026-01-11', endDate: '2026-01-08' }).result.businessDays, -1);
assert.equal(days({ mode: 'shift', startDate: '2026-01-11', days: '-1', holidays: '' }).result.resultDate, '2026-01-09');
count.workdays += 2;

const scratch = mkdtempSync(join(review, 'workdays-'));
cpSync(workdays, scratch, { recursive: true });
const build = execFileSync(process.execPath, ['scripts/build.mjs', '--mode', 'preview'], { cwd: scratch, windowsHide: true, encoding: 'utf8' }).trim();
const { WORKER_SOURCE } = await import(pathToFileURL(join(scratch, 'dist-preview/js/worker-source.js')));
const wrapper = `import { parentPort, isMainThread } from 'node:worker_threads';\nif (isMainThread) throw Error('Expected child thread');\nglobalThis.self = { postMessage: message => parentPort.postMessage(message) };\n${WORKER_SOURCE}\nparentPort.on('message', data => self.onmessage({data}));`;
const url = new URL(`data:text/javascript;base64,${Buffer.from(wrapper).toString('base64')}`);
const workers = [];
const makeWorker = () => {
  const thread = new Worker(url);
  const bridge = { postMessage: input => thread.postMessage(input), terminate() { this.termination = thread.terminate(); } };
  thread.on('message', data => bridge.onmessage?.({ data }));
  thread.on('error', error => bridge.onerror?.(error));
  thread.on('messageerror', error => bridge.onmessageerror?.(error));
  workers.push(bridge);
  return bridge;
};
let settle;
const controller = createController({ createWorker: makeWorker, onSettled: () => settle?.() });
const execute = async input => {
  controller.updateDraft({ ...input, days: '5' });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Worker did not settle')), 5000);
    settle = () => { clearTimeout(timeout); resolve(); };
    assert.equal(controller.execute().status, 'busy');
  });
  assert(workers.at(-1).termination);
  await workers.at(-1).termination;
  return controller.getState();
};
assert.equal((await execute(example)).result.businessDays, 4);
assert.equal((await execute({ ...example, endDate: '2026-02-30' })).error.code, 'INVALID_DATE');
count.nodeWorker += 2;
for (const action of ['cancel', 'discardPending', 'reset', 'updateDraft']) {
  controller.updateDraft({ ...example, days: '1' });
  controller.execute();
  const old = workers.at(-1);
  controller[action]({ ...example, days: '2' });
  await old.termination;
  assert(!controller.getState().resultAvailable);
  assert.notEqual(controller.getState().status, 'busy');
  count.nodeWorker++;
}
const app = readFileSync(join(scratch, 'dist-preview/js/app.js'), 'utf8');
const serve = readFileSync(join(scratch, 'scripts/serve.mjs'), 'utf8');
assert.match(app, /new Worker\(url, \{ type: "module" \}\)/);
assert.match(app, /new Blob\(\[WORKER_SOURCE\]/);
assert.equal(app.match(/URL\.revokeObjectURL\(url\)/g).length, 2);
assert.match(serve, /worker-src blob:;/);
assert.match(serve, /connect-src 'none';/);
console.log(JSON.stringify({ count, build, browser: 'NOT_RUN' }, null, 2));
