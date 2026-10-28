import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const owner = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(owner, '../../..');
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
const local = (p) => path.relative(owner, p).replaceAll('\\', '/');
const repo = (p) => path.relative(root, p).replaceAll('\\', '/');
const read = async (p) => JSON.parse(await fs.readFile(path.join(owner, p), 'utf8'));
const write = (p, v) => fs.writeFile(path.join(owner, p), JSON.stringify(v, null, 2) + '\n', { flag: 'wx' });
const meta = async (p) => { const bytes = await fs.readFile(p); return { path: local(p), bytes: bytes.length, sha256: hash(bytes) }; };
const source = await fs.readFile(path.join(owner, 'NativeContinuationCollector.cs'), 'utf8');
const compiled = await read('compile-2.json');
const abi = await read('abi-metadata.json');
const offline = await read('offline-2.json');
assert.equal(compiled.source.sha256, hash(Buffer.from(source)));
assert.equal(compiled.status, 'PASS_COMPILE_ONLY_NOT_EXECUTED');
assert.equal(abi.status, 'PASS_MANAGED_ABI_METADATA_ONLY');
assert.equal(abi.assemblySha256, compiled.assembly.sha256);
assert.equal(abi.fields.length, 19); assert.equal(abi.size, 120); assert.equal(abi.pinvokeCalled, false);
assert.equal(offline.status, 'PASS_OFFLINE_ONLY');
assert(offline.commands.every((r) => r.exitCode === 0 && r.windowsHide));
const log = await fs.readFile(path.join(owner, 'offline-2-7.txt'), 'utf8');
assert.match(log, /tests 77/); assert.match(log, /pass 77/); assert.match(log, /fail 0/);
const oldPure = path.resolve(root, '.runs/media-unblock-followup-2026-10-19/owner-11/generation-decision.mjs');
assert.equal(hash(await fs.readFile(oldPure)), hash(await fs.readFile(path.join(owner, 'generation-decision.mjs'))));
const imports = [...source.matchAll(/\[DllImport\("([^"]+)"[^\]]*\)\](?:\s*\[return:[^\]]+\])?\s*internal static extern [^;{]+?\s+(\w+)\s*\(/g)].map((m) => ({ dll: m[1], name: m[2] }));
const allow = new Set(['CloseHandle','GetCurrentProcess','DuplicateHandle','QueryInformationJobObject','OpenProcess','IsProcessInJob','GetProcessId','GetProcessTimes','WaitForSingleObject','QueryFullProcessImageName','GetProcessMitigationPolicy','QueryPerformanceCounter','QueryPerformanceFrequency','CompareObjectHandles','GetThreadDesktop','PssCaptureSnapshot','PssWalkMarkerCreate','PssWalkSnapshot','PssWalkMarkerFree','PssFreeSnapshot','OpenThread','GetProcessIdOfThread','GetThreadTimes']);
assert.equal(imports.length, allow.size);
assert(imports.every((i) => allow.has(i.name) && ['kernel32.dll','kernelbase.dll','user32.dll'].includes(i.dll)));
assert(!/static\s+void\s+Main\s*\(|Process\.Start\s*\(|CreateToolhelp32Snapshot|ReadProcessMemory/.test(source));
assert(source.indexOf('Native.AssertAbi();') < source.indexOf('Native.Require(Native.DuplicateHandle'));
const assemblyBytes = await fs.readFile(path.join(owner, compiled.assembly.path));
assert.equal(hash(assemblyBytes), compiled.assembly.sha256);
assert.equal(assemblyBytes.readUInt16LE(0), 0x5a4d);
const pe = assemblyBytes.readUInt32LE(0x3c);
assert.equal(assemblyBytes.readUInt32LE(pe), 0x4550);
assert.equal(assemblyBytes.readUInt16LE(pe+4), 0x8664);
assert(assemblyBytes.readUInt16LE(pe+22) & 0x2000);
await write('source-api-audit.json', { status: 'PASS_STATIC_SOURCE_REVIEW_ONLY', sourceSha256: compiled.source.sha256, imports,
  queryRights: {process: '0x101400 QUERY_INFORMATION|QUERY_LIMITED_INFORMATION|SYNCHRONIZE',thread: '0x100800 QUERY_LIMITED_INFORMATION|SYNCHRONIZE',jobDuplicate: '0x4 JOB_OBJECT_QUERY'},
  noMainOrProcessLaunch: true, noGlobalProcessOrThreadEnumeration: true, assertAbiBeforeFirstPInvoke: true,
  actualProcessHandleContinuity: 'NOT_RUN', nativePermissionsAndDesktop: 'NOT_RUN', edgeHelperIsolation: 'NOT_ESTABLISHED',
  note: 'Static allowlist/control-flow inspection plus compilation, not runtime validation. PSS allocates local metadata and caller-owned resources are released; target-process permissions are query/synchronize only.' });

const mediaRoot = path.resolve(root, '.runs/unblock-2026-10-19/owner-11');
const mediaInventoryPath = path.join(mediaRoot, 'fixtures/candidate-inventory.json');
const media = JSON.parse(await fs.readFile(mediaInventoryPath, 'utf8'));
const mediaMatches = [];
for (const f of media.files) {
  const a = await fs.readFile(path.join(mediaRoot,'candidate',f.path));
  const b = await fs.readFile(path.join(root,'tool-projects/11-video-to-audio',f.path));
  assert.equal(a.length,f.bytes); assert.equal(b.length,f.bytes);
  assert.equal(hash(a),f.sha256); assert.equal(hash(b),f.sha256);
  mediaMatches.push({...f,sourceAndFrozenCandidateMatch:true});
}
assert.equal(mediaMatches.length,40);
const candidateFiles = ['NativeContinuationCollector.cs','generation-decision.mjs','generation-decision.test.mjs','receipt-decision.mjs','receipt-decision.test.mjs','node-calibration-fixture.mjs','compile-only.mjs','run-offline-checks.mjs','build-abi-spec.mjs','verify-abi-metadata.ps1','README.md','ABI.md','CALIBRATION.md','EDGE-ISOLATION.md','review-resolution.json','abi-spec.json','sources/sdk-reference.json','sources/ProcessSnapshot.h',compiled.assembly.path];
const candidate = {taskId:'MU20-11-M1',version:'native-candidate-v2',nativeExecution:'NOT_RUN',metadataReflectionOnly:true,files:await Promise.all(candidateFiles.map((p)=>meta(path.join(owner,p)))),
 mediaPin:{inventoryPath:repo(mediaInventoryPath),inventorySha256:hash(await fs.readFile(mediaInventoryPath)),files:mediaMatches},compileReceipt:'compile-2.json',abiReceipt:'abi-metadata.json',offlineReceipt:'offline-2.json',t02:'BLOCKED_EDGE_ISOLATION_GATE'};
await write('candidate-inventory.json',candidate);
const diffPairs=[['baseline/HANDOFF.md',path.join(root,'tool-projects/11-video-to-audio/HANDOFF.md'),'HANDOFF.diff'],['baseline/NativeContinuationCollector.compile-1.cs',path.join(owner,'NativeContinuationCollector.cs'),'NativeContinuationCollector.review.diff'],['baseline/receipt-decision.v1.mjs',path.join(owner,'receipt-decision.mjs'),'receipt-decision.review.diff'],['baseline/node-calibration-fixture.v1.mjs',path.join(owner,'node-calibration-fixture.mjs'),'node-calibration-fixture.review.diff']];
for (const [before,after,output] of diffPairs) {
 const command=['--no-pager','diff','--no-index','--no-ext-diff','--no-textconv',path.join(owner,before),after];
 const child=spawnSync('git',command,{cwd:root,shell:false,windowsHide:true,timeout:30000,encoding:'utf8',maxBuffer:2097152});
 assert.equal(child.status,1,'Expected actual reviewed diff'); assert(!child.stderr || /LF will be replaced/.test(child.stderr),child.stderr);
 await fs.writeFile(path.join(owner,output),child.stdout,{flag:'wx'});
}
const handoffPath=path.join(root,'tool-projects/11-video-to-audio/HANDOFF.md');
const before=await fs.readFile(path.join(owner,'baseline/HANDOFF.md'));
const after=await fs.readFile(handoffPath);
assert(after.subarray(0,before.length).equals(before));
assert(after.subarray(before.length).toString('utf8').includes('MU20-11-M1'));
const envBefore=await read('environment-before.json'),envAfter=await read('environment-after.json');
assert.equal(envBefore.Status,'PASS');assert.equal(envAfter.Status,'PASS');assert.deepEqual(envBefore.Snapshots,envAfter.Snapshots);
const links=[];
for(const name of ['README.md','ABI.md','CALIBRATION.md','EDGE-ISOLATION.md']) {
 const text=await fs.readFile(path.join(owner,name),'utf8');
 for(const m of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) { const href=m[1];if(href.startsWith('https://'))continue;assert(!path.isAbsolute(href)&&!href.includes('..')&&!href.includes('\\'));assert((await fs.stat(path.join(owner,href))).isFile());links.push({document:name,target:href,pass:true}); }
}
const all=[];
async function walk(dir) { for(const ent of await fs.readdir(dir,{withFileTypes:true})){assert(!ent.isSymbolicLink());const full=path.join(dir,ent.name);if(ent.isDirectory())await walk(full);else{const m=await meta(full);assert(!m.path.startsWith('/')&&!m.path.includes('../')&&!m.path.includes(':'));all.push(m);}} }
await walk(owner);
const changeSet={taskId:'MU20-11-M1',status:'OWNED_CHANGES_FROZEN',allowedWriteRoots:[repo(owner)+'/',repo(handoffPath)],handoff:{path:repo(handoffPath),operation:'APPEND_ONLY',beforeBytes:before.length,beforeSha256:hash(before),afterBytes:after.length,afterSha256:hash(after),originalPrefixPreserved:true,diff:'HANDOFF.diff'},
 newOwnedFiles:all.sort((a,b)=>a.path.localeCompare(b.path)),manifestExcludes:['owned-change-set.json','final-validation.json'],nativeCalibration:'NOT_RUN',browser:'NOT_RUN',sourcePublication:'NOT_RUN',deployment:'NOT_RUN'};
await write('owned-change-set.json',changeSet);
const result={taskId:'MU20-11-M1',status:'PASS_REVIEW_CANDIDATE_ONLY',candidateVersion:candidate.version,candidateInventorySha256:hash(await fs.readFile(path.join(owner,'candidate-inventory.json'))),nativeSourceSha256:compiled.source.sha256,assemblySha256:compiled.assembly.sha256,
 checks:{compile:'PASS_ZERO_WARNINGS',syntaxFiles:7,offlineTests:77,offlinePass:77,offlineFail:0,abi:{fields:19,size:120,constants:4,status:'PASS_HEADER_AND_MANAGED_METADATA_ONLY'},sourceApiCount:imports.length,mediaFrozenFilesMatch:40,portableLinks:links},
 environment:{status:'PASS_UNCHANGED',exactSnapshotsEqual:true,snapshots:envAfter.Snapshots},
 scope:{assemblyLoadedForManagedTypeMetadata:true,collectorConstructed:false,pinvokeCalled:false,nodeCalibrationFixtureExecuted:false,unknownProcessesQueried:false,browserExecuted:false,nativeCalibration:'NOT_RUN_PRIMARY_REVIEW_REQUIRED',edge:'BLOCKED_EDGE_ISOLATION_GATE',t03:'NOT_STARTED',sourcePublication:'NOT_RUN',deployment:'NOT_RUN'},
 stillRequired:['Primary acceptance of revised ABI/source and native host/borrowed-handle lifetime','Primary-owned Node primitive calibration incl job B direct membership negative','Genuinely isolated Edge execution capability covering helpers; unknown live outside-job still rejects','Original Chrome+Edge T02 gates before T03/release'],singleZip:'No component ZIP created; primary integrates into one outer delivery archive.'};
await write('final-validation.json',result);
console.log(JSON.stringify({status:result.status,inventorySha256:result.candidateInventorySha256,nativeSourceSha256:result.nativeSourceSha256,assemblySha256:result.assemblySha256,tests:77,abiSize:120,mediaMatch:40,environment:result.environment.status,edge:result.scope.edge}));
