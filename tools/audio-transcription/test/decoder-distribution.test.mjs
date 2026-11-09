import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { AssetLoader } from '../public/js/asset-loader.mjs';
import { DECODER_DISTRIBUTION, DECODER_PATH, MAX_STATIC_ASSET_BYTES } from '../public/js/core/decoder-distribution.mjs';
import { parseManifest, validateSelectedManifest } from '../public/js/core/manifest.mjs';
import { build } from '../scripts/build.mjs';
import { walk } from '../scripts/check.mjs';
import { createSpikeServer } from '../scripts/serve-spike.mjs';
import { root, verifyAssets } from '../scripts/verify-assets.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const expectedDecoderHash = 'a6beb6baabb66f00b6a686d828c95ffca6146d51900cbad0266cad38f64cf861';
const expectedSourceManifestHash = '0eec37ebd321925e4c75332e6e7987fd36a8bd29260fe9fd9ed761eb6fd3edc0';
const sourceManifestPath = path.join(root, 'public', 'model-manifest.json');
const fixtureManifest = async () => {
  const source = JSON.parse(await readFile(sourceManifestPath, 'utf8'));
  return {
    ...source,
    files: source.files.map(file => file.path === DECODER_PATH ? file : { ...file, bytes: 2, sha256: sha('{}') }),
    decoderDistribution: structuredClone(DECODER_DISTRIBUTION),
  };
};

test('the chunk manifest rejects alternate paths, extent, hashes and fallback plans before any fetch', async () => {
  const valid = validateSelectedManifest(await fixtureManifest());
  assert(Object.isFrozen(valid.decoderDistribution.parts[0]));
  const changes = [
    value => { value.decoderDistribution.extra = true; },
    value => { value.decoderDistribution.logicalPath += '?other'; },
    value => { value.decoderDistribution.version = 2; },
    value => { value.decoderDistribution.parts.reverse(); },
    value => { value.decoderDistribution.parts.pop(); },
    value => { value.decoderDistribution.parts[0].path = 'https://example.invalid/decoder.bin'; },
    value => { value.decoderDistribution.parts[1].path = value.decoderDistribution.parts[0].path; },
    value => { value.decoderDistribution.parts[1].offset -= 1; },
    value => { value.decoderDistribution.parts[0].bytes = MAX_STATIC_ASSET_BYTES + 1; },
    value => { value.decoderDistribution.parts[1].sha256 = 'a'.repeat(64); },
    value => { value.files.find(file => file.path === DECODER_PATH).sha256 = 'b'.repeat(64); },
  ];
  let requests = 0;
  const loader = new AssetLoader({ origin: 'http://127.0.0.1', fetchImpl: async () => { requests += 1; } });
  for (const change of changes) {
    const manifest = await fixtureManifest();
    change(manifest);
    await assert.rejects(loader.load(manifest), /MANIFEST_INVALID/u);
  }
  assert.equal(requests, 0);
});

