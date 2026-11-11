import { createHash } from 'node:crypto';

export const REGISTRY_PATH = 'coordination/work-registry.json';
export const REPOSITORY = 'KYStr/glossquote-labs-home';
export const BRANCH = 'codex/initial-publication';
export const LABS_BATCH_POLICY = Object.freeze({threshold: 40, claimBatchSize: 5, maxActivePerActor: 1, submissionMode: 'batch'});
export const EXECUTORS = ['local-codex', 'cloud-dot'];
export const SPEC_SECTIONS = ['goal', 'scope', 'userFlow', 'inputsOutputs', 'implementation', 'acceptance', 'tests', 'handoff'];
const MAINTENANCE_APPLIER = 'local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf';
const RUN5_SPEC_IDS = new Set([
  'spec-age-calculator-20261109',
  'spec-cooking-measurement-converter-20261109',
  'spec-bill-split-calculator-20261109',
  'spec-salary-converter-20261109',
  'spec-workdays-calculator-20261109',
  'spec-wallpaper-calculator-20261109',
  'spec-ping-area-converter-20261109',
  'spec-clothing-size-converter-20261109',
  'spec-feels-like-temperature-20261109',
  'spec-dew-point-calculator-20261109',
  'spec-race-time-predictor-20261109',
  'spec-period-cycle-calculator-20261109',
  'spec-steps-converter-20261109',
  'spec-bac-calculator-20261109',
  'spec-vo2max-calculator-20261109',
  'spec-calories-burned-calculator-20261109',
  'spec-child-height-predictor-20261109',
  'spec-ideal-weight-calculator-20261109',
  'spec-breakeven-calculator-20261109',
  'spec-tax-included-converter-20261109',
  'spec-markup-margin-calculator-20261109',
  'spec-stock-profit-calculator-20261109',
  'spec-savings-goal-calculator-20261109',
  'spec-inflation-calculator-20261109',
  'spec-taiwan-water-bill-20261109',
  'spec-nhi-premium-calculator-20261109',
  'spec-car-depreciation-calculator-20261109',
  'spec-lighting-lumen-calculator-20261109',
  'spec-screen-ppi-calculator-20261109',
  'spec-battery-runtime-calculator-20261109',
  'spec-reading-time-estimator-20261109',
  'spec-photo-print-size-calculator-20261109',
  'spec-group-generator-20261109',
  'spec-interval-timer-20261109',
  'spec-currency-converter-20261109',
  'spec-dice-roller-20261109',
  'spec-pool-volume-calculator-20261109',
  'spec-baby-feeding-calculator-20261109',
  'spec-pet-feeding-calculator-20261109',
  'spec-baking-pan-converter-20261109',
]);
const PRODUCT_ASPECTS = [
  'functionality', 'boundaries', 'privacy', 'security', 'usability', 'accessibility',
  'localization-seo', 'toolchain-provenance', 'compatibility'
];
const APPLY_MAINTENANCE = 'apply-spec-maintenance';
const COMMAND_FIELDS = ['action', 'actor', 'operationId', 'expectedRevision', 'observedAt'];
const REVISION_FIELDS = [
  'specId', 'expectedAuthorId', 'expectedDocument', 'expectedSource', 'expectedCriteriaHash',
  'document', 'source', 'acceptanceCriteria', 'mappingRef', 'sourceMaintenanceTaskIds'
];
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

function fields(value, required, optional = []) {
  check(object(value) && required.every(key => Object.hasOwn(value, key))
    && Object.keys(value).every(key => required.includes(key) || optional.includes(key)),
  'INVALID', 'Required fields are missing or unknown fields are present.');
}

function maintenanceRef(ref, name) {
  fields(ref, ['repository', 'commit', 'path']);
  githubRef(ref, name);
  check(ref.repository === REPOSITORY && /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(ref.path),
    'INVALID_REFERENCE', `${name} must use a canonical path in the central repository.`);
}

function exactCriteria(value, aspects) {
  check(Array.isArray(value), 'RUBRIC_MISMATCH', 'Acceptance criteria must be an array.');
  for (const row of value) fields(row, ['id', 'label']);
  criteria(value);
  check(value.length === aspects.length && aspects.every(aspect => value.some(row => row.id === aspect)),
    'RUBRIC_MISMATCH', 'Acceptance criteria must contain every required aspect exactly once.');
}

function sameFile(a, b) { return a.repository === b.repository && a.path === b.path; }
function sameCommit(a, b) { return a.repository === b.repository && a.commit === b.commit; }

