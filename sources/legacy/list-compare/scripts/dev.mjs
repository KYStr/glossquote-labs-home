import path from 'node:path';
import { build } from './build.mjs';
import { ROOT } from './files.mjs';
import { makeServer, listenPreferred } from './server.mjs';

await build();
const server = await makeServer(path.join(ROOT, 'dist'));
const { address, fallback } = await listenPreferred(server);
console.log(JSON.stringify({ url: `http://127.0.0.1:${address.port}/index.html`, englishUrl: `http://127.0.0.1:${address.port}/en/index.html`, host: address.address, fallback, pid: process.pid, previewOnly: true }));
