import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));assert.equal(process.argv.length,3,'Usage: node reproduce-review.mjs NEW_OUTPUT_DIRECTORY');const output=path.resolve(process.argv[2]);assert.notEqual(output,root);await fs.mkdir(output,{recursive:false});
for(const file of ['input-manifest.json','fetch-inputs.mjs','prepare-independent.mjs','verify-effective-readiness.mjs'])await fs.copyFile(path.join(root,file),path.join(output,file));
const steps=[];
for(const script of ['fetch-inputs.mjs','prepare-independent.mjs','recheck-source-chain.mjs','verify-effective-readiness.mjs']){const run=spawnSync(process.execPath,[script],{cwd:output,windowsHide:true,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});steps.push({script,exit:run.status});await fs.writeFile(path.join(output,script+'.stdout.txt'),run.stdout??'');await fs.writeFile(path.join(output,script+'.stderr.txt'),run.stderr??'');assert.equal(run.status,0,script+' failed; inspect chosen output directory');}
const read=async file=>JSON.parse(await fs.readFile(path.join(output,file),'utf8'));const A01=await read('source-chain-results.json'),A02=await read('effective-readiness-results.json');assert.equal(A01.passed,12);assert.equal(A01.failed,0);assert.equal(A02.passed,13);assert.equal(A02.failed,0);
const result={status:'PASS_INDEPENDENT_RECHECK',candidate:'93595abc7b2f9c46a07aaaa74418b3882c8901b4',observedAt:new Date().toISOString(),node:process.version,steps,passed:25,failed:0,A01:12,effectiveReadinessAndRecovery:13,fullCandidateSuite:'Not rerun by this entry; 58/58 separately executed by primary and its evidence read by reviewer',noRealRegistryWrites:true};await fs.writeFile(path.join(output,'portable-result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
