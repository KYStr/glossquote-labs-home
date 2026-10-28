import { createHash } from 'node:crypto';

export const REGISTRY_PATH = 'coordination/work-registry.json';
export const REPOSITORY = 'KYStr/glossquote-labs-home';
export const BRANCH = 'codex/initial-publication';
export const EXECUTORS = ['local-codex', 'cloud-dot'];
export const SPEC_SECTIONS = ['goal', 'scope', 'userFlow', 'inputsOutputs', 'implementation', 'acceptance', 'tests', 'handoff'];
const ACTIVE = new Set(['claimed', 'working', 'blocked', 'reviewing', 'revision']);
const STATUSES = new Set(['draft', 'ready', 'claimed', 'working', 'blocked', 'reviewing', 'revision', 'accepted', 'released']);

export class CoordinationError extends Error {
  constructor(code, message) { super(message); this.name = 'CoordinationError'; this.code = code; }
}
const fail = (code, message) => { throw new CoordinationError(code, message); };
const check = (condition, code, message) => { if (!condition) fail(code, message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, name, max = 10000) => {
  check(typeof value === 'string' && value.trim().length > 0 && value.length <= max, 'INVALID', `${name} must be a nonempty string (max ${max}).`);
  return value;
};
const id = (value, name) => { text(value, name, 160); check(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(value), 'INVALID', `${name} contains unsupported characters.`); return value; };
const timestamp = (value, name) => { check(typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)), 'INVALID', `${name} must be a UTC ISO timestamp with milliseconds.`); return value; };
const same = (a, b) => canonical(a) === canonical(b);
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const fingerprint = value => createHash('sha256').update(canonical(value)).digest('hex');

export function githubRef(ref, name = 'GitHub reference') {
  check(object(ref), 'INVALID_REFERENCE', `${name} must specify repository, commit and path.`);
  check(typeof ref.repository === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(ref.repository), 'INVALID_REFERENCE', `${name}.repository must be owner/repository.`);
  check(typeof ref.commit === 'string' && /^[a-f0-9]{40}$/.test(ref.commit), 'INVALID_REFERENCE', `${name}.commit must be an exact 40-character commit SHA.`);
  text(ref.path, `${name}.path`, 600);
  check(!ref.path.startsWith('/') && !ref.path.split('/').some(part => part === '..' || part === '.' || part === ''), 'INVALID_REFERENCE', `${name}.path must be a relative file path.`);
  return ref;
}

function unique(values, name) {
  check(Array.isArray(values) && new Set(values).size === values.length, 'INVALID', `${name} must contain unique values.`);
}

function actorIdentity(actor) {
  check(object(actor) && EXECUTORS.includes(actor.executor), 'INVALID_ACTOR', 'actor.executor must be local-codex or cloud-dot.');
  check(typeof actor.id === 'string' && actor.id.startsWith(`${actor.executor}:`) && actor.id.slice(actor.executor.length + 1).length >= 12,
    'INVALID_ACTOR', 'Use executor:actual-conversation-or-run-id[:agent-path], not a shared /root or GitHub username.');
  id(actor.id, 'actor.id');
}

function criteria(value) {
  check(Array.isArray(value) && value.length > 0, 'INVALID', 'Declare all required acceptance aspects before dispatch.');
  unique(value.map(row => row.id), 'acceptance aspect IDs');
  value.forEach(row => { id(row.id, 'criterion.id'); text(row.label, 'criterion.label', 300); });
}

