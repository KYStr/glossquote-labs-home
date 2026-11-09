// Restore fixed, unmodified development assets; this is not a release command.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {validateManifest} from '../public/js/core/manifest.mjs';

const PACKAGE_PLAN=new Map([['core','0.12.10'],['ffmpeg','0.12.15'],['types','0.12.4']]);
const LICENSE_PLAN=new Map([
 ['/vendor/ffmpeg/ffmpeg-0.12.15/LICENSE.MIT','https://raw.githubusercontent.com/ffmpegwasm/ffmpeg.wasm/71aa99d37c02a7b4c435275ca9ef50e612f6efa1/LICENSE'],
 ['/vendor/ffmpeg/core-0.12.10/LICENSE.GPL-2.0','https://raw.githubusercontent.com/FFmpeg/FFmpeg/4729204c17f756e186d622060088371d10b34f7e/COPYING.GPLv2'],
]);
const MAX_ARCHIVE=48*1024*1024, MAX_EXPANDED=80*1024*1024;
const hash=(b,alg='sha256',encoding='hex')=>createHash(alg).update(b).digest(encoding);
export function checkBytes(b,pin,label){
 if(b.length!==pin.bytes||hash(b)!==pin.sha256)throw Error('Pinned bytes/hash mismatch: '+label);
 return b;
}
function tarText(b,start,length){
 const field=b.subarray(start,start+length),end=field.indexOf(0);
 return field.subarray(0,end===-1?field.length:end).toString('utf8');
}
// This reads selected regular entries from already integrity-checked npm archives.
// It never extracts arbitrary archive paths to disk.
export function selectTarEntries(data,wanted){
 const found=new Map();
 for(let pos=0,count=0;pos+512<=data.length;){
  const h=data.subarray(pos,pos+512);
  if(h.every(b=>b===0))break;
  if(++count>8192)throw Error('Tar entry limit exceeded');
  const prefix=tarText(h,345,155),name=(prefix?prefix+'/':'')+tarText(h,0,100);
  const sizeText=tarText(h,124,12).trim(),start=pos+512;
  if(!/^[0-7]+$/.test(sizeText))throw Error('Invalid tar entry size');
  const size=parseInt(sizeText,8);
  if(!Number.isSafeInteger(size)||start+size>data.length)throw Error('Truncated tar entry');
  if(wanted.has(name)){
   if(h[156]!==0&&h[156]!==48)throw Error('Expected a regular archive entry: '+name);
   if(found.has(name))throw Error('Duplicate archive entry: '+name);
   found.set(name,data.subarray(start,start+size));
  }
  pos=start+Math.ceil(size/512)*512;
 }
 for(const name of wanted)if(!found.has(name))throw Error('Missing archive entry: '+name);
 return found;
}
async function download(url,bytes){
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(35000)});
 if(r.status!==200||!r.body)throw Error('Fixed source GET failed: '+url);
 const chunks=[];let seen=0;
 for await(const chunk of r.body){
  seen+=chunk.length;
  if(seen>bytes)throw Error('Fixed source exceeds pinned size: '+url);
  chunks.push(Buffer.from(chunk));
 }
 if(seen!==bytes)throw Error('Fixed source size differs: '+url);
 return Buffer.concat(chunks,seen);
}
async function statOrNone(file){
 try{return await fs.lstat(file);}catch(e){if(e.code==='ENOENT')return null;throw e;}
}
async function exactDirectory(dir){
 const stat=await fs.lstat(dir);
 if(stat.isSymbolicLink()||!stat.isDirectory()||await fs.realpath(dir)!==dir)throw Error('Unsafe directory: '+path.basename(dir));
}
async function exactFile(file,pin){
 const stat=await fs.lstat(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size!==pin.bytes||await fs.realpath(file)!==file)throw Error('Unsafe or unpinned file: '+path.basename(file));
 checkBytes(await fs.readFile(file),pin,path.basename(file));
}
function fileAt(publicDir,ref){
 if(!/^\/vendor\/ffmpeg\/(?:ffmpeg-0\.12\.15|core-0\.12\.10)\/[A-Za-z0-9._-]+$/.test(ref))throw Error('Unexpected asset destination');
 return path.join(publicDir,ref.slice(1));
}
async function pinsAt(root){
 const read=p=>fs.readFile(path.join(root,p));
 const pin=JSON.parse(await read('docs/RUNTIME-SUPPLY.json'));
 assert.equal(pin.schemaVersion,1);
 const lockBytes=await read('package-lock.json'), manifestBytes=await read('public/runtime-manifest.json');
 assert.equal(hash(lockBytes),pin.lockSha256,'Lock file changed');
 assert.equal(hash(manifestBytes),pin.manifestSha256,'Runtime manifest changed');
 const lock=JSON.parse(lockBytes),runtime=validateManifest(JSON.parse(manifestBytes));
 assert.equal(runtime.runtimeId,pin.runtimeId);assert.equal(runtime.totalBytes,pin.assetBytes);
 assert.equal(pin.packages.length,PACKAGE_PLAN.size);assert.equal(pin.licenses.length,LICENSE_PLAN.size);
 for(const [name,version] of PACKAGE_PLAN){
  const row=pin.packages.find(x=>x.name==='@ffmpeg/'+name);
  const l=lock.packages['node_modules/@ffmpeg/'+name];
  assert.equal(row.version,version);assert.equal(l.version,version);assert.equal(row.license,l.license);
  assert.equal(l.resolved,'https://registry.npmjs.org/@ffmpeg/'+name+'/-/'+name+'-'+version+'.tgz');
  assert.match(l.integrity,/^sha512-[A-Za-z0-9+/]{86}==$/);
  assert.ok(Number.isSafeInteger(row.archiveBytes)&&row.archiveBytes>0&&row.archiveBytes<=MAX_ARCHIVE);
  assert.match(row.archiveSha256,/^[a-f0-9]{64}$/);
 }
 for(const [p,url] of LICENSE_PLAN){
  const row=pin.licenses.find(x=>x.path===p);
  assert.equal(row.url,url);
  assert.ok(Number.isSafeInteger(row.bytes)&&row.bytes>0&&row.bytes<=65536);
  assert.match(row.sha256,/^[a-f0-9]{64}$/);
 }
 return {pin,lock,runtime,expected:[...runtime.files,...pin.licenses]};
}
async function collectBytes({pin,lock,runtime}){
 const assets=new Map();
 for(const [name,version] of PACKAGE_PLAN){
  const archive=pin.packages.find(x=>x.name==='@ffmpeg/'+name);
  const l=lock.packages['node_modules/@ffmpeg/'+name];
  const tgz=checkBytes(await download(l.resolved,archive.archiveBytes),{bytes:archive.archiveBytes,sha256:archive.archiveSha256},name);
  assert.equal('sha512-'+hash(tgz,'sha512','base64'),l.integrity,'npm lock integrity differs');
  const selected=runtime.files.filter(e=>e.path.includes('/'+name+'-'+version+'/'));
  const entries=new Map(selected.map(e=>['package/dist/esm/'+path.posix.basename(e.path),e]));
  const tar=selectTarEntries(gunzipSync(tgz,{maxOutputLength:MAX_EXPANDED}),new Set(['package/package.json',...entries.keys()]));
  const meta=JSON.parse(tar.get('package/package.json'));
  assert.equal(meta.name,archive.name);assert.equal(meta.version,version);assert.equal(meta.license,archive.license);
  for(const [p,e] of entries)assets.set(e.path,checkBytes(tar.get(p),e,e.path));
 }
 for(const e of pin.licenses)assets.set(e.path,checkBytes(await download(e.url,e.bytes),e,e.path));
 return assets;
}
async function main(args){
 if(args.length!==1||!['--fetch','--verify'].includes(args[0]))throw Error('Usage: node scripts/restore-pinned-runtime.mjs --fetch|--verify');
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 if(path.basename(root)!=='video-to-audio'||path.basename(path.dirname(root))!=='tools')throw Error('Use a central tools/video-to-audio working copy; do not stage into the historical product');
 await exactDirectory(root);
 const publicDir=path.join(root,'public'),vendor=path.join(publicDir,'vendor'),target=path.join(vendor,'ffmpeg');
 await exactDirectory(publicDir);
 const facts=await pinsAt(root);
 if(args[0]==='--fetch'){
  if(await statOrNone(target))throw Error('Runtime destination already exists; verify it or use a fresh copy. Nothing was overwritten.');
  const assets=await collectBytes(facts);
  assert.equal(assets.size,facts.expected.length);
  if(!(await statOrNone(vendor)))await fs.mkdir(vendor);
  await exactDirectory(vendor);
  // All bytes are verified before making the output tree. Existing files are never overwritten.
  await fs.mkdir(target);
  for(const name of ['core-0.12.10','ffmpeg-0.12.15'])await fs.mkdir(path.join(target,name));
  for(const [p,b] of assets){
   const dest=fileAt(publicDir,p);
   await exactDirectory(path.dirname(dest));
   await fs.writeFile(dest,b,{flag:'wx'});
  }
 }
 await exactDirectory(vendor);await exactDirectory(target);
 for(const pin of facts.expected){
  const file=fileAt(publicDir,pin.path);
  await exactDirectory(path.dirname(file));await exactFile(file,pin);
 }
 const actual=(await fs.readdir(target)).sort();
 assert.deepEqual(actual,['core-0.12.10','ffmpeg-0.12.15']);
 for(const folder of actual){
  const expected=facts.expected.filter(x=>path.posix.dirname(x.path).endsWith('/'+folder)).map(x=>path.posix.basename(x.path)).sort();
  assert.deepEqual((await fs.readdir(path.join(target,folder))).sort(),expected);
 }
 console.log(JSON.stringify({status:'PASS_PINNED_RUNTIME',mode:args[0],files:facts.expected.length,runtimeFiles:facts.runtime.files.length,runtimeBytes:facts.runtime.totalBytes,manifestUnchanged:true,executedPackageCode:false,distributionApproved:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main(process.argv.slice(2));
