"""Offline specification oracle for PR #312. Only synthetic bytes and events are used."""

import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from platform import python_version


FIXTURE_SHA256 = "5b214e3c5d63c7d5de25496612be265a840c1993e1a8ad22279e921548d10f6c"
KNOWN = {
    b"abc": "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    b"hello": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    b"": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
}
STATUS = ("match", "mismatch", "missing", "unexpected", "read_error")
REPORT_FILENAME = "sha256-manifest-report.json"
REPORT_MIME = "application/json;charset=utf-8"
MIB = 1 << 20
ROW = re.compile(r"([0-9a-fA-F]{64}) ([ *])(.*)", flags=re.DOTALL)
TAGGED = re.compile(r"[A-Za-z0-9_-]+ \(")
HEX = re.compile(r"[0-9a-f]{64}")
DISPLAY_ESCAPED = re.compile(r"[\u00ad\u034f\u061c\u180e\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]")
ERROR_KEYS = ("code", "field", "line", "fileIndex", "firstLine", "firstFileIndex")


def assert_same(actual, expected, label):
    if actual != expected:
        raise AssertionError(f"{label}\nactual={actual!r}\nexpected={expected!r}")


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def utf16(value):
    return value.encode("utf-16-le", "surrogatepass")


def utf8_for_js_string(value):
    return utf16(value).decode("utf-16-le", "replace").encode("utf-8")


def compact_report(report):
    return json.dumps(report, ensure_ascii=False, separators=(",", ":")) + "\n"


def error(code, field=None, line=None, file_index=None, first_line=None, first_file=None):
    return dict(zip(ERROR_KEYS, (code, field, line, file_index, first_line, first_file)))


class RuleError(Exception):
    def __init__(self, problem):
        self.problem = problem


def reject(code, field=None, **positions):
    raise RuleError(error(code, field, **positions))


def safe_size(n):
    return type(n) is int and 0 <= n <= (1 << 53) - 1


def basename_error(name):
    if not name:
        return "EMPTY"
    if name in {".", "..", "-"} or name[0] == " " or name[-1] == " ":
        return "INVALID"
    for char in name:
        code = ord(char)
        if char in "/\\:" or code <= 31 or 127 <= code <= 159 or 0xD800 <= code <= 0xDFFF:
            return "INVALID"
    if len(name.encode("utf-8")) > 255:
        return "LIMIT"
    return None


def physical_lines(source):
    """Split only at LF. A single CR belongs to the terminator only if it precedes LF."""
    start = 0
    for position, char in enumerate(source):
        if char != "\n":
            continue
        end = position - (position > start and source[position - 1] == "\r")
        yield source[start:end]
        start = position + 1
    if start < len(source):
        yield source[start:]


def parse_text(raw):
    content = raw.removeprefix("\ufeff")
    if not content:
        reject("MANIFEST_EMPTY", "manifest")
    lines = list(physical_lines(content))
    if len(lines) > 200:
        reject("MANIFEST_ROWS_LIMIT", "manifest")
    entries = []
    for number, line in enumerate(lines, 1):
        for condition, code in (
            ("\0" in line, "NUL"),
            ("\r" in line, "BARE_CR"),
            (line == "", "BLANK_LINE"),
            (line.startswith("\\"), "ESCAPED"),
            (TAGGED.match(line), "TAGGED"),
        ):
            if condition:
                reject("MANIFEST_" + code, "manifest", line=number)
        fields = ROW.fullmatch(line)
        if fields is None:
            reject("MANIFEST_ROW_FORMAT", "manifest", line=number)
        checksum, _, name = fields.groups()
        invalid = basename_error(name)
        if invalid:
            reject("MANIFEST_NAME_" + invalid, "manifest", line=number)
        prior = next((row for row in entries if row["name"] == name), None)
        if prior is not None:
            reject("MANIFEST_DUPLICATE", "manifest", line=number, first_line=prior["line"])
        entries.append({"name": name, "expectedSha256": checksum.lower(), "line": number})
    return entries


def digest_of_repeat(byte, count):
    digest = hashlib.sha256()
    block_size = min(MIB, count)
    if block_size:
        block = byte * block_size
        chunks, tail = divmod(count, block_size)
        for _ in range(chunks):
            digest.update(block)
        digest.update(block[:tail])
    return digest.hexdigest()


def report_row(name, status, size, expected, actual):
    return {
        "name": name, "status": status, "sizeBytes": size,
        "expectedSha256": expected, "actualSha256": actual,
    }