function validateRevisionTarget(target) {
  fields(target, REVISION_FIELDS);
  check(RUN5_SPEC_IDS.has(target.specId), 'SPEC_MAINTENANCE_SCOPE', 'Only the forty fixed run5 specification IDs are eligible.');
  id(target.expectedAuthorId, 'expectedAuthorId');
  for (const key of ['expectedDocument', 'expectedSource', 'document', 'source', 'mappingRef']) maintenanceRef(target[key], key);
  check(typeof target.expectedCriteriaHash === 'string' && /^[a-f0-9]{64}$/.test(target.expectedCriteriaHash),
    'INVALID', 'expectedCriteriaHash must be the canonical criteria SHA-256.');
  const slug = target.specId.slice('spec-'.length, -'-20261109'.length);
  check(target.document.path === `docs/specs/${slug}/SPEC.md`
    && sameFile(target.document, target.expectedDocument) && sameFile(target.source, target.expectedSource),
  'SPEC_MAINTENANCE_SCOPE', 'A maintenance target must preserve the specification and source file identities.');
  check(target.mappingRef.path.endsWith('.json') && sameCommit(target.document, target.mappingRef)
    && sameCommit(target.source, target.mappingRef),
  'CANDIDATE_MISMATCH', 'The mapping JSON and replacement references must share one fixed candidate commit.');
  exactCriteria(target.acceptanceCriteria, PRODUCT_ASPECTS);
  unique(target.sourceMaintenanceTaskIds, 'sourceMaintenanceTaskIds');
  check(target.sourceMaintenanceTaskIds.length <= RUN5_SPEC_IDS.size, 'INVALID', 'Too many maintenance source tasks.');
  for (const taskId of target.sourceMaintenanceTaskIds) id(taskId, 'sourceMaintenanceTaskId');
}

function taskMakers(task) {
  return [...new Set([...task.contributors, task.owner?.actorId, task.submission?.authorId].filter(Boolean))];
}

function acceptedMaintenance(registry, taskId) {
  const task = taskById(registry, taskId);
  check(task.workType === 'maintenance' && task.status === 'accepted', 'INVALID_STATE', 'A source or mapping task must be accepted maintenance.');
  validateAcceptance(task, task.acceptance);
  check(task.submission.claimId === task.owner.claimId && task.submission.authorId === task.owner.actorId,
    'STALE_CLAIM', 'The accepted candidate must belong to the recorded maintenance owner and claim.');
  id(task.submission.authorId, 'maintenance submission author');
  id(task.acceptance.reviewerId, 'maintenance reviewer');
  githubRef(task.submission.evidenceRef, 'maintenance submission evidence');
  check(typeof task.submission.pullRequest === 'string'
    && /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/[1-9][0-9]*$/.test(task.submission.pullRequest)
    && task.submission.pullRequest.startsWith(`https://github.com/${task.submission.candidate.repository}/pull/`),
  'CANDIDATE_MISMATCH', 'Accepted maintenance must identify the pull request for its candidate.');
  return task;
}

function maintenanceSources(registry, target, mappingTaskId, historicalFilter, makersOnly = false) {
  const fixedTask = taskId => {
    const task = acceptedMaintenance(registry, taskId);
    maintenanceRef(task.submission.candidate, 'source maintenance candidate');
    return task;
  };
  const direct = target.sourceMaintenanceTaskIds.map(fixedTask);
  if (!direct.length) return {direct, lineage: []};
  const recordedCandidates = new Map();
  const commitKey = ref => `${ref.repository}/${ref.commit}`;
  for (const task of registry.tasks) {
    if (task.workType !== 'maintenance' || task.status === 'released') continue;
    if (historicalFilter && (task.status !== 'accepted' || !historicalFilter(task.id))) continue;
    const candidate = task.submission?.candidate ?? task.specRevisionTargets?.[0]?.mappingRef;
    if (!candidate) continue;
    const key = commitKey(candidate);
    if (!recordedCandidates.has(key)) recordedCandidates.set(key, []);
    recordedCandidates.get(key).push(task);
  }

  const lineage = new Map();
  const active = new Set();
  const stack = direct.map(task => ({task, exit: false})).reverse();
  while (stack.length) {
    const {task, exit} = stack.pop();
    if (exit) { active.delete(task.id); continue; }
    if (makersOnly && (task.id === mappingTaskId || active.has(task.id))) continue;
    check(makersOnly || (task.id !== mappingTaskId && !active.has(task.id) && !sameCommit(task.source, target.mappingRef)),
      'MAINTENANCE_SOURCE_CYCLE', 'The known maintenance source chain contains a cycle.');
    if (lineage.has(task.id)) continue;
    lineage.set(task.id, task);
    active.add(task.id);
    stack.push({task, exit: true});

    // The source can be a SPEC while the accepted candidate is a HANDOFF in the same commit.
    const parents = recordedCandidates.get(commitKey(task.source)) ?? [];
    check(parents.every(parent => parent.status === 'accepted'), 'MAINTENANCE_SOURCE_PENDING',
      'A referenced maintenance candidate is awaiting independent acceptance.');
    const declared = (task.specRevisionTargets ?? []).flatMap(row => row.sourceMaintenanceTaskIds);
    const parentIds = [...new Set([...parents.map(parent => parent.id), ...declared])];
    for (const parentId of parentIds.reverse()) {
      if (historicalFilter && !historicalFilter(parentId)) continue;
      stack.push({task: fixedTask(parentId), exit: false});
    }
  }
  return {direct, lineage: [...lineage.values()]};
}

