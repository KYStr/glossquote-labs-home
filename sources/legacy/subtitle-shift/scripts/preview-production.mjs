import { fileURLToPath } from 'node:url';
import { createProductionServer } from './production-server.mjs';
import { productionHttpSmoke } from './production-http.mjs';
const root = fileURLToPath(new URL('../', import.meta.url)); let server;
try {
  if (process.argv.slice(2).some(arg => arg !== '--smoke')) throw new Error('INVALID_ARGUMENT');
  server = await createProductionServer(root);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(5216, '127.0.0.1', resolve); });
  if (process.argv.includes('--smoke')) {
    try { process.stdout.write(JSON.stringify(await productionHttpSmoke(root), null, 2) + '\n'); }
    finally { await new Promise(resolve => server.close(resolve)); }
  } else {
    process.stdout.write('Subtitle Shift production candidate: http://127.0.0.1:5216\n');
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { process.exitCode = 0; }));
  }
} catch (error) {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  process.stderr.write(error.code === 'EADDRINUSE' ? 'PORT_BUSY: existing process preserved\n' : `PRODUCTION_PREVIEW_FAILED: ${String(error.message).slice(0, 400)}\n`); process.exitCode = 1;
}