def build_report(rows):
    counts = Counter(row["status"] for row in rows)
    return {
        "schemaVersion": 1, "algorithm": "SHA-256",
        "exactMatch": counts["match"] == len(rows),
        "counts": {status: counts[status] for status in STATUS}, "rows": rows,
    }


def read_manifest(manifest, ledger):
    if manifest is None:
        reject("MANIFEST_REQUIRED", "manifest")
    kind = manifest.get("kind")
    if kind == "text":
        if set(manifest) != {"kind", "text"} or not isinstance(manifest["text"], str):
            reject("INPUT_SCHEMA")
        raw = manifest["text"]
        if len(utf8_for_js_string(raw)) > 65_536:
            reject("MANIFEST_BYTES_LIMIT", "manifest")
        return raw
    if kind != "file" or not {"kind", "name", "sizeBytes", "bytesHex"} <= set(manifest):
        reject("INPUT_SCHEMA")
    size = manifest["sizeBytes"]
    if not safe_size(size):
        reject("MANIFEST_SIZE_INVALID", "manifest")
    if size > 65_536:
        reject("MANIFEST_BYTES_LIMIT", "manifest")
    if size == 0:
        reject("MANIFEST_EMPTY", "manifest")
    ledger["readManifestCalls"] += 1
    assert manifest.get("readMode") != "must-not-read", "Forbidden manifest read"
    content = bytes.fromhex(manifest["bytesHex"])
    if manifest.get("readMode") == "reject" or len(content) != size:
        reject("MANIFEST_READ_FAILED", "manifest")
    try:
        return content.decode("utf-8", "strict")
    except UnicodeDecodeError:
        reject("MANIFEST_UTF8", "manifest")


def selection_metadata(files):
    if len(files) > 200:
        reject("FILES_LIMIT", "files")
    for index, file in enumerate(files, 1):
        if not isinstance(file.get("name"), str) or not safe_size(file.get("sizeBytes")):
            reject("FILE_METADATA", "files", file_index=index)
        if file["sizeBytes"] > 32 * MIB:
            reject("FILE_SIZE_LIMIT", "files", file_index=index)
    if sum(file["sizeBytes"] for file in files) > 128 * MIB:
        reject("FILES_TOTAL_LIMIT", "files")
    names = []
    for index, file in enumerate(files, 1):
        name = file["name"]
        invalid = basename_error(name)
        if invalid:
            reject("FILE_NAME_" + invalid, "files", file_index=index)
        if name in names:
            reject("FILE_DUPLICATE", "files", file_index=index, first_file=names.index(name) + 1)
        names.append(name)
    return names


def evaluate_batch(inputs):
    ledger = {"readManifestCalls": 0, "readSelected": [], "digestSelected": []}
    try:
        entries = parse_text(read_manifest(inputs["manifest"], ledger))
        files = inputs["selected"]
        names = selection_metadata(files)
        rows = []
        for entry in entries:
            name, expected = entry["name"], entry["expectedSha256"]
            if name not in names:
                rows.append(report_row(name, "missing", None, expected, None))
                continue
            index = names.index(name) + 1
            file = files[index - 1]
            size = file["sizeBytes"]
            ledger["readSelected"].append(index)
            assert file.get("readMode") != "must-not-read", f"Forbidden selected read at {index}"
            repeat_byte = file.get("repeatByte")
            content = None if repeat_byte is not None else bytes.fromhex(file.get("bytesHex", ""))
            if file.get("readMode") == "reject" or content is not None and len(content) != size:
                rows.append(report_row(name, "read_error", size, expected, None))
                continue
            ledger["digestSelected"].append(index)
            if inputs.get("faults", {}).get("digestRejectAtFileIndex") == index:
                reject("DIGEST_FAILED", "files", file_index=index)
            actual = sha256(content) if repeat_byte is None else digest_of_repeat(repeat_byte, size)
            rows.append(report_row(name, "match" if actual == expected else "mismatch", size, expected, actual))
        manifest_names = [entry["name"] for entry in entries]
        for file in files:
            if file["name"] not in manifest_names:
                rows.append(report_row(file["name"], "unexpected", file["sizeBytes"], None, None))
        report = build_report(rows)
        return {"result": {"ok": True, "report": report}, **ledger, "reportUtf8": compact_report(report)}
    except RuleError as exc:
        return {"result": {"ok": False, "error": exc.problem}, **ledger, "reportUtf8": None}


