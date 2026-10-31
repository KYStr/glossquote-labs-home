// 所有破壞性負例只操作本測試精確建立的暫存副本，絕不改真candidate。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, readFile, writeFile, rm, rename, symlink, link, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { PUBLIC_FILES, SOURCE_FILES } from '../scripts/files.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
async function fixture(){const owner=await mkdtemp(join(tmpdir(),'flashcards-test-'));const dir=join(owner,'project');await mkdir(dir);for(const path of SOURCE_FILES){await mkdir(dirname(join(dir,path)),{recursive:true});await copyFile(join(root,path),join(dir,path));}return dir;}
function run(dir,script='build',args=[]){return spawnSync(process.execPath,[`scripts/${script}.mjs`,...args],{cwd:dir,encoding:'utf8',timeout:20_000});}
function pass(result){assert.equal(result.status,0,result.stderr||result.stdout);}
function fail(result){assert.notEqual(result.status,0,result.stdout);}
async function bytes(dir,prefix='dist'){return Promise.all(PUBLIC_FILES.map(async path=>[path,(await readFile(join(dir,prefix,path))).toString('base64')]));}
async function owned(fn){const dir=await fixture();try{await fn(dir);}finally{await rm(dirname(dir),{recursive:true,force:true});}}

test('check與build通過：8個public字節相同，重建可重現、不啟動server',async()=>owned(async dir=>{
 pass(run(dir,'check'));pass(run(dir));assert.deepEqual(await bytes(dir),await bytes(dir,'public'));const before=await bytes(dir);pass(run(dir));assert.deepEqual(await bytes(dir),before);pass(run(dir,'check'));assert.equal((await readdir(dir)).filter(name=>name.startsWith('.build-')).length,0);
}));
test('build/check拒絕production、site-url與未知旗標',async()=>owned(async dir=>{
 for(const script of ['build','check'])for(const flag of ['--production','--site-url=https://fake.example/','--unknown'])fail(run(dir,script,[flag]));assert.equal((await readdir(dir)).includes('dist'),false);
}));
test('來源未知檔與未知目錄均拒絕，不改既有dist',async()=>owned(async dir=>{
 pass(run(dir));const before=await bytes(dir);await writeFile(join(dir,'unknown.txt'),'sentinel');fail(run(dir));fail(run(dir,'check'));assert.equal(await readFile(join(dir,'unknown.txt'),'utf8'),'sentinel');assert.deepEqual(await bytes(dir),before);
 await rm(join(dir,'unknown.txt'));await mkdir(join(dir,'unknown'));fail(run(dir));assert.deepEqual(await bytes(dir),before);
}));
test('public未知檔含URL特殊字元不會靜默忽略或解碼',async()=>owned(async dir=>{
 pass(run(dir));const before=await bytes(dir);for(const name of ['unknown.txt','%2e%2e','a#b','a?b']){await writeFile(join(dir,'public',name),'sentinel');fail(run(dir));assert.equal(await readFile(join(dir,'public',name),'utf8'),'sentinel');assert.deepEqual(await bytes(dir),before);await rm(join(dir,'public',name));}
}));
test('public缺檔拒絕且保留既有dist',async()=>owned(async dir=>{
 pass(run(dir));const before=await bytes(dir);await rm(join(dir,'public/index.html'));fail(run(dir));assert.deepEqual(await bytes(dir),before);
}));
test('未知dist檔保留sentinel與所有已知byte；不rm未知輸出',async()=>owned(async dir=>{
 pass(run(dir));const before=await bytes(dir);await writeFile(join(dir,'dist/unknown.txt'),'DO_NOT_DELETE');fail(run(dir));fail(run(dir,'check'));assert.equal(await readFile(join(dir,'dist/unknown.txt'),'utf8'),'DO_NOT_DELETE');assert.deepEqual(await bytes(dir),before);
}));
test('未知dist空目錄也拒絕且保留',async()=>owned(async dir=>{
 pass(run(dir));await mkdir(join(dir,'dist/unknown'));fail(run(dir));assert((await readdir(join(dir,'dist'))).includes('unknown'));
}));
test('不完整既有dist拒絕，不以缺檔當不存在而覆寫',async()=>owned(async dir=>{
 await mkdir(join(dir,'dist'));await writeFile(join(dir,'dist/index.html'),'KEEP');fail(run(dir));assert.equal(await readFile(join(dir,'dist/index.html'),'utf8'),'KEEP');
}));
for(const location of ['public/index.html','dist/index.html'])test(`${location} symlink拒絕且target未改`,async()=>owned(async dir=>{
 pass(run(dir));const target=join(dir,'../outside.txt');await writeFile(target,'KEEP');await rm(join(dir,location));await symlink(target,join(dir,location));fail(run(dir));fail(run(dir,'check'));assert.equal(await readFile(target,'utf8'),'KEEP');
}));
for(const location of ['public/index.html','dist/index.html'])test(`${location} hardlink拒絕且target未改`,async()=>owned(async dir=>{
 pass(run(dir));const target=join(dir,'../outside.txt');await writeFile(target,'KEEP');await rm(join(dir,location));await link(target,join(dir,location));fail(run(dir));fail(run(dir,'check'));assert.equal(await readFile(target,'utf8'),'KEEP');
}));
for(const location of ['public/en','dist/en'])test(`${location} symlink目錄拒絕`,async()=>owned(async dir=>{
 pass(run(dir));const target=join(dir,'../saved-en');await rename(join(dir,location),target);await symlink(target,join(dir,location));fail(run(dir));assert.equal((await readFile(join(target,'index.html'),'utf8')).includes('<html lang="en">'),true);
}));
test('dist根symlink拒絕，不動原輸出',async()=>owned(async dir=>{
 pass(run(dir));const before=await bytes(dir);await rename(join(dir,'dist'),join(dir,'../saved-dist'));await symlink(join(dir,'../saved-dist'),join(dir,'dist'));fail(run(dir));assert.deepEqual(await bytes(dir,'../saved-dist'),before);
}));
test('source非public hardlink也拒絕',async()=>owned(async dir=>{
 await link(join(dir,'README.md'),join(dir,'../README-copy.md'));fail(run(dir));fail(run(dir,'check'));
}));
test('check拒絕runtime外傳API且build不會被誤稱check',async()=>owned(async dir=>{
 await writeFile(join(dir,'public/js/app.mjs'),'fetch("https://example.invalid/");\n');fail(run(dir,'check'));
}));
test('check拒絕published metadata或dist字節不同',async()=>owned(async dir=>{
 pass(run(dir));await writeFile(join(dir,'dist/styles.css'),'modified');fail(run(dir,'check'));
 const html=await readFile(join(dir,'public/index.html'),'utf8');await writeFile(join(dir,'public/index.html'),html.replace('noindex,nofollow','index,follow'));fail(run(dir,'check'));
}));
// r3：語意拒絕必須同時保護build，而不是只靠使用者另跑check。
for(const mutation of ['robots','unsafe-api','headers','dependency','canonical'])test(`r3 build拒絕${mutation}並保留原dist`,async()=>owned(async dir=>{
 pass(run(dir));const before=await bytes(dir);
 if(mutation==='robots'){const p=join(dir,'public/index.html');await writeFile(p,(await readFile(p,'utf8')).replace('noindex,nofollow','index,follow'));}
 if(mutation==='unsafe-api'){await writeFile(join(dir,'public/js/app.mjs'),'fetch("https://example.invalid/");\n');}
 if(mutation==='headers'){const p=join(dir,'public/_headers');await writeFile(p,(await readFile(p,'utf8')).replace("connect-src 'none'","connect-src *"));}
 if(mutation==='dependency'){const p=join(dir,'package.json');const json=JSON.parse(await readFile(p));json.dependencies={unapproved:'1.0.0'};await writeFile(p,JSON.stringify(json));}
 if(mutation==='canonical'){const p=join(dir,'public/index.html');await writeFile(p,(await readFile(p,'utf8')).replace('</head>','<link rel="canonical" href="https://fake.example/">\n</head>'));}
 fail(run(dir,'check'));fail(run(dir));assert.deepEqual(await bytes(dir),before);
 assert.equal((await readdir(dir)).some(name=>name.startsWith('.build-')),false);
}));
