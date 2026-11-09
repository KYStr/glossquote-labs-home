import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, verifyFrozenInputs } from './bindings.mjs';
import { requireValue, errorCode, LIMITS } from './evidence.mjs';
import { executeSixCases, bounded } from './protocol.mjs';

async function artifactWriter(ownedRunDirectory) {
  const station = path.resolve(ROOT, '.runs/browser-acceptance-2026-10-19/station-v3');
  const run = path.resolve(ownedRunDirectory), relative = path.relative(station, run);
  requireValue(relative && !path.isAbsolute(relative) && !relative.includes(path.sep) && /^[a-z0-9-]{1,80}$/u.test(relative), 'EXACT_STATION_RUN_DIRECTORY_REQUIRED');
  for (let file = run; ; file = path.dirname(file)) {
    requireValue(!(await fs.lstat(file)).isSymbolicLink(), 'ARTIFACT_LINK_REJECTED');
    if (file === path.resolve(ROOT)) break;
    requireValue(path.dirname(file) !== file, 'ARTIFACT_BOUNDARY');
  }
  requireValue((await fs.lstat(run)).isDirectory(), 'RUN_DIRECTORY_REQUIRED');
  const out = path.join(run, 'new22-12-cdp');
  await fs.mkdir(out); // Existing artifacts are never overwritten.
  await fs.mkdir(path.join(out, 'cases'));
  for (const name of ['A1', 'B1', 'A2', 'B2', 'A3', 'B3']) await fs.mkdir(path.join(out, 'cases', name));
  const files = [];
  return { out, files, async save(name, value) {
    requireValue(/^(?:cases\/[AB][123]\/(?:native-network|native-headers|first-party|server-receipt|control)|source-bindings|evidence-index|protocol-result|adapter-result|adapter-failure|server-cleanup|artifact-inventory)\.json$/u.test(name), 'ARTIFACT_NAME_REJECTED');
    const bytes = Buffer.from(JSON.stringify(value) + '\n');
    requireValue(bytes.length <= LIMITS.fileBytes, 'ARTIFACT_FILE_LIMIT');
    await fs.writeFile(path.join(out, ...name.split('/')), bytes, { flag: 'wx' });
    files.push({ path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  } };
}

/** Primary-only entry. Requires an already-owned direct-pipe Chrome client.
 * This module never spawns, connects to, closes or kills any browser/process.
 */
export async function runAdapter({ client, checkBoundary, ownedRunDirectory }) {
  requireValue(client && typeof client.session === 'function' && client.commandTimeoutMs === LIMITS.runtimeMs && typeof checkBoundary === 'function' && typeof ownedRunDirectory === 'string', 'PRIMARY_OWNED_CAPABILITIES_REQUIRED');
  const preflight = await bounded(Promise.resolve().then(() => checkBoundary({ stage: 'before-adapter-resources', ownedRunDirectory })), 30000, 'PRIMARY_GUARD_TIMEOUT');
  requireValue(preflight?.ok === true && Array.isArray(preflight.evidence) && preflight.evidence.length > 0 && preflight.evidence.length <= 8 && preflight.evidence.every(ref => typeof ref === 'string' && /^[A-Za-z0-9_./-]{1,240}$/u.test(ref) && !ref.startsWith('/') && !ref.split('/').includes('..')), 'PRIMARY_PREFLIGHT_REQUIRED');
  const bindings = await verifyFrozenInputs();
  const { DirectCdpPipeClient } = await import(bindings.directClientUrl);
  requireValue(client instanceof DirectCdpPipeClient && client.closed === false && Number.isInteger(client.childProcess?.pid) && client.childProcess.pid > 0 && client.childProcess.exitCode === null, 'REAL_DIRECT_CDP_PIPE_REQUIRED');
  const writer = await artifactWriter(ownedRunDirectory);
  await writer.save('source-bindings.json', { task: 'NEW22-12-CDP-ADAPTER', fixed: bindings.sourceFingerprints, browserPidFromOwnedClient: client.childProcess.pid, primaryPreflightEvidence: preflight.evidence });
  let transport, result, failure, listening = false;
  const cleanup = { ownsServerOnly: true, serverClosed: false, errors: [] };
  try {
    const { createTransportDiagnosticServer } = await import(bindings.transportUrl);
    const { installNativeObserver } = await import(bindings.observerUrl);
    transport = await createTransportDiagnosticServer();
    await bounded(new Promise((resolve, reject) => {
      const error = cause => reject(cause); transport.server.once('error', error);
      transport.server.listen(0, '127.0.0.1', () => { listening = true; transport.server.off('error', error); resolve(); });
    }), LIMITS.commandMs, 'OWN_SERVER_LISTEN_TIMEOUT');
    const address = transport.server.address();
    requireValue(address.address === '127.0.0.1' && address.port >= 1024, 'OWN_SERVER_ORIGIN_INVALID');
    result = await executeSixCases({ client, transport, origin: 'http://127.0.0.1:' + address.port, readerSource: bindings.readerSource, installObserver: installNativeObserver, checkBoundary, save: writer.save, executionKind: 'NATIVE_CDP_PENDING_PRIMARY_REVIEW' });
    if (result.fatal) failure = result.fatal;
    await verifyFrozenInputs();
    const { verifyFixedSources } = await import(bindings.sourceIdentityUrl);
    await verifyFixedSources();
  } catch (error) {
    failure = errorCode(error, 'ADAPTER_FAILED');
    await writer.save('adapter-failure.json', { code: failure, fullNetworkAccepted: false, fullT02Accepted: false, primaryExactJobRetirementRequired: true });
  } finally {
    if (transport && (listening || transport.server.listening)) {
      try {
        await bounded(new Promise((resolve, reject) => {
          transport.server.close(error => error ? reject(error) : resolve());
          transport.server.closeAllConnections(); // Exact server constructed above.
        }), LIMITS.terminalMs, 'OWN_SERVER_CLOSE_TIMEOUT');
        cleanup.serverClosed = !transport.server.listening && transport.server.address() === null;
      } catch (error) { cleanup.errors.push(errorCode(error, 'OWN_SERVER_CLOSE_FAILED')); }
    } else cleanup.serverClosed = true;
    await writer.save('server-cleanup.json', cleanup);
  }
  if (!cleanup.serverClosed || cleanup.errors.length) failure ??= 'OWN_SERVER_CLEANUP_INCOMPLETE';
  if (failure && result) result = { ...result, conclusion: 'INVALID_OR_INCOMPLETE_COMPARISON', reasons: [...result.reasons, failure] };
  const output = { task: 'NEW22-12-CDP-ADAPTER', state: failure ? 'STOPPED' : 'NATIVE_OBSERVATIONS_REQUIRE_PRIMARY_ACCEPTANCE', failure: failure ?? null, result: result ?? null, cleanup, primaryExactJobRetirementRequired: true, historicalFailedRetained: 69, historicalMissingTerminalsRetained: 3, fullNetworkAccepted: false, fullT02Accepted: false };
  await writer.save('adapter-result.json', output);
  await writer.save('artifact-inventory.json', { scope: 'BOUNDED_NATIVE_DIAGNOSTIC_ARTIFACTS', files: [...writer.files], excludesSelf: true });
  return output;
}
