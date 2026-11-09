import { readFile, readdir, lstat, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, PUBLIC_FILES, inspectTree } from './assets.mjs';
import { createStoredZip } from '../public/js/core/zip-store.js';
import { createIndex, serializeIndex } from '../public/js/core/index-schema.js';

// Fixed, synthetic fixtures only. No selected user files or environment values are read.
const evidence=join(ROOT,'evidence','m1');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function list(relative) {
  const results=[];
  for(const entry of await readdir(join(ROOT,relative),{withFileTypes:true})) {
    const path=`${relative}/${entry.name}`;
    const info=await lstat(join(ROOT,path));
    if(info.isSymbolicLink())throw new Error('UNSAFE_SOURCE_LINK');
    if(info.isDirectory())results.push(...await list(path));
    else if(info.isFile())results.push(path);
    else throw new Error('UNSAFE_SOURCE');
  }
  return results;
}
const specifications=['START-HERE.md','AGENTS.md','README.md','PRODUCT.md','TECHNICAL.md','UX-SEO.md','ACCEPTANCE.md','TASKS.md',...await list('docs')].sort();
const sourcePaths=['package.json','.gitignore',...await list('public'),...await list('scripts'),...await list('test'),...specifications].sort();
const files=[];
for(const path of sourcePaths) {
  const bytes=await readFile(join(ROOT,path));
  files.push({path,bytes:bytes.length,sha256:digest(bytes)});
}
const sourceSha256=digest(files.map(file=>`${file.path}\t${file.bytes}\t${file.sha256}\n`).join(''));
const dist=await inspectTree(join(ROOT,'dist'));
if(JSON.stringify(dist)!==JSON.stringify([...PUBLIC_FILES].sort()))throw new Error('DIST_TREE_MISMATCH');
const built=[];
for(const path of dist) {
  const bytes=await readFile(join(ROOT,'dist',path));
  const source=await readFile(join(ROOT,'public',path));
  if(!bytes.equals(source))throw new Error('DIST_BYTES_MISMATCH');
  built.push({path:`dist/${path}`,bytes:bytes.length,sha256:digest(bytes)});
}
await mkdir(evidence,{recursive:true});
await writeFile(join(evidence,'source-manifest.json'),JSON.stringify({schemaVersion:1,algorithm:'sha256-lines-v1',sourceSha256,scope:'package.json, .gitignore, public/**, scripts/**, test/** and 13 read-only specification/docs files; excludes mutable HANDOFF, TASK-ENTRY, dist and evidence',files,dist:built},null,2)+'\n');
const fixtureMetadata=[];
for(const [name,limit,entries] of [
  ['single-x',150,[{name:'a.txt',bytes:Uint8Array.of(0x78)}]],
  ['empty-a',100,[{name:'a',bytes:new Uint8Array()}]],
  ['pair-180',180,[{name:'a',bytes:Uint8Array.of(1)},{name:'b',bytes:Uint8Array.of(2)}]]
]) {
  const archive=await createStoredZip(entries);
  const packages=[{fileName:'bundle-001.zip',sizeBytes:archive.sizeBytes,entries:archive.entries.map((entry,sourceIndex)=>({sourceIndex,...entry}))}];
  const index=createIndex({packageLimitBytes:limit,packages});
  const directory=join(evidence,'fixtures',name);
  await mkdir(directory,{recursive:true});
  for(const [fileName,bytes] of [['bundle-001.zip',new Uint8Array(await archive.blob.arrayBuffer())],['bundle-index.json',new TextEncoder().encode(serializeIndex(index))]]) {
    await writeFile(join(directory,fileName),bytes);
    fixtureMetadata.push({path:`fixtures/${name}/${fileName}`,bytes:bytes.length,sha256:digest(bytes),input:'synthetic memory bytes only'});
  }
}
await writeFile(join(evidence,'fixture-manifest.json'),JSON.stringify(fixtureMetadata,null,2)+'\n');
process.stdout.write(`FIXED SOURCE ${sourceSha256}\n${files.length} source/spec files; ${built.length} dist files; ${fixtureMetadata.length} synthetic evidence files.\n`);
