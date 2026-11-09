import { fileURLToPath } from 'node:url';
import { createPreviewServer } from './server.mjs';
import { runHttpSmoke } from './http-smoke.mjs';
import { validateSource, validateExistingBuild } from './validate.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('../dist/', import.meta.url));
let server;
try {
  if (process.argv.slice(2).some(arg => arg !== '--smoke')) throw new Error('INVALID_ARGUMENT');
  await validateSource(root);
  if (!await validateExistingBuild(root)) throw new Error('BUILD_REQUIRED');
  server = await createPreviewServer(output);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(4216, '127.0.0.1', resolve); });
  if (process.argv.includes('--smoke')) {
    try { process.stdout.write(JSON.stringify(await runHttpSmoke(output), null, 2) + '\n'); }
    finally { await new Promise(resolve => server.close(resolve)); }
  } else {
    process.stdout.write('Subtitle Shift preview: http://127.0.0.1:4216\n');
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { process.exitCode = 0; }));
  }
} catch (error) {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  process.stderr.write(error.code === 'EADDRINUSE' ? 'PORT_BUSY: existing process preserved\n' : 'PREVIEW_FAILED\n');
  process.exitCode = 1;
}
