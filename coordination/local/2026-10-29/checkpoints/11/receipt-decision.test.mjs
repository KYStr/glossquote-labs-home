import test from 'node:test';
import assert from 'node:assert/strict';
import { decideNativeReceipt as decide, assessNodeCalibrationReceipt as nodeDecision, verifyCleanup } from './receipt-decision.mjs';

// Synthetic metadata only. No process/handle/CDP or compiled-assembly API is imported.
const fixture = () => {
  const image = 'C:\\TaskOwned\\node.exe';
  const query = (pid, before) => ({ pid, queryStartQpc: before ? '200' : '2100', qpc: before ? '900' : '2200', creationFileTime: '133000000000000' + pid,
    exitFileTime: '0', jobId: 'synthetic-job', imagePath: image, desktopId: 'synthetic-desktop', running: true, inExpectedJob: true,
    desktopObjectVerified: true, win32kDisabled: false, mitigationQuerySucceeded: true, mitigationFlags: 0, mitigationError: 0,
    threads: [{ tid: pid + 1000, creationFileTime: '133000000000000001', sameDesktopObject: true }] });
  return { schemaVersion: 2, kind: 'MU20_NATIVE_CONTINUOUS_HANDLE_CANDIDATE', captureId: 'a'.repeat(32), status: 'COMPLETE_DATA_ONLY', qpcFrequency: '10000000', startQpc: '1000', endQpc: '2000',
    rawCdpJson: JSON.stringify({ processInfo: [{ id: 100, type: 'browser', cpuTime: 1 }, { id: 104, type: 'renderer', cpuTime: 0.5 }] }), executionAuthorized: false, handlesHeldAtSave: true,
    expected: { browserPid: 100, browserCreationFileTime: '133000000000000100', jobId: 'synthetic-job', desktopId: 'synthetic-desktop', imagePath: image },
    initialJobPids: [100, 104], retained: [100, 104].map((pid) => ({ pid, handleToken: String(pid).padStart(32, '0'), openedQpc: '100', closedQpc: null, sameHandle: true, before: query(pid, true), after: query(pid, false) })), errors: [] };
};
const reject = (mutate, code) => { const f = fixture(); mutate(f); const d = decide(f); assert.equal(d.decision, 'REJECT'); assert.equal(d.executionAuthorized, false); if (code) assert(d.issues.some((i) => i.code === code), JSON.stringify(d)); };

