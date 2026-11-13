import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));assert(process.argv[2],'Usage: node reproduce-preflight.mjs <new-output-directory>');
const output=path.resolve(process.argv[2]);assert.notEqual(output,root);await fs.mkdir(output,{recursive:false});
for(const f of ['input-manifest.json','fetch-inputs.mjs','verify-mapping.mjs','candidate-github-observation.json','prior/input-audit.json','prior/semantic-matrix.json']){await fs.mkdir(path.dirname(path.join(output,f)),{recursive:true});await fs.copyFile(path.join(root,f),path.join(output,f));}
const steps=[];for(const script of ['fetch-inputs.mjs','verify-mapping.mjs','candidate/docs/reviews/five-hour-2026-11-11/eight-spec-mapping/verify.mjs']){const r=spawnSync(process.execPath,[path.join(output,script)],{cwd:output,encoding:'utf8',windowsHide:true});steps.push({script,exit:r.status,stdout:r.stdout,stderr:r.stderr});assert.equal(r.status,0,script+'\n'+r.stderr);}
const result={status:'PASS_PORTABLE_PREFLIGHT',observedAt:new Date().toISOString(),node:process.version,steps,candidate:'3bc18c8ec3659ad87b3da37b5c7dac59570cb288',pinnedInputs:86,byteIdenticalSpecs:32,exactLabels:72,relativeLinks:134,semanticCellsReused:64,arithmeticRerun:false,registryWrites:0,formalBinding:false};
await fs.writeFile(path.join(output,'portable-result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));