def display_projection(raw):
    """Use UTF-16 byte offsets so astral characters occupy two selection units."""
    encoded = utf16(raw)
    units = [encoded[i:i + 2] for i in range(0, len(encoded), 2)]
    result = []
    boundaries = [0]
    pos = 0
    while pos < len(units):
        unit = units[pos]
        if unit == b"\r\x00":
            pos += 2 if units[pos + 1:pos + 2] == [b"\n\x00"] else 1
            result.append(b"\n\x00")
        else:
            pos += 1
            result.append(unit)
        boundaries.append(pos)
    return b"".join(result).decode("utf-16-le", "surrogatepass"), boundaries


def project_paste(previous, visible, text, start, end):
    base = previous["raw"] if previous and previous["display"] == visible else visible
    _, boundaries = display_projection(base)
    encoded = utf16(base)
    inserted = utf16(text)
    result = encoded[:2 * boundaries[start]] + inserted + encoded[2 * boundaries[end]:]
    raw = result.decode("utf-16-le", "surrogatepass")
    display, new_boundaries = display_projection(raw)
    raw_caret = boundaries[start] + len(inserted) // 2
    caret = next(i for i, boundary in enumerate(new_boundaries) if boundary >= raw_caret)
    return {"raw": raw, "display": display, "origin": "paste"}, caret


