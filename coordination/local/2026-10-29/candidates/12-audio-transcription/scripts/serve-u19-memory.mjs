// Preparation only: the primary's isolated wrapper launches this reviewed CLI.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpath, writeFile, appendFile } from 'node:fs/promises';
import { createSpikeServer } from './serve-spike.mjs';
import { startServer, projectRoot, inside } from './serve.mjs';
import { verifyAssets } from './verify-assets.mjs';

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = new Map();
  for (const argument of process.argv.slice(2)) {
    const match = /^--(evidence|port)=([^\r\n]+)$/u.exec(argument);
    if (!match || options.has(match[1])) throw new Error('U19_SERVER_ARGUMENT_INVALID');
    options.set(match[1], match[2]);
  }
  const owner = await realpath(path.resolve(projectRoot, '../../.runs/unblock-2026-10-19/owner-12'));
  const evidence = await realpath(options.get('evidence') ?? path.join(owner, 'runtime'));
  if (!inside(owner, evidence) || evidence === owner) throw new Error('U19_SERVER_EVIDENCE_INVALID');
  const port = Number(options.get('port') ?? 5192);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('U19_SERVER_PORT_INVALID');
  await verifyAssets();
  const audit = path.join(evidence, 'server-requests.jsonl');
  await writeFile(audit, '', { flag: 'wx' });
  let writes = Promise.resolve();
  const server = createSpikeServer({ getFault: () => 'normal', onRequest: record => { writes = writes.then(() => appendFile(audit, JSON.stringify(record) + '\n')); } });
  const address = await startServer(server, port);
  await writeFile(path.join(evidence, 'server-startup.json'), JSON.stringify({ taskId: 'U19-12', pid: process.pid, address: address.address, port: address.port, sourceRoot: projectRoot, originalRouteAndHeaders: true, faultMode: 'normal', audit, startedAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ taskId: 'U19-12', pid: process.pid, origin: `http://127.0.0.1:${address.port}`, startup: path.join(evidence, 'server-startup.json') }));
}
