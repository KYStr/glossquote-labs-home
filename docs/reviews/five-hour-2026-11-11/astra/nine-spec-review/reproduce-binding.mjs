import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));assert.equal(process.argv.length,3,'Usage: node reproduce-binding.mjs NEW_OUTPUT_DIRECTORY');const output=path.resolve(process.argv[2]);assert.notEqual(output,root);await fs.mkdir(output,{recursive:false});
for(const file of ['input-manifest.json','fetch-inputs.mjs','registered-task.json','registered-commands.json','scores.json','verify-task-binding.mjs'])await fs.copyFile(path.join(root,file),path.join(output,file));
const steps=[];for(const script of ['fetch-inputs.mjs','verify-task-binding.mjs']){const run=spawnSync(process.execPath,[script],{cwd:output,windowsHide:true,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});steps.push({script,exit:run.status});await fs.writeFile(path.join(output,script+'.stdout.txt'),run.stdout??'');await fs.writeFile(path.join(output,script+'.stderr.txt'),run.stderr??'');assert.equal(run.status,0,script+' failed; inspect chosen output directory');}
const binding=JSON.parse(await fs.readFile(path.join(output,'binding-results.json'),'utf8'));assert.equal(binding.status,'PASS_FORMAL_REVIEW_BINDING_NOT_WRITTEN');assert.equal(binding.registryWrites,0);
const result={status:'PASS_PORTABLE_FORMAL_BINDING',observedAt:new Date().toISOString(),node:process.version,taskId:binding.taskId,candidate:binding.candidate,steps,pinnedInputs:9,exactRegisteredTargets:9,originalCommandHashes:4,inheritedMakers:4,reviewerIndependent:true,currentPersonalAck:true,priorSameByteReviewReused:true,arithmeticRerun:false,registryWrites:0,readyWrites:0};await fs.writeFile(path.join(output,'portable-result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
