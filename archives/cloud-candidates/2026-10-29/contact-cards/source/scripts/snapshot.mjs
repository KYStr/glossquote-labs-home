// 可重現源碼摘要，不含 dist 或會自我參照的文件／驗收紀錄。
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { snapshotTree } from './files.mjs';
const root = new URL('../',import.meta.url); const files = {};
const digest = value => createHash('sha256').update(value).digest('hex');
for (const [name,bytes] of await snapshotTree(new URL('public/',root))) files[`public/${name}`] = digest(bytes);
for (const folder of ['scripts/','test/']) for (const name of (await readdir(new URL(folder,root))).sort()) if (name.endsWith('.mjs')) files[folder+name] = digest(await readFile(new URL(folder+name,root)));
files['package.json'] = digest(await readFile(new URL('package.json',root)));
const sorted = Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b,'en')));
const codeSha256 = digest(Object.entries(sorted).map(([name,sha])=>`${name}\0${sha}\n`).join(''));
await writeFile(new URL('evidence/source-manifest.json',root),JSON.stringify({schemaVersion:1,algorithm:'SHA-256 of sorted relative-path + NUL + file-SHA256 + LF',codeSha256,files:sorted},null,2)+'\n');
console.log(`SOURCE SHA256 ${codeSha256}`);
