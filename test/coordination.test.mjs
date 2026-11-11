import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBatch, applyOperation, inventorySummary, operationReferences, validateRegistry, SPEC_SECTIONS, REPOSITORY, BRANCH } from '../scripts/coordination-core.mjs';
import { MAX_REGISTRY_BYTES, MAX_RESPONSE_BYTES, executeBatch, executeOperation, GitHubError, GitHubClient } from '../scripts/coordination.mjs';

const source = {repository: REPOSITORY, commit: 'a'.repeat(40), path: 'README.md'};
const proof = {repository: REPOSITORY, commit: 'b'.repeat(40), path: 'coordination/evidence.md'};
const candidate = {repository: 'KYStr/example-tool', commit: 'c'.repeat(40), path: 'public/index.html'};
const criteria = [{id: 'functionality', label: '功能'}, {id: 'usability', label: '操作'}, {id: 'reliability', label: '可靠性'}];
const author = {id: 'cloud-dot:actual-thread-1111:author', executor: 'cloud-dot'};
const reviewer = {id: 'cloud-dot:actual-thread-2222:reviewer', executor: 'cloud-dot'};
const local = {id: 'local-codex:actual-thread-3333:maker', executor: 'local-codex'};
const local2 = {id: 'local-codex:actual-thread-4444:maker', executor: 'local-codex'};
let sequence = 0;
const clone = value => structuredClone(value);
function empty() {
  return {schemaVersion: 1, contractVersion: '2026-10-29.1', revision: 0, repository: REPOSITORY, branch: BRANCH,
    baseline: {homepage: source, reconciliation: {'local-codex': null, 'cloud-dot': null}, inventoryComplete: false}, actors: [], specs: [], tasks: [], events: []};
}
function command(registry, actor, action, extra = {}) {
  return {operationId: `fixture-operation-${++sequence}`, expectedRevision: registry.revision, observedAt: '2026-10-29T01:00:00.000Z', actor, action, ...extra};
}
function apply(registry, actor, action, extra) { return applyOperation(registry, command(registry, actor, action, extra)).registry; }
function acknowledge(registry, actor) { return apply(registry, actor, 'acknowledge', {contractVersion: registry.contractVersion, baselineCommit: registry.baseline.homepage.commit, evidence: 'Fixture actor explicitly read this exact rule and baseline.'}); }
function reconciled() {
  let registry = empty();
  for (const actor of [author, reviewer, local, local2]) registry = acknowledge(registry, actor);
  for (const actor of [author, local]) registry = apply(registry, actor, 'reconcile', {inventoryComplete: true, taskIds: [], specIds: [], evidence: 'Fixture complete environment inventory.', evidenceRef: proof});
  return registry;
}
function addSpec(registry, specId = 'fixture-spec', ready = true) {
  registry = apply(registry, author, 'register-spec', {spec: {id: specId, title: `Fixture ${specId}`, document: {...proof, path: `specs/${specId}.md`}, source, acceptanceCriteria: criteria}});
  if (ready) registry = apply(registry, reviewer, 'mark-spec-ready', {specId, sections: Object.fromEntries(SPEC_SECTIONS.map(key => [key, true])), evidence: 'Fixture independent full specification review.'});
  return registry;
}
function addTask(registry, taskId = 'fixture-task', options = {}) {
  return apply(registry, author, 'register-task', {task: {id: taskId, title: taskId, workType: 'production', source, brief: proof, specId: 'fixture-spec', acceptanceCriteria: criteria, ...options}});
}
function production() { return addTask(addSpec(reconciled())); }
function reviewable() {
  let registry = production();
  registry = apply(registry, local, 'claim', {taskId: 'fixture-task'});
  const claimId = registry.tasks[0].owner.claimId;
  registry = apply(registry, local, 'start', {taskId: 'fixture-task', claimId, evidence: 'Fixture work actually started.'});
  return apply(registry, local, 'submit', {taskId: 'fixture-task', claimId, candidate, pullRequest: 'https://github.com/KYStr/example-tool/pull/1', evidenceRef: proof, evidence: 'Fixture candidate and checks uploaded; no deployment.'});
}
function goodReview(registry, overrides = {}) {
  return command(registry, reviewer, 'review', {taskId: 'fixture-task', candidate, verdict: 'accepted', evidenceRef: proof, evidence: 'Fixture independent exact-candidate review.', rubricComplete: true, requiredChecksComplete: true, aspects: criteria.map(row => ({id: row.id, score: 90, evidence: `Fixture observed evidence for ${row.id}.`})), ...overrides});
}

test('unknown inventory is null; catalog draft/published counts do not become ready stock', () => {
  const registry = empty(); registry.catalog = {published: 47, draft: 9};
  assert.deepEqual(inventorySummary(registry).readyUnconsumedCount, null);
  assert.equal(inventorySummary(registry).specPriority, null);
  assert.equal(inventorySummary(registry).reconciliationPriority, 'P1');
  assert.equal(inventorySummary(reconciled()).readyUnconsumedCount, 0);
});

test('complete reviewed specifications follow 39 -> 40 -> 39 stock threshold on production claim', () => {
  let registry = reconciled();
  for (let i = 0; i < 39; i++) registry = addSpec(registry, `spec-${i}`);
  assert.equal(inventorySummary(registry).readyUnconsumedCount, 39);
  assert.equal(inventorySummary(registry).specPriority, 'P1');
  registry = addSpec(registry, 'fixture-spec');
  assert.equal(inventorySummary(registry).readyUnconsumedCount, 40);
  assert.equal(inventorySummary(registry).specPriority, 'P3');
  registry = addTask(registry);
  registry = apply(registry, local, 'claim', {taskId: 'fixture-task'});
  assert.equal(inventorySummary(registry).readyUnconsumedCount, 39);
  assert.equal(inventorySummary(registry).specPriority, 'P1');
  assert.equal(inventorySummary(registry).productionPriority, 'P3');
});

test('new claim requires both reconciliation reports and exact actor ACK', () => {
  let registry = empty(); for (const actor of [author, reviewer, local]) registry = acknowledge(registry, actor);
  registry = addTask(addSpec(registry));
  assert.throws(() => apply(registry, local, 'claim', {taskId: 'fixture-task'}), {code: 'RECONCILIATION_REQUIRED'});
  const ready = production(); ready.actors = ready.actors.filter(actor => actor.id !== local2.id);
  assert.throws(() => apply(ready, local2, 'claim', {taskId: 'fixture-task'}), {code: 'ACK_REQUIRED'});
  assert.throws(() => acknowledge(empty(), {id: '/root', executor: 'cloud-dot'}), {code: 'INVALID_ACTOR'});
});

test('cloud cannot take production merely because it is idle; spec-writing tasks do not require a finished spec', () => {
  const registry = production();
  assert.throws(() => apply(registry, author, 'claim', {taskId: 'fixture-task'}), {code: 'EXECUTOR_NOT_ALLOWED'});
  let writing = addTask(reconciled(), 'write-new-spec', {workType: 'spec', specId: null});
  writing = apply(writing, author, 'claim', {taskId: 'write-new-spec'});
  assert.equal(writing.tasks[0].owner.actorId, author.id);
  assert.equal(inventorySummary(writing).readyUnconsumedCount, 0);
});

test('spec approval requires complete sections and an independent reviewer; production rubric cannot shrink', () => {
  let registry = addSpec(reconciled(), 'fixture-spec', false);
  assert.throws(() => apply(registry, author, 'mark-spec-ready', {specId: 'fixture-spec', sections: Object.fromEntries(SPEC_SECTIONS.map(key => [key, true])), evidence: 'Self review is insufficient.'}), {code: 'INDEPENDENT_REVIEW_REQUIRED'});
  assert.throws(() => apply(registry, reviewer, 'mark-spec-ready', {specId: 'fixture-spec', sections: {goal: true}, evidence: 'Missing sections.'}), {code: 'INCOMPLETE_SPEC'});
  registry = apply(registry, reviewer, 'mark-spec-ready', {specId: 'fixture-spec', sections: Object.fromEntries(SPEC_SECTIONS.map(key => [key, true])), evidence: 'Complete independent review.'});
  assert.throws(() => addTask(registry, 'reduced-rubric', {acceptanceCriteria: criteria.slice(0, 1)}), {code: 'RUBRIC_MISMATCH'});
});

test('stale time does not release a claim and the same ready spec cannot fund two production tasks', () => {
  let registry = production(); registry = addTask(registry, 'second-task');
  registry = apply(registry, local, 'claim', {taskId: 'fixture-task'});
  const later = command(registry, local2, 'claim', {taskId: 'fixture-task', observedAt: '2027-10-29T01:00:00.000Z'});
  assert.throws(() => applyOperation(registry, later), {code: 'ALREADY_OWNED'});
  assert.throws(() => apply(registry, local2, 'claim', {taskId: 'second-task'}), {code: 'SPEC_UNAVAILABLE'});
});

test('release preserves consumed stock and explicit re-claim resumes the same work only', () => {
  let registry = production(); registry = apply(registry, local, 'claim', {taskId: 'fixture-task'});
  const claimId = registry.tasks[0].owner.claimId;
  registry = apply(registry, local, 'release', {taskId: 'fixture-task', claimId, checkpoint: 'Fixture checkpoint saved to GitHub.', reason: 'Explicit release.', evidenceRef: proof});
  assert.equal(inventorySummary(registry).readyUnconsumedCount, 0);
  assert.equal(registry.tasks[0].owner, null);
  registry = apply(registry, local2, 'claim', {taskId: 'fixture-task'});
  assert.equal(registry.tasks[0].owner.actorId, local2.id);
});

test('handoff requires source owner pause plus exact receiving acceptance; stale owner cannot resume', () => {
  let registry = production(); registry = apply(registry, local, 'claim', {taskId: 'fixture-task'});
  const claimId = registry.tasks[0].owner.claimId;
  registry = apply(registry, local, 'offer-handoff', {taskId: 'fixture-task', claimId, toActorId: local2.id, checkpoint: 'Safe checkpoint.', evidenceRef: proof});
  assert.equal(registry.tasks[0].owner.actorId, local.id);
  assert.throws(() => apply(registry, local, 'resume', {taskId: 'fixture-task', claimId, evidence: 'Still has no receiving ACK.'}), {code: 'HANDOFF_PENDING'});
  const offerId = registry.tasks[0].handoff.offerId;
  registry = apply(registry, local2, 'accept-handoff', {taskId: 'fixture-task', offerId, evidence: 'Receiver checked exact checkpoint.'});
  assert.equal(registry.tasks[0].owner.actorId, local2.id);
  assert.throws(() => apply(registry, local, 'resume', {taskId: 'fixture-task', claimId, evidence: 'Old owner.'}), {code: 'NOT_OWNER'});
});

