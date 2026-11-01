import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBatch, applyOperation, inventorySummary, validateRegistry, SPEC_SECTIONS, REPOSITORY, BRANCH } from '../scripts/coordination-core.mjs';
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
