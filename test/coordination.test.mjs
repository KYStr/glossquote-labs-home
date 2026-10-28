import test from 'node:test';
import assert from 'node:assert/strict';
import { applyOperation, inventorySummary, validateRegistry, SPEC_SECTIONS, REPOSITORY, BRANCH } from '../scripts/coordination-core.mjs';
import { executeOperation, GitHubError, GitHubClient } from '../scripts/coordination.mjs';

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

test('complete reviewed specifications follow 5 -> 6 -> 5 stock threshold on production claim', () => {
  let registry = reconciled();
  for (let i = 0; i < 5; i++) registry = addSpec(registry, `spec-${i}`);
  assert.equal(inventorySummary(registry).readyUnconsumedCount, 5);
  assert.equal(inventorySummary(registry).specPriority, 'P1');
  registry = addSpec(registry, 'fixture-spec');
  assert.equal(inventorySummary(registry).readyUnconsumedCount, 6);
  assert.equal(inventorySummary(registry).specPriority, 'P3');
  registry = addTask(registry);
  registry = apply(registry, local, 'claim', {taskId: 'fixture-task'});
  assert.equal(inventorySummary(registry).readyUnconsumedCount, 5);
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
