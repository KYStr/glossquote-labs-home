import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {root,expected,allowed} from './build.mjs';
const mode=process.argv[process.argv.indexOf('--mode')+1],files=await expected(mode),dir=root+(mode==='preview'?'/dist':'/dist-production');
async function walk(p,prefix=''){const out=[];for(const e of await fs.readdir(p,{withFileTypes:true}))if(e.isDirectory())out.push(...await walk(path.join(p,e.name),prefix+e.name+'/'));else out.push(prefix+e.name);return out;}
assert.deepEqual((await walk(dir)).sort(),[...allowed].sort());for(const[n,text]of Object.entries(files))assert.equal(await fs.readFile(dir+'/'+n,'utf8'),text,n);console.log('PASS exact nine generated assets, links/metadata/CSP and source bytes');
