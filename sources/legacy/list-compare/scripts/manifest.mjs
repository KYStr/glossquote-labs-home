import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, ASSETS, PUBLIC_ASSETS, fileRecords, sha256 } from './files.mjs';
import { sourceFiles } from './source-files.mjs';

export async function manifest() {
  const files = await sourceFiles();
  const codeFiles = files.filter(file=>file.startsWith('public/')||file.startsWith('scripts/')||file.startsWith('test/')||['package.json','.gitignore','wrangler.jsonc'].includes(file));
  const source = await fileRecords(ROOT, files);
  const code = await fileRecords(ROOT, codeFiles);
  const runtime = await fileRecords(path.join(ROOT, 'public'), ASSETS);
  const dist = await fileRecords(path.join(ROOT, 'dist'), ASSETS);
  const production = await fileRecords(path.join(ROOT, 'dist-production'), PUBLIC_ASSETS);
  const digest = records => sha256(Buffer.from(JSON.stringify(records)));
  return { format: 'sorted-path-bytes-sha256-v1', node: process.version, source, code, runtime, dist, production, digests: { source: digest(source), code: digest(code), runtime: digest(runtime), dist: digest(dist), production: digest(production) } };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await manifest(), null, 2));