export function validateRegistry(registry) {
  check(object(registry) && registry.schemaVersion === 1, 'INVALID_REGISTRY', 'Expected registry schemaVersion 1.');
  text(registry.contractVersion, 'contractVersion', 80);
  check(registry.repository === REPOSITORY && registry.branch === BRANCH, 'INVALID_REGISTRY', 'Unexpected authoritative repository or branch.');
  check(Number.isSafeInteger(registry.revision) && registry.revision >= 0, 'INVALID_REGISTRY', 'Invalid revision.');
  check(object(registry.baseline) && object(registry.baseline.reconciliation), 'INVALID_REGISTRY', 'Missing baseline/reconciliation.');
  githubRef(registry.baseline.homepage, 'baseline.homepage');
  check(typeof registry.baseline.inventoryComplete === 'boolean', 'INVALID_REGISTRY', 'inventoryComplete must be explicit.');
  for (const executor of EXECUTORS) check(Object.hasOwn(registry.baseline.reconciliation, executor), 'INVALID_REGISTRY', `Missing ${executor} reconciliation state.`);
  for (const field of ['actors', 'specs', 'tasks', 'events']) check(Array.isArray(registry[field]), 'INVALID_REGISTRY', `${field} must be an array.`);
  for (const field of ['actors', 'specs', 'tasks']) unique(registry[field].map(row => row.id), `${field} IDs`);
  unique(registry.specs.map(spec => `${spec.document?.repository}/${spec.document?.path}`), 'spec document identities');
  unique(registry.events.map(row => row.operationId), 'event operation IDs');
  if (registry.pendingReconciliationTasks !== undefined) {
    check(Array.isArray(registry.pendingReconciliationTasks), 'INVALID_REGISTRY', 'pendingReconciliationTasks must be an array.');
    unique(registry.pendingReconciliationTasks.map(row => row.id), 'pending task IDs');
    for (const pending of registry.pendingReconciliationTasks) {
      id(pending.id, 'pending.id'); check(EXECUTORS.includes(pending.executor), 'INVALID_REGISTRY', 'Pending work needs its known execution environment.');
      if (pending.resolvedTaskId) check(registry.tasks.some(task => task.id === pending.resolvedTaskId) && registry.actors.some(actor => actor.id === pending.resolvedBy && actor.executor === pending.executor), 'INVALID_REGISTRY', 'A pending-work resolution must reference a real registered task and acknowledging actor.');
    }
  }
  for (const actor of registry.actors) {
    actorIdentity(actor);
    text(actor.contractVersion, 'actor.contractVersion', 80); text(actor.baselineCommit, 'actor.baselineCommit', 40);
    timestamp(actor.acknowledgedAt, 'actor.acknowledgedAt'); text(actor.evidence, 'actor.evidence');
  }
  for (const spec of registry.specs) {
    id(spec.id, 'spec.id'); text(spec.title, 'spec.title', 300); id(spec.authorId, 'spec.authorId');
    githubRef(spec.document, 'spec.document'); githubRef(spec.source, 'spec.source');
    criteria(spec.acceptanceCriteria);
    check(['draft', 'ready', 'consumed', 'reserved', 'invalid'].includes(spec.status), 'INVALID_REGISTRY', 'Unknown spec status.');
    if (spec.status === 'ready' || spec.status === 'consumed') validateSpecReadiness(spec);
    if (spec.status === 'consumed' || spec.status === 'reserved') check(object(spec.consumedBy) && typeof spec.consumedBy.taskId === 'string', 'INVALID_REGISTRY', 'Consumed/reserved spec needs consuming task.');
  }
  for (const task of registry.tasks) {
    id(task.id, 'task.id'); text(task.title, 'task.title', 300);
    check(['spec', 'production', 'review', 'maintenance'].includes(task.workType), 'INVALID_REGISTRY', 'Unknown work type.');
    check(STATUSES.has(task.status), 'INVALID_REGISTRY', 'Unknown task status.');
    githubRef(task.source, 'task.source'); githubRef(task.brief, 'task.brief');
    unique(task.allowedExecutors, 'allowedExecutors'); check(task.allowedExecutors.length > 0 && task.allowedExecutors.every(e => EXECUTORS.includes(e)), 'INVALID_REGISTRY', 'Invalid allowedExecutors.');
    criteria(task.acceptanceCriteria);
    unique(task.contributors, 'task contributors');
    if (task.workType === 'production') {
      const spec = registry.specs.find(spec => spec.id === task.specId);
      check(spec, 'INVALID_REGISTRY', 'Production task has no registered specification.');
      check(same(task.acceptanceCriteria, spec.acceptanceCriteria), 'INVALID_REGISTRY', 'Production cannot remove or redefine its specification acceptance aspects.');
    }
    if (ACTIVE.has(task.status) || task.status === 'accepted') {
      check(object(task.owner) && typeof task.owner.actorId === 'string' && typeof task.owner.claimId === 'string' && EXECUTORS.includes(task.owner.executor), 'INVALID_REGISTRY', 'Active/accepted task requires its recorded owner.');
      check(task.allowedExecutors.includes(task.owner.executor), 'INVALID_REGISTRY', 'Owner executor is not permitted.');
    } else check(task.owner === null, 'INVALID_REGISTRY', 'Unclaimed task cannot retain an owner.');
    if (task.status === 'accepted') validateAcceptance(task, task.acceptance);
  }
  if (registry.baseline.inventoryComplete) check(isReconciled(registry), 'INVALID_REGISTRY', 'Complete inventory requires current acknowledgements and both reconciliations.');
  return registry;
}

