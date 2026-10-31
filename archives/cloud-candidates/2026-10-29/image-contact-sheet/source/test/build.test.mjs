import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, writeFile, readFile, rm, link, symlink, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { root, assets, listFiles } from '../scripts/check.mjs';
import { createHandler } from '../scripts/serve.mjs';
// 所有負面破壞測試在獨立暫存副本進行，不碰候選或使用者檔案。
async function copyProject() { const scratch=await mkdtemp(resolve(tmpdir(),'contact-sheet-gate-'));const checkout=resolve(scratch,'project');await cp(root,checkout,{recursive:true,filter:path=>!/(^|\/)(dist|evidence|\.git)(\/|$)/.test(path)});return {scratch,checkout}; }
function command(checkout,script){return spawnSync(process.execPath,[`scripts/${script}.mjs`],{cwd:checkout,encoding:'utf8'});}
test('build is reproducible, closed allowlist and hashes match exact preview bytes',async()=>{
  const {scratch,checkout}=await copyProject();try{
    let run=command(checkout,'build');assert.equal(run.status,0,run.stderr);
    const first=await readFile(resolve(checkout,'dist/build-manifest.json'),'utf8');
    run=command(checkout,'build');assert.equal(run.status,0,run.stderr);assert.equal(await readFile(resolve(checkout,'dist/build-manifest.json'),'utf8'),first);
    const manifest=JSON.parse(first);assert.equal(manifest.mode,'preview-noindex');assert.deepEqual(Object.keys(manifest.files),assets);
    for(const path of assets){const source=await readFile(resolve(checkout,'public',path));assert.deepEqual(await readFile(resolve(checkout,'dist',path)),source);assert.equal(manifest.files[path],createHash('sha256').update(source).digest('hex'));}
  }finally{await rm(scratch,{recursive:true,force:true});}
});
test('check rejects unknown public files and modified static language copy',async()=>{
  const {scratch,checkout}=await copyProject();try{
    await writeFile(resolve(checkout,'public/secret.txt'),'synthetic-only');let run=command(checkout,'check');assert.notEqual(run.status,0);assert.match(run.stderr,/PUBLIC_ALLOWLIST/);
    await rm(resolve(checkout,'public/secret.txt'));await writeFile(resolve(checkout,'public/index.html'),'wrong');run=command(checkout,'check');assert.notEqual(run.status,0);assert.match(run.stderr,/STATIC_PAGE_OUT_OF_DATE/);
  }finally{await rm(scratch,{recursive:true,force:true});}
});
test('build rejects stale unknown output without deleting it',async()=>{
  const {scratch,checkout}=await copyProject();try{await mkdir(resolve(checkout,'dist'));await writeFile(resolve(checkout,'dist/keep.txt'),'keep');const run=command(checkout,'build');assert.notEqual(run.status,0);assert.match(run.stderr,/UNKNOWN_OUTPUT_REJECTED/);assert.equal(await readFile(resolve(checkout,'dist/keep.txt'),'utf8'),'keep');}finally{await rm(scratch,{recursive:true,force:true});}
});
test('source hardlink and symlink gates reject external aliases',async()=>{
  const {scratch,checkout}=await copyProject();try{
    await link(resolve(checkout,'public/js/core.mjs'),resolve(scratch,'shared-core'));let run=command(checkout,'check');assert.notEqual(run.status,0);assert.match(run.stderr,/HARDLINK_REJECTED/);
    await rm(resolve(scratch,'shared-core'));await symlink(resolve(checkout,'public/js/core.mjs'),resolve(checkout,'public/alias'));run=command(checkout,'check');assert.notEqual(run.status,0);assert.match(run.stderr,/SYMLINK_REJECTED/);
  }finally{await rm(scratch,{recursive:true,force:true});}
});
test('dist hardlink rejection does not overwrite the linked external evidence',async()=>{
  const {scratch,checkout}=await copyProject();try{
    const run=command(checkout,'build');assert.equal(run.status,0,run.stderr);const target=resolve(checkout,'dist/index.html');await rm(target);await writeFile(resolve(scratch,'external'),'do not change');await link(resolve(scratch,'external'),target);
    const blocked=command(checkout,'build');assert.notEqual(blocked.status,0);assert.match(blocked.stderr,/HARDLINK_REJECTED/);assert.equal(await readFile(resolve(scratch,'external'),'utf8'),'do not change');
  }finally{await rm(scratch,{recursive:true,force:true});}
});
test('file walker rejects symlinked directories too',async()=>{
  const scratch=await mkdtemp(resolve(tmpdir(),'contact-walker-'));try{await mkdir(resolve(scratch,'one'));await mkdir(resolve(scratch,'two'));await symlink(resolve(scratch,'two'),resolve(scratch,'one/link'));await assert.rejects(()=>listFiles(resolve(scratch,'one')),/SYMLINK_REJECTED/);}finally{await rm(scratch,{recursive:true,force:true});}
});
// 下列是直接呼叫真handler的控制測試；不是實際HTTP/server部署驗證。
test('HTTP handler allowlist, Host, methods, redirects, MIME, HEAD and headers without binding a server',async()=>{
  const handler=createHandler(resolve(root,'public'),()=>4238);
  async function request(url,method='GET',host='127.0.0.1:4238'){
    let status,headers,body;await handler({url,method,headers:{host}},{writeHead(code,values){status=code;headers=values;},end(bytes){body=bytes;}});return {status,headers,body};
  }
  for(const path of ['/index.html','/en/index.html']){const res=await request(path);assert.equal(res.status,200);assert.match(res.headers['Content-Type'],/^text\/html/);assert.equal(res.headers['X-Robots-Tag'],'noindex, nofollow');assert.match(res.headers['Content-Security-Policy'],/connect-src 'none'/);assert.match(String(res.body),/noindex,nofollow/);}
  assert.match((await request('/js/core.mjs')).headers['Content-Type'],/^text\/javascript/);
  assert.equal((await request('/')).headers.Location,'/index.html');assert.equal((await request('/en/')).headers.Location,'/en/index.html');
  for(const path of ['/../package.json','/%2e%2e/package.json','//index.html','/index.html?q=x','/_headers','/build-manifest.json','/absent'])assert.equal((await request(path)).status,404,path);
  assert.equal((await request('/index.html','POST')).status,405);assert.equal((await request('/index.html','GET','evil.example')).status,403);
  const head=await request('/index.html','HEAD');assert.equal(head.status,200);assert.equal(head.body,undefined);
});
test('HTTP handler refuses file aliases rather than serving outside bytes',async()=>{
  const scratch=await mkdtemp(resolve(tmpdir(),'contact-handler-'));try{await writeFile(resolve(scratch,'outside'),'not public');await mkdir(resolve(scratch,'dist'));await link(resolve(scratch,'outside'),resolve(scratch,'dist/index.html'));const handler=createHandler(resolve(scratch,'dist'),()=>1);let code,body;await handler({url:'/index.html',method:'GET',headers:{host:'127.0.0.1:1'}},{writeHead(status){code=status;},end(bytes){body=bytes;}});assert.equal(code,500);assert.equal(body,'Build unavailable');}finally{await rm(scratch,{recursive:true,force:true});}
});
