import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {executeOperation} from './candidate/scripts/coordination.mjs';
import {inputs,mapper,ancestor,command,task,mappingCandidate,evidence,reviewCommand,maintainCommand,readyCommand} from './independent-fixtures.mjs';
import {transport} from './fake-github.mjs';
const initial=inputs();const fake=transport(initial.registry,[initial.target],initial.mappingTask);
const receipts=[];
async function execute(cmd){const r=await executeOperation(fake.client,cmd);assert(r.saved);receipts.push({action:cmd.action,actor:cmd.actor.id,operationId:cmd.operationId,status:r.taskStatus,saved:r.saved});return r;}
await execute(command(fake.state.registry,mapper,'register-task',{task:initial.mappingTask}));
await execute(command(fake.state.registry,mapper,'claim',{taskId:initial.mappingTask.id}));
await execute(command(fake.state.registry,mapper,'start',{taskId:initial.mappingTask.id,claimId:task(fake.state.registry,initial.mappingTask.id).owner.claimId,evidence:'Synthetic mapping work.'}));
await execute(command(fake.state.registry,mapper,'submit',{taskId:initial.mappingTask.id,claimId:task(fake.state.registry,initial.mappingTask.id).owner.claimId,candidate:mappingCandidate,pullRequest:'https://github.com/'+mappingCandidate.repository+'/pull/83',evidence:'Synthetic fixed mapping.',evidenceRef:evidence}));
await execute(reviewCommand(fake.state.registry,ancestor,initial.mappingTask.id));
await execute(maintainCommand(fake.state.registry));
await execute(readyCommand(fake.state.registry,ancestor));
assert.equal(fake.state.registry.specs[0].status,'ready');
assert(!fake.state.registry.specs[0].contributors.includes(ancestor.id));
const result={status:'BLOCKING_DEFECT_REPRODUCED',finding:'FH-CORE-A-01',candidate:'e1c4d5d50b23cd8e9449632d3eb697f217dea305',
 scope:'Actual candidate GitHubClient and executeOperation with isolated in-memory fake transport; no real credential/network/registry write',
 allReferenceAndMappingByteChecksEnabled:true,syntheticPutCount:fake.state.puts,receipts,
 ancestorWasAllowedToAcceptMappingAndReadiness:true,finalSpecStatus:fake.state.registry.specs[0].status,
 finalContributors:fake.state.registry.specs[0].contributors,calls:fake.state.calls};
await fs.writeFile(new URL('./omitted-ancestor-adapter-result.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,finding:result.finding,syntheticPutCount:result.syntheticPutCount,finalSpecStatus:result.finalSpecStatus}));