function validateSpecReadiness(spec) {
  check(object(spec.readiness) && object(spec.readiness.sections), 'INCOMPLETE_SPEC', 'Specification readiness evidence is missing.');
  check(SPEC_SECTIONS.every(section => spec.readiness.sections[section] === true), 'INCOMPLETE_SPEC', 'Every required specification section must be checked.');
  id(spec.readiness.reviewerId, 'spec.readiness.reviewerId');
  check(spec.readiness.reviewerId !== spec.authorId, 'INDEPENDENT_REVIEW_REQUIRED', 'The specification author cannot approve their own ready inventory.');
  text(spec.readiness.evidence, 'spec.readiness.evidence'); timestamp(spec.readiness.reviewedAt, 'spec.readiness.reviewedAt');
}

function currentActor(registry, actor) {
  actorIdentity(actor);
  const record = registry.actors.find(row => row.id === actor.id);
  check(record && record.executor === actor.executor && record.contractVersion === registry.contractVersion && record.baselineCommit === registry.baseline.homepage.commit,
    'ACK_REQUIRED', 'This actor must acknowledge the exact current contract and homepage baseline before acting.');
  return record;
}

export function isReconciled(registry) {
  if ((registry.pendingReconciliationTasks ?? []).some(task => !task.resolvedTaskId)) return false;
  return EXECUTORS.every(executor => {
    const record = registry.baseline.reconciliation[executor];
    if (!record || !record.inventoryComplete || record.contractVersion !== registry.contractVersion || record.baselineCommit !== registry.baseline.homepage.commit) return false;
    const actor = registry.actors.find(row => row.id === record.actorId);
    return actor?.executor === executor && actor.contractVersion === registry.contractVersion && actor.baselineCommit === registry.baseline.homepage.commit;
  });
}

export function inventorySummary(registry) {
  validateRegistry(registry);
  const known = registry.baseline.inventoryComplete && isReconciled(registry);
  const count = known ? registry.specs.filter(spec => spec.status === 'ready').length : null;
  return {
    readyUnconsumedCount: count, inventoryStatus: known ? 'confirmed' : 'unknown',
    specPriority: known ? (count < 6 ? 'P1' : 'P3') : null,
    reconciliationPriority: known ? null : 'P1', productionPriority: 'P3',
    productionDefaultExecutor: 'local-codex',
    phases: Object.fromEntries([...STATUSES].map(status => [status, registry.tasks.filter(task => task.workType === 'production' && task.status === status).length])),
    reason: known ? (count < 6 ? 'Ready, unconsumed specification stock is below six.' : 'Specification stock has reached six.') : 'Local and cloud inventories have not both been reconciled. Do not infer zero or use catalog draft counts.'
  };
}

function taskById(registry, taskId) {
  id(taskId, 'taskId'); const task = registry.tasks.find(row => row.id === taskId); check(task, 'NOT_FOUND', 'Task not found.'); return task;
}
function ownedTask(registry, command) {
  const task = taskById(registry, command.taskId);
  check(task.owner?.actorId === command.actor.id && task.owner?.executor === command.actor.executor, 'NOT_OWNER', 'Only the recorded owner may change this work.');
  check(command.claimId === task.owner.claimId, 'STALE_CLAIM', 'The exact current claimId is required.');
  return task;
}
function readyToClaim(registry, task, actor) {
  check(registry.baseline.inventoryComplete && isReconciled(registry), 'RECONCILIATION_REQUIRED', 'Local and cloud must reconcile existing work before any new claim.');
  check(task.allowedExecutors.includes(actor.executor), 'EXECUTOR_NOT_ALLOWED', 'This executor is not explicitly allowed to take this task.');
  check(task.status === 'ready' || task.status === 'released', 'ALREADY_OWNED', 'Task is not available. Silence or stale observations do not release ownership.');
  check(task.owner === null, 'ALREADY_OWNED', 'Task already has an owner.');
  githubRef(task.source, 'task.source'); githubRef(task.brief, 'task.brief');
  if (task.workType === 'production') {
    const spec = registry.specs.find(row => row.id === task.specId);
    check(spec && (spec.status === 'ready' || (spec.status === 'consumed' && spec.consumedBy.taskId === task.id)), 'SPEC_UNAVAILABLE', 'Production needs a ready spec or the same previously consumed spec.');
    validateSpecReadiness(spec);
  }
}