test('acceptance requires every fixed aspect >=90, same candidate, independent reviewer and complete checks', () => {
  const registry = reviewable();
  assert.throws(() => applyOperation(registry, goodReview(registry, {actor: local})), {code: 'INDEPENDENT_REVIEW_REQUIRED'});
  assert.throws(() => applyOperation(registry, goodReview(registry, {candidate: {...candidate, commit: 'd'.repeat(40)}})), {code: 'CANDIDATE_MISMATCH'});
  assert.throws(() => applyOperation(registry, goodReview(registry, {aspects: [{id: 'functionality', score: 100, evidence: 'One aspect only.'}]})), {code: 'INCOMPLETE_REVIEW'});
  assert.throws(() => applyOperation(registry, goodReview(registry, {aspects: criteria.map((row, index) => ({id: row.id, score: index === 1 ? 89 : 100, evidence: 'A high average cannot cover a failing aspect.'}))})), {code: 'SCORE_BELOW_TARGET'});
  assert.throws(() => applyOperation(registry, goodReview(registry, {requiredChecksComplete: false})), {code: 'INCOMPLETE_REVIEW'});
  const accepted = applyOperation(registry, goodReview(registry)).registry;
  assert.equal(accepted.tasks[0].status, 'accepted');
  assert.equal(accepted.tasks[0].publication, null);
});

test('existing work import holds unfinished specs without inventing ready stock and resolves known pending work', () => {
  let registry = empty(); for (const actor of [author, reviewer, local]) registry = acknowledge(registry, actor);
  registry.pendingReconciliationTasks = [{id: 'known-local-work', executor: 'local-codex', resolvedTaskId: null}];
  registry = addTask(addSpec(registry, 'fixture-spec', false));
  assert.throws(() => apply(registry, local, 'reconcile', {inventoryComplete: true, taskIds: [], specIds: [], evidence: 'Omitted actual existing work.', evidenceRef: proof}), {code: 'INCOMPLETE_RECONCILIATION'});
  registry = apply(registry, local, 'adopt-existing', {taskId: 'fixture-task', pendingId: 'known-local-work', checkpoint: 'Existing work paused and pushed.', evidence: 'Actual prior local work.', evidenceRef: proof});
  assert.equal(registry.specs[0].status, 'reserved');
  assert.equal(registry.tasks[0].status, 'blocked');
  for (const actor of [author, local]) registry = apply(registry, actor, 'reconcile', {inventoryComplete: true, taskIds: actor === local ? ['fixture-task'] : [], specIds: ['fixture-spec'], evidence: 'Complete environment inventory.', evidenceRef: proof});
  assert.equal(inventorySummary(registry).readyUnconsumedCount, 0);
  const claimId = registry.tasks[0].owner.claimId;
  assert.throws(() => apply(registry, local, 'resume', {taskId: 'fixture-task', claimId, evidence: 'Cannot resume incomplete spec.'}), {code: 'INCOMPLETE_SPEC'});
  registry = apply(registry, reviewer, 'mark-spec-ready', {specId: 'fixture-spec', sections: Object.fromEntries(SPEC_SECTIONS.map(key => [key, true])), evidence: 'Existing spec independently completed.'});
  registry = apply(registry, local, 'resume', {taskId: 'fixture-task', claimId, evidence: 'Current owner resumed after completed gates.'});
  assert.equal(registry.tasks[0].status, 'working');
});

test('changing homepage baseline invalidates both reconciliations and old actor acknowledgements', () => {
  let registry = reconciled();
  registry = apply(registry, local, 'change-baseline', {homepage: {...source, commit: 'e'.repeat(40)}, evidence: 'Actual newer local homepage was uploaded.', evidenceRef: proof});
  assert.equal(registry.baseline.inventoryComplete, false);
  assert.equal(inventorySummary(registry).readyUnconsumedCount, null);
  assert.throws(() => addSpec(registry), {code: 'ACK_REQUIRED'});
  for (const actor of [author, local]) { registry = acknowledge(registry, actor); registry = apply(registry, actor, 'reconcile', {inventoryComplete: true, taskIds: [], specIds: [], evidence: 'Reconciled new baseline.', evidenceRef: proof}); }
  assert.equal(inventorySummary(registry).readyUnconsumedCount, 0);
});

test('exact repeated operation is idempotent, but altered reuse and stale expected revision fail', () => {
  const registry = production(); const cmd = command(registry, local, 'claim', {taskId: 'fixture-task'});
  const once = applyOperation(registry, cmd);
  assert.equal(applyOperation(once.registry, cmd).idempotent, true);
  assert.throws(() => applyOperation(once.registry, {...cmd, observedAt: '2026-10-29T02:00:00.000Z'}), {code: 'IDEMPOTENCY_CONFLICT'});
  assert.throws(() => applyOperation(once.registry, {...cmd, operationId: 'different-claim'}), {code: 'REVISION_CONFLICT'});
});

class FakeGitHub {
  constructor(registry) { this.registry = clone(registry); this.sha = 'blob-0'; this.writes = 0; this.reads = 0; this.loseResponse = false; }
  async readRegistry() { this.reads++; return {registry: clone(this.registry), sha: this.sha, url: 'https://github.com/example/registry'}; }
  async writeRegistry(sha, registry) {
    this.writes++;
    if (sha !== this.sha) throw new GitHubError(409);
    this.registry = clone(registry); this.sha = `blob-${this.writes}`;
    if (this.loseResponse) throw new GitHubError(0);
  }
}

test('two stale claim snapshots race through GitHub CAS: exactly one owner wins, no write retry', async () => {
  const registry = production(); const client = new FakeGitHub(registry);
  const [a, b] = await Promise.allSettled([
    executeOperation(client, command(registry, local, 'claim', {taskId: 'fixture-task'}), {verifyReferences: false}),
    executeOperation(client, command(registry, local2, 'claim', {taskId: 'fixture-task'}), {verifyReferences: false})
  ]);
  assert.equal(a.status, 'fulfilled'); assert.equal(a.value.workMayStart, true);
  assert.equal(b.status, 'rejected'); assert.equal(b.reason.code, 'REVISION_CONFLICT');
  assert.equal(client.registry.tasks[0].owner.actorId, local.id);
  assert.equal(client.writes, 2);
});

test('lost PUT response is reconciled by exact operation hash without a second write', async () => {
  const registry = production(); const client = new FakeGitHub(registry); client.loseResponse = true;
  const cmd = command(registry, local, 'claim', {taskId: 'fixture-task'});
  const result = await executeOperation(client, cmd, {verifyReferences: false});
  assert.equal(result.reconciledAfterLostResponse, true); assert.equal(result.workMayStart, true); assert.equal(client.writes, 1);
  const repeated = await executeOperation(client, cmd, {verifyReferences: false});
  assert.equal(repeated.idempotent, true); assert.equal(repeated.putAttempted, false); assert.equal(client.writes, 1);
});

test('failed authoritative readback never grants permission to start and never repeats PUT', async () => {
  const registry = production(); const client = new FakeGitHub(registry);
  const read = client.readRegistry.bind(client); client.readRegistry = async () => { if (client.reads > 0) throw new Error('offline'); return read(); };
  await assert.rejects(executeOperation(client, command(registry, local, 'claim', {taskId: 'fixture-task'}), {verifyReferences: false}), {code: 'OUTCOME_UNKNOWN'});
  assert.equal(client.writes, 1);
});

test('remote source verification rejects missing files and PRs whose head changed', async () => {
  let requested;
  const client = new GitHubClient('fixture-secret-not-real', {fetchFn: async (url, init) => {
    requested = {url, init}; return {ok: true, text: async () => JSON.stringify({head: {sha: 'd'.repeat(40), repo: {full_name: candidate.repository}}, state: 'open'})};
  }});
  await assert.rejects(client.verifyPullRequest('https://github.com/KYStr/example-tool/pull/1', candidate), {code: 'CANDIDATE_MISMATCH'});
  assert.equal(requested.init.redirect, 'error');
  assert.equal(requested.url, 'https://api.github.com/repos/KYStr/example-tool/pulls/1');
  await assert.rejects(client.verifyReference(source), {code: 'MISSING_SOURCE'});
});

test('a malformed direct registry edit cannot silently manufacture accepted work', () => {
  const registry = reviewable(); registry.tasks[0].status = 'accepted'; registry.tasks[0].acceptance = null;
  assert.throws(() => validateRegistry(registry), {code: 'INCOMPLETE_REVIEW'});
});

test('the same specification document cannot be counted twice; revision withdraws ready state and cannot alter dispatched criteria', () => {
  let registry = addSpec(reconciled());
  assert.throws(() => apply(registry, author, 'register-spec', {spec: {id: 'duplicate-spec', title: 'Same document copied under another ID', document: registry.specs[0].document, source, acceptanceCriteria: criteria}}), {code: 'DUPLICATE_SPEC'});
  registry = apply(registry, author, 'revise-spec', {specId: 'fixture-spec', document: {...registry.specs[0].document, commit: 'f'.repeat(40)}, source, acceptanceCriteria: criteria, evidence: 'An unassigned spec changed and needs independent review again.'});
  assert.equal(registry.specs[0].status, 'draft'); assert.equal(inventorySummary(registry).readyUnconsumedCount, 0);
  registry = addTask(registry);
  assert.throws(() => apply(registry, author, 'revise-spec', {specId: 'fixture-spec', document: registry.specs[0].document, source, acceptanceCriteria: criteria.slice(0, 1), evidence: 'Attempt to drop a dispatched criterion.'}), {code: 'SPEC_ALREADY_ASSIGNED'});
});


