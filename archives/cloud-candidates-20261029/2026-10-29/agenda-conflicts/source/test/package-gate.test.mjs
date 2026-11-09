// r2 唯一剩餘 package gate 的 red/green 負例，runtime 完全不改。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,readdirSync,rmSync,unlinkSync,symlinkSync,linkSync,existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildProject } from '../scripts/build.mjs';
const files=['404.html','_headers','en/index.html','index.html','js/app.mjs','js/core.mjs','js/i18n.mjs','robots.txt','styles.css'];
function fixture(t){const root=mkdtempSync(join(tmpdir(),'agenda-package-'));for(const path of ['public','public/en','public/js'])mkdirSync(join(root,path));for(const path of files)copyFileSync(fileURLToPath(new URL(`../public/${path}`,import.meta.url)),join(root,'public',path));copyFileSync(fileURLToPath(new URL('../package.json',import.meta.url)),join(root,'package.json'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;}
const mutations=[
 ['dependencies',p=>{p.dependencies={synthetic:'1.0.0'};}],['devDependencies',p=>{p.devDependencies={synthetic:'1.0.0'};}],['optionalDependencies',p=>{p.optionalDependencies={synthetic:'1.0.0'};}],['peerDependencies',p=>{p.peerDependencies={synthetic:'1.0.0'};}],
 ['private false',p=>{p.private=false;}],['private missing',p=>{delete p.private;}],['type commonjs',p=>{p.type='commonjs';}],['type missing',p=>{delete p.type;}]
];
for(const[name,mutate]of mutations)test(`build rejects package ${name} and keeps existing dist bytes`,t=>{
 const root=fixture(t);buildProject(root);const before=Object.fromEntries(files.map(p=>[p,readFileSync(join(root,'dist',p))]));
 const pkg=JSON.parse(readFileSync(join(root,'package.json')));mutate(pkg);writeFileSync(join(root,'package.json'),JSON.stringify(pkg));assert.throws(()=>buildProject(root));
 for(const path of files)assert.deepEqual(readFileSync(join(root,'dist',path)),before[path]);assert.equal(readdirSync(root).filter(n=>n.startsWith('.preview-')).length,0);
});
test('invalid package is refused before creating an initial dist',t=>{
 const root=fixture(t);writeFileSync(join(root,'package.json'),'{ broken');assert.throws(()=>buildProject(root));assert.equal(existsSync(join(root,'dist')),false);assert.equal(readdirSync(root).filter(n=>n.startsWith('.preview-')).length,0);
});
for(const kind of ['missing','symlink','hardlink'])test(`package ${kind} is refused by safe read before stage`,t=>{
 const root=fixture(t);buildProject(root);const previous=readFileSync(join(root,'dist/index.html'));const path=join(root,'package.json'),outside=join(root,'owned-target.json');copyFileSync(path,outside);unlinkSync(path);
 if(kind==='symlink')symlinkSync(outside,path);if(kind==='hardlink')linkSync(outside,path);assert.throws(()=>buildProject(root));assert.deepEqual(readFileSync(join(root,'dist/index.html')),previous);assert.ok(existsSync(outside));
});
test('package policy accepts absent/empty maps but rejects malformed dependency containers',async()=>{
 const {validatePackage}=await import('../scripts/semantics.mjs');
 const bytes=value=>Buffer.from(JSON.stringify(value));
 for(const dependencies of [null,false,0,'',[],['synthetic']])assert.throws(()=>validatePackage(bytes({private:true,type:'module',dependencies})));
 assert.doesNotThrow(()=>validatePackage(bytes({private:true,type:'module'})));
 assert.doesNotThrow(()=>validatePackage(bytes({private:true,type:'module',dependencies:{},devDependencies:{},optionalDependencies:{},peerDependencies:{}})));
 for(const value of [null,[],false,'package'])assert.throws(()=>validatePackage(bytes(value)));
});