class Timeline:
    """State and effect ledger for the review; no DOM, native File, Worker or browser."""

    def __init__(self, sample):
        self.sample = sample
        self.phase = "idle"
        self.generation = 0
        self.active = True
        self.text = None
        self.manifest_file = None
        self.files = []
        self.current_worker = None
        self.report_url = None
        self.effects = {key: [] for key in (
            "workersCreated", "workersTerminated", "workerUrlsRevoked",
            "reportUrlsCreated", "reportUrlsRevoked", "downloads", "uiNotices",
        )}
        self.clear_output()

    def clear_output(self):
        self.progress = None
        self.report = None
        self.error = None
        self.notice = None
        self.filter = "all"

    def terminate(self):
        if self.current_worker is None:
            return
        self.effects["workersTerminated"].append(self.current_worker)
        self.effects["workerUrlsRevoked"].append(f"worker:{self.current_worker}")
        self.current_worker = None

    def revoke_download(self):
        if self.report_url is not None:
            self.effects["reportUrlsRevoked"].append(self.report_url)
            self.report_url = None

    def advance(self, phase):
        self.generation += 1
        self.terminate()
        self.revoke_download()
        self.clear_output()
        self.phase = phase

    def use_text(self, raw, origin):
        self.text = {"raw": raw, "display": display_projection(raw)[0], "origin": origin}
        self.manifest_file = None

    def reset(self):
        self.advance("idle")
        self.text = None
        self.manifest_file = None
        self.files = []

    @property
    def busy(self):
        return self.phase in ("validating", "hashing")

    def fail(self, problem):
        self.terminate()
        self.revoke_download()
        self.clear_output()
        self.error = problem
        self.phase = "error"

    def current_input(self):
        manifest = {"kind": "text", "text": self.text["raw"]} if self.text else self.manifest_file
        return {"manifest": manifest, "selected": self.files}

    def handle_worker(self, action, value):
        if self.current_worker != value["worker"] or not self.busy:
            return
        if action == "worker-error":
            self.fail(error("WORKER_FAILED"))
            return
        message = value["message"]
        kind = message.get("type")
        message_fields = {
            "prepared": "totalPairs", "progress": "completedPairs",
            "result": "report", "failure": "error",
        }
        expected_keys = {"type", "version", "runId", message_fields.get(kind)}
        if set(message) != expected_keys or message["runId"] != self.generation or message["version"] != 1:
            self.fail(error("WORKER_PROTOCOL"))
            return
        if kind == "prepared":
            total = message["totalPairs"]
            if self.phase != "validating" or type(total) is not int or not 0 <= total <= 200:
                self.fail(error("WORKER_PROTOCOL"))
                return
            oracle = evaluate_batch(self.current_input())
            assert oracle["result"]["ok"], "A fixture prepared an input that fails the oracle"
            counts = oracle["result"]["report"]["counts"]
            assert_same(total, counts["match"] + counts["mismatch"] + counts["read_error"], "prepared total")
            self.phase = "hashing"
            self.progress = {"completed": 0, "total": total}
        elif kind == "progress":
            completed = message["completedPairs"]
            if self.phase != "hashing" or completed != self.progress["completed"] + 1 or completed > self.progress["total"]:
                self.fail(error("WORKER_PROTOCOL"))
                return
            self.progress["completed"] = completed
        elif kind == "result":
            if self.phase != "hashing" or self.progress["completed"] != self.progress["total"]:
                self.fail(error("WORKER_PROTOCOL"))
                return
            oracle = evaluate_batch(self.current_input())["result"]
            assert oracle["ok"], "A current fixture result failed the independent input oracle"
            assert_same(compact_report(message["report"]), compact_report(oracle["report"]), "current report from draft")
            self.report = oracle["report"]
            self.terminate()
            self.phase = "complete"
        elif kind == "failure":
            problem = message["error"]
            assert_same(list(problem), list(ERROR_KEYS), "worker error shape")
            if problem["code"].startswith("MANIFEST_"):
                derived = evaluate_batch(self.current_input())["result"]
                assert_same(derived, {"ok": False, "error": problem}, "manifest error from draft")
            self.fail(problem)

    def handle(self, action, value):
        if action == "pageshow":
            self.active = True
            return
        if not self.active:
            return
        if action in ("initial", "picker-cancel"):
            return
        if action == "paste":
            if not value["hasPlainText"]:
                self.effects["uiNotices"].append("paste-no-plain-text")
                return
            draft, _ = project_paste(
                self.text, value["value"], value["text"], value["selectionStart"], value["selectionEnd"],
            )
            self.advance("dirty")
            self.text, self.manifest_file = draft, None
        elif action == "edit-text":
            previous = self.text["display"] if self.text else ""
            if value["value"] != previous:
                self.advance("dirty")
                self.use_text(value["value"], "textarea")
        elif action == "choose-manifest-file":
            self.advance("dirty")
            self.text, self.manifest_file = None, value["file"]
        elif action == "replace-files":
            self.advance("dirty")
            self.files = value["files"]
        elif action == "remove-file":
            self.advance("dirty")
            index = value["fileIndex"] - 1
            self.files = self.files[:index] + self.files[index + 1:]
        elif action == "load-sample":
            self.advance("dirty")
            self.use_text(self.sample["manifest"]["text"], "textarea")
            self.files = self.sample["selected"]
        elif action == "start":
            if self.busy:
                return
            previous = self.text["display"] if self.text else ""
            if "observedTextareaValue" in value and value["observedTextareaValue"] != previous:
                self.use_text(value["observedTextareaValue"], "textarea")
            self.advance("validating")
            if self.text is None and self.manifest_file is None:
                self.fail(error("MANIFEST_REQUIRED", "manifest"))
            elif value.get("fault") == "env-unavailable":
                self.fail(error("ENV_UNAVAILABLE"))
            elif value.get("fault") == "worker-factory-before-url":
                self.fail(error("WORKER_START_FAILED"))
            else:
                self.current_worker = len(self.effects["workersCreated"]) + 1
                self.effects["workersCreated"].append({"worker": self.current_worker, "runId": self.generation})
        elif action in ("worker-message", "worker-error"):
            self.handle_worker(action, value)
        elif action == "cancel":
            if self.busy:
                self.advance("cancelled")
        elif action in ("pagehide", "language-leave"):
            self.reset()
            self.active = False
        elif action == "reset":
            self.reset()
        elif action == "filter":
            if self.phase == "complete":
                self.filter = value["value"]
        elif action == "download":
            if self.phase != "complete":
                return
            if value.get("fault") == "report-object-url":
                self.revoke_download()
                self.notice = "failed"
                return
            if self.report_url is None:
                self.report_url = f'report:{len(self.effects["reportUrlsCreated"]) + 1}'
                self.effects["reportUrlsCreated"].append(self.report_url)
            self.effects["downloads"].append({
                "url": self.report_url, "filename": REPORT_FILENAME, "mime": REPORT_MIME,
                "utf8": compact_report(self.report),
            })
            self.notice = "requested"
        else:
            raise AssertionError(f"Unhandled fixture action {action}")

    def observe(self):
        if self.text is not None:
            source = "text"
            size = len(utf8_for_js_string(self.text["raw"]))
        elif self.manifest_file is not None:
            source = "file"
            size = self.manifest_file["sizeBytes"]
        else:
            source, size = "none", None
        return {
            "snapshot": {
                "phase": self.phase, "generation": self.generation, "manifestSource": source,
                "textOrigin": self.text["origin"] if self.text else None, "manifestBytes": size,
                "selectedCount": len(self.files), "selectedBytes": sum(file["sizeBytes"] for file in self.files),
                "progress": self.progress, "filter": self.filter, "reportReady": self.report is not None,
                "exactMatch": self.report["exactMatch"] if self.report is not None else None,
                "error": self.error, "downloadNotice": self.notice,
            },
            "textDraft": self.text, "effects": self.effects,
        }