function batchStock(count = 6) {
  let registry = reconciled();
  for (let i = 0; i < count; i++) {
    registry = addSpec(registry, `batch-spec-${i}`);
    registry = addTask(registry, `batch-task-${i}`, {specId: `batch-spec-${i}`});
  }
  return registry;
}
function claimBatch(registry, actor = local, start = 0, count = 5) {
  return Array.from({length: count}, (_, i) => command(registry, actor, 'claim', {taskId: `batch-task-${start+i}`, expectedRevision: registry.revision+i}));
}
test('five claims use one CAS and individual readbacks; reservations are not execution', async () => {
  const registry = batchStock(), client = new FakeGitHub(registry), commands = claimBatch(registry);
  const result = await executeBatch(client, commands, {verifyReferences: false});
  assert.equal(client.writes, 1); assert.equal(result.receipts.length, 5);
  assert.equal(new Set(result.receipts.map(r => r.operationId)).size, 5);
  assert.ok(result.receipts.every(r => r.taskStatus === 'claimed' && !r.actualExecutionClaimed));
  assert.equal(client.registry.tasks.filter(t => t.status === 'working').length, 0);
  assert.equal(inventorySummary(client.registry).readyUnconsumedCount, 1);
  assert.equal((await executeBatch(client, commands, {verifyReferences:false})).receipts[0].idempotent, true);
  assert.equal(client.writes, 1);
});
test('existing own item can top up four; sixth claim and second concurrent start fail', () => {
  let registry = batchStock();
  registry = apply(registry, local, 'claim', {taskId:'batch-task-0'});
  const own = clone(registry.tasks[0].owner);
  registry = applyBatch(registry, claimBatch(registry, local, 1, 4)).registry;
  assert.deepEqual(registry.tasks[0].owner, own);
  assert.throws(() => apply(registry, local, 'claim', {taskId:'batch-task-5'}), {code:'CLAIM_LIMIT'});
  const start = i => ({taskId:`batch-task-${i}`,claimId:registry.tasks[i].owner.claimId,evidence:'Actual fixture start.'});
  registry = apply(registry, local, 'start', start(0));
  assert.throws(() => apply(registry, local, 'start', start(1)), {code:'ACTIVE_LIMIT'});
  registry = apply(registry, local, 'block', {...start(0),checkpoint:'Completed fixture candidate retained.',blocker:'Await complete batch submission, not revision.',resumeCondition:'batch submit ready'});
  registry = apply(registry, local, 'start', start(1));
  assert.equal(registry.tasks[0].status,'blocked');assert.equal(registry.tasks[1].status,'working');
});
test('invalid last child, insufficient batch, stale revision and disallowed executor never PUT or mutate input', async () => {
  for (const kind of ['missing','short','stale','executor']) {
    const registry=batchStock(), before=clone(registry), client=new FakeGitHub(registry);
    const commands=claimBatch(registry,kind==='executor'?author:local,0,kind==='short'?4:5);
    if(kind==='missing') commands[4].taskId='absent-task';
    if(kind==='stale') commands[4].expectedRevision--;
    await assert.rejects(executeBatch(client,commands,{verifyReferences:false}));
    assert.equal(client.writes,0);assert.deepEqual(registry,before);assert.deepEqual(client.registry,before);
  }
});
test('batch race preserves winning owners; no CAS retry', async () => {
  const registry=batchStock(), client=new FakeGitHub(registry);
  const results=await Promise.allSettled([executeBatch(client,claimBatch(registry),{verifyReferences:false}),executeBatch(client,claimBatch(registry,local2),{verifyReferences:false})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.code,'REVISION_CONFLICT');
  assert.ok(client.registry.tasks.slice(0,5).every(t=>t.owner.actorId===local.id));assert.equal(client.writes,2);
});
test('lost batch response resolves all original hashes; partial/altered retry cannot write', async () => {
  const registry=batchStock(),client=new FakeGitHub(registry),commands=claimBatch(registry);client.loseResponse=true;
  const result=await executeBatch(client,commands,{verifyReferences:false});
  assert.ok(result.receipts.every(r=>r.reconciledAfterLostResponse));assert.equal(client.writes,1);
  const changed=clone(commands);changed[4].observedAt='2026-10-30T01:00:00.000Z';
  await assert.rejects(executeBatch(client,changed,{verifyReferences:false}),{code:'IDEMPOTENCY_CONFLICT'});
  const partial=new FakeGitHub(applyOperation(registry,commands[0]).registry);
  await assert.rejects(executeBatch(partial,commands,{verifyReferences:false}),{code:'PARTIAL_BATCH'});assert.equal(partial.writes,0);
});
test('failed batch readback remains unknown without repeat PUT', async () => {
  const registry=batchStock(),client=new FakeGitHub(registry),read=client.readRegistry.bind(client);
  client.readRegistry=async()=>{if(client.reads)throw new Error('offline');return read();};
  await assert.rejects(executeBatch(client,claimBatch(registry),{verifyReferences:false}),{code:'OUTCOME_UNKNOWN'});assert.equal(client.writes,1);
});
test('reference failure for any child prevents the whole batch write',async()=>{
  const registry=batchStock(),client=new FakeGitHub(registry);client.verifyReference=async()=>{throw new Error('missing source');};
  await assert.rejects(executeBatch(client,claimBatch(registry)),/missing source/);assert.equal(client.writes,0);
});
test('submitted work retains owner but frees unsubmitted slots; batch review still rejects self-scoring',()=>{
  let registry=reviewable();const own=clone(registry.tasks[0].owner);
  for(let i=0;i<5;i++){registry=addSpec(registry,`batch-spec-${i}`);registry=addTask(registry,`batch-task-${i}`,{specId:`batch-spec-${i}`});}
  registry=applyBatch(registry,claimBatch(registry)).registry;
  assert.deepEqual(registry.tasks[0].owner,own);assert.equal(registry.tasks[0].status,'reviewing');
  assert.throws(()=>applyBatch(registry,[goodReview(registry,{actor:local})]),{code:'INDEPENDENT_REVIEW_REQUIRED'});
  assert.throws(()=>applyBatch(registry,[goodReview(registry,{candidate:{...candidate,commit:'d'.repeat(40)}})]),{code:'CANDIDATE_MISMATCH'});
});

test('five completed checkpoints submit atomically with distinct candidates and retain independent review gates', async () => {
  let registry = batchStock(); registry = applyBatch(registry, claimBatch(registry)).registry;
  for (const task of registry.tasks.slice(0,5)) {
    const ids = {taskId:task.id,claimId:task.owner.claimId};
    registry=apply(registry,local,'start',{...ids,evidence:'Fixture actual sequential production.'});
    registry=apply(registry,local,'block',{...ids,checkpoint:`Fixed completed candidate ${task.id}`,blocker:'Await batch submission, not revision.',resumeCondition:'batch submit ready'});
  }
  let staged=registry; const commands=[];
  for(let i=0;i<5;i++){
    const task=staged.tasks[i], ids={taskId:task.id,claimId:task.owner.claimId};
    for(const [action,extra] of [['resume',{evidence:'Original completion checkpoint verified for submission.'}],['submit',{candidate:{...candidate,commit:String(i+1).repeat(40)},pullRequest:`https://github.com/KYStr/example-tool/pull/${i+1}`,evidence:'Completed individual candidate.',evidenceRef:proof}]]) {
      const cmd=command(staged,local,action,{...ids,...extra});commands.push(cmd);staged=applyOperation(staged,cmd).registry;
    }
  }
  const client=new FakeGitHub(registry);client.verifyReference=async()=>{};const prs=[];client.verifyPullRequest=async(url,c)=>prs.push([url,c.commit]);
  const result=await executeBatch(client,commands);
  assert.equal(client.writes,1);assert.equal(prs.length,5);assert.equal(result.receipts.length,10);
  assert.ok(client.registry.tasks.slice(0,5).every(t=>t.status==='reviewing'&&t.owner.actorId===local.id));
  assert.equal(new Set(client.registry.tasks.slice(0,5).map(t=>t.submission.candidate.commit)).size,5);
  assert.ok(client.registry.tasks.slice(0,5).every(t=>t.acceptance===null));
});

test('historical overflow preserves owners and blocks new claims without invalidating registry',()=>{
  let registry=batchStock(7);registry=applyBatch(registry,claimBatch(registry)).registry;
  // Simulate a previously submitted task returning for revision after the next batch was reserved.
  const prior=clone(registry.tasks[0]);prior.id='historical-revision';prior.specId='batch-spec-6';prior.status='revision';
  registry.tasks.push(prior);assert.equal(validateRegistry(registry),registry);
  const owners=registry.tasks.map(t=>clone(t.owner));
  assert.throws(()=>apply(registry,local,'claim',{taskId:'batch-task-5'}),{code:'CLAIM_LIMIT'});
  assert.deepEqual(registry.tasks.map(t=>t.owner),owners);
});

test('revision return takes priority over another reserved production item',()=>{
  let registry=batchStock();registry=applyBatch(registry,claimBatch(registry)).registry;
  registry.tasks[0].status='revision';
  const ids=i=>({taskId:registry.tasks[i].id,claimId:registry.tasks[i].owner.claimId,evidence:'Fixture actual resume.'});
  assert.throws(()=>apply(registry,local,'start',ids(1)),{code:'REVISION_FIRST'});
  registry=apply(registry,local,'resume',ids(0));assert.equal(registry.tasks[0].status,'working');
});

function registryPayload(registry, suffix = '') {
  const bytes=Buffer.from(JSON.stringify(registry)+suffix);
  return {type:'file',sha:createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),size:bytes.length,encoding:'base64',content:bytes.toString('base64'),html_url:'https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/coordination/work-registry.json'};
}
function readClient(responses) {
  const calls=[];const client=new GitHubClient('',{fetchFn:async(url,init)=>{calls.push({url,init});const value=responses.shift();if(value instanceof Error)throw value;if(typeof value==='number')return {ok:false,status:value};return {ok:true,text:async()=>JSON.stringify(value)};}});
  return {client,calls};
}
test('small Contents payload retains exact SHA and valid registry with no fallback',async()=>{
  const payload=registryPayload(reconciled()),{client,calls}=readClient([payload]);
  const result=await client.readRegistry();assert.equal(result.sha,payload.sha);assert.equal(result.registry.revision,6);assert.equal(calls.length,1);assert.equal(calls[0].init.redirect,'error');
});
test('large encoding-none metadata reads only exact same-repository Git blob, preserving all history',async()=>{
  const registry=reconciled();registry.padding='x'.repeat(1024*1024);const payload=registryPayload(registry);
  const metadata={...payload,encoding:'none',content:'',git_url:'https://evil.test/blob',download_url:'https://evil.test/raw'};
  const {client,calls}=readClient([metadata,payload]);const result=await client.readRegistry();
  assert.deepEqual(result.registry,registry);assert.equal(result.sha,payload.sha);
  assert.equal(calls[1].url,`https://api.github.com/repos/${REPOSITORY}/git/blobs/${payload.sha}`);assert.equal(calls[1].init.redirect,'error');
});
test('registry decoder rejects bad metadata, noncanonical base64, size/hash mismatch and invalid UTF8/JSON',async()=>{
  const payload=registryPayload(reconciled());
  const malformed=[{...payload,sha:'bad'},{...payload,size:0},{...payload,size:1.5},{...payload,type:'symlink'},{...payload,encoding:'none',content:'not empty'},{...payload,content:payload.content+'!'},{...payload,content:payload.content.slice(0,-1)},{...payload,size:payload.size+1},{...payload,sha:'f'.repeat(40)}];
  for(const data of malformed)await assert.rejects(readClient([data]).client.readRegistry());
  for(const bytes of [Buffer.from([0xff]),Buffer.from('not JSON'),Buffer.from('{}')]){
    const data={...payload,size:bytes.length,sha:createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),content:bytes.toString('base64')};
    await assert.rejects(readClient([data]).client.readRegistry(),{code:'INVALID_REGISTRY'});
  }
  // Nonzero padding bits decode to identical bytes but must be rejected.
  await assert.rejects(readClient([{...payload,size:1,content:'e31=',sha:'a'.repeat(40)}]).client.readRegistry());
});
test('fallback refuses wrong blob identity/size/encoding and missing blob without retries',async()=>{
  const payload=registryPayload(reconciled()),metadata={...payload,encoding:'none',content:''};
  for(const bad of [{...payload,sha:'f'.repeat(40)},{...payload,size:payload.size+1},{...payload,encoding:'none',content:''},404]) {
    const {client,calls}=readClient([metadata,bad]);await assert.rejects(client.readRegistry());assert.equal(calls.length,2);
  }
});
test('raw 4 MiB and JSON 8 MiB limits are bounded; at-limit registry still reads',async()=>{
  const registry=reconciled(),base=Buffer.byteLength(JSON.stringify(registry));const payload=registryPayload(registry,' '.repeat(MAX_REGISTRY_BYTES-base));
  assert.equal(payload.size,MAX_REGISTRY_BYTES);assert.deepEqual((await readClient([payload]).client.readRegistry()).registry,registry);
  const {client,calls}=readClient([{...payload,size:MAX_REGISTRY_BYTES+1,encoding:'none',content:''}]);
  await assert.rejects(client.readRegistry(),{code:'REGISTRY_TOO_LARGE'});assert.equal(calls.length,1);
  const big=new GitHubClient('',{fetchFn:async()=>({ok:true,text:async()=> ' '.repeat(MAX_RESPONSE_BYTES+1)})});
  await assert.rejects(big.readRegistry(),{code:'RESPONSE_TOO_LARGE'});
});
test('lost write readback can cross Contents threshold and still resolves original operation exactly',async()=>{
  const registry=production(),cmd=command(registry,local,'claim',{taskId:'fixture-task'}),after=applyOperation(registry,cmd).registry;
  after.padding='x'.repeat(1024*1024);const payload=registryPayload(after),metadata={...payload,encoding:'none',content:''};
  let puts=0;const urls=[];const responses=[registryPayload(registry),metadata,payload];
  const client=new GitHubClient('fixture-not-real',{fetchFn:async(url,init)=>{urls.push(url);if(init.method==='PUT'){puts++;throw new Error('lost');}return{ok:true,text:async()=>JSON.stringify(responses.shift())};}});
  const result=await executeOperation(client,cmd,{verifyReferences:false});assert.equal(puts,1);assert.equal(result.reconciledAfterLostResponse,true);assert.equal(result.operationId,cmd.operationId);assert.equal(urls.at(-1),`https://api.github.com/repos/${REPOSITORY}/git/blobs/${payload.sha}`);
});

