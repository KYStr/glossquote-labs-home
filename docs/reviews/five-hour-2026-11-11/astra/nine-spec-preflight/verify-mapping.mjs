import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url)),head='4bc6d4e300d315597a4b1ea5feb86f6f2d6fc1c0',repo='KYStr/glossquote-labs-home',prefix='docs/reviews/five-hour-2026-11-11/nine-spec-mapping/';
const read=async file=>fs.readFile(path.join(root,file)),json=async file=>JSON.parse(await read(file));
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
const sha256=b=>createHash('sha256').update(b).digest('hex');const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const input=await json('input-manifest.json'),registry=await json('registry-excerpt.json'),map=await json('candidate/'+prefix+'mapping.json'),source=await json('candidate/'+prefix+'SOURCE-BYTES.json'),history=await json('candidate/'+prefix+'SOURCE-HISTORY.json'),shared=await json('shared-link-targets.json');
assert.equal(input.length,101);assert.deepEqual(Object.keys(map),['targets']);assert.equal(map.targets.length,9);assert.equal(source.files.length,41);assert.equal(registry.assignedSpecIds.length,0);
for(const row of input)assert.equal(blob(await read(row.destination)),row.blob,row.destination);
const fullRegistry=await json('registry/r1588.json');assert.equal(fullRegistry.revision,registry.revision);
for(const spec of registry.specs)assert.deepEqual(fullRegistry.specs.find(x=>x.id===spec.id),spec);
for(const task of registry.tasks)assert.deepEqual(fullRegistry.tasks.find(x=>x.id===task.id),task);
assert.deepEqual(fullRegistry.tasks.filter(x=>registry.specs.some(s=>s.id===x.specId)).map(x=>x.specId),registry.assignedSpecIds);
for(const row of shared.targets)assert.equal(blob(await read('shared/'+row.path)),row.sha);
const byteRows=[];
for(const row of source.files){
 const candidate=await read('candidate/'+row.path),original=await read('sources/'+row.sourceCommit+'/'+row.path);assert(candidate.equals(original));assert.equal(candidate.length,row.bytes);assert.equal(sha256(candidate),row.sha256);assert.equal(blob(candidate),row.gitBlob);
 const task=registry.tasks.find(t=>t.id===row.sourceTask);assert.equal(task.status,'accepted');assert.equal(task.submission.candidate.commit,row.sourceCommit);assert.deepEqual(task.acceptance.candidate,task.submission.candidate);assert.equal(task.submission.claimId,task.owner.claimId);assert.equal(task.submission.authorId,task.owner.actorId);assert(task.acceptance.aspects.every(a=>a.score>=90));assert.equal(task.acceptance.rubricComplete,true);assert.equal(task.acceptance.requiredChecksComplete,true);
 byteRows.push({path:row.path,sourceCommit:row.sourceCommit,gitBlob:row.gitBlob,status:'BYTE_IDENTICAL'});
}
const productIds=['functionality','boundaries','privacy','security','usability','accessibility','localization-seo','toolchain-provenance','compatibility'],sectionIds=['goal','scope','userFlow','inputsOutputs','implementation','acceptance','tests','handoff'];const targets=[];const makers=new Set();
for(const t of map.targets){
 assert.deepEqual(Object.keys(t).sort(),['specId','expectedAuthorId','expectedDocument','expectedSource','expectedCriteriaHash','document','source','acceptanceCriteria','sourceMaintenanceTaskIds'].sort());
 const s=registry.specs.find(s=>s.id===t.specId);assert(s);assert.deepEqual(history.specs.find(x=>x.id===s.id),s);assert.equal(s.status,'draft');assert.equal(s.consumedBy,null);assert.equal(s.authorId,t.expectedAuthorId);assert.deepEqual(s.document,t.expectedDocument);assert.deepEqual(s.source,t.expectedSource);assert.equal(sha256(canonical(s.acceptanceCriteria)),t.expectedCriteriaHash);
 makers.add(s.authorId);for(const task of registry.tasks.filter(task=>task.workType==='spec'&&task.brief.path===s.document.path.replace('/SPEC.md','/BRIEF.md'))){for(const a of [...task.contributors,task.owner?.actorId,task.submission?.authorId].filter(Boolean))makers.add(a);}
 for(const field of ['document','source']){const ref=t[field],b=await read('candidate/'+ref.path);assert.deepEqual(Object.keys(ref).sort(),['repository','path','bytes','sha256'].sort());assert.equal(ref.repository,repo);assert.equal(ref.path,s[field].path);assert.equal(ref.bytes,b.length);assert.equal(ref.sha256,sha256(b));}
 const text=(await read('candidate/'+t.document.path)).toString('utf8'),labels=[];for(const line of text.split(/\r?\n/)){const cells=line.split('|').map(x=>x.trim());if(productIds.includes(cells[1])){assert.equal(cells.length,4);labels.push({id:cells[1],label:cells[2]});}}
 assert.deepEqual(labels.map(x=>x.id),productIds);assert.deepEqual(t.acceptanceCriteria,labels);
 const fileRow=source.files.find(x=>x.path===t.document.path);assert(t.sourceMaintenanceTaskIds.includes(fileRow.sourceTask));
 for(const id of t.sourceMaintenanceTaskIds){const sourceTask=registry.tasks.find(x=>x.id===id);assert.equal(sourceTask.status,'accepted');assert.deepEqual(history.acceptedMaintenanceSources.find(x=>x.id===id),sourceTask);for(const a of [...sourceTask.contributors,sourceTask.owner?.actorId,sourceTask.submission?.authorId].filter(Boolean))makers.add(a);const parent=registry.tasks.find(x=>x.workType==='maintenance'&&x.submission?.candidate.commit===sourceTask.source.commit);if(parent)assert(t.sourceMaintenanceTaskIds.includes(parent.id));}
 const headings=text.split(/\r?\n/).filter(x=>/^## /.test(x));if(!t.specId.includes('calories-burned'))for(const id of sectionIds)assert(headings.includes('## '+id));else for(const heading of ['## 1. Purpose, users and scope','## 2. Normative rules','## 3. Determinism and acceptance fixtures','## 4. Implementation plan','## 5. Toolchain and test plan','## 6. Acceptance aspects','## 8. Milestones, stop conditions and handoff'])assert(headings.includes(heading));
 targets.push({specId:t.specId,sourceCommit:fileRow.sourceCommit,documentBlob:fileRow.gitBlob,criteriaLabels:9,oldStateExact:true,structurePresent:true,substantiveReview:'Prior same-byte eight-section evidence reused; not inferred from headings',inventoryDisposition:t.specId.includes('race-time')?'existing-tool-upgrade; keep draft':/nhi-premium|calories-burned/.test(t.specId)?'potential new-production stock ONLY after duplicate-product check and lawful independent review/apply/ready':'legacy candidate continuation; keep draft'});
}
const paths=new Set(input.filter(x=>x.destination.startsWith('candidate/')).map(x=>x.path));for(const row of shared.targets)paths.add(row.path);let links=0;
for(const row of input.filter(x=>x.destination.startsWith('candidate/')&&x.path.endsWith('.md'))){const text=(await read(row.destination)).toString('utf8');for(const hit of text.matchAll(/\]\(([^)]+)\)/g)){const href=hit[1].split('#')[0];if(!href||/^[a-zA-Z]+:/.test(href))continue;const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(row.path),href));assert(paths.has(resolved),row.path+' -> '+href);links++;}}
assert.equal(links,159);assert.equal(shared.targets.length,14);assert.equal((await read('candidate/README.md')).length,1810);
const handoff=(await read('candidate/'+prefix+'HANDOFF.md')).toString('utf8');assert(handoff.includes('此版先留 draft'));assert(handoff.includes('不作新工具庫存'));
const self='local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/five_hour_astra_review';assert(!makers.has(self));
const result={status:'PASS_READ_ONLY_PREFLIGHT',candidate:head,observedAt:new Date().toISOString(),node:process.version,registryRevision:registry.revision,registryBlob:registry.registryBlob,candidateFiles:45,independentlyFetchedSources:41,byteIdenticalSpecFiles:40,unchangedReadmeBytes:1810,pinnedInputs:101,baseCandidateAndSourceInputs:86,downloadedSharedLinkTargets:14,fullRegistrySnapshotInputs:1,relativeLinks:links,sharedLinkTargets:14,criteriaLabels:81,unassignedDrafts:9,targetRows:targets,sourceByteRows:byteRows,requiredMakerSet:[...makers].sort(),reviewerNotMaker:true,formalMappingTaskRegisteredAtSnapshot:false,formalBindingStatus:'PENDING_ACTUAL_TASK_AND_SUBMISSION; historical r1588 snapshot only',formalReview:false,readyWrites:0,productTestsRerun:false};
await fs.writeFile(path.join(root,'preflight-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,inputs:101,identicalSpecs:40,criteriaLabels:81,relativeLinks:159,unassignedDrafts:9,requiredMakers:[...makers].sort(),formalReview:false}));
