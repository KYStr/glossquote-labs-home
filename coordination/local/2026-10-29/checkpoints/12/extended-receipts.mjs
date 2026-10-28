import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as diagnostics from '../../../tool-projects/12-audio-transcription/public/js/core/memory-phases.mjs';
import * as old from '../../new-tools-2026-10-22/owner-12-cdp/evidence.mjs';
import { cases, failNative } from '../../new-tools-2026-10-22/owner-12-cdp/offline-fixtures.mjs';

// A Node-only independent contract probe; never connects CDP, HTTP or a browser.
const run = new URL('./', import.meta.url);
assert(process.argv[2], 'NEW_OUTPUT_PATH_REQUIRED');
const destination = path.resolve(process.argv[2]);
const candidate = await import(new URL('./evidence.mjs', run));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const before = await readFile(new URL('./evidence.mjs', run));
const external = JSON.parse(await readFile(new URL('../../new-candidates-acceptance-2026-10-23/external/output/evidence/receipt-regression.json', run)));
const negative = external.results.filter(row => row.kind === 'negative');
assert.equal(negative.length, 90);
const externalResults = negative.map(row => {
  const baseline = old.classifyCase(row.input), current = candidate.classifyCase(row.input);
  assert.equal(baseline.status, 'PASS');
  assert.notEqual(current.status, 'PASS');
  assert.notEqual(current.evidenceStatus, 'VALID_THREE_WAY_OBSERVATION');
  return { id: row.id, name: row.name, before: baseline.status, after: current.status, reasons: current.reasons };
});
const contradictions = [];
const stateFields = ['receivedBytes','eof','hashChecked','hashOk','readerLocked','lockObserved','outcomeCode'];
const serverFields = ['Content-Security-Policy','X-Content-Type-Options','Referrer-Policy','X-Frame-Options','X-Robots-Tag','Permissions-Policy','Cache-Control','Content-Type','Content-Length'];
function reject(row, name) {
  const result = candidate.classifyCase(row);
  assert.notEqual(result.status, 'PASS', name);
  assert.notEqual(result.evidenceStatus, 'VALID_THREE_WAY_OBSERVATION', name);
  assert.equal(result.fullNetworkAccepted, false);assert.equal(result.fullT02Accepted, false);
  contradictions.push({ id: row.id, name, status: result.status, reasons: result.reasons });
}
for (const baseline of cases()) {
  assert.equal(candidate.classifyCase(baseline).status, 'PASS');
  const failed = candidate.classifyCase(failNative(structuredClone(baseline)));
  assert.equal(failed.status, 'FAIL');assert.equal(failed.nativeFailures.length, 1);
  for (let stage=0; stage<5; stage++) for (const field of stateFields) {
    const row=structuredClone(baseline);
    row.firstParty.receipts[stage][field] = row.firstParty.receipts[stage][field] === 0 ? 1 : 0;
    reject(row, `stage-${stage}-${field}`);
  }
  for (const field of serverFields) {
    const row=structuredClone(baseline);delete row.server.responseHeaders[field];reject(row, `missing-server-${field}`);
  }
  for (const field of ['content-length','cache-control']) for (const missing of [false,true]) {
    const row=structuredClone(baseline), response=row.native.events.find(e=>e.method==='Network.responseReceived').response;
    if (missing) delete response.headers[field]; else response.headers[field]='contradiction';
    reject(row, `${missing ? 'missing' : 'contradictory'}-native-${field}`);
  }
}
const invalid = cases();invalid[0].native.events.find(e=>e.method==='Network.responseReceived').response.headers['content-length']='1';
const runResult=candidate.classifyRun(invalid);
assert.equal(runResult.conclusion,'INVALID_OR_INCOMPLETE_COMPARISON');
assert.equal(runResult.historicalFailedRetained,69);assert.equal(runResult.historicalMissingTerminalsRetained,3);
assert.equal(runResult.fullNetworkAccepted,false);assert.equal(runResult.fullT02Accepted,false);

// Execute the exact pinned getBytes function with a synthetic Node Web Stream.
// The diagnostic module and reader code are real; fetch is explicitly injected
// and never accesses a network. This does not establish browser acceptance.
const module=await readFile(new URL('./reader-extracted.mjs',run),'utf8');
const reader=module.slice(module.indexOf('async function getBytes('),module.indexOf('export {getBytes};'));
assert.equal(sha(reader),old.FIXTURE.readerSha256);
const payload=await readFile(new URL('../../../tool-projects/12-audio-transcription/test/fixtures/generated/t02-v1/en-04.wav',run));
assert.equal(sha(payload),old.FIXTURE.sha256);
const streamResults=[];
for (const chunkSize of [1,4096,65536,payload.length]) {
  let offset=0, reads=0;
  const stream=new ReadableStream({pull(controller) {
    if (offset===payload.length) {controller.close();return;}
    const end=Math.min(offset+chunkSize,payload.length);controller.enqueue(new Uint8Array(payload.subarray(offset,end)));offset=end;
  }});
  const records=[];diagnostics.enableMemoryTrace(record=>records.push(record));
  try {
    const injectedFetch=async (path,options)=>{
      assert.equal(path,old.FIXTURE.path);
      assert.deepEqual(options,{credentials:'omit',redirect:'error',cache:'no-store'});reads++;
      return {status:200,body:stream};
    };
    const factory=new Function('pageReadDiagnostics','fetch',`let pageReadId=0;const pageReadReceipts=new Map();\n${reader}\nreturn {getBytes,pageReadReceipts};`);
    const api=factory(diagnostics,injectedFetch);
    const bytes=await api.getBytes(old.FIXTURE.path,old.FIXTURE.bytes,1);
    const digest=sha(bytes);assert.equal(digest,old.FIXTURE.sha256);
    api.pageReadReceipts.get(1).record(diagnostics.READ_EVENT.HASH_RESULT,{hashChecked:1,hashOk:1,reasonCode:0});
    const value={outcome:'SUCCESS',receivedBytes:bytes.length,sha256:digest,receipts:records,overflow:false,readerSha256:old.FIXTURE.readerSha256};
    assert.equal(reads,1);assert.equal(records.length,5);
    const row=cases()[0];row.firstParty=value;
    const result=candidate.classifyCase(row);assert.equal(result.status,'PASS');
    streamResults.push({chunkSize,status:result.status,receipts:records});
  } finally {diagnostics.disableMemoryTrace();}
}
assert.equal(sha(await readFile(new URL('./evidence.mjs',run))),sha(before));
await mkdir(path.dirname(destination),{recursive:true});
const result={status:'PASS',scope:'NODE_SYNTHETIC_RECEIPTS_AND_FIXED_READER_WEBSTREAM_ONLY',runtime:process.version,candidateSha256:sha(before),externalNegativeReplayed:externalResults.length,positive:6,nativeFailuresPreserved:6,independentMutations:contradictions.length,nodeReaderStreamCases:streamResults.length,externalResults,contradictions,streamResults,runResult,browser:'NOT_RUN_USER_FOCUS_INCIDENT',fullT02Accepted:false};
await writeFile(destination,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,externalNegativeReplayed:result.externalNegativeReplayed,independentMutations:result.independentMutations,nodeReaderStreamCases:result.nodeReaderStreamCases,browser:result.browser}));
