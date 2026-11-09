import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { root, listFiles } from './check.mjs';
// 程式快照不含會持續補證據的文件；未初始化 Git，也不建立遠端 repo。
const paths = ['.gitignore','package.json'];
for (const directory of ['public','scripts','test']) for (const path of await listFiles(resolve(root,directory))) paths.push(`${directory}/${path}`);
paths.sort();
const files = {};
for (const path of paths) files[path] = createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');
// 以「相對路徑 NUL SHA256 LF」串接後雜湊，避免順序與路徑歧義。
const codeSha256 = createHash('sha256').update(paths.map(path => `${path}\0${files[path]}\n`).join('')).digest('hex');
await mkdir(resolve(root,'evidence'),{recursive:true});
await writeFile(resolve(root,'evidence/source-manifest.json'),JSON.stringify({schemaVersion:1,algorithm:'SHA-256 of sorted relative-path + NUL + file-SHA256 + LF',codeSha256,files},null,2)+'\n');
console.log(`CODE SNAPSHOT SHA256 ${codeSha256} (${paths.length} files; not a Git commit)`);
