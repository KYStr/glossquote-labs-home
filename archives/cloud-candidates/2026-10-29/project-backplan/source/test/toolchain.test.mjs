// 每個破壞性 fixture 只在獨立 tmp 複本測試，不改來源或使用者目錄。
import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, rm, writeFile, readFile, unlink, link, symlink, rename, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const source=new URL('../',import.meta.url);
async function fixture(){const root=await mkdtemp(join(tmpdir(),'backplan-tree-'));for(const path of ['scripts','public','package.json'])await cp(new URL(path,source),join(root,path),{recursive:true});return root;}
const command=(root,name,...args)=>spawnSync(process.execPath,[`scripts/${name}.mjs`,...args],{cwd:root,encoding:'utf8'});
const refused=(result)=>assert.notEqual(result.status,0,`${result.stdout}\n${result.stderr}`);
test('preview build exact file bytes and repeated safe replacement',async()=>{const root=await fixture();try{assert.equal(command(root,'build').status,0);const {PUBLIC_FILES}=await import('../scripts/files.mjs');for(const path of PUBLIC_FILES)assert.deepEqual(await readFile(join(root,'dist',path)),await readFile(join(root,'public',path)));assert.equal(command(root,'check').status,0);assert.equal(command(root,'build').status,0);assert.deepEqual((await readdir(root)).filter(name=>name.startsWith('.build-')),[]);refused(command(root,'build','--production'));refused(command(root,'serve','--host','0.0.0.0'));refused(command(root,'serve','--port','65536'));refused(command(root,'serve','--unknown'));}finally{await rm(root,{recursive:true,force:true});}});
for(const variant of ['unknown-source','hardlink-source','symlink-file-source','symlink-directory-source','symlink-root-source','unknown-output','symlink-root-output','hardlink-output'])test(`toolchain refuses ${variant} and preserves existing output`,async()=>{
  const root=await fixture();try{
    assert.equal(command(root,'build').status,0);
    const original=await readFile(join(root,'dist/index.html'));
    if(variant==='unknown-source')await writeFile(join(root,'public/private-fixture.txt'),'do not publish');
    if(variant==='hardlink-source')await link(join(root,'public/styles.css'),join(root,'linked-copy.css'));
    if(variant==='symlink-file-source'){await rename(join(root,'public/styles.css'),join(root,'styles-original.css'));await symlink('../styles-original.css',join(root,'public/styles.css'));}
    if(variant==='symlink-directory-source'){await rename(join(root,'public/js'),join(root,'original-js'));await symlink('../original-js',join(root,'public/js'));}
    if(variant==='symlink-root-source'){await rename(join(root,'public'),join(root,'public-original'));await symlink('public-original',join(root,'public'));}
    if(variant==='unknown-output')await writeFile(join(root,'dist/KEEP.txt'),'must survive');
    if(variant==='symlink-root-output'){await rename(join(root,'dist'),join(root,'dist-original'));await symlink('dist-original',join(root,'dist'));}
    if(variant==='hardlink-output')await link(join(root,'dist/styles.css'),join(root,'linked-output.css'));
    refused(command(root,'check'));refused(command(root,'build'));
    assert.deepEqual(await readFile(join(root,'dist/index.html')),original);
    if(variant==='unknown-output')assert.equal(await readFile(join(root,'dist/KEEP.txt'),'utf8'),'must survive');
  }finally{await rm(root,{recursive:true,force:true});}
});
test('preview server rejects unsafe source before binding and snapshot never follows later swap',async()=>{
  const root=await fixture();try{
    const {serve}=await import(pathToFileURL(join(root,'scripts/serve.mjs')));
    await rename(join(root,'public/styles.css'),join(root,'styles-original.css'));await symlink('../styles-original.css',join(root,'public/styles.css'));
    await assert.rejects(()=>serve(0));await unlink(join(root,'public/styles.css'));await rename(join(root,'styles-original.css'),join(root,'public/styles.css'));
    const original=await readFile(join(root,'public/styles.css'),'utf8');const server=await serve(0);
    try{await writeFile(join(root,'fixture-secret.txt'),'not served');await unlink(join(root,'public/styles.css'));await symlink('../fixture-secret.txt',join(root,'public/styles.css'));const response=await fetch(`http://127.0.0.1:${server.address().port}/styles.css`);assert.equal(await response.text(),original);}finally{await new Promise(resolve=>server.close(resolve));}
  }finally{await rm(root,{recursive:true,force:true});}
});
