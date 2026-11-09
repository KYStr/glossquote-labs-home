// 另建受控測試產物，不把測試驅動程式混進預覽/正式站。
import { readFile, writeFile, copyFile, lstat, mkdir, rm } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { root, listFiles } from './files.mjs';
import { build } from './build.mjs';
const source = await build(), destination = resolve(root, 'test-product');
try { const info = await lstat(destination); if (info.isSymbolicLink() || !info.isDirectory()) throw Error('OUTPUT_REJECTED'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await rm(destination, { recursive: true, force: true }); await mkdir(destination);
for (const file of await listFiles(source)) { const target = resolve(destination, relative(source, file)); await mkdir(dirname(target), { recursive: true }); await copyFile(file, target); }
await copyFile(resolve(root, 'test/browser-tests.mjs'), resolve(destination, 'browser-tests.mjs'));
for (const path of ['index.html', 'en/index.html']) {
  const target = resolve(destination, path), base = path.startsWith('en/') ? '../' : './';
  const html = await readFile(target, 'utf8');
  await writeFile(target, html.replace('</body>', `<section class="panel"><h2>Browser fixture runner — synthetic data only</h2><button type="button" id="run-browser-tests">Run browser fixtures</button><pre id="browser-test-log" role="status"></pre></section><script type="module" src="${base}browser-tests.mjs"></script></body>`));
}
console.log(`FIXTURES READY: ${destination}; no browser tests have run merely by preparing these files.`);
