import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, unlinkSync, rmSync, rmdirSync, symlinkSync, lstatSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT } from '../scripts/files.mjs';
import { readDeploymentConfig } from '../scripts/deployment-config.mjs';

function fixture(run) {
  const parent = resolve(ROOT, 'evidence/m2a/fixtures'); mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(join(parent, 'deployment-fixture-'));
  try { cpSync(join(ROOT, 'wrangler.jsonc'), join(directory, 'wrangler.jsonc')); run(directory); }
  finally { assert.ok(resolve(directory).startsWith(`${parent}${sep}deployment-fixture-`)); assert.ok(!lstatSync(directory).isSymbolicLink()); rmSync(directory, { recursive: true }); }
}
test('deployment is the full fixed assets-only M2A contract and returns its actual bytes/hash', () => fixture(directory => {
  const bytes = readFileSync(join(directory, 'wrangler.jsonc')), value = JSON.parse(bytes);
  assert.deepEqual(value, {
    name: 'glossquote-flashcards', compatibility_date: '2026-10-24', workers_dev: false, preview_urls: false, send_metrics: false,
    routes: [{ pattern: 'flashcards.glossquote.com', custom_domain: true }],
    observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
    assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' },
    build: { command: 'node scripts/release.mjs build' }
  });
  assert.deepEqual(readDeploymentConfig(directory), { path: 'wrangler.jsonc', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}));
const mutations = {
  'worker name': value => { value.name = 'other'; },
  'compatibility date': value => { value.compatibility_date = '2026-10-27'; },
  'workers.dev': value => { value.workers_dev = true; },
  'preview URLs': value => { value.preview_urls = true; },
  'metrics': value => { value.send_metrics = true; },
  'observability': value => { value.observability.enabled = true; },
  'logs': value => { value.observability.logs.enabled = true; },
  'invocation logs': value => { value.observability.logs.invocation_logs = true; },
  'traces': value => { value.observability.traces.enabled = true; },
  'missing disabled flag': value => { delete value.observability.logs.invocation_logs; },
  'different domain': value => { value.routes[0].pattern = 'other.example.invalid'; },
  'custom domain disabled': value => { value.routes[0].custom_domain = false; },
  'second route': value => { value.routes.push({ pattern: 'example.invalid', custom_domain: true }); },
  'wildcard route': value => { value.routes[0].pattern += '/*'; },
  'zone binding': value => { value.routes[0].zone_id = 'FAKE'; },
  'executable worker': value => { value.main = 'fake.mjs'; },
  'bindings': value => { value.kv_namespaces = [{ binding: 'FAKE', id: 'FAKE' }]; },
  'environment overrides': value => { value.env = { fake: {} }; },
  'runtime vars': value => { value.vars = { FAKE: 'FAKE' }; },
  'asset binding': value => { value.assets.binding = 'FAKE'; },
  'asset directory': value => { value.assets.directory = './public'; },
  'worker first': value => { value.assets.run_worker_first = true; },
  'HTML normalization': value => { value.assets.html_handling = 'auto-trailing-slash'; },
  'SPA fallback': value => { value.assets.not_found_handling = 'single-page-application'; },
  'build command': value => { value.build.command = 'node fake.mjs'; },
  'build cwd': value => { value.build.cwd = '..'; },
  'unknown top-level field': value => { value.unknown = false; }
};
for (const [name, mutate] of Object.entries(mutations)) test(`deployment guard rejects ${name}`, () => fixture(directory => {
  const path = join(directory, 'wrangler.jsonc'), value = JSON.parse(readFileSync(path, 'utf8')); mutate(value);
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`); writeFileSync(path, bytes);
  assert.throws(() => readDeploymentConfig(directory), /DEPLOY_CONFIG_CONTRACT/); assert.deepEqual(readFileSync(path), bytes);
}));
test('deployment guard refuses missing, directory, junction, excessive size, invalid UTF-8, duplicate keys and noncanonical JSON', () => fixture(directory => {
  const path = join(directory, 'wrangler.jsonc'), original = readFileSync(path);
  unlinkSync(path); assert.throws(() => readDeploymentConfig(directory), /DEPLOY_CONFIG_FILE/);
  mkdirSync(path); assert.throws(() => readDeploymentConfig(directory), /DEPLOY_CONFIG_FILE/); rmdirSync(path);
  const target = join(directory, 'fake-target'); mkdirSync(target); writeFileSync(join(target, 'keep.txt'), 'FAKE_PRESERVE');
  symlinkSync(target, path, process.platform === 'win32' ? 'junction' : 'dir'); assert.throws(() => readDeploymentConfig(directory), /DEPLOY_CONFIG_FILE/); unlinkSync(path);
  assert.equal(readFileSync(join(target, 'keep.txt'), 'utf8'), 'FAKE_PRESERVE');
  for (const [bytes, code] of [[Buffer.alloc(8193, 32), 'FILE'], [Buffer.from([0xff]), 'JSON'], [Buffer.from(original.toString().replace('{', '{\n  "send_metrics": true,')), 'FORMAT'], [Buffer.from(`\uFEFF${original}`), 'JSON'], [Buffer.from(original.toString().replace(/\n/g, '\r\n')), 'FORMAT'], [Buffer.from(`${original}// fake comment\n`), 'JSON']]) {
    writeFileSync(path, bytes); assert.throws(() => readDeploymentConfig(directory), new RegExp(`DEPLOY_CONFIG_${code}`)); assert.deepEqual(readFileSync(path), bytes);
  }
}));