function previouslyAcceptedSources(registry, mappingTask) {
  // An ancestor accepted later can require a fresh mapping review without invalidating older registry snapshots.
  const action = mappingTask.status === 'accepted' ? 'review' : 'register-task';
  const anchor = registry.events.findLast(event => event.action === action && event.taskId === mappingTask.id);
  if (!anchor) return () => true;
  const acceptedLater = new Set(registry.events.filter(event => event.action === 'review' && event.revision > anchor.revision)
    .map(event => event.taskId));
  return taskId => !acceptedLater.has(taskId);
}

function mappingSourceMakers(registry, task, include) {
  return task.specRevisionTargets.flatMap(target => maintenanceSources(registry, target, task.id, include).lineage.flatMap(taskMakers));
}

function knownSpecMakers(registry, spec) {
  const briefPath = spec.document.path.replace(/\/SPEC\.md$/, '/BRIEF.md');
  const specTasks = registry.tasks.filter(task => task.workType === 'spec'
    && (task.specId === spec.id || (task.submission?.candidate && sameFile(task.submission.candidate, spec.document))
      || (task.brief.repository === spec.document.repository && task.brief.path === briefPath)));
  const maintenanceMakers = (spec.maintenanceHistory ?? []).flatMap(entry =>
    maintenanceSources(registry, entry.replacement, entry.taskId, () => true, true).lineage.flatMap(taskMakers));
  return [spec.authorId, ...(spec.contributors ?? []), ...specTasks.flatMap(taskMakers), ...maintenanceMakers];
}

function validateMappingTask(registry, task, include) {
  check(task.workType === 'maintenance' && task.specId === null,
    'SPEC_MAINTENANCE_SCOPE', 'Only a maintenance task without a production spec reference can declare revision targets.');
  exactCriteria(task.acceptanceCriteria, SPEC_SECTIONS);
  const targets = task.specRevisionTargets;
  check(Array.isArray(targets) && targets.length > 0 && targets.length <= RUN5_SPEC_IDS.size,
    'INVALID', 'A mapping task needs one to forty declared specification targets.');
  for (const target of targets) validateRevisionTarget(target);
  unique(targets.map(target => target.specId), 'revision target specification IDs');
  const mappingRef = targets[0].mappingRef;
  const inherited = [];
  for (const target of targets) {
    const spec = registry.specs.find(row => row.id === target.specId);
    check(spec && target.expectedAuthorId === spec.authorId, 'SPEC_MAINTENANCE_SCOPE', 'The target must retain its existing specification and author.');
    check(same(target.mappingRef, mappingRef), 'CANDIDATE_MISMATCH', 'A mapping task must declare a single fixed mapping file.');
    check(!target.sourceMaintenanceTaskIds.includes(task.id), 'SPEC_MAINTENANCE_SCOPE', 'A mapping task cannot source its own candidate.');
    inherited.push(spec.authorId);
  }
  if (task.submission) {
    maintenanceRef(task.submission.candidate, 'mapping submission candidate');
    check(sameCommit(task.submission.candidate, mappingRef),
      'CANDIDATE_MISMATCH', 'Submission must use the candidate fixed at mapping registration. A changed commit requires a new task.');
  }
  return [...inherited, ...mappingSourceMakers(registry, task, include)];
}