function validateAcceptance(task, review) {
  check(object(review) && review.verdict === 'accepted', 'INCOMPLETE_REVIEW', 'Accepted verdict is required.');
  check(task.submission && same(review.candidate, task.submission.candidate), 'CANDIDATE_MISMATCH', 'Review must match the exact submitted candidate.');
  githubRef(review.candidate, 'review.candidate');
  check(review.reviewerId && review.reviewerId !== task.owner.actorId && review.reviewerId !== task.submission.authorId && !task.contributors.includes(review.reviewerId), 'INDEPENDENT_REVIEW_REQUIRED', 'A different actor who has not contributed to this work must review the candidate.');
  text(review.evidence, 'review.evidence'); githubRef(review.evidenceRef, 'review.evidenceRef');
  check(review.rubricComplete === true, 'INCOMPLETE_REVIEW', 'The entire agreed rubric must be evaluated.');
  const required = task.acceptanceCriteria;
  check(Array.isArray(required) && required.length > 0, 'INCOMPLETE_REVIEW', 'The task must declare acceptance criteria before work starts.');
  check(Array.isArray(review.aspects) && review.aspects.length === required.length, 'INCOMPLETE_REVIEW', 'Every required aspect must be scored.');
  unique(review.aspects.map(aspect => aspect.id), 'review aspect IDs');
  for (const criterion of required) {
    const aspect = review.aspects.find(row => row.id === criterion.id);
    check(aspect && Number.isFinite(aspect.score) && aspect.score >= 90 && aspect.score <= 100, 'SCORE_BELOW_TARGET', `Required aspect ${criterion.id} has not reached 90.`);
    text(aspect.evidence, `aspect ${criterion.id} evidence`);
  }
  check(review.requiredChecksComplete === true, 'INCOMPLETE_REVIEW', 'Required checks must be complete; NOT_RUN is not passed.');
}

