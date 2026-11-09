import { mkdir, copyFile, rm, lstat, realpath, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, checkProject } from './check.mjs';
import {releaseOptions,releaseHTML,releaseHeaders,robots,sitemap} from './release.mjs';
import {verifyBuild} from './verify-build.mjs';

const options = releaseOptions(process.argv.slice(2));
const files = await checkProject();
const realRoot = await realpath(root);
const output = path.resolve(realRoot, 'dist');
if (path.relative(realRoot, output) !== 'dist') throw new Error('Unsafe build target');
let existing;
try { existing = await lstat(output); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (existing?.isSymbolicLink() || (existing && !existing.isDirectory())) throw new Error('Unsafe build target');
await rm(output, { recursive: true, force: true });
await mkdir(output);
for (const file of files) {
  const destination = path.join(output, path.relative(path.join(root, 'public'), file));
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(file, destination);
}
if (options.release) {
  for (const file of ['index.html','en/index.html']) {
    const target=path.join(output,file);
    await writeFile(target,releaseHTML(await readFile(target,'utf8'),file,options.origin));
  }
  const headers=path.join(output,'_headers');
  await writeFile(headers,releaseHeaders(await readFile(headers,'utf8')));
  await writeFile(path.join(output,'sitemap.xml'),sitemap());
}
await writeFile(path.join(output,'robots.txt'),robots(options.release));
await verifyBuild(options,output);
console.log(`BUILD_PASS ${options.release?'release candidate (not deployed)':'preview noindex'}; ${files.length} allowlisted assets plus generated SEO`);
