import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));assert.equal(process.argv.length,3,'Usage: node reproduce-review.mjs NEW_OUTPUT_DIRECTORY');const output=path.resolve(process.argv[2]);assert.notEqual(output,root);await fs.mkdir(output,{recursive:false});
for(const name of ['input-manifest.json','fetch-inputs.mjs','run-candidate-tests.mjs','recheck-source-chain.mjs','late-source-probe.mjs','effective-readiness-probes.mjs'])await fs.copyFile(path.join(root,name),path.join(output,name));
const steps=[];
for(const script of ['fetch-inputs.mjs','run-candidate-tests.mjs','recheck-source-chain.mjs','late-source-probe.mjs','effective-readiness-probes.mjs']){
 const run=spawnSync(process.execPath,[script],{cwd:output,windowsHide:true,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});steps.push({script,exit:run.status});await fs.writeFile(path.join(output,script+'.stdout.txt'),run.stdout??'');await fs.writeFile(path.join(output,script+'.stderr.txt'),run.stderr??'');assert.equal(run.status,0,script+' failed; inspect chosen output directory');
}
const read=async name=>JSON.parse(await fs.readFile(path.join(output,name),'utf8'));assert.equal((await read('candidate-tests.json')).passed,55);assert.equal((await read('source-chain-results.json')).passed,12);const cases=await read('effective-readiness-results.json');assert.equal(cases.rows.length,4);assert(cases.rows.every(x=>x.status==='BLOCKING_DEFECT_REPRODUCED'));assert.equal(cases.recovery.status,'PASS');
const result={status:'REPRODUCTION_COMPLETE_CANDIDATE_BLOCKED',candidate:'110e809c15b10004c2aadca6a6649b9324be1419',observedAt:new Date().toISOString(),node:process.version,steps,fullSuitePassed:55,targetedMatrixPassed:12,blockingFinding:'FH-CORE-A-02',temporalCounterexamples:4,existingActionRecovery:'PASS',exitZeroMeaning:'All expected results reproduced, including the blocking defect; not candidate acceptance'};await fs.writeFile(path.join(output,'portable-result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
