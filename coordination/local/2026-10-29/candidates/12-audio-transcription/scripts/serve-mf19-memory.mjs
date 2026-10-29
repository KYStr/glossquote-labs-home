// Prepared for the primary's reviewed isolated runner. Importing never starts a listener.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpath, readFile, writeFile, appendFile } from 'node:fs/promises';
import { createSpikeServer } from './serve-spike.mjs';
import { startServer, projectRoot, publicRoot, inside } from './serve.mjs';
import { verifyAssets } from './verify-assets.mjs';

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = new Map();
  for (const argument of process.argv.slice(2)) {
    const match = /^--(evidence|port)=([^\r\n]+)$/u.exec(argument);
    if (!match || options.has(match[1])) throw new Error('MF19_SERVER_ARGUMENT_INVALID');
    options.set(match[1], match[2]);
  }
  const owner = await realpath(path.resolve(projectRoot, '../../.runs/media-unblock-followup-2026-10-19/owner-12'));
  const runtime = await realpath(path.join(owner, 'runtime'));
  if (!options.has('evidence')) throw new Error('MF19_SERVER_EVIDENCE_REQUIRED');
  const evidence = await realpath(options.get('evidence'));
  if (!inside(owner, runtime) || !inside(runtime, evidence) || path.dirname(evidence) !== runtime || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/u.test(path.basename(evidence))) throw new Error('MF19_SERVER_EVIDENCE_INVALID');
  const port = Number(options.get('port') ?? 5192);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('MF19_SERVER_PORT_INVALID');
  await verifyAssets();
  const manifest = JSON.parse(await readFile(path.join(publicRoot, 'model-manifest.json'), 'utf8'));
  const fixtures = JSON.parse(await readFile(path.join(projectRoot, 'test/fixtures/generated/t02-v1/quality-speech.json'), 'utf8'));
  const mapping = [
    ...manifest.files.map((file, index) => ({ scopeCode: 1, ordinal: index + 1, path: file.path, expectedBytes: file.bytes })),
    { scopeCode: 2, ordinal: 1, path: '/model-manifest.json', expectedBytes: 65536 },
    { scopeCode: 2, ordinal: 2, path: '/fixtures/generated/t02-v1/quality-speech.json', expectedBytes: 65536 },
    ...fixtures.cases.map((item, index) => ({ scopeCode: 2, ordinal: index + 3, path: item.path, expectedBytes: item.bytes })),
  ].map((entry, index) => ({ pathOrdinal: index + 1, ...entry }));
  if (manifest.files.length !== 19 || fixtures.cases.length !== 13 || new Set(mapping.map(item => item.path)).size !== mapping.length) throw new Error('MF19_SERVER_MAPPING_INVALID');
  const audit = path.join(evidence, 'server-requests.jsonl');
  const diagnostics = path.join(evidence, 'server-diagnostics.jsonl');
  await writeFile(audit, '', { flag: 'wx' });
  await writeFile(diagnostics, '', { flag: 'wx' });
  await writeFile(path.join(evidence, 'server-read-ordinals.json'), JSON.stringify(mapping, null, 2) + '\n', { flag: 'wx' });
  let writes = Promise.resolve();
  const append = (file, record) => { writes = writes.then(() => appendFile(file, JSON.stringify(record) + '\n')); };
  const server = createSpikeServer({
    getFault: () => 'normal',
    onRequest: record => append(audit, record),
    diagnostics: { pathOrdinals: new Map(mapping.map(item => [item.path, item.pathOrdinal])), onRecord: record => append(diagnostics, record) },
  });
  const address = await startServer(server, port);
  await writeFile(path.join(evidence, 'server-startup.json'), JSON.stringify({ taskId: 'U19-12', milestone: 'MF19-12-M1', pid: process.pid, address: address.address, port: address.port, sourceRoot: projectRoot, originalRouteAndHeaders: true, faultMode: 'normal', diagnosticOptIn: true, audit, diagnostics, startedAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ taskId: 'U19-12', pid: process.pid, origin: `http://127.0.0.1:${address.port}` }));
}
