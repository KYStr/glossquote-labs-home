"""Focused offline retest of the revised PR #312 boundaries contract."""

import hashlib
import json
import sys
from pathlib import Path
from platform import python_version


PRIOR_FILES = {
    "verify.py": "c31a860908168e63f605b21caec669d0969a68c92da79e1452c30abba78578df",
    "fixtures.json": "5b214e3c5d63c7d5de25496612be265a840c1993e1a8ad22279e921548d10f6c",
}
AFFECTED_FIXTURES = (
    "manifest-file-over-limit-before-read",
    "manifest-read-rejection",
    "manifest-duplicate-before-file-cap",
    "single-file-over-limit",
    "selected-total-over-limit-before-name",
    "read-error-continues",
    "read-size-mismatch",
    "digest-rejects-batch",
)
CANDIDATE = "456b4210b3a2a41c0285cee30867bd741bc59c13"


def check(actual, expected, label):
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


def problem(code, field=None, file_index=None):
    return {
        "ok": False,
        "error": {
            "code": code, "field": field, "line": None, "fileIndex": file_index,
            "firstLine": None, "firstFileIndex": None,
        },
    }


def prior_inputs(root):
    data = {}
    for name, expected in PRIOR_FILES.items():
        data[name] = (root / name).read_bytes()
        check(hashlib.sha256(data[name]).hexdigest(), expected, f"prior {name} SHA-256")
    oracle = {"__name__": "pinned_document_oracle", "__file__": str(root / "verify.py")}
    exec(compile(data["verify.py"], "verify.py", "exec"), oracle)
    return oracle, json.loads(data["fixtures.json"])


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -B -X utf8 retest.py <prior-evidence-directory>")
    oracle, fixture = prior_inputs(Path(sys.argv[1]))
    evaluate = oracle["evaluate_batch"]
    cases = {case["id"]: case for case in fixture["batchCases"]}
    fixed = []
    for case_id in AFFECTED_FIXTURES:
        case = cases[case_id]
        result = evaluate(case["input"])
        check(result, case["expect"], case_id)
        if case_id not in {"read-error-continues", "read-size-mismatch", "digest-rejects-batch"}:
            check(result["readSelected"], [], f"{case_id} selected-content reads")
            check(result["digestSelected"], [], f"{case_id} digest calls")
        fixed.append({"id": case_id, "actual": result})

    digest = hashlib.sha256(b"abc").hexdigest()
    line = digest + "  x"
    text = {"kind": "text", "text": line}
    x = {"name": "x", "sizeBytes": 3, "bytesHex": "616263"}

    # A preflight failure may follow a manifest-file read, without reading the selected data.
    manifest_bytes = line.encode("ascii")
    preflight_input = {
        "manifest": {"kind": "file", "name": "SHA256SUMS", "sizeBytes": len(manifest_bytes),
                     "bytesHex": manifest_bytes.hex()},
        "selected": [{"name": "x", "sizeBytes": 33_554_433, "readMode": "must-not-read"}],
    }
    preflight = evaluate(preflight_input)
    check(preflight, {
        "result": problem("FILE_SIZE_LIMIT", "files", 1), "readManifestCalls": 1,
        "readSelected": [], "digestSelected": [], "reportUtf8": None,
    }, "file-manifest preflight order")

    minimal_input = {"manifest": text, "selected": [x], "faults": {"digestRejectAtFileIndex": 1}}
    minimal = evaluate(minimal_input)
    check(minimal, {
        "result": problem("DIGEST_FAILED", "files", 1), "readManifestCalls": 0,
        "readSelected": [1], "digestSelected": [1], "reportUtf8": None,
    }, "original blocking one-file counterexample")

    # A recoverable row is kept only if the batch later finishes successfully.
    later_input = {
        "manifest": {"kind": "text", "text": "\n".join(digest + "  " + n for n in ("bad", "x", "later"))},
        "selected": [{"name": "bad", "sizeBytes": 3, "readMode": "reject"}, x,
                     {"name": "later", "sizeBytes": 3, "readMode": "must-not-read"}],
        "faults": {"digestRejectAtFileIndex": 2},
    }
    later = evaluate(later_input)
    check(later, {
        "result": problem("DIGEST_FAILED", "files", 2), "readManifestCalls": 0,
        "readSelected": [1, 2], "digestSelected": [2], "reportUtf8": None,
    }, "prior read_error and later whole-batch failure")

    # A current fake Worker fails in hashing, after one progress message.
    timeline = oracle["Timeline"](cases["main-batch"]["input"])
    timeline.handle("load-sample", {})
    timeline.handle("start", {})
    timeline.handle("worker-message", {
        "worker": 1, "message": {"type": "prepared", "version": 1, "runId": 2, "totalPairs": 2},
    })
    timeline.handle("worker-message", {
        "worker": 1, "message": {"type": "progress", "version": 1, "runId": 2, "completedPairs": 1},
    })
    before = dict(timeline.observe()["snapshot"])
    check(before["phase"], "hashing", "before worker failure phase")
    check(before["progress"], {"completed": 1, "total": 2}, "before worker failure progress")
    timeline.handle("worker-error", {"worker": 1})
    state = timeline.observe()
    check(state["snapshot"], {
        **before, "phase": "error", "progress": None, "reportReady": False, "exactMatch": None,
        "error": problem("WORKER_FAILED")["error"],
    }, "whole-batch worker error after progress")
    check(state["effects"]["workersTerminated"], [1], "terminate failed worker")
    check(state["effects"]["workerUrlsRevoked"], ["worker:1"], "revoke failed worker URL")
    after = json.loads(json.dumps(state))
    timeline.handle("worker-message", {
        "worker": 1, "message": {"type": "progress", "version": 1, "runId": 2, "completedPairs": 2},
    })
    timeline.handle("download", {})
    check(timeline.observe(), after, "no late update or download after worker failure")
    check(after["effects"]["reportUrlsCreated"], [], "worker failure report URLs")
    check(after["effects"]["downloads"], [], "worker failure downloads")

    print(json.dumps({
        "candidate": CANDIDATE, "python": python_version(), "priorFilesSha256": PRIOR_FILES,
        "fixedFixtures": fixed,
        "focusedCases": {
            "fileManifestThenPreflightFailure": {"input": preflight_input, "actual": preflight},
            "minimalDigestFailure": {"input": minimal_input, "actual": minimal},
            "readErrorThenDigestFailure": {"input": later_input, "actual": later},
            "workerFailureAfterProgress": {"before": before, "after": after, "lateAndDownloadUnchanged": True},
        },
        "totals": {"fixedFixtures": len(fixed), "focusedCases": 4, "fullPriorSuiteRerun": False},
    }, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