test('oversized proposed write fails before PUT and noncanonical pad bits fail even at matching byte hash',async()=>{
  const {client,calls}=readClient([]);await assert.rejects(client.writeRegistry('a'.repeat(40),{padding:'x'.repeat(MAX_REGISTRY_BYTES)},{action:'fixture',operationId:'fixture'}),{code:'REGISTRY_TOO_LARGE'});assert.equal(calls.length,0);
  const bytes=Buffer.from('0'),sha=createHash('sha1').update('blob 1\0').update(bytes).digest('hex');
  await assert.rejects(readClient([{type:'file',sha,size:1,encoding:'base64',content:'MB=='}]).client.readRegistry(),{code:'INVALID_RESPONSE'});
});

const primary = {id: 'local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf', executor: 'local-codex'};
const mappingMaker = {id: 'local-codex:fixture-mapping-maker', executor: 'local-codex'};
const originalMaker = {id: 'cloud-dot:fixture-original-maker', executor: 'cloud-dot'};
const ageSpec = 'spec-age-calculator-20261109';
const billSpec = 'spec-bill-split-calculator-20261109';
const originTask = 'fixture-accepted-repair';
const mappingTask = 'fixture-spec-mapping';
const mappingPR = 'https://github.com/KYStr/glossquote-labs-home/pull/99';
const mappingRef = {...proof, commit: 'e'.repeat(40), path: 'docs/reviews/spec-mapping.json'};
const mappingCandidate = {...mappingRef, path: 'docs/reviews/mapping-check.md'};
const originCandidate = {...proof, commit: 'd'.repeat(40), path: 'docs/reviews/source-repair.md'};
const ancestorMaker = {id: 'local-codex:fixture-ancestor-maker', executor: 'local-codex'};
const ancestorTask = 'fixture-ancestor-repair';
const ancestorCandidate = {...proof, commit: '2'.repeat(40), path: 'docs/reviews/ancestor/HANDOFF.md'};
const sections = ['goal', 'scope', 'userFlow', 'inputsOutputs', 'implementation', 'acceptance', 'tests', 'handoff'];
const eightSections = Object.fromEntries(sections.map(id => [id, true]));
const documentRubric = sections.map(id => ({id, label: 'Independently checked section ' + id}));
const productRubric = [
  {id: 'functionality', label: 'Leap-day ages match the published table'},
  {id: 'boundaries', label: 'Reject an end date before the birth date'},
  {id: 'privacy', label: 'Dates remain local and are cleared on reset'},
  {id: 'security', label: 'Reject non-date input and render output as text'},
  {id: 'usability', label: 'Recover from malformed dates beside the field'},
  {id: 'accessibility', label: 'Keyboard and screen-reader flow reaches results'},
  {id: 'localization-seo', label: 'Both localized routes have canonical metadata'},
  {id: 'toolchain-provenance', label: 'Node 24 offline reproducible static build'},
  {id: 'compatibility', label: 'Age results agree in isolated supported browsers'}
];
// Literal fixture keys are already ordered as id, label. Derive the expected hash independently of the core.
const criteriaHash = rubric => createHash('sha256').update(JSON.stringify(rubric)).digest('hex');
const taskRow = (registry, id) => registry.tasks.find(task => task.id === id);

function maintenanceReview(registry, taskId, candidate, overrides = {}) {
  const aspects = taskRow(registry, taskId).acceptanceCriteria.map(({id}) => ({id, score: 94, evidence: 'Observed ' + id}));
  return command(registry, reviewer, 'review', {taskId, candidate, verdict: 'accepted',
    evidenceRef: {...proof, path: 'docs/reviews/independent-review.md'}, evidence: 'Independent pinned review.',
    rubricComplete: true, requiredChecksComplete: true, aspects, ...overrides});
}

function claimAndStart(registry, actor, taskId) {
  registry = apply(registry, actor, 'claim', {taskId});
  const claimId = taskRow(registry, taskId).owner.claimId;
  registry = apply(registry, actor, 'start', {taskId, claimId, evidence: 'Started after exact readback.'});
  return {registry, claimId};
}

function submitAncestorRepair(registry) {
  return apply(registry, ancestorMaker, 'submit', {
    taskId: ancestorTask, claimId: taskRow(registry, ancestorTask).owner.claimId, candidate: ancestorCandidate,
    pullRequest: 'https://github.com/KYStr/glossquote-labs-home/pull/97',
    evidence: 'Pinned earlier maintenance.', evidenceRef: {...proof, path: 'docs/reviews/ancestor/checks.md'}
  });
}

function mappingInputs(status = 'draft', withAncestor = false) {
  let registry = reconciled();
  for (const actor of [primary, mappingMaker, originalMaker, ancestorMaker]) registry = acknowledge(registry, actor);
  for (const specId of [ageSpec, billSpec]) {
    const document = {...proof, path: 'docs/specs/' + specId.slice(5, -9) + '/SPEC.md'};
    registry = apply(registry, author, 'register-spec', {spec: {
      id: specId, title: 'Fixture ' + specId, document, source, acceptanceCriteria: documentRubric
    }});
    // A snapshot written by the old core could mark the eight-aspect rubric ready.
    if (status === 'ready') Object.assign(registry.specs.at(-1), {
      status, readiness: {reviewerId: reviewer.id, sections: eightSections,
        evidence: 'Independent eight-section review of the old document.', reviewedAt: '2026-10-29T01:00:00.000Z'}
    });
    if (status === 'invalid') registry.specs.at(-1).status = 'invalid';
  }
  registry = apply(registry, author, 'register-task', {task: {
    id: 'fixture-original-authoring', title: 'Original spec task', workType: 'spec', source,
    brief: {...proof, path: 'docs/specs/age-calculator/BRIEF.md'}, acceptanceCriteria: documentRubric
  }});
  registry = apply(registry, originalMaker, 'claim', {taskId: 'fixture-original-authoring'});
  let repairSource = {...proof, path: 'docs/reviews/source-start.md'};
  if (withAncestor) {
    const oldDocument = registry.specs[0].document;
    registry = apply(registry, ancestorMaker, 'register-task', {task: {
      id: ancestorTask, title: 'Earlier accepted maintenance', workType: 'maintenance',
      source: ['cycle', 'late-cycle'].includes(withAncestor) ? {...originCandidate, path: oldDocument.path} : oldDocument,
      brief: {...proof, path: 'docs/reviews/ancestor/TASK.md'}, acceptanceCriteria: criteria
    }});
    registry = claimAndStart(registry, ancestorMaker, ancestorTask).registry;
    if (!['unsubmitted', 'late-cycle'].includes(withAncestor)) registry = submitAncestorRepair(registry);
    if (withAncestor === true || withAncestor === 'cycle') {
      registry = applyOperation(registry, maintenanceReview(registry, ancestorTask, ancestorCandidate)).registry;
    }
    repairSource = {...ancestorCandidate, path: oldDocument.path};
  }
  registry = apply(registry, author, 'register-task', {task: {
    id: originTask, title: 'Accepted source maintenance', workType: 'maintenance',
    source: repairSource, brief: {...proof, path: 'docs/reviews/source-brief.md'},
    acceptanceCriteria: criteria
  }});
  registry = apply(registry, local, 'claim', {taskId: originTask});
  registry = apply(registry, local, 'offer-handoff', {taskId: originTask, claimId: registry.tasks.at(-1).owner.claimId,
    toActorId: local2.id, checkpoint: 'Origin work safely checkpointed.', evidenceRef: proof});
  registry = apply(registry, local2, 'accept-handoff', {taskId: originTask, offerId: registry.tasks.at(-1).handoff.offerId,
    evidence: 'Exact source handoff read back.'});
  const claimId = registry.tasks.at(-1).owner.claimId;
  registry = apply(registry, local2, 'start', {taskId: originTask, claimId, evidence: 'Source repair started.'});
  registry = apply(registry, local2, 'submit', {taskId: originTask, claimId, candidate: originCandidate,
    pullRequest: 'https://github.com/KYStr/glossquote-labs-home/pull/98',
    evidence: 'Source candidate.', evidenceRef: {...proof, path: 'docs/reviews/source-test.md'}});
  registry = applyOperation(registry, maintenanceReview(registry, originTask, originCandidate)).registry;
  const targets = registry.specs.map(spec => ({
    specId: spec.id, expectedAuthorId: author.id, expectedDocument: spec.document, expectedSource: source,
    expectedCriteriaHash: criteriaHash(documentRubric), document: {...spec.document, commit: mappingRef.commit},
    source: {...source, commit: mappingRef.commit}, acceptanceCriteria: productRubric, mappingRef,
    sourceMaintenanceTaskIds: spec.id === ageSpec ? [originTask] : []
  }));
  const task = {id: mappingTask, title: 'Fixture product rubric mapping', workType: 'maintenance',
    source, brief: {...proof, path: 'docs/reviews/mapping-brief.md'}, acceptanceCriteria: documentRubric,
    specRevisionTargets: targets};
  return {registry, targets, task};
}

function mappingFixture(status, withAncestor, mappingReviewer = reviewer) {
  const {registry: before, task, targets} = mappingInputs(status, withAncestor);
  const registered = apply(before, mappingMaker, 'register-task', {task});
  const started = claimAndStart(registered, mappingMaker, task.id);
  const submit = {taskId: task.id, claimId: started.claimId, candidate: mappingCandidate,
    pullRequest: mappingPR, evidence: 'Fixed mapping candidate.', evidenceRef: proof};
  const reviewing = apply(started.registry, mappingMaker, 'submit', submit);
  const registry = applyOperation(reviewing, maintenanceReview(reviewing, task.id, mappingCandidate, {actor: mappingReviewer})).registry;
  return {registry, before, task, targets, registered, started, submit, reviewing};
}

const maintain = (registry, extra = {}) => command(registry, primary, 'apply-spec-maintenance', {taskId: mappingTask, specId: ageSpec, ...extra});
const markMaintained = (registry, actor = reviewer, extra = {}) => command(registry, actor, 'mark-spec-ready', {
  specId: ageSpec, document: registry.specs[0].document, sections: eightSections, evidence: 'Exact eight-section review.',
  evidenceRef: proof, ...extra
});