def check_recipe(case):
    recipe = case["recipe"]
    kind = recipe["kind"]
    if kind == "display-name":
        name = recipe["name"]
        escaped = DISPLAY_ESCAPED.sub(lambda match: f"\\u{ord(match.group()):04x}", name)
        return {"display": escaped, "reportName": name, "domKind": "text"}
    if kind == "repeat-text":
        text = recipe["character"] * recipe["count"]
    elif kind == "manifest-grid":
        text = "\ufeff" if recipe["bom"] else ""
        lines = []
        for number in range(1, recipe["rows"] + 1):
            suffix = str(number).zfill(recipe["indexWidth"])
            name = recipe["namePrefix"] * recipe["prefixCount"] + suffix
            lines.append(recipe["digest"] + " " + recipe["mode"] + name)
        text += recipe["eol"].join(lines)
        if recipe["terminalEol"]:
            text += recipe["eol"]
    else:
        text = recipe["manifestText"]

    inputs = {"manifest": {"kind": "text", "text": text}, "selected": []}
    if kind in ("repeat-text", "manifest-grid"):
        size = len(text.encode("utf-8"))
        run = evaluate_batch(inputs)
        if run["result"]["ok"]:
            entries = parse_text(text)
            return {
                "utf8Bytes": size, "ok": True, "entries": len(entries),
                "first": entries[0], "last": entries[-1], "readSelected": run["readSelected"],
            }
        return {"utf8Bytes": size, **{key: run[key] for key in case["expect"] if key != "utf8Bytes"}}
    if kind == "selected-grid":
        inputs["selected"] = [
            {"name": recipe["prefix"] + str(n).zfill(recipe["indexWidth"]) + recipe["suffix"],
             "sizeBytes": recipe["sizeBytes"], "readMode": recipe["readMode"]}
            for n in range(1, recipe["count"] + 1)
        ]
        run = evaluate_batch(inputs)
        if not run["result"]["ok"]:
            return {key: run[key] for key in ("result", "readSelected", "digestSelected")}
        report = run["result"]["report"]
        rows = report["rows"]
        return {
            "ok": True, "exactMatch": report["exactMatch"], "rows": len(rows), "counts": report["counts"],
            "first": rows[0], "firstExtra": next(row for row in rows if row["status"] == "unexpected"),
            "last": rows[-1], "readSelected": run["readSelected"], "digestSelected": run["digestSelected"],
        }
    assert kind == "repeat-file-byte", kind
    inputs["selected"] = [
        {"name": recipe["name"], "sizeBytes": recipe["count"], "repeatByte": bytes.fromhex(recipe["byteHex"])}
    ]
    return evaluate_batch(inputs)