/** Pure transition: no clock, network, dispatch, deployment or permission expansion. */
export function applyOperation(input, command) {
  validateRegistry(input);
  check(object(command), 'INVALID', 'Command must be an object.');
  id(command.operationId, 'operationId'); timestamp(command.observedAt, 'observedAt');
  check(Number.isSafeInteger(command.expectedRevision) && command.expectedRevision >= 0, 'INVALID', 'expectedRevision is required.');
  const digest = fingerprint(command);
  const prior = input.events.find(event => event.operationId === command.operationId);
  if (prior) { check(prior.requestHash === digest, 'IDEMPOTENCY_CONFLICT', 'operationId was used for another command.'); return {registry: structuredClone(input), event: prior, idempotent: true}; }
  check(command.expectedRevision === input.revision, 'REVISION_CONFLICT', 'Registry changed. Read it again and reconsider; do not blindly retry.');
  const registry = structuredClone(input);
  text(command.action, 'action', 80);
  actorIdentity(command.actor);
  if (command.action !== 'acknowledge') currentActor(registry, command.actor);

  switch (command.action) {
    case 'acknowledge': {
      check(command.contractVersion === registry.contractVersion && command.baselineCommit === registry.baseline.homepage.commit, 'STALE_CONTRACT', 'Acknowledge the current exact contractVersion and homepage commit.');
      text(command.evidence, 'evidence');
      const existing = registry.actors.find(row => row.id === command.actor.id);
      check(!existing || existing.executor === command.actor.executor, 'ACTOR_CONFLICT', 'An actor cannot switch execution environments under the same identity.');
      const record = {...command.actor, contractVersion: registry.contractVersion, baselineCommit: registry.baseline.homepage.commit, acknowledgedAt: command.observedAt, evidence: command.evidence};
      if (existing) registry.actors[registry.actors.indexOf(existing)] = record; else registry.actors.push(record);
      break;
    }
    case 'reconcile': {
      text(command.evidence, 'evidence'); githubRef(command.evidenceRef, 'evidenceRef');
      check(typeof command.inventoryComplete === 'boolean', 'INVALID', 'inventoryComplete must be explicit.');
      unique(command.taskIds, 'taskIds'); unique(command.specIds, 'specIds');
      check(command.taskIds.every(taskId => registry.tasks.some(task => task.id === taskId)), 'INVALID', 'Every reconciled task must be registered first.');
      check(command.specIds.every(specId => registry.specs.some(spec => spec.id === specId)), 'INVALID', 'Every reconciled spec must be registered first.');
      check(registry.tasks.filter(task => task.owner?.executor === command.actor.executor && ACTIVE.has(task.status)).every(task => command.taskIds.includes(task.id)), 'INCOMPLETE_RECONCILIATION', 'Reconciliation cannot omit active work from this executor.');
      check(!command.inventoryComplete || !(registry.pendingReconciliationTasks ?? []).some(task => task.executor === command.actor.executor && !task.resolvedTaskId), 'INCOMPLETE_RECONCILIATION', 'Known existing work must be imported and linked before this inventory is complete.');
      registry.baseline.reconciliation[command.actor.executor] = {actorId: command.actor.id, contractVersion: registry.contractVersion, baselineCommit: registry.baseline.homepage.commit, inventoryComplete: command.inventoryComplete, taskIds: command.taskIds, specIds: command.specIds, evidence: command.evidence, evidenceRef: command.evidenceRef, observedAt: command.observedAt};
      registry.baseline.inventoryComplete = isReconciled(registry);
      break;
    }
    case 'change-baseline': {
      githubRef(command.homepage, 'homepage'); text(command.evidence, 'evidence'); githubRef(command.evidenceRef, 'evidenceRef');
      check(command.homepage.repository === REPOSITORY, 'INVALID_REFERENCE', 'The shared homepage baseline must remain in its authoritative repository.');
      check(!same(command.homepage, registry.baseline.homepage), 'INVALID', 'The homepage baseline has not changed.');
      registry.baseline.previousHomepage = registry.baseline.homepage;
      registry.baseline.homepage = command.homepage;
      registry.baseline.change = {by: command.actor.id, at: command.observedAt, evidence: command.evidence, evidenceRef: command.evidenceRef};
      registry.baseline.inventoryComplete = false;
      registry.baseline.reconciliation = {'local-codex': null, 'cloud-dot': null};
      break;
    }
    case 'register-spec': {
      const spec = command.spec; check(object(spec), 'INVALID', 'spec is required.');
      id(spec.id, 'spec.id'); text(spec.title, 'spec.title', 300); githubRef(spec.document, 'spec.document'); githubRef(spec.source, 'spec.source');
      criteria(spec.acceptanceCriteria);
      check(!registry.specs.some(row => row.id === spec.id), 'DUPLICATE', 'Specification ID already exists.');
      check(!registry.specs.some(row => row.document.repository === spec.document.repository && row.document.path === spec.document.path), 'DUPLICATE_SPEC', 'This specification document is already registered. Use its stable ID instead of inflating inventory with another version/ID.');
      registry.specs.push({id: spec.id, title: spec.title, authorId: command.actor.id, source: spec.source, document: spec.document, acceptanceCriteria: spec.acceptanceCriteria, status: 'draft', readiness: null, consumedBy: null, registeredAt: command.observedAt});
      break;
    }
    case 'revise-spec': {
      const spec = registry.specs.find(row => row.id === command.specId); check(spec, 'NOT_FOUND', 'Specification not found.');
      check(spec.authorId === command.actor.id, 'NOT_OWNER', 'Only the recorded specification author can replace an unassigned draft.');
      check(['draft', 'ready', 'invalid'].includes(spec.status) && !registry.tasks.some(task => task.specId === spec.id), 'SPEC_ALREADY_ASSIGNED', 'A specification referenced by dispatched work is frozen. Use revision work without shrinking its original acceptance contract.');
      githubRef(command.document, 'document'); githubRef(command.source, 'source'); criteria(command.acceptanceCriteria); text(command.evidence, 'evidence');
      check(!registry.specs.some(row => row.id !== spec.id && row.document.repository === command.document.repository && row.document.path === command.document.path), 'DUPLICATE_SPEC', 'Document already belongs to another specification.');
      spec.document = command.document; spec.source = command.source; spec.acceptanceCriteria = command.acceptanceCriteria; spec.status = 'draft'; spec.readiness = null;
      spec.lastRevision = {by: command.actor.id, at: command.observedAt, evidence: command.evidence};
      break;
    }
    case 'mark-spec-ready': {
      const spec = registry.specs.find(row => row.id === command.specId); check(spec, 'NOT_FOUND', 'Specification not found.');
      check(['draft', 'invalid', 'reserved'].includes(spec.status), 'SPEC_UNAVAILABLE', 'Only a draft, reserved or invalidated spec can be reviewed.');
      spec.readiness = {reviewerId: command.actor.id, sections: command.sections, evidence: command.evidence, reviewedAt: command.observedAt};
      validateSpecReadiness(spec); spec.status = spec.status === 'reserved' ? 'consumed' : 'ready';
      break;
    }
    case 'register-task': {
      const task = command.task; check(object(task), 'INVALID', 'task is required.');
      id(task.id, 'task.id'); text(task.title, 'task.title', 300); githubRef(task.source, 'task.source'); githubRef(task.brief, 'task.brief');
      check(!registry.tasks.some(row => row.id === task.id), 'DUPLICATE', 'Task ID already exists.');
      check(['spec', 'production', 'review', 'maintenance'].includes(task.workType), 'INVALID', 'Unsupported workType.');
      const allowedExecutors = task.allowedExecutors ?? (task.workType === 'production' ? ['local-codex'] : ['local-codex', 'cloud-dot']);
      unique(allowedExecutors, 'allowedExecutors'); check(allowedExecutors.length && allowedExecutors.every(row => EXECUTORS.includes(row)), 'INVALID', 'Invalid executors.');
      if (task.workType === 'production') check(registry.specs.some(row => row.id === task.specId), 'NOT_FOUND', 'Register the production specification first.');
      criteria(task.acceptanceCriteria);
      if (task.workType === 'production') check(same(task.acceptanceCriteria, registry.specs.find(row => row.id === task.specId).acceptanceCriteria), 'RUBRIC_MISMATCH', 'Production acceptance criteria must exactly match the reviewed specification.');
      registry.tasks.push({id: task.id, title: task.title, workType: task.workType, source: task.source, brief: task.brief, specId: task.specId ?? null, allowedExecutors, acceptanceCriteria: task.acceptanceCriteria, contributors: [], status: 'ready', owner: null, checkpoint: null, blocker: null, handoff: null, submission: null, acceptance: null, publication: null, registeredAt: command.observedAt});
      break;
    }
    case 'adopt-existing': {
      const task = taskById(registry, command.taskId);
      check(!registry.baseline.inventoryComplete, 'MIGRATION_ONLY', 'Existing-work import is only permitted before reconciliation is complete.');
      check(task.status === 'ready' && !task.owner, 'ALREADY_OWNED', 'Cannot overwrite existing ownership during migration.');
      check(task.allowedExecutors.includes(command.actor.executor), 'EXECUTOR_NOT_ALLOWED', 'Executor not allowed.');
      text(command.evidence, 'evidence'); githubRef(command.evidenceRef, 'evidenceRef');
      text(command.checkpoint, 'checkpoint');
      task.owner = {actorId: command.actor.id, executor: command.actor.executor, claimId: command.operationId, claimedAt: command.observedAt, importedExisting: true, evidence: command.evidence, evidenceRef: command.evidenceRef};
      if (!task.contributors.includes(command.actor.id)) task.contributors.push(command.actor.id);
      task.status = 'blocked'; task.checkpoint = command.checkpoint; task.blocker = 'Existing work imported; complete reconciliation before resuming.';
      if (task.workType === 'production') { const spec = registry.specs.find(row => row.id === task.specId); check(['draft', 'ready'].includes(spec.status) || (['consumed', 'reserved'].includes(spec.status) && spec.consumedBy.taskId === task.id), 'SPEC_UNAVAILABLE', 'Specification is already reserved by different work.'); spec.status = spec.status === 'draft' || spec.status === 'reserved' ? 'reserved' : 'consumed'; spec.consumedBy = {taskId: task.id, claimId: command.operationId, consumedAt: command.observedAt}; }
      if (command.pendingId) {
        const pending = (registry.pendingReconciliationTasks ?? []).find(row => row.id === command.pendingId);
        check(pending && !pending.resolvedTaskId && pending.executor === command.actor.executor, 'INVALID', 'The known pending work must be unresolved and in the same execution environment.');
        pending.resolvedTaskId = task.id; pending.resolvedBy = command.actor.id; pending.resolvedAt = command.observedAt;
      }
      break;
    }
    case 'claim': {
      const task = taskById(registry, command.taskId); readyToClaim(registry, task, command.actor);
      task.owner = {actorId: command.actor.id, executor: command.actor.executor, claimId: command.operationId, claimedAt: command.observedAt};
      if (!task.contributors.includes(command.actor.id)) task.contributors.push(command.actor.id);
      task.status = 'claimed'; task.blocker = null; task.handoff = null;
      if (task.workType === 'production') { const spec = registry.specs.find(row => row.id === task.specId); spec.status = 'consumed'; spec.consumedBy = {taskId: task.id, claimId: command.operationId, consumedAt: command.observedAt}; }
      break;
    }
    case 'start': case 'resume': {
      const task = ownedTask(registry, command);
      check(registry.baseline.inventoryComplete && isReconciled(registry), 'RECONCILIATION_REQUIRED', 'Complete both reconciliations before execution.');
      check(['claimed', 'blocked', 'revision'].includes(task.status), 'INVALID_STATE', 'Task cannot start or resume from this state.');
      check(!task.handoff, 'HANDOFF_PENDING', 'Do not resume while a handoff is pending.');
      if (task.workType === 'production') { const spec = registry.specs.find(row => row.id === task.specId); check(spec.status === 'consumed' && spec.consumedBy.taskId === task.id, 'INCOMPLETE_SPEC', 'Finish the reserved legacy specification review before production resumes.'); }
      text(command.evidence, 'evidence'); task.status = 'working'; task.blocker = null; task.lastObservation = {at: command.observedAt, evidence: command.evidence};
      break;
    }
    case 'block': {
      const task = ownedTask(registry, command); check(ACTIVE.has(task.status), 'INVALID_STATE', 'Only active work can block.');
      text(command.blocker, 'blocker'); text(command.checkpoint, 'checkpoint'); text(command.resumeCondition, 'resumeCondition');
      task.status = 'blocked'; task.blocker = command.blocker; task.checkpoint = command.checkpoint; task.resumeCondition = command.resumeCondition;
      break;
    }
    case 'release': {
      const task = ownedTask(registry, command); check(ACTIVE.has(task.status), 'INVALID_STATE', 'Only active work can be released.');
      text(command.checkpoint, 'checkpoint'); text(command.reason, 'reason'); githubRef(command.evidenceRef, 'evidenceRef');
      task.release = {by: command.actor.id, claimId: task.owner.claimId, reason: command.reason, evidenceRef: command.evidenceRef, at: command.observedAt};
      task.status = 'released'; task.owner = null; task.checkpoint = command.checkpoint; task.handoff = null; task.blocker = null;
      task.submission = null; task.acceptance = null;
      break;
    }
    case 'offer-handoff': {
      const task = ownedTask(registry, command); check(ACTIVE.has(task.status) && task.status !== 'reviewing', 'INVALID_STATE', 'Handoff must occur at a safe checkpoint before review.');
      id(command.toActorId, 'toActorId'); text(command.checkpoint, 'checkpoint'); githubRef(command.evidenceRef, 'evidenceRef');
      const recipient = registry.actors.find(row => row.id === command.toActorId); check(recipient, 'ACK_REQUIRED', 'The receiving actor must acknowledge the current rules first.'); currentActor(registry, recipient);
      check(recipient.id !== command.actor.id && task.allowedExecutors.includes(recipient.executor), 'EXECUTOR_NOT_ALLOWED', 'The target must be a different permitted actor.');
      task.status = 'blocked'; task.checkpoint = command.checkpoint; task.blocker = 'Owner paused at a checkpoint; awaiting explicit receiving acknowledgement.';
      task.handoff = {offerId: command.operationId, fromActorId: command.actor.id, toActorId: recipient.id, previousClaimId: task.owner.claimId, evidenceRef: command.evidenceRef, offeredAt: command.observedAt};
      break;
    }
    case 'cancel-handoff': {
      const task = ownedTask(registry, command); check(task.handoff, 'INVALID_STATE', 'No pending handoff.'); text(command.evidence, 'evidence');
      task.handoff = null; task.blocker = 'Handoff cancelled by recorded owner; resume explicitly after checking the latest registry.';
      break;
    }
    case 'accept-handoff': {
      const task = taskById(registry, command.taskId);
      check(registry.baseline.inventoryComplete && isReconciled(registry), 'RECONCILIATION_REQUIRED', 'Reconciliation is required.');
      check(task.status === 'blocked' && task.handoff?.toActorId === command.actor.id && task.handoff.offerId === command.offerId && task.owner?.claimId === task.handoff.previousClaimId, 'STALE_HANDOFF', 'Exact current handoff offer is required.');
      check(task.allowedExecutors.includes(command.actor.executor), 'EXECUTOR_NOT_ALLOWED', 'Executor not allowed.'); text(command.evidence, 'evidence');
      task.lastHandoff = {...task.handoff, acceptedBy: command.actor.id, acceptedAt: command.observedAt, evidence: command.evidence};
      task.owner = {actorId: command.actor.id, executor: command.actor.executor, claimId: command.operationId, claimedAt: command.observedAt}; task.status = 'claimed'; task.handoff = null; task.blocker = null;
      if (!task.contributors.includes(command.actor.id)) task.contributors.push(command.actor.id);
      break;
    }
    case 'submit': {
      const task = ownedTask(registry, command); check(task.status === 'working' || task.status === 'revision', 'INVALID_STATE', 'Only finished work can be submitted.');
      check(!task.handoff, 'HANDOFF_PENDING', 'Resolve the handoff before submission.');
      githubRef(command.candidate, 'candidate'); githubRef(command.evidenceRef, 'evidenceRef'); text(command.evidence, 'evidence');
      check(typeof command.pullRequest === 'string' && /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/[1-9][0-9]*$/.test(command.pullRequest), 'INVALID_REFERENCE', 'A GitHub pull request URL is required.');
      check(command.pullRequest.startsWith(`https://github.com/${command.candidate.repository}/pull/`), 'CANDIDATE_MISMATCH', 'Candidate and pull request repositories differ.');
      task.submission = {candidate: command.candidate, pullRequest: command.pullRequest, evidence: command.evidence, evidenceRef: command.evidenceRef, authorId: command.actor.id, claimId: task.owner.claimId, submittedAt: command.observedAt};
      task.status = 'reviewing'; task.acceptance = null;
      break;
    }
    case 'review': {
      const task = taskById(registry, command.taskId); check(task.status === 'reviewing' && task.submission, 'INVALID_STATE', 'Task is not awaiting review.');
      check(command.actor.id !== task.owner.actorId && command.actor.id !== task.submission.authorId && !task.contributors.includes(command.actor.id), 'INDEPENDENT_REVIEW_REQUIRED', 'The current or former maker cannot independently review their own work.');
      check(same(command.candidate, task.submission.candidate), 'CANDIDATE_MISMATCH', 'Candidate changed; review the exact submitted commit.');
      text(command.evidence, 'evidence'); githubRef(command.evidenceRef, 'evidenceRef');
      check(['accepted', 'revision'].includes(command.verdict), 'INVALID', 'Verdict must be accepted or revision.');
      const review = {verdict: command.verdict, reviewerId: command.actor.id, candidate: command.candidate, evidence: command.evidence, evidenceRef: command.evidenceRef, rubricComplete: command.rubricComplete === true, requiredChecksComplete: command.requiredChecksComplete === true, aspects: command.aspects ?? [], reviewedAt: command.observedAt};
      if (command.verdict === 'accepted') validateAcceptance(task, review);
      task.acceptance = review; task.status = command.verdict === 'accepted' ? 'accepted' : 'revision';
      break;
    }
    default: fail('UNKNOWN_ACTION', `Unsupported action: ${command.action}`);
  }
  registry.revision++;
  const event = {operationId: command.operationId, requestHash: digest, revision: registry.revision, action: command.action, actorId: command.actor.id, executor: command.actor.executor, observedAt: command.observedAt, taskId: command.taskId ?? command.task?.id ?? null, specId: command.specId ?? command.spec?.id ?? null};
  registry.events.push(event);
  validateRegistry(registry);
  return {registry, event, idempotent: false};
}

/** References that must be read back from GitHub before the proposed write. */
export function operationReferences(registry, command) {
  const refs = [registry.baseline.homepage];
  const add = value => { if (object(value) && value.repository && value.commit && value.path) refs.push(value); };
  add(command.evidenceRef); add(command.candidate); add(command.homepage); add(command.document); add(command.source); add(command.spec?.document); add(command.spec?.source); add(command.task?.source); add(command.task?.brief);
  if (command.taskId) {
    const task = registry.tasks.find(row => row.id === command.taskId);
    if (task) { add(task.source); add(task.brief); add(task.submission?.candidate); const spec = registry.specs.find(row => row.id === task.specId); if (spec) { add(spec.document); add(spec.source); } }
  }
  if (command.specId) { const spec = registry.specs.find(row => row.id === command.specId); if (spec) { add(spec.document); add(spec.source); } }
  return [...new Map(refs.map(ref => [canonical(ref), ref])).values()];
}