function checkTargetState(registry, spec, target) {
  check(['draft', 'ready', 'invalid'].includes(spec.status) && spec.consumedBy === null
    && !registry.tasks.some(task => task.specId === spec.id), 'SPEC_ALREADY_ASSIGNED',
  'Only an unassigned draft, ready or invalid specification may be maintained.');
  check(spec.authorId === target.expectedAuthorId && same(spec.document, target.expectedDocument)
    && same(spec.source, target.expectedSource) && fingerprint(spec.acceptanceCriteria) === target.expectedCriteriaHash,
  'SPEC_MAINTENANCE_STALE', 'Current specification does not match its declared pre-maintenance state.');
  check(!same(spec.document, target.document) || !same(spec.source, target.source)
    || !same(spec.acceptanceCriteria, target.acceptanceCriteria), 'NO_CHANGE', 'Maintenance must change the fixed references or product criteria.');
}

function specSnapshot(spec) {
  return structuredClone({
    id: spec.id, title: spec.title, authorId: spec.authorId, registeredAt: spec.registeredAt,
    document: spec.document, source: spec.source, acceptanceCriteria: spec.acceptanceCriteria,
    status: spec.status, readiness: spec.readiness, consumedBy: spec.consumedBy,
    lastRevision: spec.lastRevision ?? null, contributors: spec.contributors ?? []
  });
}

function maintenanceEvidence(task) {
  const {candidate, pullRequest, authorId, submittedAt, evidenceRef: submissionRef} = task.submission;
  const {reviewerId, reviewedAt, evidenceRef: acceptanceRef} = task.acceptance;
  return structuredClone({
    submission: {candidate, pullRequest, authorId, submittedAt, evidenceRef: submissionRef, recordHash: fingerprint(task.submission)},
    acceptance: {reviewerId, reviewedAt, evidenceRef: acceptanceRef, recordHash: fingerprint(task.acceptance)}
  });
}

function validateMaintenanceHistory(registry, spec, events) {
  const history = spec.maintenanceHistory === undefined ? [] : spec.maintenanceHistory;
  check(Array.isArray(history) && history.length === events.length, 'INVALID_REGISTRY', 'Maintenance history must match the recorded apply events.');
  if (spec.contributors !== undefined) {
    unique(spec.contributors, 'spec contributors');
    for (const contributor of spec.contributors) id(contributor, 'spec contributor');
    check(spec.contributors.includes(spec.authorId), 'INVALID_REGISTRY', 'Specification contributors must retain the original author.');
  }
  if (!events.length) return;
  const usedTasks = new Set();
  for (const [index, entry] of history.entries()) {
    const event = events[index];
    id(event.operationId, 'maintenance operation ID');
    timestamp(event.observedAt, 'maintenance event time');
    check(Number.isSafeInteger(event.revision) && event.revision > (events[index - 1]?.revision ?? 0)
      && event.revision <= registry.revision && /^[a-f0-9]{64}$/.test(event.requestHash),
    'INVALID_REGISTRY', 'Maintenance history requires ordered events with valid revisions and request hashes.');
    fields(entry, ['operationId', 'actorId', 'observedAt', 'taskId', 'claimId', 'makers', 'submission', 'acceptance', 'previous', 'replacement']);
    check(event.operationId === entry.operationId && event.actorId === MAINTENANCE_APPLIER && event.executor === 'local-codex'
      && entry.actorId === event.actorId && entry.observedAt === event.observedAt && entry.taskId === event.taskId
      && !usedTasks.has(entry.taskId), 'INVALID_REGISTRY', 'Maintenance history must identify a unique matching primary apply event and mapping task.');
    usedTasks.add(entry.taskId);
    const task = acceptedMaintenance(registry, entry.taskId);
    const target = task.specRevisionTargets?.find(row => row.specId === spec.id);
    const evidence = maintenanceEvidence(task);
    check(target && same(entry.replacement, target) && entry.claimId === task.owner.claimId
      && same(entry.submission, evidence.submission) && same(entry.acceptance, evidence.acceptance)
      && same(entry.makers, taskMakers(task)), 'INVALID_REGISTRY', 'Maintenance history must preserve the accepted mapping, claim and makers.');
    const previous = entry.previous;
    fields(previous, ['id', 'title', 'authorId', 'registeredAt', 'document', 'source', 'acceptanceCriteria', 'status', 'readiness', 'consumedBy', 'lastRevision', 'contributors']);
    criteria(previous.acceptanceCriteria);
    unique(previous.contributors, 'previous spec contributors');
    check(previous.id === spec.id && previous.authorId === target.expectedAuthorId
      && previous.title === spec.title && previous.registeredAt === spec.registeredAt
      && ['draft', 'ready', 'invalid'].includes(previous.status) && previous.consumedBy === null
      && same(previous.document, target.expectedDocument) && same(previous.source, target.expectedSource)
      && fingerprint(previous.acceptanceCriteria) === target.expectedCriteriaHash,
    'INVALID_REGISTRY', 'Maintenance history must preserve the exact previous specification state.');
    if (previous.status === 'ready') validateSpecReadiness(previous, index > 0);
    check(spec.contributors && [...previous.contributors, ...entry.makers].every(maker => spec.contributors.includes(maker)),
      'INVALID_REGISTRY', 'Specification contributors must include every historical maker.');
  }
  const latest = history.at(-1).replacement;
  const lastApplyRevision = events.at(-1).revision;
  const revisedLater = registry.events.some(event => event.action === 'revise-spec' && event.specId === spec.id
    && event.actorId === spec.authorId && event.revision > lastApplyRevision);
  if (!revisedLater) check(same(spec.document, latest.document) && same(spec.source, latest.source)
    && same(spec.acceptanceCriteria, latest.acceptanceCriteria),
  'INVALID_REGISTRY', 'Maintained specification references and criteria must match the latest application or a later author revision.');
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
  const maintenanceEvents = new Map();
  for (const event of registry.events) {
    if (event.action !== APPLY_MAINTENANCE) continue;
    check(registry.specs.some(spec => spec.id === event.specId), 'INVALID_REGISTRY', 'Maintenance event must identify an existing specification.');
    if (!maintenanceEvents.has(event.specId)) maintenanceEvents.set(event.specId, []);
    maintenanceEvents.get(event.specId).push(event);
  }
  for (const spec of registry.specs) {
    id(spec.id, 'spec.id'); text(spec.title, 'spec.title', 300); id(spec.authorId, 'spec.authorId');
    githubRef(spec.document, 'spec.document'); githubRef(spec.source, 'spec.source');
    criteria(spec.acceptanceCriteria);
    check(['draft', 'ready', 'consumed', 'reserved', 'invalid'].includes(spec.status), 'INVALID_REGISTRY', 'Unknown spec status.');
    validateMaintenanceHistory(registry, spec, maintenanceEvents.get(spec.id) ?? []);
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
    if (task.specRevisionTargets !== undefined) {
      const inherited = validateMappingTask(registry, task, previouslyAcceptedSources(registry, task));
      check([...inherited, ...taskMakers(task)].every(maker => task.contributors.includes(maker)),
        'INVALID_REGISTRY', 'Mapping task contributors must retain every source maker and its recorded owner.');
      for (const maker of task.contributors) id(maker, 'mapping contributor');
    }
  }
  if (registry.baseline.inventoryComplete) check(isReconciled(registry), 'INVALID_REGISTRY', 'Complete inventory requires current acknowledgements and both reconciliations.');
  return registry;
}