def main():
    fixture_path = Path(__file__).with_name("fixtures.json")
    data = fixture_path.read_bytes()
    assert_same(sha256(data), FIXTURE_SHA256, "fixed fixture SHA-256")
    fixtures = json.loads(data)
    assert_same(fixtures["schemaVersion"], 1, "fixture schema")
    assert_same(len(fixtures["hashAnswers"]), len(KNOWN), "known vector count")
    known_results = []
    for answer in fixtures["hashAnswers"]:
        content = bytes.fromhex(answer["bytesHex"])
        actual = sha256(content)
        assert_same(actual, KNOWN[content], "independent SHA-256 answer")
        assert_same(actual, answer["sha256"], "literal SHA-256 answer")
        known_results.append({"bytesHex": content.hex(), "sha256": actual})

    batch_results = []
    for case in fixtures["batchCases"]:
        actual = evaluate_batch(case["input"])
        assert_same(actual, case["expect"], case["id"])
        record = {"id": case["id"], **actual}
        if actual["reportUtf8"] is not None:
            report_bytes = actual["reportUtf8"].encode("utf-8")
            record.update(bytes=len(report_bytes), sha256=sha256(report_bytes))
        batch_results.append(record)
    main_case = next(case for case in fixtures["batchCases"] if case["id"] == "main-batch")
    main_result = next(result for result in batch_results if result["id"] == "main-batch")
    assert_same(main_result["bytes"], 846, "primary download bytes")
    assert_same(main_result["sha256"], "ce2119748c04ce50cb99c49bafdcc470b707edf34f6e5f415bc8d09b9c137fa8", "primary download SHA")

    controller_results = []
    for case in fixtures["controllerCases"]:
        timeline = Timeline(main_case["input"])
        steps = []
        for number, step in enumerate(case["steps"], 1):
            timeline.handle(step["action"], step["input"])
            observed = timeline.observe()
            assert_same(observed, step["expect"], f"{case['id']} step {number}")
            steps.append({
                "step": number, "action": step["action"], "phase": timeline.phase,
                "generation": timeline.generation,
                "snapshotAndEffectsSha256": sha256(json.dumps(observed, ensure_ascii=True, sort_keys=True).encode("ascii")),
            })
        controller_results.append({"id": case["id"], "steps": steps})

    boundary_results = []
    for case in fixtures["boundaryRecipes"]:
        actual = check_recipe(case)
        assert_same(actual, case["expect"], case["id"])
        boundary_results.append({"id": case["id"], "actual": actual})

    draft, caret = project_paste(None, "😀\nq", "\r", 2, 2)
    assert_same(draft, {"raw": "😀\r\nq", "display": "😀\nq", "origin": "paste"}, "astral offset / CRLF merge")
    assert_same(caret, 3, "paste caret moves past merged CRLF")
    zero_hash = digest_of_repeat(b"\x00", 32 * MIB)
    assert_same(zero_hash, "83ee47245398adee79bd9c0a8bc57b821e92aba10f5f9ade8a5d1fae4d8c4302", "32 MiB zero stream")
    # All four files are paired and each digest streams one fixed 1 MiB buffer.
    names = ["a.bin", "b.bin", "c.bin", "d.bin"]
    at_limit = {
        "manifest": {"kind": "text", "text": "\n".join(zero_hash + "  " + name for name in names)},
        "selected": [{"name": name, "sizeBytes": 32 * MIB, "repeatByte": b"\x00"} for name in names],
    }
    exact = evaluate_batch(at_limit)
    assert exact["result"]["report"]["exactMatch"]
    assert_same(exact["readSelected"], [1, 2, 3, 4], "128 MiB matched reads")
    assert_same(exact["digestSelected"], [1, 2, 3, 4], "128 MiB matched hashes")
    over = evaluate_batch({**at_limit, "selected": at_limit["selected"] + [
        {"name": "extra.bin", "sizeBytes": 1, "readMode": "must-not-read"},
    ]})
    assert_same(over["result"], {"ok": False, "error": error("FILES_TOTAL_LIMIT", "files")}, "128 MiB plus one")
    assert_same(over["readSelected"], [], "over-limit selection is not read")

    fault_input = {
        "manifest": {"kind": "text", "text": KNOWN[b"abc"] + "  x"},
        "selected": [{"name": "x", "sizeBytes": 3, "bytesHex": "616263"}],
        "faults": {"digestRejectAtFileIndex": 1},
    }
    fault = evaluate_batch(fault_input)
    assert_same(fault["result"], {"ok": False, "error": error("DIGEST_FAILED", "files", file_index=1)}, "minimal digest error")
    assert_same(fault["readSelected"], [1], "digest failure requires a selected-content read")
    summary = {
        "python": python_version(), "fixturesSha256": FIXTURE_SHA256,
        "knownAnswers": known_results, "batch": batch_results, "controller": controller_results,
        "boundaries": boundary_results,
        "supplemental": {
            "pasteUtf16AndCrlfMerge": {"draft": draft, "caret": caret},
            "single32MiBZeroDigest": zero_hash,
            "fourPairedFilesAt128MiB": {"bytes": 128 * MIB, "actual": exact},
            "at128MiBPlusOne": {"bytes": 128 * MIB + 1, "actual": over},
            "digestFailureRequiresRead": {"input": fault_input, "actual": fault},
        },
        "totals": {
            "knownAnswers": len(known_results), "batchCases": len(batch_results),
            "successfulReports": sum(row["result"]["ok"] for row in batch_results),
            "controllerCases": len(controller_results),
            "controllerSteps": sum(len(row["steps"]) for row in controller_results),
            "boundaryRecipes": len(boundary_results),
        },
    }
    print(json.dumps(summary, ensure_ascii=True, separators=(",", ":")))


if __name__ == "__main__":
    main()