test('complete synthetic native receipts remain data only', () => { const d = decide(fixture()); assert.equal(d.decision, 'VERIFIED_DATA_ONLY'); assert.equal(d.executionAuthorized, false); });
test('null receipt rejects without native lookup', () => assert.equal(decide(null).decision, 'REJECT'));
test('native capture/PSS access error cannot become success', () => reject((f) => { f.status = 'REJECTED_NATIVE_CAPTURE'; f.errors.push({ code: 'OWNED_THREAD_SNAPSHOT_FAILED_NO_RIGHTS_ESCALATION', win32: 5 }); }, 'NATIVE_CAPTURE_NOT_COMPLETE'));
test('extra schema fields cannot smuggle authority', () => reject((f) => { f.allowUnknownHelper = true; }));
test('a claimed execution grant rejects', () => reject((f) => { f.executionAuthorized = true; }));
test('receipt saved after handle closure rejects', () => reject((f) => { f.handlesHeldAtSave = false; }));
test('missing root in owned job list rejects', () => reject((f) => { f.initialJobPids = [104]; }));
test('duplicate job PID list rejects', () => reject((f) => { f.initialJobPids = [100, 100]; }));
test('partial retained-handle coverage rejects', () => reject((f) => { f.retained.pop(); }));
test('reused handle token rejects', () => reject((f) => { f.retained[1].handleToken = f.retained[0].handleToken; }));
test('reopened PID is not a retained native handle', () => reject((f) => { f.retained[1].sameHandle = false; }));
test('closed handle rejects', () => reject((f) => { f.retained[1].closedQpc = '1500'; }));
test('late before-query cannot bracket CDP', () => reject((f) => { f.retained[1].before.qpc = '1500'; }, 'NATIVE_QUERY_DID_NOT_BRACKET_CDP'));
test('after query beginning before CDP completion rejects even if it ended later', () => reject((f) => { f.retained[1].after.queryStartQpc = '1999'; }, 'NATIVE_QUERY_DID_NOT_BRACKET_CDP'));
test('creation FILETIME generation change rejects', () => reject((f) => { f.retained[1].after.creationFileTime = '133000000000000999'; }, 'GENERATION_OR_PID_MISMATCH'));
test('live outside-job row rejects', () => reject((f) => { f.retained[1].after.inExpectedJob = false; }, 'LIVE_OUTSIDE_JOB'));
test('unknown outside-job PID in original raw rows is not opened or filtered', () => reject((f) => { const raw = JSON.parse(f.rawCdpJson); raw.processInfo.push({ id: 89564, type: 'identity-helper', cpuTime: 0 }); f.rawCdpJson = JSON.stringify(raw); }, 'UNKNOWN_CDP_PID_NO_RETAINED_GENERATION'));
test('exact image is still required inside the job', () => reject((f) => { f.retained[1].after.imagePath = 'C:\\TaskOwned\\other.exe'; }, 'UNAPPROVED_IMAGE'));
test('desktop object boolean without thread proof rejects', () => reject((f) => { f.retained[1].after.threads = []; }, 'NATIVE_DESKTOP_OBJECT_PROOF_MISSING'));
test('unverified thread object rejects', () => reject((f) => { f.retained[1].after.threads[0].sameDesktopObject = false; }));
test('duplicate thread identifier rejects', () => reject((f) => { f.retained[1].after.threads.push({ ...f.retained[1].after.threads[0] }); }));
test('audit-only Win32k bit cannot substitute for actual denial', () => reject((f) => { const q = f.retained[1].after; q.mitigationFlags = 2; q.win32kDisabled = true; }, 'NATIVE_WIN32K_FLAG_UNPROVEN'));
test('failed mitigation query cannot produce a denial proof', () => reject((f) => { const q = f.retained[1].after; q.mitigationQuerySucceeded = false; q.mitigationFlags = 1; q.win32kDisabled = true; }));
test('actual Win32k denial can establish child boundary', () => { const f = fixture(); for (const q of [f.retained[1].before, f.retained[1].after]) { q.mitigationFlags = 1; q.win32kDisabled = true; q.desktopObjectVerified = false; q.threads = []; } assert.equal(decide(f).decision, 'VERIFIED_DATA_ONLY'); });
test('browser root cannot substitute Win32k for desktop proof', () => reject((f) => { const q = f.retained[0].after; q.mitigationFlags = 1; q.win32kDisabled = true; q.desktopObjectVerified = false; q.threads = []; }, 'DESKTOP_OR_WIN32K_PROOF_REQUIRED'));
test('dead process with zero exit FILETIME rejects torn observation', () => reject((f) => { f.retained[1].after.running = false; }, 'NATIVE_EXIT_TIME_LIVENESS_INCONSISTENT'));
test('fully evidenced owned child exit requires a new snapshot, not success', () => { const f = fixture(); f.retained[1].after.running = false; f.retained[1].after.exitFileTime = '133000000000000888'; const d = decide(f); assert.equal(d.decision, 'REFRESH_REQUIRED'); assert.equal(d.executionAuthorized, false); });
test('owned root exit still rejects', () => reject((f) => { f.retained[0].after.running = false; f.retained[0].after.exitFileTime = '133000000000000888'; }, 'BROWSER_ROOT_EXITED'));
test('raw CDP role is mandatory', () => reject((f) => { f.rawCdpJson = '{"processInfo":[{"id":100,"cpuTime":1}]}'; }));
test('raw CDP full result cannot be replaced by a PID CSV', () => reject((f) => { f.rawCdpJson = '100,104'; }));
test('raw duplicate keys cannot erase an earlier foreign row', () => reject((f) => { f.rawCdpJson = '{"processInfo":[{"id":89564,"type":"identity-helper","cpuTime":0}],"processInfo":[{"id":100,"type":"browser","cpuTime":0}]}'; }));
test('escaped duplicate JSON key is also rejected', () => reject((f) => { f.rawCdpJson = '{"processInfo":[],"process\\u0049nfo":[]}'; }));
test('duplicate id field is rejected before JSON can overwrite it', () => reject((f) => { f.rawCdpJson = '{"processInfo":[{"id":89564,"id":100,"type":"browser","cpuTime":0}]}'; }));
test('oversized raw CDP bytes reject', () => reject((f) => { f.rawCdpJson = ' '.repeat(1048577); }));
test('negative or infinite raw CPU counters reject', () => reject((f) => { f.rawCdpJson = '{"processInfo":[{"id":100,"type":"browser","cpuTime":1e999}]}'; }));
test('duplicate raw PID is never silently collapsed', () => reject((f) => { const raw = JSON.parse(f.rawCdpJson); raw.processInfo.push(raw.processInfo[0]); f.rawCdpJson = JSON.stringify(raw); }, 'INVALID_OR_DUPLICATE_RAW_CDP_ROW'));
test('metric role text is not an executable ownership oracle', () => { const f = fixture(); const raw = JSON.parse(f.rawCdpJson); raw.processInfo[1].type = 'arbitrary-embedder-metric'; f.rawCdpJson = JSON.stringify(raw); assert.equal(decide(f).decision, 'VERIFIED_DATA_ONLY'); });
test('successful mitigation result with nonzero error is inconsistent', () => reject((f) => { f.retained[1].after.mitigationError = 5; }, 'NATIVE_MITIGATION_RESULT_INCONSISTENT'));
test('failed mitigation result cannot retain output flags', () => reject((f) => { const q = f.retained[1].after; q.mitigationQuerySucceeded = false; q.mitigationFlags = 2; q.mitigationError = 5; }, 'NATIVE_MITIGATION_RESULT_INCONSISTENT'));

