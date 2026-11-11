import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));
assert.equal(process.argv.length,3,'Usage: node reproduce-review.mjs NEW_OUTPUT_DIRECTORY');
const output=path.resolve(process.argv[2]);assert.notEqual(output,root);
await fs.mkdir(output,{recursive:false});
const files=['input-manifest.json','fetch-inputs.mjs','run-candidate-tests.mjs','validate-snapshots.mjs','check-scope.mjs','run5-spec-ids.json','TASK-snapshot.md','independent-fixtures.mjs','fake-github.mjs','reproduce-omitted-ancestor.mjs','reproduce-ancestor-adapter.mjs','independent-matrix.mjs'];
for(const file of files)await fs.copyFile(path.join(root,file),path.join(output,file));
const steps=[];
for(const script of ['fetch-inputs.mjs','check-scope.mjs','run-candidate-tests.mjs','validate-snapshots.mjs','reproduce-omitted-ancestor.mjs','reproduce-ancestor-adapter.mjs','independent-matrix.mjs']){
 const result=spawnSync(process.execPath,[script],{cwd:output,windowsHide:true,encoding:'utf8',timeout:120000,maxBuffer:2*1024*1024});
 steps.push({script,exit:result.status,signal:result.signal});
 await fs.writeFile(path.join(output,script+'.stdout.txt'),result.stdout??'');await fs.writeFile(path.join(output,script+'.stderr.txt'),result.stderr??'');
 assert.equal(result.status,0,script+' failed; inspect its output in the chosen output directory');
}
const read=async name=>JSON.parse(await fs.readFile(path.join(output,name),'utf8'));
assert.equal((await read('candidate-tests.json')).passCount,49);assert.equal((await read('independent-matrix-results.json')).passed,16);
assert.equal((await read('omitted-ancestor-result.json')).status,'BLOCKING_DEFECT_REPRODUCED');assert.equal((await read('omitted-ancestor-adapter-result.json')).status,'BLOCKING_DEFECT_REPRODUCED');
const result={status:'REPRODUCTION_COMPLETE_CANDIDATE_BLOCKED',candidate:'e1c4d5d50b23cd8e9449632d3eb697f217dea305',observedAt:new Date().toISOString(),node:process.version,steps,fullSuitePassed:49,independentMatrixPassed:16,registrySnapshotsPassed:2,allowlistCount:40,blockingFinding:'FH-CORE-A-01',reproducerExitMeaning:'Exit0 confirms the defect remains reproducible; this is not candidate acceptance'};
await fs.writeFile(path.join(output,'portable-result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