test('primary maintenance keeps old tasks and audit state, resets readiness, and supplies nine product aspects', () => {
  for (const status of ['draft', 'ready', 'invalid']) {
    const {registry, targets} = mappingFixture(status);
    const before = clone(registry);
    const cmd = maintain(registry);
    const after = applyOperation(registry, cmd).registry;
    const [spec] = after.specs;
    const [original] = before.specs;
    const task = taskRow(registry, mappingTask);
    assert.deepEqual(registry, before);
    assert.deepEqual(after.tasks, before.tasks);
    assert.deepEqual(after.actors, before.actors);
    assert.deepEqual(after.baseline, before.baseline);
    assert.deepEqual(after.specs[1], before.specs[1]);
    assert.deepEqual(after.events.slice(0, -1), before.events);
    assert.equal(spec.authorId, original.authorId);
    assert.equal(spec.title, original.title);
    assert.equal(spec.status, 'draft');
    assert.equal(spec.readiness, null);
    assert.equal(spec.consumedBy, null);
    assert.deepEqual(spec.document, targets[0].document);
    assert.deepEqual(spec.source, targets[0].source);
    assert.deepEqual(spec.acceptanceCriteria, productRubric);
    const makers = [author, originalMaker, local, local2, mappingMaker];
    assert.deepEqual(new Set(spec.contributors), new Set(makers.map(actor => actor.id)));
    assert.deepEqual(spec.maintenanceHistory, [{
      operationId: cmd.operationId, actorId: primary.id, observedAt: cmd.observedAt,
      taskId: mappingTask, claimId: task.owner.claimId, makers: task.contributors,
      submission: {candidate: task.submission.candidate, pullRequest: task.submission.pullRequest, authorId: task.submission.authorId,
        submittedAt: task.submission.submittedAt, evidenceRef: task.submission.evidenceRef, recordHash: recordHash(task.submission)},
      acceptance: {reviewerId: task.acceptance.reviewerId, reviewedAt: task.acceptance.reviewedAt,
        evidenceRef: task.acceptance.evidenceRef, recordHash: recordHash(task.acceptance)},
      previous: {...original, lastRevision: null, contributors: []}, replacement: targets[0]
    }]);
    for (const actor of makers) assert.throws(() => applyOperation(after, markMaintained(after, actor)), {code: 'INDEPENDENT_REVIEW_REQUIRED'});
    assert.throws(() => applyOperation(after, markMaintained(after, reviewer, {document: original.document})), {code: 'CANDIDATE_MISMATCH'});
    assert.throws(() => applyOperation(after, markMaintained(after, reviewer, {sections: {goal: true}})), {code: 'INCOMPLETE_SPEC'});
    const ready = applyOperation(after, markMaintained(after)).registry;
    assert.equal(ready.specs[0].status, 'ready');
    const productionTask = {id: 'mapped-production', title: 'Mapped product task',
      workType: 'production', source, brief: proof, specId: ageSpec, acceptanceCriteria: productRubric};
    assert.throws(() => apply(ready, local, 'register-task', {task: {...productionTask, acceptanceCriteria: documentRubric}}), {code: 'RUBRIC_MISMATCH'});
    assert.deepEqual(apply(ready, local, 'register-task', {task: productionTask}).tasks.at(-1).acceptanceCriteria, productRubric);
  }
});

test('maintenance requires exact primary ACK, current revision, declared target and accepted mapping', () => {
  const {registry, reviewing} = mappingFixture();
  for (const [extra, code] of [
    [{actor: local}, 'SPEC_MAINTENANCE_AUTHORITY'],
    [{actor: {...local, role: 'primary'}}, 'INVALID'],
    [{override: true}, 'INVALID'],
    [{expectedRevision: registry.revision - 1}, 'REVISION_CONFLICT'],
    [{specId: 'fixture-outside-spec'}, 'SPEC_MAINTENANCE_SCOPE'],
    [{taskId: originTask}, 'SPEC_MAINTENANCE_SCOPE']
  ]) assert.throws(() => applyOperation(registry, maintain(registry, extra)), {code});
  for (const mutate of [
    row => { row.actors = row.actors.filter(actor => actor.id !== primary.id); },
    row => { row.actors.find(actor => actor.id === primary.id).contractVersion = 'outdated'; },
    row => { row.actors.find(actor => actor.id === primary.id).baselineCommit = '9'.repeat(40); }
  ]) {
    const stale = clone(registry);
    mutate(stale);
    assert.throws(() => applyOperation(stale, maintain(stale)), {code: 'ACK_REQUIRED'});
  }
  assert.throws(() => applyOperation(reviewing, maintain(reviewing)), {code: 'INVALID_STATE'});
});

test('unmapped run5 document rubric cannot become ready or be dispatched as product acceptance', () => {
  const draft = mappingInputs().registry;
  assert.throws(() => apply(draft, reviewer, 'mark-spec-ready', {specId: ageSpec, sections: eightSections,
    evidence: 'Only the eight document sections were checked.'}), {code: 'RUBRIC_MISMATCH'});
  const prior = mappingInputs('ready').registry;
  const task = {id: 'historical-product-task', title: 'Previously staged product task',
    workType: 'production', source, brief: proof, specId: ageSpec, acceptanceCriteria: documentRubric};
  assert.throws(() => apply(prior, local, 'register-task', {task}), {code: 'RUBRIC_MISMATCH'});
  const olderRegistry = clone(prior);
  olderRegistry.tasks.push({...olderRegistry.tasks[0], ...task, owner: null, status: 'ready'});
  assert.doesNotThrow(() => validateRegistry(olderRegistry));
  assert.throws(() => apply(olderRegistry, local, 'claim', {taskId: task.id}), {code: 'RUBRIC_MISMATCH'});
});

test('registration rejects stale state, unknown fields, out-of-scope refs, and invalid source maintenance', () => {
  const {registry, task, targets: [target, second]} = mappingInputs();
  const register = (patch, taskPatch = {}, snapshot = registry) => apply(snapshot, mappingMaker, 'register-task',
    {task: {...task, specRevisionTargets: [{...target, ...patch}, second], ...taskPatch}});
  for (const [patch, code] of [
    [{expectedAuthorId: reviewer.id}, 'SPEC_MAINTENANCE_SCOPE'],
    [{expectedDocument: {...target.expectedDocument, commit: '1'.repeat(40)}}, 'SPEC_MAINTENANCE_STALE'],
    [{expectedSource: {...source, commit: '1'.repeat(40)}}, 'SPEC_MAINTENANCE_STALE'],
    [{expectedCriteriaHash: '1'.repeat(64)}, 'SPEC_MAINTENANCE_STALE'],
    [{expectedCriteriaHash: 'bad'}, 'INVALID'],
    [{specId: 'spec-outside-the-fixed-forty-20261109'}, 'SPEC_MAINTENANCE_SCOPE'],
    [{document: {...target.document, path: second.document.path}}, 'SPEC_MAINTENANCE_SCOPE'],
    [{source: {...target.source, path: 'docs/OTHER.md'}}, 'SPEC_MAINTENANCE_SCOPE'],
    [{document: {...target.document, repository: 'KYStr/other'}}, 'INVALID_REFERENCE'],
    [{source: {...target.source, commit: '1'.repeat(40)}}, 'CANDIDATE_MISMATCH'],
    [{mappingRef: {...mappingRef, path: 'docs/other.json'}}, 'CANDIDATE_MISMATCH'],
    [{mappingRef: {...mappingRef, path: 'docs/../other.json'}}, 'INVALID_REFERENCE'],
    [{mappingRef: {...mappingRef, extra: true}}, 'INVALID'],
    [{owner: local.id}, 'INVALID'],
    [{acceptanceCriteria: productRubric.slice(1)}, 'RUBRIC_MISMATCH'],
    [{acceptanceCriteria: documentRubric}, 'RUBRIC_MISMATCH'],
    [{acceptanceCriteria: criteria}, 'RUBRIC_MISMATCH'],
    [{acceptanceCriteria: [productRubric[1], ...productRubric.slice(1)]}, 'INVALID'],
    [{acceptanceCriteria: [{...productRubric[0], score: 100}, ...productRubric.slice(1)]}, 'INVALID'],
    [{sourceMaintenanceTaskIds: ['missing-repair']}, 'NOT_FOUND'],
    [{sourceMaintenanceTaskIds: ['fixture-original-authoring']}, 'INVALID_STATE'],
    [{sourceMaintenanceTaskIds: [originTask, originTask]}, 'INVALID']
  ]) assert.throws(() => register(patch), {code});
  for (const [patch, code] of [
    [{contributors: [reviewer.id]}, 'INVALID'], [{specId: ageSpec}, 'INVALID'],
    [{specRevisionTargets: null}, 'INVALID'], [{specRevisionTargets: [target, target]}, 'INVALID'],
    [{workType: 'review'}, 'SPEC_MAINTENANCE_SCOPE'], [{acceptanceCriteria: productRubric}, 'RUBRIC_MISMATCH']
  ]) assert.throws(() => register({}, patch), {code});
  const unchanged = clone(registry);
  Object.assign(unchanged.specs[0], {document: target.document, source: target.source, acceptanceCriteria: productRubric});
  assert.throws(() => register({expectedDocument: target.document, expectedSource: target.source,
    expectedCriteriaHash: criteriaHash(productRubric)}, {}, unchanged), {code: 'NO_CHANGE'});
  const pending = clone(registry);
  Object.assign(taskRow(pending, originTask), {status: 'reviewing', acceptance: null});
  assert.throws(() => register({}, {}, pending), {code: 'INVALID_STATE'});
});

test('maintenance rejects task references in any phase, consumed states and later author revisions', () => {
  const {registry} = mappingFixture();
  for (const status of ['ready', 'released']) {
    const row = clone(registry);
    row.tasks.push({...row.tasks[0], id: 'fixture-referencing-work', owner: null, status, specId: ageSpec});
    assert.throws(() => applyOperation(row, maintain(row)), {code: 'SPEC_ALREADY_ASSIGNED'});
  }
  for (const status of ['draft', 'reserved', 'consumed']) {
    const row = clone(registry);
    Object.assign(row.specs[0], {status, consumedBy: {taskId: 'fixture-prior-work'}});
    if (status === 'consumed') row.specs[0].readiness = {
      reviewerId: reviewer.id, sections: eightSections, evidence: 'Previous review.', reviewedAt: '2026-10-29T01:00:00.000Z'
    };
    assert.throws(() => applyOperation(row, maintain(row)), {code: 'SPEC_ALREADY_ASSIGNED'});
  }
  const stale = apply(registry, author, 'revise-spec', {specId: ageSpec, document: {...registry.specs[0].document, commit: '7'.repeat(40)},
    source, acceptanceCriteria: documentRubric, evidence: 'An author revision landed after registration.'});
  assert.throws(() => applyOperation(stale, maintain(stale)), {code: 'SPEC_MAINTENANCE_STALE'});
});