const nodeFixture = () => { const f = fixture(); f.kind = 'MU20_NATIVE_NODE_PRIMITIVES_CALIBRATION'; f.rawCdpJson = null; f.initialJobPids = [100]; f.retained = [f.retained[0]]; return f; };
const ledger = () => [{ pid: 100, creationFileTime: '133000000000000100' }];
test('Node native primitive envelope has no CDP and distinct data-only outcome', () => { const r = nodeDecision(nodeFixture(), ledger()); assert.equal(r.decision, 'CALIBRATION_PRIMITIVES_DATA_ONLY'); assert.equal(r.executionAuthorized, false); });
test('Node native primitive receipt cannot pass browser decision', () => assert.equal(decide(nodeFixture()).decision, 'REJECT'));
test('browser receipt cannot pass Node calibration decision', () => assert.equal(nodeDecision(fixture(), ledger()).decision, 'REJECT'));
test('Node calibration rejects fabricated browser processInfo', () => { const f = nodeFixture(); f.rawCdpJson = fixture().rawCdpJson; assert.equal(nodeDecision(f, ledger()).decision, 'REJECT'); });
test('Node generation must come from launcher ledger', () => { const l = ledger(); l[0].creationFileTime = '1'; assert.equal(nodeDecision(nodeFixture(), l).decision, 'REJECT'); });
test('task-owned job B negative fixture is not silently included in job A', () => { const l = ledger(); l.push({ pid: 200, creationFileTime: '133000000000000200' }); assert.equal(nodeDecision(nodeFixture(), l).decision, 'REJECT'); });

const cleanup = () => ({ captureId: 'a'.repeat(32), savedBeforeClose: true, processHandleCloseAttempts: 2, releasesSucceeded: true, queryJobHandleCloseAttempted: true, borrowedDesktopClosed: false, executionAuthorized: false, closedQpc: '3000' });
test('successful cleanup remains data only', () => assert.deepEqual(verifyCleanup(fixture(), cleanup()), { status: 'VERIFIED_CLEANUP_DATA_ONLY', executionAuthorized: false }));
test('cleanup missing capture rejects without throwing', () => assert.equal(verifyCleanup(null, cleanup()).status, 'REJECT'));
test('missing pre-close persistence rejects cleanup', () => { const c = cleanup(); c.savedBeforeClose = false; assert.equal(verifyCleanup(fixture(), c).status, 'REJECT'); });
test('any CloseHandle failure rejects cleanup proof', () => { const c = cleanup(); c.releasesSucceeded = false; assert.equal(verifyCleanup(fixture(), c).status, 'REJECT'); });
test('closing borrowed desktop rejects cleanup', () => { const c = cleanup(); c.borrowedDesktopClosed = true; assert.equal(verifyCleanup(fixture(), c).status, 'REJECT'); });
test('missing process-handle close attempt rejects cleanup', () => { const c = cleanup(); c.processHandleCloseAttempts = 1; assert.equal(verifyCleanup(fixture(), c).status, 'REJECT'); });

