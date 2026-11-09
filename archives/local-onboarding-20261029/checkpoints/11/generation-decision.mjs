// Pure consistency candidate. It performs no OS/process/browser operations and
// can never authorize UI execution; native collector provenance stays primary-owned.
export function evaluateGenerationSnapshot(input) {
  const issues = [], rows = [];
  const reject = (code, pid) => issues.push({ severity: 'REJECT', code, ...(pid === undefined ? {} : { pid }) });
  const refresh = (code, pid) => issues.push({ severity: 'REFRESH_REQUIRED', code, pid });
  const result = () => ({
    decision: issues.some((i) => i.severity === 'REJECT') ? 'REJECT'
      : issues.length ? 'REFRESH_REQUIRED' : 'VERIFIED_DATA_ONLY',
    executionAuthorized: false,
    scope: 'Consistency of contemporaneous primary-native receipts only; not a native acceptance PASS.',
    issues, rows,
  });
  const pid = (v) => Number.isInteger(v) && v > 0 && v <= 0xffffffff;
  const tick = (v) => typeof v === 'string' && /^[0-9]{1,20}$/.test(v) ? BigInt(v) : null;
  const pathKey = (v) => typeof v === 'string' ? v.replaceAll('/', '\\').toLowerCase() : null;
  if (!input || input.schemaVersion !== 1) { reject('SCHEMA_REQUIRED'); return result(); }
  const expected = input.expected, snapshot = input.snapshot;
  if (!expected || !pid(expected.browserPid) || tick(expected.browserCreationFileTime) === null || !expected.jobId || !expected.desktopId || !pathKey(expected.imagePath)) {
    reject('EXPECTED_NATIVE_BOUNDARY_REQUIRED'); return result();
  }
  if (!snapshot || snapshot.method !== 'SystemInfo.getProcessInfo' || snapshot.target !== 'browser' || !Array.isArray(snapshot.processInfo) || !snapshot.processInfo.length || snapshot.processInfo.length > 1024) {
    reject('RAW_BROWSER_CDP_SNAPSHOT_REQUIRED'); return result();
  }
  const start = tick(snapshot.startQpc), end = tick(snapshot.endQpc);
  if (start === null || end === null || end < start) { reject('CDP_MONOTONIC_BRACKET_REQUIRED'); return result(); }
  if (!Array.isArray(input.retained) || input.retained.length > 2048) { reject('RETAINED_NATIVE_HANDLES_REQUIRED'); return result(); }
  const retained = new Map(), seen = new Set();
  for (const r of input.retained) {
    if (!r || !pid(r.pid) || retained.has(r.pid)) { reject('AMBIGUOUS_RETAINED_RECORD', r?.pid); continue; }
    retained.set(r.pid, r);
  }
  let rootSeen = false;
  for (const p of snapshot.processInfo) {
    if (!p || !pid(p.id) || seen.has(p.id) || typeof p.type !== 'string' || !p.type || !Number.isFinite(p.cpuTime) || p.cpuTime < 0) { reject('INVALID_OR_DUPLICATE_RAW_CDP_ROW', p?.id); continue; }
    seen.add(p.id);
    if (p.id === expected.browserPid) { rootSeen = true; if (p.type !== 'browser') reject('BROWSER_TARGET_IDENTITY_MISMATCH', p.id); }
    const r = retained.get(p.id);
    if (!r) { reject('UNKNOWN_CDP_PID_NO_RETAINED_GENERATION', p.id); continue; }
    const a = r.before, b = r.after;
    if (!a || !b) { reject('TWO_SAME_HANDLE_QUERIES_REQUIRED', p.id); continue; }
    // No role, filename, missing-current-PID, or reused-PID claim can override
    // a live outside-job observation, even when other receipt fields are absent.
    if ((a.running === true && a.inExpectedJob !== true) || (b.running === true && b.inExpectedJob !== true)) {
      reject('LIVE_OUTSIDE_JOB', p.id); continue;
    }
    if (typeof r.handleToken !== 'string' || !r.handleToken || r.closedQpc !== null || r.sameHandle !== true) {
      reject('CONTINUOUS_HANDLE_REQUIRED', p.id); continue;
    }
    const opened = tick(r.openedQpc), atA = tick(a.qpc), atB = tick(b.qpc);
    if (opened === null || atA === null || atB === null || opened > atA || atA > start || atB < end) {
      reject('HANDLE_DID_NOT_BRACKET_CDP', p.id); continue;
    }
    const generation = tick(a.creationFileTime);
    if (generation === null || generation === 0n || tick(b.creationFileTime) !== generation || a.pid !== p.id || b.pid !== p.id) {
      reject('GENERATION_OR_PID_MISMATCH', p.id); continue;
    }
    if (p.id === expected.browserPid && a.creationFileTime !== expected.browserCreationFileTime) {
      reject('BROWSER_GENERATION_MISMATCH', p.id); continue;
    }
    if (a.jobId !== expected.jobId || b.jobId !== expected.jobId || a.inExpectedJob !== true || b.inExpectedJob !== true) {
      reject('EXPECTED_JOB_NOT_VERIFIED', p.id); continue;
    }
    if (pathKey(a.imagePath) !== pathKey(expected.imagePath) || pathKey(b.imagePath) !== pathKey(expected.imagePath)) {
      reject('UNAPPROVED_IMAGE', p.id); continue;
    }
    const desktop = (q) => (q.desktopId === expected.desktopId && q.desktopObjectVerified === true) || (p.id !== expected.browserPid && q.win32kDisabled === true);
    if (!desktop(a) || !desktop(b)) { reject('DESKTOP_OR_WIN32K_PROOF_REQUIRED', p.id); continue; }
    if (typeof a.running !== 'boolean' || typeof b.running !== 'boolean') { reject('NATIVE_LIVENESS_REQUIRED', p.id); continue; }
    if (!a.running || !b.running) {
      if (p.id === expected.browserPid) reject('BROWSER_ROOT_EXITED', p.id);
      else refresh('PROVEN_OWNED_EXIT_REQUIRES_FRESH_SNAPSHOT', p.id);
      continue;
    }
    rows.push({ pid: p.id, cdpRole: p.type, generation: a.creationFileTime, verifiedForSnapshot: true });
  }
  if (!rootSeen) reject('OWN_BROWSER_MISSING_FROM_RAW_CDP');
  return result();
}
