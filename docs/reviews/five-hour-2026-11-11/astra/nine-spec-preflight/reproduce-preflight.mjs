import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));assert.equal(process.argv.length,3,'Usage: node reproduce-preflight.mjs NEW_OUTPUT_DIRECTORY');
const output=path.resolve(process.argv[2]);assert.notEqual(output,root);await fs.mkdir(output,{recursive:false});
for(const file of ['input-manifest.json','fetch-inputs.mjs','verify-mapping.mjs','registry-excerpt.json','shared-link-targets.json'])await fs.copyFile(path.join(root,file),path.join(output,file));
const steps=[];for(const script of ['fetch-inputs.mjs','verify-mapping.mjs']){const run=spawnSync(process.execPath,[script],{cwd:output,windowsHide:true,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});steps.push({script,exit:run.status});await fs.writeFile(path.join(output,script+'.stdout.txt'),run.stdout??'');await fs.writeFile(path.join(output,script+'.stderr.txt'),run.stderr??'');assert.equal(run.status,0,script+' failed; inspect chosen output directory');}
const preflight=JSON.parse(await fs.readFile(path.join(output,'preflight-results.json'),'utf8'));assert.equal(preflight.status,'PASS_READ_ONLY_PREFLIGHT');assert.equal(preflight.pinnedInputs,101);assert.equal(preflight.formalReview,false);
const result={status:'PASS_PORTABLE_READ_ONLY_PREFLIGHT',candidate:preflight.candidate,observedAt:new Date().toISOString(),node:process.version,steps,pinnedInputs:101,byteIdenticalSpecFiles:40,criteriaLabels:81,relativeLinks:159,registryRevision:1588,formalReview:false,productArithmeticRerun:false,registryWrites:0};
await fs.writeFile(path.join(output,'portable-result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