test('chunk fetch rejects missing, redirected, wrong-type, corrupt, short and oversized bodies and aborts', async () => {
  const part = DECODER_DISTRIBUTION.parts[0];
  const nativePath = path.join(root, 'public', DECODER_PATH.slice(1));
  const source = (await readFile(nativePath)).subarray(0, part.bytes);
  const first = Buffer.from(source);
  first[0] ^= 1;
  const stream = data => new ReadableStream({ start(controller) { controller.enqueue(data); controller.close(); } });
  const binary = { 'content-type': 'application/octet-stream' };
  const cases = [
    ['MODEL_LOAD_FAILED', () => new Response(null, { status: 404 })],
    ['MODEL_LOAD_FAILED', () => new Response(null, { status: 302, headers: { location: 'https://example.invalid/' } })],
    ['MODEL_LOAD_FAILED', () => new Response(stream(source), { headers: { 'content-type': 'text/html' } })],
    ['ASSET_INTEGRITY_FAILED', () => new Response(stream(first), { headers: binary })],
    ['ASSET_INTEGRITY_FAILED', () => new Response(stream(source.subarray(1)), { headers: binary })],
    ['ASSET_INTEGRITY_FAILED', () => new Response(stream(new Uint8Array(part.bytes + 1)), { headers: binary })],
    ['ASSET_INTEGRITY_FAILED', () => new Response(stream(source), { headers: { ...binary, 'content-length': '1' } })],
    ['MODEL_LOAD_FAILED', () => new Response(stream(source), { headers: binary }), true],
  ];
  for (const [error, reply, abort] of cases) {
    const controller = new AbortController();
    const requested = [];
    let activePart = false;
    const loader = new AssetLoader({ origin: 'http://127.0.0.1', fetchImpl: async url => {
      const pathname = new URL(url).pathname;
      requested.push(pathname);
      if (pathname === part.path) { activePart = true; return reply(); }
      return new Response('{}');
    } });
    await assert.rejects(loader.load(await fixtureManifest(), { signal: controller.signal, onProgress() {
      if (abort && activePart) controller.abort();
    } }), { message: error });
    assert.equal(requested.at(-1), part.path);
    assert(!requested.includes(DECODER_PATH));
    assert.equal(loader.verified.size, 0);
    await assert.rejects(loader.fetch(DECODER_PATH), /ASSET_REQUEST_BLOCKED/u);
  }
});

test('built transport serves exactly three chunks; the real decoder reaches only the logical in-memory route', async t => {
  const totalFiles = await build();
  const dist = path.join(root, 'dist');
  const files = await walk(dist);
  assert.equal(files.length, totalFiles);
  for (const file of files) assert((await stat(file)).size <= MAX_STATIC_ASSET_BYTES, file);
  const verified = await verifyAssets(dist, undefined, { requireDistribution: true });
  assert.equal(verified.files, 19);
  assert.equal(verified.physicalFiles, 21);
  assert.equal(verified.bytes, 102581371);
  assert.equal(sha(await readFile(sourceManifestPath)), expectedSourceManifestHash);

  const server = createSpikeServer({ distribution: true });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = 'http://127.0.0.1:' + server.address().port;
  assert.equal((await fetch(origin + DECODER_PATH, { method: 'HEAD' })).status, 404);
  const unavailable = await fetch(origin + DECODER_PATH);
  assert.equal(unavailable.status, 404);
  await unavailable.body.cancel();
  for (const part of DECODER_DISTRIBUTION.parts) {
    const head = await fetch(origin + part.path, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-type'), 'application/octet-stream');
    assert.equal(Number(head.headers.get('content-length')), part.bytes);
  }
  const request = await fetch(origin + '/model-manifest.json');
  assert.equal(request.status, 200);
  const manifest = parseManifest(await request.text());
  const network = [];
  const loader = new AssetLoader({ origin, fetchImpl: (url, options) => {
    assert.equal(new URL(url).origin, origin);
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    network.push(new URL(url).pathname);
    return fetch(url, options);
  } });
  let prior = 0;
  const timing = await loader.load(manifest, { onProgress({ loaded, total }) {
    assert(loaded > prior && loaded <= total);
    prior = loaded;
  } });
  assert.equal(prior, verified.bytes);
  assert.equal(timing.loadedBytes, verified.bytes);
  assert.equal(network.length, verified.physicalFiles);
  assert.deepEqual(network.filter(requestPath => requestPath.startsWith(DECODER_PATH)), DECODER_DISTRIBUTION.parts.map(part => part.path));
  assert.equal(sha(loader.getVerifiedBytes(DECODER_PATH)), expectedDecoderHash);
  const response = await loader.fetch(DECODER_PATH);
  assert.equal(response.headers.get('content-type'), 'application/octet-stream');
  assert.equal(sha(Buffer.from(await response.arrayBuffer())), expectedDecoderHash);
  assert.equal(loader.audit().reads[DECODER_PATH], 1);
  await assert.rejects(loader.fetch(DECODER_DISTRIBUTION.parts[0].path), /ASSET_REQUEST_BLOCKED/u);
});
