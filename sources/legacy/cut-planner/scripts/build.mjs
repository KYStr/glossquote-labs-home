import { mkdir, lstat, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { check } from './check.mjs';
import { ROOT,DIST,OUTPUT,HEADERS_TEXT,inspectTree,contained,manifest } from './assets.mjs';
export async function build(){
  const files=await check();
  if(path.resolve(DIST)!==path.join(ROOT,'dist'))throw Error('unsafe build destination');
  try{await inspectTree(DIST,OUTPUT,false);}catch(e){if(e.code!=='ENOENT')throw e;try{await lstat(DIST);throw Error('incomplete unsafe build tree');}catch(missing){if(missing.code!=='ENOENT')throw missing;}}
  await mkdir(DIST,{recursive:true});
  const out=new Map(files);out.set('_headers',Buffer.from(HEADERS_TEXT));out.set('asset-manifest.json',Buffer.from(JSON.stringify(manifest(out),null,2)+'\n'));
  for(const [name,bytes]of out){const absolute=contained(DIST,name);await mkdir(path.dirname(absolute),{recursive:true});await writeFile(absolute,bytes);}
  return out;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const out=await build();console.log(`PASS preview build: ${out.size} files; dist/ remains noindex,nofollow`);}
