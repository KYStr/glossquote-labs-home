// Build tests (SPEC §5): preview reproducibility, the exact artifact list,
// and production-mode origin gating (refusal without an approved origin is
// the specified behaviour, not a failure).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(args, env) {
  return new Promise((resolve) => {
    execFile(process.execPath, args, { cwd: root, env: env || process.env }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

async function collect(dir, base, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collect(full, base, out);
    else out.set(path.relative(base, full).split(path.sep).join('/'), await readFile(full));
    // Keys are POSIX-style: path.relative uses backslashes on Windows, but
    // the expected artifact list and downstream lookups use slashes.
  }
  return out;
}

const EXPECTED_ARTIFACTS = [
  '_headers', 'assets/app.mjs', 'assets/controller.mjs', 'assets/core.mjs',
  'assets/styles.css', 'assets/texts.mjs', 'en/index.html', 'index.html',
  'robots.txt', 'sitemap.xml',
];

test('preview build is byte-reproducible and emits exactly the allowlisted artifacts', async () => {
  const a = await mkdtemp(path.join(os.tmpdir(), 'cssspec-a-'));
  const b = await mkdtemp(path.join(os.tmpdir(), 'cssspec-b-'));
  try {
    const env = { ...process.env };
    delete env.APPROVED_ORIGIN;
    const r1 = await run(['scripts/build.mjs', '--mode=preview', '--out=' + a], env);
    const r2 = await run(['scripts/build.mjs', '--mode=preview', '--out=' + b], env);
    assert.equal(r1.code, 0, r1.stderr);
    assert.equal(r2.code, 0, r2.stderr);
    const fa = await collect(a, a, new Map());
    const fb = await collect(b, b, new Map());
    assert.deepEqual([...fa.keys()].sort(), EXPECTED_ARTIFACTS);
    for (const key of fa.keys()) assert.ok(fa.get(key).equals(fb.get(key)), 'byte mismatch: ' + key);
    const html = fa.get('index.html').toString('utf8');
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'), 'preview must be noindex');
    assert.ok(!html.includes('rel="canonical"'), 'preview must not fabricate a canonical origin');
    assert.equal(fa.get('robots.txt').toString('utf8'), 'User-agent: *\nDisallow: /\n');
  } finally {
    await rm(a, { recursive: true, force: true });
    await rm(b, { recursive: true, force: true });
  }
});

test('production build refuses without an approved https origin and emits nothing', async () => {
  const out = await mkdtemp(path.join(os.tmpdir(), 'cssspec-prod-'));
  const target = path.join(out, 'would-be-dist');
  const env = { ...process.env };
  delete env.APPROVED_ORIGIN;
  try {
    const noOrigin = await run(['scripts/build.mjs', '--mode=production', '--out=' + target], env);
    assert.notEqual(noOrigin.code, 0);
    await assert.rejects(access(target), 'no artifacts may be emitted without an origin');
    const httpOrigin = await run(['scripts/build.mjs', '--mode=production', '--out=' + target, '--origin=http://example.com'], env);
    assert.notEqual(httpOrigin.code, 0);
    await assert.rejects(access(target));
    const pathOrigin = await run(['scripts/build.mjs', '--mode=production', '--out=' + target, '--origin=https://example.com/sub'], env);
    assert.notEqual(pathOrigin.code, 0);
    await assert.rejects(access(target));
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test('production build with an approved origin writes canonical/hreflang/sitemap', async () => {
  const out = await mkdtemp(path.join(os.tmpdir(), 'cssspec-prod-ok-'));
  try {
    const r = await run(['scripts/build.mjs', '--mode=production', '--out=' + out, '--origin=https://example.com'], { ...process.env });
    assert.equal(r.code, 0, r.stderr);
    const files = await collect(out, out, new Map());
    assert.deepEqual([...files.keys()].sort(), EXPECTED_ARTIFACTS);
    const zh = files.get('index.html').toString('utf8');
    const en = files.get('en/index.html').toString('utf8');
    assert.ok(zh.includes('<link rel="canonical" href="https://example.com/">'));
    assert.ok(en.includes('<link rel="canonical" href="https://example.com/en/">'));
    assert.ok(zh.includes('hreflang="en" href="https://example.com/en/"'));
    assert.ok(files.get('sitemap.xml').toString('utf8').includes('<loc>https://example.com/en/</loc>'));
    assert.ok(!zh.includes('noindex'), 'production must not be noindex');
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
