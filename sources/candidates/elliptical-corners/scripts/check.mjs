import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {root,payload,build} from './build.mjs';
for(const f of payload.filter(x=>x.endsWith('.mjs')))execFileSync(process.execPath,['--check',root+'/'+f]);
const source=(await Promise.all(payload.filter(x=>x.endsWith('.mjs')).map(x=>fs.readFile(root+'/'+x,'utf8')))).join('\n');
for(const bad of ['innerHTML','eval(','localStorage','sessionStorage','navigator.clipboard','fetch(','XMLHttpRequest','document.cookie','createObjectURL'])assert.ok(!source.includes(bad),'forbidden sink '+bad);
for(const f of ['index.html','en/index.html']){const html=await fs.readFile(root+'/'+f,'utf8');assert.match(html,/connect-src 'none'/);assert.match(html,/id="boot-status"/);assert.match(html,/id="generate"[^>]*disabled/);assert.equal((html.match(/input id=/g)||[]).length,10);assert.ok(!html.includes('maxlength='));}
const pkg=JSON.parse(await fs.readFile(root+'/package.json','utf8'));assert.ok(!pkg.dependencies&&!pkg.devDependencies);
const a=await build(),b=await build();assert.deepEqual(a,b);console.log('PASS syntax, fixed sinks, closed static bilingual fallback, zero dependencies, two reproducible clean builds');