function validateSpecReadiness(spec, maintained = Boolean(spec.maintenanceHistory?.length)) {
  check(object(spec.readiness) && object(spec.readiness.sections), 'INCOMPLETE_SPEC', 'Specification readiness evidence is missing.');
  check(SPEC_SECTIONS.every(section => spec.readiness.sections[section] === true), 'INCOMPLETE_SPEC', 'Every required specification section must be checked.');
  id(spec.readiness.reviewerId, 'spec.readiness.reviewerId');
  check(spec.readiness.reviewerId !== spec.authorId && !(spec.contributors ?? []).includes(spec.readiness.reviewerId),
    'INDEPENDENT_REVIEW_REQUIRED', 'The specification author and contributors cannot approve their own ready inventory.');
  text(spec.readiness.evidence, 'spec.readiness.evidence'); timestamp(spec.readiness.reviewedAt, 'spec.readiness.reviewedAt');
  if (maintained) {
    exactCriteria(spec.acceptanceCriteria, PRODUCT_ASPECTS);
    fields(spec.readiness.sections, SPEC_SECTIONS);
    check(same(spec.readiness.document, spec.document), 'CANDIDATE_MISMATCH', 'Readiness must review the exact maintained specification document.');
    githubRef(spec.readiness.evidenceRef, 'spec.readiness.evidenceRef');
  }
}

// Historical readiness is structurally readable even when later source records disqualify it for new work.
function effectiveReadinessIssue(registry, spec) {
  try {
    validateSpecReadiness(spec);
    const latest = spec.maintenanceHistory?.at(-1);
    if (latest) {
      const mapping = acceptedMaintenance(registry, latest.taskId);
      const makers = new Set([...knownSpecMakers(registry, spec), ...mappingSourceMakers(registry, mapping)]);
      check(!makers.has(mapping.acceptance.reviewerId), 'MAPPING_REVIEW_CONFLICT',
        'The current mapping needs a fresh independent acceptance because its recorded reviewer is now a known maker.');
      check(!makers.has(spec.readiness.reviewerId), 'INDEPENDENT_REVIEW_REQUIRED',
        'A recorded specification maker cannot independently approve readiness.');
      check([...makers].every(maker => mapping.contributors.includes(maker)), 'MAINTENANCE_SOURCE_STALE',
        'The current mapping is missing a known maker. Register and independently review a fresh mapping.');
    }
    return null;
  } catch (error) {
    if (error instanceof CoordinationError) return error;
    throw error;
  }
}

