import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const manifest=JSON.parse(fs.readFileSync(path.join(here,'SOURCE-BYTES.json')));
for(const f of manifest.files){const b=fs.readFileSync(path.join(root,f.path));assert.equal(b.length,f.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),f.gitBlob);}
const mapping=JSON.parse(fs.readFileSync(path.join(here,'mapping.json')));assert.equal(mapping.targets.length,8);
for(const t of mapping.targets){assert.equal(t.acceptanceCriteria.length,9);const s=fs.readFileSync(path.join(root,t.document.path),'utf8');for(const c of t.acceptanceCriteria){assert(s.includes(c.id));assert(s.includes(c.label));}}
console.log(JSON.stringify({files:manifest.files.length,targets:8,productCriteria:72,status:'PASS_SOURCE_INTEGRITY_ONLY'}));