test('mapping acceptance binds the exact candidate and excludes original and inherited makers', () => {
  const {reviewing, registered, started, submit} = mappingFixture();
  const makers = [author, originalMaker, local, local2];
  assert.deepEqual(new Set(registered.tasks.at(-1).contributors), new Set(makers.map(actor => actor.id)));
  assert.throws(() => apply(started.registry, mappingMaker, 'submit', {...submit, candidate: {...mappingCandidate, commit: '9'.repeat(40)}}),
    {code: 'CANDIDATE_MISMATCH'});
  for (const actor of [...makers, mappingMaker]) assert.throws(() =>
    applyOperation(reviewing, maintenanceReview(reviewing, mappingTask, mappingCandidate, {actor})), {code: 'INDEPENDENT_REVIEW_REQUIRED'});
  for (const [extra, code] of [
    [{candidate: {...mappingCandidate, path: 'docs/other.md'}}, 'CANDIDATE_MISMATCH'],
    [{aspects: [{id: 'goal', score: 100, evidence: 'Partial.'}]}, 'INCOMPLETE_REVIEW'],
    [{requiredChecksComplete: false}, 'INCOMPLETE_REVIEW'],
    [{aspects: documentRubric.map(({id}, i) => ({id, score: i ? 90 : 89, evidence: 'Scored.'}))}, 'SCORE_BELOW_TARGET']
  ]) assert.throws(() => applyOperation(reviewing, maintenanceReview(reviewing, mappingTask, mappingCandidate, extra)), {code});
  const changed = clone(reviewing);
  taskRow(changed, 'fixture-original-authoring').contributors.push(reviewer.id);
  assert.throws(() => applyOperation(changed, maintenanceReview(changed, mappingTask, mappingCandidate)),
    {code: 'INDEPENDENT_REVIEW_REQUIRED'});
});

test('exact maintenance replay is idempotent and changed, partial and cross-mapping replays fail atomically', () => {
  const {registry} = mappingFixture();
  const first = maintain(registry);
  const second = maintain(registry, {specId: billSpec, expectedRevision: registry.revision + 1});
  const result = applyBatch(registry, [first, second]);
  assert.deepEqual(result.registry.specs.map(spec => spec.maintenanceHistory.length), [1, 1]);
  assert.equal(applyOperation(result.registry, first).idempotent, true);
  assert.equal(applyBatch(result.registry, [first, second]).idempotent, true);
  assert.throws(() => applyOperation(result.registry, {...first, specId: billSpec}), {code: 'IDEMPOTENCY_CONFLICT'});
  assert.throws(() => applyOperation(result.registry, maintain(result.registry)), {code: 'SPEC_MAINTENANCE_STALE'});
  assert.throws(() => applyBatch(applyOperation(registry, first).registry, [first, second]), {code: 'PARTIAL_BATCH'});
  const before = clone(registry);
  assert.throws(() => applyBatch(registry, [first, {...second, taskId: originTask}]), {code: 'SPEC_MAINTENANCE_SCOPE'});
  assert.deepEqual(registry, before);
});

test('validation detects corrupted history, ownership, exact acceptance, and readiness evidence', () => {
  const {registry} = mappingFixture();
  const applied = applyOperation(registry, maintain(registry)).registry;
  const ready = applyOperation(applied, markMaintained(applied)).registry;
  for (const mutate of [
    row => { delete row.specs[0].maintenanceHistory; },
    row => { row.specs[0].maintenanceHistory[0].previous.document.commit = '9'.repeat(40); },
    row => { row.specs[0].maintenanceHistory[0].claimId = 'wrong-claim'; },
    row => { row.specs[0].maintenanceHistory[0].acceptance.reviewerId = mappingMaker.id; },
    row => { row.specs[0].contributors = [author.id]; },
    row => { row.specs[0].readiness.reviewerId = local.id; },
    row => { delete row.specs[0].readiness.document; },
    row => { row.tasks.at(-1).contributors = [mappingMaker.id]; },
    row => { row.tasks.at(-1).submission.candidate.commit = '9'.repeat(40); },
    row => { row.tasks.at(-1).acceptance.candidate.commit = '9'.repeat(40); },
    row => { delete row.tasks.at(-1).acceptance; }
  ]) {
    const corrupted = clone(ready);
    mutate(corrupted);
    assert.throws(() => validateRegistry(corrupted));
  }
  assert.deepEqual(validateRegistry(ready), ready);
});


const recordHash = value => createHash('sha256').update(JSON.stringify(value, (_key, part) => {
  if (!part || typeof part !== 'object' || Array.isArray(part)) return part;
  return Object.fromEntries(Object.entries(part).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0));
})).digest('hex');

test('a later independently accepted maintenance appends history and still excludes earlier makers', () => {
  const {registry} = mappingFixture();
  const first = applyOperation(registry, maintain(registry)).registry;
  const firstReady = applyOperation(first, markMaintained(first)).registry;
  const spec = firstReady.specs[0];
  const laterMapping = {...mappingRef, commit: 'f'.repeat(40)};
  const laterCandidate = {...laterMapping, path: mappingCandidate.path};
  const laterTask = 'fixture-next-mapping';
  const adjusted = productRubric.map(row => row.id === 'compatibility' ? {...row, label: 'Same output in both supported browsers'} : row);
  const nextTarget = {
    specId: ageSpec, expectedAuthorId: author.id, expectedDocument: spec.document,
    expectedSource: spec.source, expectedCriteriaHash: criteriaHash(productRubric),
    document: {...spec.document, commit: laterMapping.commit},
    source: {...spec.source, commit: laterMapping.commit},
    acceptanceCriteria: adjusted, mappingRef: laterMapping, sourceMaintenanceTaskIds: [mappingTask]
  };
  const newMaker = {id: 'local-codex:fixture-new-mapping-maker', executor: 'local-codex'};
  let current = acknowledge(firstReady, newMaker);
  current = apply(current, newMaker, 'register-task', {task: {id: laterTask, title: 'Second independent mapping', workType: 'maintenance',
    source, brief: proof, acceptanceCriteria: documentRubric, specRevisionTargets: [nextTarget]}});
  const {registry: started, claimId} = claimAndStart(current, newMaker, laterTask);
  current = apply(started, newMaker, 'submit', {taskId: laterTask, claimId, candidate: laterCandidate, pullRequest: mappingPR,
    evidenceRef: proof, evidence: 'Pinned new mapping.'});
  current = applyOperation(current, maintenanceReview(current, laterTask, laterCandidate)).registry;
  current = applyOperation(current, maintain(current, {taskId: laterTask})).registry;
  assert.deepEqual(current.specs[0].maintenanceHistory[0], spec.maintenanceHistory[0]);
  assert.equal(current.specs[0].maintenanceHistory.length, 2);
  assert.deepEqual(current.specs[0].maintenanceHistory[1].previous.readiness, spec.readiness);
  assert.deepEqual(current.specs[0].acceptanceCriteria, adjusted);
  assert.throws(() => applyOperation(current, markMaintained(current, mappingMaker)), {code: 'INDEPENDENT_REVIEW_REQUIRED'});
  assert.throws(() => applyOperation(current, markMaintained(current, newMaker)), {code: 'INDEPENDENT_REVIEW_REQUIRED'});
});

