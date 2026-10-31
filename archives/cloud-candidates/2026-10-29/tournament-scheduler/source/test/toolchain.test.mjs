// 所有負面檔案 fixture 都在本測試建立的 tmp 複本，不更動正式來源或其他任務。
import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, rm, writeFile, readFile, unlink, link, symlink, rename, readdir, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const source=new URL('../',import.meta.url);
async function fixture(prefix='tournament-tree-'){const root=await mkdtemp(join(tmpdir(),prefix));for(const path of ['scripts','public','package.json'])await cp(new URL(path,source),join(root,path),{recursive:true});return root;}
const command=(root,name,...args)=>spawnSync(process.execPath,[`scripts/${name}.mjs`,...args],{cwd:root,encoding:'utf8'});
const refused=result=>assert.notEqual(result.status,0,`${result.stdout}\n${result.stderr}`);
const passed=result=>assert.equal(result.status,0,`${result.stdout}\n${result.stderr}`);
test('preview build exact bytes, repeat replacement, special URL characters and flag refusal',async()=>{
  const root=await fixture('tournament space # ? -');try{
    passed(command(root,'check'));passed(command(root,'build'));
    for(const path of ['_headers','en/index.html','index.html','js/app.mjs','js/core/schedule.mjs','js/i18n.mjs','robots.txt','styles.css'])assert.deepEqual(await readFile(join(root,'dist',path)),await readFile(join(root,'public',path)));
    passed(command(root,'build'));assert.deepEqual((await readdir(root)).filter(name=>name.startsWith('.build-')),[]);refused(command(root,'build','--production'));refused(command(root,'check','--production'));
  }finally{await rm(root,{recursive:true,force:true});}
});
for(const variant of ['unknown-source','missing-source','unknown-directory','hardlink-source','symlink-file-source','symlink-directory-source','symlink-root-source','unknown-output','unknown-output-directory','symlink-root-output','hardlink-output'])test(`check/build reject ${variant} and preserve previous output`,async()=>{
  const root=await fixture();try{
    passed(command(root,'build'));const original=await readFile(join(root,'dist/index.html'));
    if(variant==='unknown-source')await writeFile(join(root,'public/private-fixture.txt'),'do not publish');
    if(variant==='missing-source')await unlink(join(root,'public/js/core/schedule.mjs'));
    if(variant==='unknown-directory')await mkdir(join(root,'public/unused'));
    if(variant==='hardlink-source')await link(join(root,'public/styles.css'),join(root,'linked-copy.css'));
    if(variant==='symlink-file-source'){await rename(join(root,'public/styles.css'),join(root,'styles-original.css'));await symlink('../styles-original.css',join(root,'public/styles.css'));}
    if(variant==='symlink-directory-source'){await rename(join(root,'public/js'),join(root,'original-js'));await symlink('../original-js',join(root,'public/js'));}
    if(variant==='symlink-root-source'){await rename(join(root,'public'),join(root,'public-original'));await symlink('public-original',join(root,'public'));}
    if(variant==='unknown-output')await writeFile(join(root,'dist/KEEP.txt'),'must survive');
    if(variant==='unknown-output-directory')await mkdir(join(root,'dist/KEEP'));
    if(variant==='symlink-root-output'){await rename(join(root,'dist'),join(root,'dist-original'));await symlink('dist-original',join(root,'dist'));}
    if(variant==='hardlink-output')await link(join(root,'dist/styles.css'),join(root,'linked-output.css'));
    refused(command(root,'check'));refused(command(root,'build'));assert.deepEqual(await readFile(join(root,'dist/index.html')),original);
    if(variant==='unknown-output')assert.equal(await readFile(join(root,'dist/KEEP.txt'),'utf8'),'must survive');
  }finally{await rm(root,{recursive:true,force:true});}
});
for(const variant of ['indexing','network-call','html-sink','remote-css','header-weaken','dependency'])test(`security regression ${variant} blocks check AND build without replacing output`,async()=>{
  const root=await fixture();try{
    passed(command(root,'build'));const original=await readFile(join(root,'dist/index.html'));
    const edit=async(path,fn)=>{const file=join(root,path);await writeFile(file,fn(await readFile(file,'utf8')));};
    if(variant==='indexing')await edit('public/index.html',s=>s.replace('noindex, nofollow','index, follow'));
    if(variant==='network-call')await edit('public/js/app.mjs',s=>s+'\nfetch("/leak");\n');
    if(variant==='html-sink')await edit('public/js/app.mjs',s=>s+'\ndocument.body.innerHTML = "unsafe";\n');
    if(variant==='remote-css')await edit('public/styles.css',s=>s+'\n@import "https://example.invalid/fixture.css";\n');
    if(variant==='header-weaken')await edit('public/_headers',s=>s.replace("connect-src 'none'","connect-src *"));
    if(variant==='dependency')await edit('package.json',s=>JSON.stringify({...JSON.parse(s),dependencies:{fixture:'1.0.0'}}));
    refused(command(root,'check'));refused(command(root,'build'));assert.deepEqual(await readFile(join(root,'dist/index.html')),original);
  }finally{await rm(root,{recursive:true,force:true});}
});
