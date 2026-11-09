import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { allowedDownloadUrl, downloadPinned, pinnedSources } from '../scripts/stage-model.mjs';
import { root, verifyAssets } from '../scripts/verify-assets.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const source = { url: 'https://huggingface.co/Test/model/resolve/' + 'a'.repeat(40) + '/config.json', bytes: 2, sha256: sha('{}') };

test('stage retrieval verifies fixed bytes and digest and uses a credential-free GET', async () => {
  let calls = 0;
  const buffer = await downloadPinned(source, async (url, options) => {
    calls += 1;
    assert.equal(url, source.url);
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.cache, 'no-store');
    return new Response('{}', { headers: { 'content-length': '2' } });
  });
  assert.equal(buffer.toString(), '{}');
  assert.equal(calls, 1);
  assert.equal((await downloadPinned(source, async () => new Response('{}', { headers: { 'content-length': '1', 'content-encoding': 'gzip' } }))).toString(), '{}');
  await assert.rejects(downloadPinned(source, async () => new Response('{x', { headers: { 'content-length': '2' } })), /SOURCE_INTEGRITY_FAILED/u);
  await assert.rejects(downloadPinned(source, async () => new Response('{}x')), /SOURCE_SIZE_MISMATCH/u);
  await assert.rejects(downloadPinned(source, async () => new Response('', { status: 404 })), /PUBLIC_SOURCE_UNAVAILABLE/u);
});

test('rejects unapproved redirect destinations without retrieving them', async () => {
  let calls = 0;
  await assert.rejects(downloadPinned(source, async () => {
    calls += 1;
    return new Response(null, { status: 302, headers: { location: 'https://example.invalid/leak' } });
  }), /UNAPPROVED_SOURCE_HOST/u);
  assert.equal(calls, 1);
  assert.equal(allowedDownloadUrl('https://huggingface.co.evil.invalid/model'), false);
  assert.equal(allowedDownloadUrl('https://token@huggingface.co/model'), false);
  assert.equal(allowedDownloadUrl('http://huggingface.co/model'), false);
  assert(pinnedSources.every(item => Number.isSafeInteger(item.bytes) && item.bytes > 0 && /^[a-f\d]{64}$/u.test(item.sha256)));
});

test('offline staged-tree verification detects corruption, missing and unlisted files', async () => {
  const temporary = path.join(root, 'test', '.tmp');
  await mkdir(temporary, { recursive: true });
  const directory = await mkdtemp(path.join(temporary, 'staging-'));
  const revision = 'a'.repeat(40);
  const assetPath = `/models/whisper-base/${revision}/config.json`;
  const target = path.join(directory, assetPath.slice(1));
  const manifest = { schemaVersion: 1, modelId: 'Test/whisper-base', revision, runtimeVersion: '3.8.1', dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' }, files: [{ path: assetPath, bytes: 2, sha256: sha('{}'), mime: 'application/json' }] };
  const expected = { modelId: manifest.modelId, revision };
  try {
    await mkdir(path.dirname(target), { recursive: true });
    await mkdir(path.join(directory, 'vendor'));
    await writeFile(target, '{}');
    await writeFile(path.join(directory, 'model-manifest.json'), JSON.stringify(manifest));
    assert.equal((await verifyAssets(directory, expected)).bytes, 2);
    await writeFile(target, '{x');
    await assert.rejects(verifyAssets(directory, expected), /ASSET_INTEGRITY_FAILED/u);
    await writeFile(target, '{}');
    await writeFile(path.join(directory, 'vendor', 'extra.txt'), 'unlisted');
    await assert.rejects(verifyAssets(directory, expected), /UNLISTED_PUBLIC_ASSET/u);
    await rm(path.join(directory, 'vendor', 'extra.txt'));
    await rm(target);
    await assert.rejects(verifyAssets(directory, expected), { code: 'ENOENT' });
  } finally {
    const relative = path.relative(temporary, directory);
    assert(relative.startsWith('staging-') && !relative.includes(path.sep));
    await rm(directory, { recursive: true });
  }
});