function filePayload(bytes) {
  return {type: 'file', size: bytes.length, encoding: 'base64', content: bytes.toString('base64'),
    sha: createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex')};
}

const fixedFileKey = ref => ref.repository + '/' + ref.commit + '/' + ref.path;

function adapterFixture(registry, targets) {
  const files = new Map();
  const save = (ref, content) => files.set(fixedFileKey(ref), filePayload(Buffer.from(content)));
  const auxiliary = [
    source, proof, mappingCandidate, originCandidate, {...proof, path: 'docs/reviews/source-start.md'},
    {...proof, path: 'docs/reviews/source-brief.md'}, {...proof, path: 'docs/reviews/source-test.md'},
    {...proof, path: 'docs/reviews/independent-review.md'}, {...proof, path: 'docs/reviews/mapping-brief.md'}
  ];
  for (const ref of auxiliary) save(ref, 'Independent fixture file ' + ref.path);
  for (const task of registry.tasks.filter(row => row.workType === 'maintenance' && row.status === 'accepted')) {
    for (const ref of [task.source, task.brief, task.submission.candidate, task.submission.evidenceRef, task.acceptance.evidenceRef]) {
      if (!files.has(fixedFileKey(ref))) save(ref, 'Independent fixture file ' + ref.path);
    }
  }
  const oldDocuments = ['old age specification\r\n', 'old and unchanged bill specification\n'];
  const newDocuments = ['repaired age specification\r\n', 'old and unchanged bill specification\n'];
  const sourceBytes = 'Independent fixture file README.md';
  const descriptor = (ref, value) => ({repository: ref.repository, path: ref.path, bytes: Buffer.byteLength(value),
    sha256: createHash('sha256').update(value).digest('hex')});
  const manifest = {targets: targets.map((target, index) => {
    const {mappingRef, document, source, ...fields} = target;
    save(target.expectedDocument, oldDocuments[index]);
    save(document, newDocuments[index]);
    save(source, sourceBytes);
    if (index === 0) save({...originCandidate, path: document.path}, newDocuments[index]);
    return {...fields, document: descriptor(document, newDocuments[index]), source: descriptor(source, sourceBytes)};
  })};
  save(mappingRef, JSON.stringify(manifest));
  const state = {registry: clone(registry), writes: 0, head: mappingCandidate.commit, open: true, calls: []};
  const client = new GitHubClient('fixture-not-real', {fetchFn: async (raw, init) => {
    const url = new URL(raw);
    assert.equal(url.origin, 'https://api.github.com');
    assert.equal(init.redirect, 'error');
    state.calls.push({path: url.pathname, ref: url.searchParams.get('ref'), method: init.method});
    const registryPath = '/repos/' + REPOSITORY + '/contents/coordination/work-registry.json';
    if (url.pathname === registryPath && init.method === 'PUT') {
      state.writes++;
      const payload = JSON.parse(init.body);
      assert.equal(payload.sha, registryPayload(state.registry).sha);
      assert.equal(payload.branch, BRANCH);
      state.registry = JSON.parse(Buffer.from(payload.content, 'base64').toString());
      return {ok: true, text: async () => '{}'};
    }
    let result;
    if (url.pathname === registryPath) {
      assert.equal(url.searchParams.get('ref'), BRANCH);
      result = registryPayload(state.registry);
    } else if (url.pathname === '/repos/' + REPOSITORY + '/pulls/99') {
      result = {head: {sha: state.head, repo: {full_name: REPOSITORY}}, state: state.open ? 'open' : 'closed'};
    } else {
      const match = /^\/repos\/([^/]+\/[^/]+)\/contents\/(.+)$/.exec(url.pathname);
      if (match) result = files.get(fixedFileKey({
        repository: match[1], commit: url.searchParams.get('ref'), path: decodeURIComponent(match[2])
      }));
    }
    return result ? {ok: true, text: async () => JSON.stringify(result)} : {ok: false, status: 404};
  }});
  return {state, client, files, save, manifest};
}

test('mapping references include original and replacement files, pinned mapping, and the entire source review chain', () => {
  const {registry, targets} = mappingFixture();
  const references = operationReferences(registry, maintain(registry)).map(fixedFileKey);
  const origin = taskRow(registry, originTask);
  const task = taskRow(registry, mappingTask);
  const required = [mappingRef, task.source, task.brief, task.submission.candidate, task.submission.evidenceRef,
    task.acceptance.evidenceRef, origin.source, origin.brief, origin.submission.candidate,
    origin.submission.evidenceRef, origin.acceptance.evidenceRef,
    ...targets.flatMap(target => [target.expectedDocument, target.expectedSource, target.document, target.source])];
  for (const ref of required) assert.ok(references.includes(fixedFileKey(ref)), fixedFileKey(ref));
  assert.equal(references.length, new Set(references).size);
});

test('adapter reads pinned bytes, validates mapping candidate head before one CAS, and replays without writing', async () => {
  const {registry, targets} = mappingFixture();
  const {client, state} = adapterFixture(registry, targets);
  const first = maintain(registry);
  const second = maintain(registry, {specId: billSpec, expectedRevision: registry.revision + 1});
  const commands = [first, second];
  const {receipts} = await executeBatch(client, commands);
  assert.equal(receipts.length, 2);
  assert.deepEqual(receipts.map(row => row.operationId), [first.operationId, second.operationId]);
  assert.deepEqual(state.registry.specs.map(spec => spec.document), targets.map(target => target.document));
  assert.equal(state.writes, 1);
  const writeIndex = state.calls.findIndex(row => row.method === 'PUT');
  assert.equal(state.calls[writeIndex - 1].path, '/repos/' + REPOSITORY + '/pulls/99');
  assert.equal(state.calls.filter(row => row.path.endsWith(mappingRef.path)).length, 2);
  assert.ok(state.calls.some(row => row.path.endsWith(targets[0].document.path) && row.ref === originCandidate.commit));
  assert.ok((await executeBatch(client, commands)).receipts.every(row => row.idempotent));
  assert.equal(state.writes, 1);
});

test('adapter rejects absent refs, mismatched mapping and byte provenance, and moved PR before any PUT', async () => {
  const {registry, targets} = mappingFixture();
  for (const [alter, error] of [
    [({files}) => files.delete(fixedFileKey(mappingRef)), {status: 404}],
    [({files}) => files.delete(fixedFileKey(taskRow(registry, originTask).acceptance.evidenceRef)), {status: 404}],
    [({save}) => save(mappingRef, 'invalid JSON'), {code: 'INVALID_SPEC_MAPPING'}],
    [({save}) => save(mappingRef, Buffer.from([255])), {code: 'INVALID_SPEC_MAPPING'}],
    [({save, manifest}) => save(mappingRef, JSON.stringify({...manifest, extra: true})), {code: 'INVALID_SPEC_MAPPING'}],
    [({save, manifest}) => {
      manifest.targets[0].acceptanceCriteria = productRubric.map(row => ({...row, label: 'Wrong label'}));
      save(mappingRef, JSON.stringify(manifest));
    }, {code: 'INVALID_SPEC_MAPPING'}],
    [({save, manifest}) => {
      manifest.targets[0].document.sha256 = 'f'.repeat(64);
      save(mappingRef, JSON.stringify(manifest));
    }, {code: 'INVALID_SPEC_MAPPING'}],
    [({save}) => save({...originCandidate, path: targets[0].document.path}, 'Wrong accepted document'), {code: 'SPEC_SOURCE_MISMATCH'}],
    [({files}) => files.delete(fixedFileKey({...originCandidate, path: targets[0].document.path})), {code: 'SPEC_SOURCE_MISMATCH'}],
    [({save}) => save(targets[1].document, 'Unreviewed changes in second target'), {code: 'SPEC_SOURCE_MISMATCH'}],
    [({save}) => save(targets[0].source, 'Unreviewed replacement baseline'), {code: 'SPEC_SOURCE_MISMATCH'}],
    [({files}) => { files.get(fixedFileKey(mappingRef)).sha = 'f'.repeat(40); }, {code: 'BLOB_HASH_MISMATCH'}],
    [({files}) => { files.get(fixedFileKey(mappingRef)).encoding = 'none'; }, {code: 'INVALID_RESPONSE'}],
    [({state}) => { state.head = '9'.repeat(40); }, {code: 'CANDIDATE_MISMATCH'}],
    [({state}) => { state.open = false; }, {code: 'INVALID_STATE'}]
  ]) {
    const fixture = adapterFixture(registry, targets);
    alter(fixture);
    const commands = [maintain(registry), maintain(registry, {specId: billSpec, expectedRevision: registry.revision + 1})];
    await assert.rejects(executeBatch(fixture.client, commands, {verifyReferences: false}), error);
    assert.equal(fixture.state.writes, 0);
    assert.deepEqual(fixture.state.registry, registry);
  }
});

test('adapter also verifies fixed mapping during register, submit, and independent review', async () => {
  const {before, task, targets, started, submit, reviewing} = mappingFixture();
  const register = command(before, mappingMaker, 'register-task', {task});
  const submitCommand = command(started.registry, mappingMaker, 'submit', submit);
  const reviewCommand = maintenanceReview(reviewing, task.id, mappingCandidate);
  for (const [registry, cmd] of [[before, register], [started.registry, submitCommand], [reviewing, reviewCommand]]) {
    const good = adapterFixture(registry, targets);
    assert.equal((await executeOperation(good.client, cmd)).saved, true);
    assert.equal(good.state.writes, 1);
    const changed = adapterFixture(registry, targets);
    changed.save(mappingRef, '{"targets":[]}');
    await assert.rejects(executeOperation(changed.client, cmd), {code: 'INVALID_SPEC_MAPPING'});
    assert.equal(changed.state.writes, 0);
  }
});

test('known upstream accepted maintenance excludes its maker from mapping and readiness even when only the latest repair is declared', () => {
  const {registry, reviewing, registered, targets} = mappingFixture('draft', true);
  assert.deepEqual(targets[0].sourceMaintenanceTaskIds, [originTask]);
  const upstream = taskRow(registry, ancestorTask);
  const latest = taskRow(registry, originTask);
  assert.equal(latest.source.commit, upstream.submission.candidate.commit);
  assert.notEqual(latest.source.path, upstream.submission.candidate.path);
  assert.ok(taskRow(registered, mappingTask).contributors.includes(ancestorMaker.id));
  assert.throws(() => applyOperation(reviewing, maintenanceReview(reviewing, mappingTask, mappingCandidate, {actor: ancestorMaker})),
    {code: 'INDEPENDENT_REVIEW_REQUIRED'});
  const before = clone(registry);
  const applied = applyOperation(registry, maintain(registry)).registry;
  assert.deepEqual(applied.tasks, before.tasks);
  assert.ok(applied.specs[0].contributors.includes(ancestorMaker.id));
  assert.throws(() => applyOperation(applied, markMaintained(applied, ancestorMaker)), {code: 'INDEPENDENT_REVIEW_REQUIRED'});
  assert.equal(applyOperation(applied, markMaintained(applied)).registry.specs[0].status, 'ready');

  const references = operationReferences(registry, maintain(registry)).map(fixedFileKey);
  for (const ref of [upstream.source, upstream.brief, upstream.submission.candidate, upstream.submission.evidenceRef, upstream.acceptance.evidenceRef]) {
    assert.ok(references.includes(fixedFileKey(ref)));
  }
  const omitted = clone(registered);
  const contributors = taskRow(omitted, mappingTask).contributors;
  contributors.splice(contributors.indexOf(ancestorMaker.id), 1);
  assert.throws(() => validateRegistry(omitted), {code: 'INVALID_REGISTRY'});
});

test('a later accepted ancestor leaves historical snapshots valid and requires fresh independent evidence', () => {
  const {registry, reviewing} = mappingFixture('draft', 'unsubmitted');
  const acceptAncestor = row => {
    const submitted = submitAncestorRepair(row);
    return applyOperation(submitted, maintenanceReview(submitted, ancestorTask, ancestorCandidate)).registry;
  };
  const pendingReview = submitAncestorRepair(reviewing);
  assert.throws(() => applyOperation(pendingReview, maintenanceReview(pendingReview, mappingTask, mappingCandidate)),
    {code: 'MAINTENANCE_SOURCE_PENDING'});
  const pendingApply = submitAncestorRepair(registry);
  assert.throws(() => applyOperation(pendingApply, maintain(pendingApply)), {code: 'MAINTENANCE_SOURCE_PENDING'});
  const updatedReview = acceptAncestor(reviewing);
  assert.throws(() => applyOperation(updatedReview, maintenanceReview(updatedReview, mappingTask, mappingCandidate)),
    {code: 'INDEPENDENT_REVIEW_REQUIRED'});
  const updatedApply = acceptAncestor(registry);
  assert.doesNotThrow(() => validateRegistry(updatedApply));
  assert.throws(() => applyOperation(updatedApply, maintain(updatedApply)), {code: 'INDEPENDENT_REVIEW_REQUIRED'});
  const previouslyApplied = applyOperation(registry, maintain(registry)).registry;
  const updatedReady = acceptAncestor(previouslyApplied);
  assert.throws(() => applyOperation(updatedReady, markMaintained(updatedReady, ancestorMaker)), {code: 'INDEPENDENT_REVIEW_REQUIRED'});
  assert.throws(() => applyOperation(updatedReady, markMaintained(updatedReady)), {code: 'MAINTENANCE_SOURCE_STALE'});
});

test('adapter blocks upstream self-review before CAS and still requires bytes from an explicitly declared candidate', async () => {
  const {before, task, targets} = mappingFixture('draft', true);
  const {client, state} = adapterFixture(before, targets);
  const execute = (actor, action, extra) => executeOperation(client, command(state.registry, actor, action, extra));
  await execute(mappingMaker, 'register-task', {task});
  await execute(mappingMaker, 'claim', {taskId: task.id});
  const claimId = taskRow(state.registry, task.id).owner.claimId;
  await execute(mappingMaker, 'start', {taskId: task.id, claimId, evidence: 'Fixed mapping started.'});
  await execute(mappingMaker, 'submit', {taskId: task.id, claimId, candidate: mappingCandidate,
    pullRequest: mappingPR, evidence: 'Fixed mapping candidate.', evidenceRef: proof});
  await assert.rejects(executeOperation(client, maintenanceReview(state.registry, task.id, mappingCandidate, {actor: ancestorMaker})),
    {code: 'INDEPENDENT_REVIEW_REQUIRED'});
  assert.equal(state.writes, 4);
  await executeOperation(client, maintenanceReview(state.registry, task.id, mappingCandidate));
  await executeOperation(client, maintain(state.registry));
  await assert.rejects(executeOperation(client, markMaintained(state.registry, ancestorMaker)), {code: 'INDEPENDENT_REVIEW_REQUIRED'});
  assert.equal(state.writes, 6);
  await executeOperation(client, markMaintained(state.registry));
  assert.equal(state.writes, 7);
  assert.equal(state.registry.specs[0].status, 'ready');

  const wrongDirect = adapterFixture(before, targets);
  wrongDirect.save({...ancestorCandidate, path: targets[0].document.path}, 'repaired age specification\r\n');
  wrongDirect.save({...originCandidate, path: targets[0].document.path}, 'incorrect direct source');
  await assert.rejects(executeOperation(wrongDirect.client, command(before, mappingMaker, 'register-task', {task})),
    {code: 'SPEC_SOURCE_MISMATCH'});
  assert.equal(wrongDirect.state.writes, 0);
});

function acceptedRepair(registry, actor, taskId, source, candidate, pullNumber) {
  registry = apply(registry, actor, 'register-task', {task: {
    id: taskId, title: taskId, workType: 'maintenance', source, brief: proof, acceptanceCriteria: criteria
  }});
  const started = claimAndStart(registry, actor, taskId);
  registry = apply(started.registry, actor, 'submit', {
    taskId, claimId: started.claimId, candidate, pullRequest: 'https://github.com/' + REPOSITORY + '/pull/' + pullNumber,
    evidence: 'Pinned independent fixture candidate.', evidenceRef: proof
  });
  return applyOperation(registry, maintenanceReview(registry, taskId, candidate)).registry;
}

test('all accepted records at the same upstream commit contribute regardless of evidence path', () => {
  const {registry, task} = mappingInputs('draft', true);
  const otherMaker = {id: 'local-codex:fixture-second-ancestor-maker', executor: 'local-codex'};
  const otherCandidate = {...ancestorCandidate, path: 'docs/reviews/other-record/HANDOFF.md'};
  const withSecond = acceptedRepair(acknowledge(registry, otherMaker), otherMaker, 'fixture-second-ancestor',
    registry.specs[0].document, otherCandidate, 96);
  const register = command(withSecond, mappingMaker, 'register-task', {task});
  const references = operationReferences(withSecond, register).map(fixedFileKey);
  assert.ok(references.includes(fixedFileKey(ancestorCandidate)));
  assert.ok(references.includes(fixedFileKey(otherCandidate)));
  const registered = applyOperation(withSecond, register).registry;
  const contributors = taskRow(registered, mappingTask).contributors;
  assert.ok(contributors.includes(ancestorMaker.id));
  assert.ok(contributors.includes(otherMaker.id));
});

test('multi-spec mapping ancestry retains declared provenance from every target in the accepted parent', () => {
  const {registry, task, targets} = mappingInputs('draft', true);
  const upstream = {...task, specRevisionTargets: [
    {...targets[0], sourceMaintenanceTaskIds: []},
    {...targets[1], sourceMaintenanceTaskIds: [ancestorTask]}
  ]};
  const registered = apply(registry, mappingMaker, 'register-task', {task: upstream});
  const started = claimAndStart(registered, mappingMaker, upstream.id);
  const submitted = apply(started.registry, mappingMaker, 'submit', {
    taskId: upstream.id, claimId: started.claimId, candidate: mappingCandidate, pullRequest: mappingPR,
    evidence: 'Pinned mapping spanning both specs.', evidenceRef: proof
  });
  const accepted = applyOperation(submitted, maintenanceReview(submitted, upstream.id, mappingCandidate)).registry;
  const latestId = 'fixture-downstream-repair';
  const latestCandidate = {...originCandidate, commit: '5'.repeat(40)};
  const latestSource = {...mappingCandidate, path: targets[0].document.path};
  const repaired = acceptedRepair(accepted, local2, latestId, latestSource, latestCandidate, 95);
  const nextRef = {...mappingRef, commit: '6'.repeat(40)};
  const nextMapping = {...task, id: 'fixture-downstream-mapping', specRevisionTargets: [{
    ...targets[0], mappingRef: nextRef, document: {...targets[0].document, commit: nextRef.commit},
    source: {...targets[0].source, commit: nextRef.commit}, sourceMaintenanceTaskIds: [latestId]
  }]};
  const register = command(repaired, local, 'register-task', {task: nextMapping});
  const refs = operationReferences(repaired, register).map(fixedFileKey);
  assert.ok(refs.includes(fixedFileKey(ancestorCandidate)));
  assert.ok(refs.includes(fixedFileKey(mappingCandidate)));
  const contributors = taskRow(applyOperation(repaired, register).registry, nextMapping.id).contributors;
  assert.ok(contributors.includes(ancestorMaker.id));
  assert.ok(contributors.includes(mappingMaker.id));
  assert.ok(contributors.includes(local2.id));
});

test('a reachable source cycle or a known submitted but unaccepted source stops mapping before adapter CAS', async () => {
  for (const [mode, code] of [['cycle', 'MAINTENANCE_SOURCE_CYCLE'], ['pending', 'MAINTENANCE_SOURCE_PENDING']]) {
    const {registry, targets, task} = mappingInputs('draft', mode);
    const register = command(registry, mappingMaker, 'register-task', {task});
    assert.doesNotThrow(() => validateRegistry(registry));
    assert.throws(() => applyOperation(registry, register), {code});
    const {client, state} = adapterFixture(registry, targets);
    await assert.rejects(executeOperation(client, register), {code});
    assert.equal(state.writes, 0);
    assert.deepEqual(state.registry, registry);
  }
});

function readyBeforeSource(options = {}) {
  const {mappingReviewer = reviewer, readyReviewer = reviewer, cycle = false} = options;
  const {registry, task, targets} = mappingFixture('draft', cycle ? 'late-cycle' : 'unsubmitted', mappingReviewer);
  const applied = applyOperation(registry, maintain(registry)).registry;
  const ready = applyOperation(applied, markMaintained(applied, readyReviewer)).registry;
  return {ready, task, targets};
}

function ageProduction(registry, id = 'fixture-aged-production') {
  return {id, title: 'Production from current age specification', workType: 'production', specId: ageSpec,
    source: registry.specs[0].document, brief: proof, acceptanceCriteria: productRubric};
}

function lateSource(registry, pending = false) {
  const submitted = submitAncestorRepair(registry);
  return pending ? submitted : applyOperation(submitted, maintenanceReview(submitted, ancestorTask, ancestorCandidate)).registry;
}

test('effective readiness excludes late conflicts, pending sources, cycles, and incomplete known makers before new production writes', async () => {
  const scenarios = [
    [{readyReviewer: ancestorMaker}, false, 'INDEPENDENT_REVIEW_REQUIRED'],
    [{mappingReviewer: ancestorMaker}, false, 'MAPPING_REVIEW_CONFLICT'],
    [{}, true, 'MAINTENANCE_SOURCE_PENDING'],
    [{cycle: true}, false, 'MAINTENANCE_SOURCE_CYCLE'],
    [{}, false, 'MAINTENANCE_SOURCE_STALE']
  ];
  for (const [options, pending, code] of scenarios) {
    const {ready, targets} = readyBeforeSource(options);
    const task = ageProduction(ready);
    assert.equal(inventorySummary(ready).readyUnconsumedCount, 1);
    const preregistered = apply(ready, primary, 'register-task', {task});
    const stale = lateSource(preregistered, pending);
    assert.doesNotThrow(() => validateRegistry(stale));
    assert.deepEqual(stale.specs[0], ready.specs[0]);
    assert.deepEqual(taskRow(stale, mappingTask), taskRow(ready, mappingTask));
    assert.equal(inventorySummary(stale).readyUnconsumedCount, 0);
    assert.throws(() => apply(stale, primary, 'register-task', {task: ageProduction(stale, 'another-production')}), {code});
    const claim = command(stale, primary, 'claim', {taskId: task.id});
    assert.throws(() => applyOperation(stale, claim), {code});
    const fake = adapterFixture(stale, targets);
    await assert.rejects(executeOperation(fake.client, claim), {code});
    assert.equal(fake.state.writes, 0);
    assert.deepEqual(fake.state.registry, stale);
  }
});

test('unrelated source activity leaves maintained readiness effective and old claims survive later discovery', () => {
  const {ready} = readyBeforeSource({readyReviewer: ancestorMaker});
  const unrelatedCandidate = {...originCandidate, commit: '8'.repeat(40)};
  const unrelated = acceptedRepair(ready, local, 'fixture-unrelated-maintenance', source, unrelatedCandidate, 94);
  assert.equal(inventorySummary(unrelated).readyUnconsumedCount, 1);
  const task = ageProduction(unrelated);
  const registered = apply(unrelated, primary, 'register-task', {task});
  const claimed = apply(registered, primary, 'claim', {taskId: task.id});
  const stale = lateSource(claimed);
  const originalClaim = taskRow(claimed, task.id);
  assert.deepEqual(taskRow(stale, task.id), originalClaim);
  assert.deepEqual(stale.specs[0].consumedBy, claimed.specs[0].consumedBy);
  assert.deepEqual(stale.specs[0].readiness, claimed.specs[0].readiness);
  const released = apply(stale, primary, 'release', {taskId: task.id, claimId: originalClaim.owner.claimId,
    checkpoint: 'Existing ownership intentionally released.', reason: 'Fixture release', evidenceRef: proof});
  assert.throws(() => apply(released, primary, 'claim', {taskId: task.id}), {code: 'INDEPENDENT_REVIEW_REQUIRED'});
});

test('an unassigned stale specification recovers through fresh independent mapping and preserves previous evidence', () => {
  const {ready, task, targets} = readyBeforeSource({mappingReviewer: ancestorMaker});
  const stale = lateSource(ready);
  const previous = clone(stale);
  assert.equal(inventorySummary(stale).readyUnconsumedCount, 0);
  assert.throws(() => applyOperation(stale, markMaintained(stale)), {code: 'SPEC_UNAVAILABLE'});
  const spec = stale.specs[0];
  const mapRef = {...mappingRef, commit: '7'.repeat(40)};
  const next = {...task, id: 'fixture-fresh-independent-mapping', specRevisionTargets: [{
    ...targets[0], expectedDocument: spec.document, expectedSource: spec.source,
    expectedCriteriaHash: criteriaHash(productRubric), mappingRef: mapRef,
    document: {...spec.document, commit: mapRef.commit}, source: {...spec.source, commit: mapRef.commit}
  }]};
  const registered = apply(stale, mappingMaker, 'register-task', {task: next});
  assert.ok(taskRow(registered, next.id).contributors.includes(ancestorMaker.id));
  const started = claimAndStart(registered, mappingMaker, next.id);
  const candidate = {...mappingCandidate, commit: mapRef.commit};
  const reviewing = apply(started.registry, mappingMaker, 'submit', {taskId: next.id, claimId: started.claimId,
    candidate, pullRequest: mappingPR, evidence: 'New pinned independently reviewable mapping.', evidenceRef: proof});
  const accepted = applyOperation(reviewing, maintenanceReview(reviewing, next.id, candidate)).registry;
  const applied = applyOperation(accepted, maintain(accepted, {taskId: next.id})).registry;
  assert.equal(applied.specs[0].status, 'draft');
  assert.equal(applied.specs[0].readiness, null);
  assert.deepEqual(applied.specs[0].maintenanceHistory[0], previous.specs[0].maintenanceHistory[0]);
  assert.deepEqual(applied.specs[0].maintenanceHistory[1].previous.readiness, previous.specs[0].readiness);
  assert.deepEqual(applied.tasks.filter(row => row.id !== next.id), previous.tasks);
  assert.throws(() => applyOperation(applied, markMaintained(applied, ancestorMaker)), {code: 'INDEPENDENT_REVIEW_REQUIRED'});
  const recovered = applyOperation(applied, markMaintained(applied)).registry;
  assert.equal(inventorySummary(recovered).readyUnconsumedCount, 1);
  const production = ageProduction(recovered);
  const dispatched = apply(recovered, primary, 'register-task', {task: production});
  assert.equal(taskRow(apply(dispatched, primary, 'claim', {taskId: production.id}), production.id).status, 'claimed');
});