const m2Reject = (mutate) => { const f = nodeFixture(), l = ledger(); const override = mutate(f, l); const d = nodeDecision(f, override === undefined ? l : override); assert.equal(d.decision, 'REJECT'); assert.equal(d.executionAuthorized, false); };
test('M2 exact single idle root with matching FILETIME and desktop proof is data only', () => { const d = nodeDecision(nodeFixture(), ledger()); assert.equal(d.decision, 'CALIBRATION_PRIMITIVES_DATA_ONLY'); assert.equal(d.executionAuthorized, false); assert.match(d.scope, /No IPC\/controlled-exit/); });
test('M2 empty ledger rejects', () => m2Reject(() => []));
test('M2 absent ledger rejects', () => { assert.equal(nodeDecision(nodeFixture(), undefined).decision, 'REJECT'); });
test('M2 null ledger rejects', () => m2Reject(() => null));
test('M2 duplicate ledger root rejects', () => m2Reject((f, l) => { l.push({ ...l[0] }); }));
test('M2 extra ledger PID rejects', () => m2Reject((f, l) => { l.push({ pid: 104, creationFileTime: '133000000000000104' }); }));
test('M2 one ledger PID different from root rejects', () => m2Reject((f, l) => { l[0].pid = 104; }));
test('M2 empty initial job list rejects', () => m2Reject((f) => { f.initialJobPids = []; }));
test('M2 missing retained root rejects', () => m2Reject((f) => { f.retained = []; }));
test('M2 duplicate initial PID rejects', () => m2Reject((f) => { f.initialJobPids.push(100); }));
test('M2 duplicate retained PID rejects', () => m2Reject((f) => { f.retained.push(structuredClone(f.retained[0])); }));
test('M2 extra retained PID alone rejects', () => m2Reject((f) => { f.retained.push(fixture().retained[1]); }));
test('M2 job and retained extra member cannot hide behind smaller ledger', () => m2Reject((f) => { f.initialJobPids.push(104); f.retained.push(fixture().retained[1]); }));
test('M2 formerly valid root plus child ledger/job/retained triple is now outside scope', () => m2Reject((f, l) => { f.initialJobPids.push(104); f.retained.push(fixture().retained[1]); l.push({ pid: 104, creationFileTime: '133000000000000104' }); }));
test('M2 extra member with Win32k denial cannot substitute for exact root coverage', () => m2Reject((f) => { const child = fixture().retained[1]; for (const q of [child.before, child.after]) { q.mitigationFlags = 1; q.win32kDisabled = true; q.desktopObjectVerified = false; q.threads = []; } f.initialJobPids.push(104); f.retained.push(child); }));
test('M2 wrong ledger FILETIME rejects', () => m2Reject((f, l) => { l[0].creationFileTime = '133000000000000101'; }));
test('M2 wrong expected root FILETIME rejects', () => m2Reject((f) => { f.expected.browserCreationFileTime = '133000000000000101'; }));
test('M2 wrong before FILETIME rejects', () => m2Reject((f) => { f.retained[0].before.creationFileTime = '133000000000000101'; }));
test('M2 wrong after FILETIME rejects', () => m2Reject((f) => { f.retained[0].after.creationFileTime = '133000000000000101'; }));
test('M2 leading-zero ledger FILETIME cannot normalize to success', () => m2Reject((f, l) => { l[0].creationFileTime = '0133000000000000100'; }));
test('M2 root Win32k denial cannot replace after desktop object proof', () => m2Reject((f) => { const q = f.retained[0].after; q.mitigationFlags = 1; q.win32kDisabled = true; q.desktopObjectVerified = false; q.threads = []; }));
test('M2 root Win32k denial cannot replace before desktop object proof', () => m2Reject((f) => { const q = f.retained[0].before; q.mitigationFlags = 1; q.win32kDisabled = true; q.desktopObjectVerified = false; q.threads = []; }));
test('M2 wrong desktop object label rejects', () => m2Reject((f) => { f.retained[0].after.desktopId = 'other-desktop'; }));
test('M2 Win32k bit alongside actual desktop proof is still data only', () => { const f = nodeFixture(); for (const q of [f.retained[0].before, f.retained[0].after]) { q.mitigationFlags = 1; q.win32kDisabled = true; } const d = nodeDecision(f, ledger()); assert.equal(d.decision, 'CALIBRATION_PRIMITIVES_DATA_ONLY'); assert.equal(d.executionAuthorized, false); });
