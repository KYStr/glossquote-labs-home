import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const tools = [
  'age-calculator',
  'bill-split-calculator',
  'clothing-size-converter',
  'dew-point-calculator',
  'feels-like-temperature',
  'period-cycle-calculator',
  'race-time-predictor',
  'salary-converter',
];

function platform(source, { failFirst = false, failTerminate = false } = {}) {
  const constructionError = new Error('worker constructor failure');
  const terminationError = new Error('worker termination failure');
  const issued = [];
  const revoked = [];
  const workers = [];
  const active = new Set();
  const context = {
    WORKER_SOURCE: '/* worker test body */',
    Blob,
    URL: {
      createObjectURL(blob) {
        assert.equal(blob.type, 'text/javascript');
        const url = 'blob:worker-' + issued.length;
        issued.push(url);
        active.add(url);
        return url;
      },
      revokeObjectURL(url) {
        revoked.push(url);
        active.delete(url);
      },
    },
    Worker: class {
      constructor(url, options) {
        assert(active.has(url));
        assert.equal(options.type, 'module');
        if (failFirst && issued.length === 1) throw constructionError;
        this.url = url;
        this.terminations = 0;
        workers.push(this);
      }
      postMessage(message) {
        this.posted = structuredClone(message);
      }
      terminate() {
        this.terminations += 1;
        if (failTerminate) throw terminationError;
      }
    },
  };
  const createWorker = runInNewContext(source + '\ncreateWorker', context, { timeout: 1000 });
  return { createWorker, constructionError, terminationError, issued, revoked, workers, active };
}

for (const slug of tools) {
  const js = new URL('../../../../tools/' + slug + '/public/js/', import.meta.url);
  const app = await readFile(new URL('app.js', js), 'utf8');
  const match = app.match(/^function createWorker\(\) \{[\s\S]*?^\}/m);
  assert(match, slug + ' createWorker');
  const source = match[0];
  const { createController } = await import(new URL('controller.mjs', js));

  test(slug + ': releases URL and preserves the original constructor exception', () => {
    const fake = platform(source, { failFirst: true });
    assert.throws(() => fake.createWorker(), error => error === fake.constructionError);
    assert.equal(fake.issued.length, 1);
    assert.deepEqual(fake.revoked, fake.issued);
    assert.equal(fake.active.size, 0);
    assert.equal(fake.workers.length, 0);
  });

  test(slug + ': keeps URL until normal termination', () => {
    const fake = platform(source);
    const worker = fake.createWorker();
    assert(fake.active.has(worker.url));
    assert.deepEqual(fake.revoked, []);
    worker.terminate();
    assert.equal(worker.terminations, 1);
    assert.deepEqual(fake.revoked, [worker.url]);
    assert.equal(fake.active.size, 0);
  });

  test(slug + ': cleanup and native termination are idempotent', () => {
    const fake = platform(source);
    const worker = fake.createWorker();
    worker.terminate();
    worker.terminate();
    assert.equal(worker.terminations, 1);
    assert.deepEqual(fake.revoked, [worker.url]);
    assert.equal(fake.active.size, 0);
  });

  test(slug + ': releases URL even when native termination throws', () => {
    const fake = platform(source, { failTerminate: true });
    const worker = fake.createWorker();
    assert.throws(() => worker.terminate(), error => error === fake.terminationError);
    assert.deepEqual(fake.revoked, [worker.url]);
    assert.equal(fake.active.size, 0);
    worker.terminate();
    assert.equal(worker.terminations, 1);
    assert.deepEqual(fake.revoked, [worker.url]);
  });

  test(slug + ': controller can retry with a fresh Worker and no leaked URL', () => {
    const fake = platform(source, { failFirst: true });
    const controller = createController({ createWorker: fake.createWorker });
    controller.loadExample();
    controller.run();
    assert.equal(controller.getState().state, 'error');
    assert.equal(controller.getState().error.code, 'WORKER_ERROR');
    assert.equal(controller.getState().reportAvailable, false);
    assert.equal(fake.active.size, 0);
    assert.deepEqual(fake.revoked, [fake.issued[0]]);

    controller.run();
    const [worker] = fake.workers;
    assert.equal(controller.getState().state, 'busy');
    assert.notEqual(worker.url, fake.issued[0]);
    assert.deepEqual([...fake.active], [worker.url]);
    const result = { marker: 'successful retry' };
    worker.onmessage({ data: { generation: worker.posted.generation, ok: true, result } });
    assert.equal(controller.getState().state, 'success');
    assert.deepEqual(controller.getState().result, result);
    assert.equal(controller.getState().reportAvailable, true);
    assert.equal(worker.terminations, 1);
    assert.equal(fake.active.size, 0);
    assert.deepEqual(fake.revoked, fake.issued);
  });
}
