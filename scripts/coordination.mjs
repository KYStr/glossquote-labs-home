import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { REGISTRY_PATH, REPOSITORY, BRANCH, CoordinationError, applyOperation, validateRegistry, inventorySummary, operationReferences, fingerprint } from './coordination-core.mjs';

const API = 'https://api.github.com';
const encodePath = path => path.split('/').map(encodeURIComponent).join('/');
const endpoint = `/repos/${REPOSITORY}/contents/${encodePath(REGISTRY_PATH)}`;
const fail = (code, message) => { throw new CoordinationError(code, message); };

export class GitHubError extends Error {
  constructor(status, message = `GitHub returned HTTP ${status}.`) { super(message); this.name = 'GitHubError'; this.status = status; }
}

/** All network traffic is restricted to GitHub's API; redirects are rejected. */
export class GitHubClient {
  constructor(token, {fetchFn = globalThis.fetch} = {}) { this.token = token; this.fetch = fetchFn; }
  async request(path, {method = 'GET', body} = {}) {
    if (!path.startsWith('/repos/')) fail('INVALID_URL', 'Only repository endpoints are allowed.');
    if (method !== 'GET' && !this.token) fail('AUTH_REQUIRED', 'Set GH_TOKEN or GITHUB_TOKEN through the local authenticated environment; never paste it into a command or prompt.');
    const headers = {'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'glossquote-coordination'};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let response;
    try { response = await this.fetch(`${API}${path}`, {method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(30000)}); }
    catch { throw new GitHubError(0, 'GitHub request failed or its response was lost. Do not assume a write failed.'); }
    if (!response.ok) throw new GitHubError(response.status);
    const raw = await response.text();
    if (raw.length > 4_000_000) fail('RESPONSE_TOO_LARGE', 'GitHub response is too large for this coordination operation.');
    try { return JSON.parse(raw); } catch { fail('INVALID_RESPONSE', 'GitHub did not return valid JSON.'); }
  }
  async readRegistry() {
    const content = await this.request(`${endpoint}?ref=${encodeURIComponent(BRANCH)}`);
    if (content.type !== 'file' || content.encoding !== 'base64' || typeof content.sha !== 'string') fail('INVALID_RESPONSE', 'Expected a GitHub registry file with blob SHA.');
    let registry;
    try { registry = JSON.parse(Buffer.from(content.content, 'base64').toString('utf8')); } catch { fail('INVALID_REGISTRY', 'Registry is not UTF-8 JSON.'); }
    validateRegistry(registry);
    return {registry, sha: content.sha, url: content.html_url};
  }
  async writeRegistry(sha, registry, command) {
    return this.request(endpoint, {method: 'PUT', body: {branch: BRANCH, sha, message: `coordination: ${command.action} ${command.taskId ?? command.specId ?? command.operationId}`, content: Buffer.from(`${JSON.stringify(registry, null, 2)}\n`, 'utf8').toString('base64')}});
  }
  async verifyReference(ref) {
    const data = await this.request(`/repos/${ref.repository}/contents/${encodePath(ref.path)}?ref=${encodeURIComponent(ref.commit)}`);
    if (data.type !== 'file' || typeof data.sha !== 'string') fail('MISSING_SOURCE', `Required pinned GitHub file is unavailable: ${ref.repository}/${ref.path}.`);
  }
  async verifyPullRequest(url, candidate) {
    const match = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/pull\/([1-9][0-9]*)$/.exec(url);
    if (!match || match[1] !== candidate.repository) fail('CANDIDATE_MISMATCH', 'Pull request and candidate repositories must match.');
    const pull = await this.request(`/repos/${match[1]}/pulls/${match[2]}`);
    if (pull.head?.sha !== candidate.commit || pull.head?.repo?.full_name !== candidate.repository) fail('CANDIDATE_MISMATCH', 'Pull request head is not the exact submitted candidate commit. Re-freeze and re-review after changes.');
    if (pull.state !== 'open') fail('INVALID_STATE', 'Submit and review an open pull request; accepted source and deployed release are separate records.');
  }
}

function receipt(snapshot, command, event, extra = {}) {
  const task = snapshot.registry.tasks.find(row => row.id === command.taskId);
  return {
    saved: true, operationId: command.operationId, requestHash: event.requestHash,
    operationRevision: event.revision, currentRevision: snapshot.registry.revision, blobSha: snapshot.sha,
    registryUrl: snapshot.url ?? `https://github.com/${REPOSITORY}/blob/${BRANCH}/${REGISTRY_PATH}`,
    action: event.action, taskId: task?.id ?? null, taskStatus: task?.status ?? null, owner: task?.owner ?? null,
    workMayStart: ['claim', 'accept-handoff'].includes(command.action) && task?.owner?.claimId === command.operationId && task?.owner?.actorId === command.actor.id && task?.status === 'claimed' && snapshot.registry.baseline.inventoryComplete,
    actualExecutionClaimed: false, deployed: false, inventory: inventorySummary(snapshot.registry), ...extra
  };
}

/** One conditional PUT at most. Conflicts and unknown outcomes never retry a write. */
export async function executeOperation(client, command, {verifyReferences = true} = {}) {
  const before = await client.readRegistry();
  const proposed = applyOperation(before.registry, command);
  if (proposed.idempotent) return receipt(before, command, proposed.event, {idempotent: true, putAttempted: false});
  if (verifyReferences) {
    for (const ref of operationReferences(before.registry, command)) await client.verifyReference(ref);
    const task = before.registry.tasks.find(row => row.id === command.taskId);
    if (command.action === 'submit') await client.verifyPullRequest(command.pullRequest, command.candidate);
    if (command.action === 'review') await client.verifyPullRequest(task.submission.pullRequest, command.candidate);
  }
  let writeError = null;
  try { await client.writeRegistry(before.sha, proposed.registry, command); } catch (error) { writeError = error; }
  let after;
  try { after = await client.readRegistry(); }
  catch {
    fail('OUTCOME_UNKNOWN', `Write outcome is unknown for ${command.operationId}. Do not work or repeat a changed request. Restore GitHub read access and check this exact operationId/request hash first.`);
  }
  const event = after.registry.events.find(row => row.operationId === command.operationId);
  if (event?.requestHash === fingerprint(command)) return receipt(after, command, event, {idempotent: false, putAttempted: true, reconciledAfterLostResponse: Boolean(writeError)});
  if (event) fail('IDEMPOTENCY_CONFLICT', 'Another command used this operationId. No ownership was obtained by this request.');
  if (writeError?.status === 409 || writeError?.status === 422 || after.sha !== before.sha) fail('REVISION_CONFLICT', 'Another write won the GitHub compare-and-swap. Read current ownership, then choose another task or explicitly reconsider; do not force-update.');
  if (writeError) fail('WRITE_NOT_CONFIRMED', 'The operation is absent from the authoritative readback. No ownership or permission to work was obtained. Fix access and inspect again before a deliberate retry.');
  fail('READBACK_MISMATCH', 'GitHub acknowledged a write, but the exact operation is absent from readback. Do not start work.');
}

async function stdinJson() {
  let raw = '';
  for await (const chunk of process.stdin) { raw += chunk; if (raw.length > 1_000_000) fail('INPUT_TOO_LARGE', 'Command is too large.'); }
  try { return JSON.parse(raw); } catch { fail('INVALID_JSON', 'Provide one JSON command on stdin.'); }
}

export async function main(argv = process.argv.slice(2)) {
  const [action, path] = argv;
  if (action === 'validate') {
    const registry = JSON.parse(await readFile(path ?? REGISTRY_PATH, 'utf8'));
    console.log(JSON.stringify({valid: Boolean(validateRegistry(registry)), revision: registry.revision, inventory: inventorySummary(registry)}, null, 2)); return;
  }
  if (!['read', 'apply'].includes(action)) {
    console.log('Usage: node scripts/coordination.mjs read | validate [registry.json] | apply < command.json\nRead is public. Writes require GH_TOKEN or GITHUB_TOKEN in the local environment. Never put credentials in JSON, shell arguments, commits or prompts. The CLI records protocol state only; it never launches work, merges a PR or deploys.'); return;
  }
  const client = new GitHubClient(process.env.GH_TOKEN || process.env.GITHUB_TOKEN);
  if (action === 'read') { const snapshot = await client.readRegistry(); console.log(JSON.stringify({...snapshot, inventory: inventorySummary(snapshot.registry)}, null, 2)); return; }
  const command = await stdinJson();
  if (Object.keys(command).some(key => /token|password|authorization/i.test(key))) fail('SECRET_IN_INPUT', 'Credentials do not belong in command JSON.');
  console.log(JSON.stringify(await executeOperation(client, command), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => {
  console.error(JSON.stringify({ok: false, code: error.code ?? (error instanceof GitHubError ? `GITHUB_${error.status}` : 'FAILED'), message: error instanceof CoordinationError || error instanceof GitHubError ? error.message : 'Coordination command failed before a confirmed receipt. Inspect the registry before retrying.'})); process.exitCode = 1;
});