function requireEffectiveReadiness(registry, spec) {
  const issue = effectiveReadinessIssue(registry, spec);
  if (issue) throw issue;
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
  const count = known ? registry.specs.filter(spec => spec.status === 'ready' && !effectiveReadinessIssue(registry, spec)).length : null;
  return {
    ...LABS_BATCH_POLICY, readyUnconsumedCount: count, inventoryStatus: known ? 'confirmed' : 'unknown',
    specPriority: known ? (count < LABS_BATCH_POLICY.threshold ? 'P1' : 'P3') : null,
    reconciliationPriority: known ? null : 'P1', productionPriority: 'P3',
    productionDefaultExecutor: 'local-codex',
    phases: Object.fromEntries([...STATUSES].map(status => [status, registry.tasks.filter(task => task.workType === 'production' && task.status === status).length])),
    reason: known ? (count < LABS_BATCH_POLICY.threshold ? 'Ready, unconsumed specification stock is below forty.' : 'Specification stock has reached forty.') : 'Local and cloud inventories have not both been reconciled. Do not infer zero or use catalog draft counts.'
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
function productionHeld(registry, actorId) {
  return registry.tasks.filter(task => task.workType === 'production' && ['claimed', 'working', 'blocked', 'revision'].includes(task.status) && task.owner?.actorId === actorId);
}
function checkProductionCapacity(registry, task, actor) {
  if (task.workType === 'production') check(productionHeld(registry, actor.id).length < LABS_BATCH_POLICY.claimBatchSize,
    'CLAIM_LIMIT', 'At most five unsubmitted production tasks per actor; existing ownership is preserved.');
}
function readyToClaim(registry, task, actor) {
  checkProductionCapacity(registry, task, actor);
  check(registry.baseline.inventoryComplete && isReconciled(registry), 'RECONCILIATION_REQUIRED', 'Local and cloud must reconcile existing work before any new claim.');
  check(task.allowedExecutors.includes(actor.executor), 'EXECUTOR_NOT_ALLOWED', 'This executor is not explicitly allowed to take this task.');
  check(task.status === 'ready' || task.status === 'released', 'ALREADY_OWNED', 'Task is not available. Silence or stale observations do not release ownership.');
  check(task.owner === null, 'ALREADY_OWNED', 'Task already has an owner.');
  githubRef(task.source, 'task.source'); githubRef(task.brief, 'task.brief');
  if (task.workType === 'production') {
    const spec = registry.specs.find(row => row.id === task.specId);
    check(spec && (spec.status === 'ready' || (spec.status === 'consumed' && spec.consumedBy.taskId === task.id)), 'SPEC_UNAVAILABLE', 'Production needs a ready spec or the same previously consumed spec.');
    if (RUN5_SPEC_IDS.has(spec.id)) exactCriteria(spec.acceptanceCriteria, PRODUCT_ASPECTS);
    requireEffectiveReadiness(registry, spec);
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
      const maintained = Boolean(spec.maintenanceHistory?.length);
      check(['draft', 'invalid', 'reserved'].includes(spec.status), 'SPEC_UNAVAILABLE', 'Only a draft, reserved or invalidated spec can be reviewed.');
      if (RUN5_SPEC_IDS.has(spec.id)) exactCriteria(spec.acceptanceCriteria, PRODUCT_ASPECTS);
      spec.readiness = {reviewerId: command.actor.id, sections: command.sections, evidence: command.evidence, reviewedAt: command.observedAt};
      if (maintained) {
        fields(command, [...COMMAND_FIELDS, 'specId', 'sections', 'evidence', 'document', 'evidenceRef']);
        spec.readiness.document = command.document;
        spec.readiness.evidenceRef = command.evidenceRef;
      }
      requireEffectiveReadiness(registry, spec);
      spec.status = spec.status === 'reserved' ? 'consumed' : 'ready';
      break;
    }
    case APPLY_MAINTENANCE: {
      fields(command, [...COMMAND_FIELDS, 'taskId', 'specId']);
      fields(command.actor, ['id', 'executor']);
      check(command.actor.id === MAINTENANCE_APPLIER && command.actor.executor === 'local-codex',
        'SPEC_MAINTENANCE_AUTHORITY', 'Only the fixed primary actor can apply run5 specification maintenance.');
      const task = acceptedMaintenance(registry, command.taskId);
      const target = task.specRevisionTargets?.find(row => row.specId === command.specId);
      check(target, 'SPEC_MAINTENANCE_SCOPE', 'The accepted mapping task must predeclare this exact specification.');
      const spec = registry.specs.find(row => row.id === target.specId);
      check(!(spec.maintenanceHistory ?? []).some(entry => entry.taskId === task.id),
        'SPEC_MAINTENANCE_STALE', 'This mapping task was already applied to the specification.');
      checkTargetState(registry, spec, target);
      const makers = taskMakers(task);
      check([...knownSpecMakers(registry, spec), ...mappingSourceMakers(registry, task)].every(maker => makers.includes(maker)),
        'INDEPENDENT_REVIEW_REQUIRED', 'The mapping omitted a recorded specification maker. Register and independently review a fresh mapping.');
      spec.maintenanceHistory ??= [];
      spec.maintenanceHistory.push({
        operationId: command.operationId, actorId: command.actor.id, observedAt: command.observedAt,
        taskId: task.id, claimId: task.owner.claimId, makers, ...maintenanceEvidence(task),
        previous: specSnapshot(spec), replacement: structuredClone(target)
      });
      spec.contributors = [...new Set([...makers, ...(spec.contributors ?? []), spec.authorId])];
      const {document, source, acceptanceCriteria} = structuredClone(target);
      spec.document = document; spec.source = source; spec.acceptanceCriteria = acceptanceCriteria;
      spec.status = 'draft'; spec.readiness = null;
      break;
    }
    case 'register-task': {
      const task = command.task; check(object(task), 'INVALID', 'task is required.');
      id(task.id, 'task.id'); text(task.title, 'task.title', 300); githubRef(task.source, 'task.source'); githubRef(task.brief, 'task.brief');
      check(!registry.tasks.some(row => row.id === task.id), 'DUPLICATE', 'Task ID already exists.');
      check(['spec', 'production', 'review', 'maintenance'].includes(task.workType), 'INVALID', 'Unsupported workType.');
      const allowedExecutors = task.allowedExecutors ?? (task.workType === 'production' ? ['local-codex'] : ['local-codex', 'cloud-dot']);
      unique(allowedExecutors, 'allowedExecutors'); check(allowedExecutors.length && allowedExecutors.every(row => EXECUTORS.includes(row)), 'INVALID', 'Invalid executors.');
      criteria(task.acceptanceCriteria);
      if (task.workType === 'production') {
        const spec = registry.specs.find(row => row.id === task.specId);
        check(spec, 'NOT_FOUND', 'Register the production specification first.');
        if (RUN5_SPEC_IDS.has(spec.id)) exactCriteria(spec.acceptanceCriteria, PRODUCT_ASPECTS);
        check(same(task.acceptanceCriteria, spec.acceptanceCriteria), 'RUBRIC_MISMATCH', 'Production acceptance criteria must exactly match the reviewed specification.');
        if (spec.maintenanceHistory?.length) {
          check(['ready', 'consumed'].includes(spec.status), 'SPEC_UNAVAILABLE', 'A maintained specification must be independently ready before production registration.');
          requireEffectiveReadiness(registry, spec);
        }
      }
      const registered = {id: task.id, title: task.title, workType: task.workType, source: task.source, brief: task.brief, specId: task.specId ?? null, allowedExecutors, acceptanceCriteria: task.acceptanceCriteria, contributors: [], status: 'ready', owner: null, checkpoint: null, blocker: null, handoff: null, submission: null, acceptance: null, publication: null, registeredAt: command.observedAt};
      if (Object.hasOwn(task, 'specRevisionTargets')) {
        fields(command, [...COMMAND_FIELDS, 'task']);
        fields(task, ['id', 'title', 'workType', 'source', 'brief', 'acceptanceCriteria', 'specRevisionTargets'], ['allowedExecutors']);
        registered.specRevisionTargets = structuredClone(task.specRevisionTargets);
        registered.acceptanceCriteria = structuredClone(task.acceptanceCriteria);
        const inherited = validateMappingTask(registry, registered);
        for (const target of registered.specRevisionTargets) {
          const spec = registry.specs.find(row => row.id === target.specId);
          checkTargetState(registry, spec, target);
          inherited.push(...knownSpecMakers(registry, spec));
        }
        registered.contributors = [...new Set(inherited)];
      }
      registry.tasks.push(registered);
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
      if (task.workType === 'production' && task.status !== 'revision') check(!productionHeld(registry, command.actor.id).some(row => row.id !== task.id && row.status === 'revision'), 'REVISION_FIRST', 'Return to revision work at a safe checkpoint before starting another reserved item.');
      if (task.workType === 'production') check(!productionHeld(registry, command.actor.id).some(row => row.id !== task.id && row.status === 'working'), 'ACTIVE_LIMIT', 'Only one production task may be working per actor; checkpoint the current item first.');
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
      checkProductionCapacity(registry, task, command.actor);
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
      if (task.specRevisionTargets) check(mappingSourceMakers(registry, task).every(maker => task.contributors.includes(maker)),
        'INDEPENDENT_REVIEW_REQUIRED', 'The mapping omitted a known maintenance ancestor. Register and review a fresh mapping.');
      if (command.verdict === 'accepted' && task.specRevisionTargets) {
        for (const target of task.specRevisionTargets) {
          const spec = registry.specs.find(row => row.id === target.specId);
          checkTargetState(registry, spec, target);
          check(knownSpecMakers(registry, spec).every(maker => task.contributors.includes(maker)),
            'INDEPENDENT_REVIEW_REQUIRED', 'The mapping must retain every known specification maker before acceptance.');
        }
      }
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
  const mapping = specMappingVerification(registry, command);
  if (mapping) {
    add(mapping.mappingRef);
    if (mapping.submission) add(mapping.submission.evidenceRef);
    add(mapping.acceptance?.evidenceRef);
    for (const {target, lineage} of mapping.targets) {
      for (const ref of [target.expectedDocument, target.expectedSource, target.document, target.source]) add(ref);
      for (const source of lineage) {
        for (const ref of [source.source, source.brief, source.submission.candidate,
          source.submission.evidenceRef, source.acceptance.evidenceRef]) add(ref);
      }
    }
  }
  return [...new Map(refs.map(ref => [canonical(ref), ref])).values()];
}

/** Pinned inputs for the network adapter, computed after the proposed transition validates. */
export function specMappingVerification(registry, command) {
  const registering = command.action === 'register-task';
  if (!registering && !['submit', 'review', APPLY_MAINTENANCE].includes(command.action)) return null;
  const task = registering ? command.task : registry.tasks.find(row => row.id === command.taskId);
  if (!task?.specRevisionTargets) return null;
  return {
    mappingRef: task.specRevisionTargets[0].mappingRef,
    targets: task.specRevisionTargets.map(target => {
      const {direct, lineage} = maintenanceSources(registry, target, task.id);
      return {target, sources: direct, lineage};
    }),
    submission: task.submission,
    acceptance: task.acceptance
  };
}

/** Validate the entire batch in memory before any write. Each child retains its exact operation ID/hash/revision. */
export function applyBatch(input, commands) {
  validateRegistry(input);
  check(Array.isArray(commands) && commands.length > 0 && commands.length <= 20, 'INVALID_BATCH', 'Provide 1–20 explicit child commands.');
  check(commands.every(object), 'INVALID_BATCH', 'Every child must be a command object.');
  unique(commands.map(command => command.operationId), 'batch operation IDs');
  check(commands.every(command => same(command.actor, commands[0].actor)), 'INVALID_BATCH', 'One actual actor must own a batch.');
  const existing = commands.map(command => input.events.find(event => event.operationId === command.operationId));
  for (let i = 0; i < commands.length; i++) if (existing[i]) check(existing[i].requestHash === fingerprint(commands[i]), 'IDEMPOTENCY_CONFLICT', 'A child operation ID has a different request hash.');
  check(existing.every(Boolean) || existing.every(event => !event), 'PARTIAL_BATCH', 'Only part of this batch is recorded. Inspect original operation IDs; do not resend or fill gaps automatically.');
  if (existing.every(Boolean)) return {registry: structuredClone(input), events: existing, idempotent: true};
  let registry = input;
  const events = [];
  for (const command of commands) {
    const proposed = applyOperation(registry, command);
    registry = proposed.registry; events.push(proposed.event);
  }
  if (commands.some(command => command.action === 'claim' && taskById(registry, command.taskId).workType === 'production')) {
    check(productionHeld(registry, commands[0].actor.id).length === LABS_BATCH_POLICY.claimBatchSize, 'BATCH_INCOMPLETE', 'A production claim batch must fill the actor to five including existing work; insufficient ready inventory is not fabricated.');
  }
  return {registry, events, idempotent: false};
}
