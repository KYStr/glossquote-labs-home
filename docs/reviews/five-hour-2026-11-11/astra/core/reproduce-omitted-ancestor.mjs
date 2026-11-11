import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {applyOperation,validateRegistry,operationReferences} from './candidate/scripts/coordination-core.mjs';
import {reviewingMapping,reviewTask,ancestor,task,maintainCommand,readyCommand,ancestorCandidate,documentPath} from './independent-fixtures.mjs';
const fixture=reviewingMapping();let r=fixture.registry;
assert.equal(task(r,'latest-repair').source.commit,ancestorCandidate.commit);
assert.equal(task(r,'latest-repair').source.path,documentPath);
assert.equal(task(r,'ancestor-repair').owner.actorId,ancestor.id);
assert(!task(r,'independent-mapping').contributors.includes(ancestor.id));
// This should be rejected: the reviewer made the accepted ancestor of the copied specification.
r=reviewTask(r,ancestor,'independent-mapping');
const mappingAcceptedByAncestor=task(r,'independent-mapping').acceptance.reviewerId===ancestor.id;
r=applyOperation(r,maintainCommand(r)).registry;
const ancestorMissingAfterApply=!r.specs[0].contributors.includes(ancestor.id);
r=applyOperation(r,readyCommand(r,ancestor)).registry;
assert.equal(r.specs[0].status,'ready');validateRegistry(r);
const report={status:'BLOCKING_DEFECT_REPRODUCED',candidate:'e1c4d5d50b23cd8e9449632d3eb697f217dea305',
 finding:'FH-CORE-A-01',scope:'Pure offline core; no real registry operation',
 sourceChain:['original specification','accepted ancestor-repair at commit 2','accepted latest-repair whose source is commit 2','mapping lists only latest-repair'],
 omittedKnownMaker:ancestor.id,mappingAcceptedByAncestor,ancestorMissingAfterApply,readyByAncestor:r.specs[0].readiness.reviewerId,
 mappingContributors:task(r,'independent-mapping').contributors,specContributors:r.specs[0].contributors,
 expected:'Inherit every known upstream source maker or reject the incomplete declared source chain before registration/review; ancestor must not independently review mapping or readiness.',
 actual:'All legal transitions and validateRegistry succeed with the known ancestor maker omitted.'};
await fs.writeFile(new URL('./omitted-ancestor-result.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
