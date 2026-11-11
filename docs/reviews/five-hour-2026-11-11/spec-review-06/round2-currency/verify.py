"""Offline document oracle for Currency Converter PR #319."""

import argparse
import hashlib
import json
import re
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal, localcontext
from fractions import Fraction
from pathlib import Path


FIELDS = {"fromCode": 8, "toCode": 8, "rate": 14, "amount": 12, "direction": 8}
INITIAL = {"fromCode": "USD", "toCode": "TWD", "rate": "", "amount": "100", "direction": "a-to-b"}
EXAMPLE = {**INITIAL, "rate": "31.5"}
LABELS = {
    None: {"zh-Hant": "請輸入匯率", "en": "Enter an exchange rate"},
    "manual": {"zh-Hant": "手填匯率", "en": "Manually entered rate"},
    "example": {"zh-Hant": "合成範例匯率", "en": "Synthetic example rate"},
}
CHECKPOINT_FIELDS = {"state", "rateSource", "resultRateSource", "reportAvailable"}


def utf16_order(value):
    if isinstance(value, dict):
        keys = sorted(value, key=lambda key: key.encode("utf-16-be", errors="surrogatepass"))
        return {key: utf16_order(value[key]) for key in keys}
    if isinstance(value, list):
        return [utf16_order(item) for item in value]
    return value


def canonical_bytes(value):
    return (json.dumps(utf16_order(value), ensure_ascii=True, allow_nan=False,
                       separators=(",", ":")) + "\n").encode("utf-8")


def digest(data):
    return {"utf8Bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def error(code, field=None):
    return {"ok": False, "error": {"code": code, "field": field, "row": None}}


def round_cents(value):
    return int(value + Fraction(1, 2))


def display_inverse(rate):
    with localcontext() as context:
        context.prec = 6
        context.rounding = ROUND_HALF_UP
        inverse = Decimal(rate.denominator) / Decimal(rate.numerator)
    fixed = format(inverse, "f")
    return fixed.rstrip("0").rstrip(".") if "." in fixed else fixed


def core(raw):
    if type(raw) is not dict or set(raw) != set(FIELDS) or any(type(v) is not str for v in raw.values()):
        return error("SCHEMA")

    values = {}
    for key, capacity in FIELDS.items():
        value = raw[key]
        utf16 = value.encode("utf-16-le", errors="surrogatepass")
        if len(utf16) // 2 > capacity:
            return error("INPUT_LIMIT", key)
        try:
            utf16.decode("utf-16-le")
        except UnicodeDecodeError:
            return error("UNICODE", key)
        if not value:
            return error("EMPTY", key)

        if key in ("fromCode", "toCode"):
            if not re.fullmatch(r"[A-Za-z]{3}", value):
                return error("CODE_FORMAT", key)
            values[key] = value.upper()
        elif key == "direction":
            if value not in ("a-to-b", "b-to-a"):
                return error("ENUM", key)
            values[key] = value
        else:
            places = 6 if key == "rate" else 2
            if not re.fullmatch(rf"(0|[1-9][0-9]*)(\.[0-9]{{1,{places}}})?", value):
                return error("DECIMAL_FORMAT", key)
            number = Fraction(value)
            low, high = ((Fraction(1, 1_000_000), 1_000_000) if key == "rate"
                         else (0, Fraction(999_999_999, 100)))
            if not low <= number <= high:
                return error("RANGE", key)
            values[key] = number

    rate = values["rate"]
    cents = int(values["amount"] * 100)
    direction = values["direction"]
    converted = cents * rate if direction == "a-to-b" else cents / rate
    result = {
        "fromCode": values["fromCode"],
        "toCode": values["toCode"],
        "direction": direction,
        "rateMicro": int(rate * 1_000_000),
        "amountCents": cents,
        "convertedCents": round_cents(converted),
        "inverseRate": display_inverse(rate),
        "quickTable": [
            {"amountCents": step, "convertedCents": round_cents(step * rate)}
            for step in (100, 1000, 10000, 100000)
        ],
    }
    return {"ok": True, "result": result}


@dataclass(frozen=True)
class Job:
    draft: dict
    source: str | None


@dataclass
class Controller:
    draft: dict = field(default_factory=lambda: INITIAL.copy())
    source: str | None = None
    state: str = "empty"
    active: str | None = None
    jobs: dict = field(default_factory=dict)
    accepted: tuple | None = None
    error: dict | None = None
    deliveries: list = field(default_factory=list)

    def invalidate(self, state):
        self.state = state
        self.active = None
        self.accepted = None
        self.error = None

    def load_example(self):
        self.invalidate("dirty")
        self.draft = EXAMPLE.copy()
        self.source = "example"

    def edit(self, key, value):
        if key not in FIELDS or type(value) is not str:
            raise ValueError("edit must target one core field and carry a string")
        self.invalidate("dirty")
        self.draft[key] = value
        if key == "rate":
            self.source = "manual" if value else None

    def enter_manual(self, draft):
        if set(draft) != set(FIELDS):
            raise ValueError("manual entry must supply all five fields")
        for key, value in draft.items():
            self.edit(key, value)

    def start(self, job):
        if job in self.jobs:
            raise ValueError(f"job already used: {job}")
        self.invalidate("busy")
        self.active = job
        self.jobs[job] = Job(self.draft.copy(), self.source)

    def finish(self, job):
        snapshot = self.jobs[job]
        reply = core(snapshot.draft)
        accepted = self.state == "busy" and self.active == job
        self.deliveries.append({
            "job": job,
            "workerInput": snapshot.draft,
            "snapshotSource": snapshot.source,
            "reply": reply,
            "accepted": accepted,
        })
        if accepted:
            self.active = None
            if reply["ok"]:
                if snapshot.source not in ("manual", "example"):
                    raise ValueError("a successful reply must have input provenance")
                self.accepted = (reply["result"], snapshot.source)
                self.state = "success"
            else:
                self.error = reply["error"]
                self.state = "error"
        return reply

    def reset(self):
        self.invalidate("empty")
        self.draft = INITIAL.copy()
        self.source = None

    def report_bytes(self):
        if self.accepted is None:
            return None
        result, source = self.accepted
        return canonical_bytes({**result, "rateSource": source})

    def observe(self):
        result_source = self.accepted[1] if self.accepted is not None else None
        data = self.report_bytes()
        return {
            "state": self.state,
            "draft": self.draft.copy(),
            "rateSource": self.source,
            "resultRateSource": result_source,
            "reportAvailable": data is not None,
            "error": self.error,
            "report": None if data is None else {"rateSource": result_source, **digest(data)},
            "formLabels": LABELS[self.source],
            "resultLabels": LABELS[result_source] if result_source is not None else None,
        }


def compare(actual, expected):
    return {"pass": canonical_bytes(actual) == canonical_bytes(expected),
            "actual": actual, "expected": expected}


def checkpoint(actual, expected):
    if not CHECKPOINT_FIELDS <= expected.keys():
        raise ValueError("checkpoint omits a required state or source field")
    selected = {key: actual[key] for key in expected}
    return {**compare(selected, expected), "observed": actual}


def replay(case):
    case_id, data = case["id"], case["input"]
    controller = Controller()
    observed, checks, reports = {}, {}, {}

    def capture(at):
        if at in observed:
            raise ValueError(f"duplicate checkpoint: {at}")
        observed[at] = controller.observe()
        if at in ("exampleSuccess", "manualSuccess"):
            reports[at] = controller.report_bytes()

    if case_id == "state-dirty-error":
        controller.enter_manual(data["initial"])
        controller.start("original")
        controller.finish("original")
        capture("afterRun")
        controller.enter_manual(data["edit"])
        capture("afterEdit")
        controller.start("edited")
        controller.finish("edited")
        capture("afterRerun")
    elif case_id == "state-cancel-late":
        controller.enter_manual(data["draft"])
        controller.start("pending")
        capture("whilePending")
        controller.invalidate("cancelled")
        capture("afterCancel")
        reply = controller.finish("pending")
        checks["lateResultMatchesOriginalDraft"] = compare(reply, {"ok": True, "result": data["lateResult"]})
        capture("afterLateResult")
        controller.reset()
        capture("afterReset")
    elif case_id == "state-replace-late":
        controller.enter_manual(data["olderDraft"])
        controller.start("older")
        controller.enter_manual(data["newerDraft"])
        controller.start("newer")
        controller.finish("newer")
        capture("afterNewerResult")
        reply = controller.finish("older")
        checks["olderLateResultMatchesOriginalDraft"] = compare(
            reply, {"ok": True, "result": data["olderLateResult"]})
        capture("afterOlderLateResult")
    elif case_id == "state-rate-source":
        for step in data["steps"]:
            match step["op"]:
                case "initial":
                    if observed:
                        raise ValueError("initial observation must be first")
                case "loadExample":
                    controller.load_example()
                case "edit":
                    controller.edit(step["field"], step["value"])
                case "start":
                    controller.start(step["job"])
                case "finish":
                    controller.finish(step["job"])
                case "reset":
                    controller.reset()
                case _:
                    raise ValueError(f"unknown step: {step['op']}")
            capture(step["at"])
    else:
        raise ValueError(f"unrecognized controller case: {case_id}")

    expected = case["expected"]
    if set(observed) != set(expected):
        raise ValueError(f"{case_id} expected checkpoint names do not match executed actions")
    states = {at: checkpoint(snapshot, expected[at]) for at, snapshot in observed.items()}
    checks["acceptedReportSourceMatchesFormAndResult"] = compare(
        all(state["rateSource"] == state["resultRateSource"] == state["report"]["rateSource"]
            and state["formLabels"] == state["resultLabels"]
            for state in observed.values() if state["reportAvailable"]),
        True,
    )
    checks["workerSeesOnlyFiveCoreFields"] = compare(
        all(set(delivery["workerInput"]) == set(FIELDS) for delivery in controller.deliveries), True)
    return {
        "id": case_id,
        "input": data,
        "pass": all(item["pass"] for item in (*states.values(), *checks.values())),
        "checkpoints": states,
        "assertions": checks,
        "deliveries": controller.deliveries,
    }, reports


def check_original(original, current):
    old = {case["id"]: case for case in original["cases"]}
    now = {case["id"]: case for case in current["cases"]}
    added = sorted(now.keys() - old.keys())
    if set(added) != {"reverse-display-rounding-regression", "state-rate-source"} or old.keys() - now.keys():
        raise ValueError("unexpected additions or deletions of fixture IDs")
    same_core, same_controller_input, same_checkpoint, differences = [], [], [], []
    for case_id, previous in old.items():
        updated = now[case_id]
        if previous["kind"] == "core":
            same_core.append({"id": case_id, **compare(
                [updated["input"], updated["expected"]], [previous["input"], previous["expected"]])})
            continue
        same_controller_input.append({"id": case_id, **compare(updated["input"], previous["input"])})
        if set(updated["expected"]) != set(previous["expected"]):
            raise ValueError(f"{case_id} dropped or added an existing checkpoint")
        for at, expected in previous["expected"].items():
            subset = {key: updated["expected"][at][key] for key in expected}
            if (case_id, at) == ("state-cancel-late", "afterReset"):
                differences.append({"id": case_id, "at": at, "old": expected, "new": subset})
                expected = {**expected, "draft": {**expected["draft"], "rate": ""}}
            same_checkpoint.append({"id": case_id, "at": at, **compare(subset, expected)})
    return {"added": added, "existingCore": same_core,
            "existingControllerInput": same_controller_input,
            "existingCheckpointFields": same_checkpoint, "intendedDiff": differences,
            "pass": all(item["pass"] for item in same_core + same_controller_input + same_checkpoint)}


def supplemental(report_files):
    proofs = {}
    reverse = {**EXAMPLE, "rate": "3", "amount": "30000", "direction": "b-to-a"}
    for name, raw, expected in [
        ("reverseDifferentByOneCent", reverse, [1_000_000, "0.333333", 999_999]),
        ("oldRepeatingCaseBothRoundTo317", {**EXAMPLE, "direction": "b-to-a"}, [317, "0.031746", 317]),
    ]:
        result = core(raw)["result"]
        amount_in_cents = Fraction(raw["amount"]) * 100
        inverse_product = round_cents(amount_in_cents * Fraction(result["inverseRate"]))
        proofs[name] = {"input": raw, **compare(
            [result["convertedCents"], result["inverseRate"], inverse_product], expected)}

    for name, raw, expected in [
        ("coreRejectsRateSourceMetadata", {**EXAMPLE, "rateSource": "example"}, error("SCHEMA")),
        ("firstInvalidFieldPrecedesBlankRate", {**INITIAL, "fromCode": "USDT"}, error("CODE_FORMAT", "fromCode")),
        ("unpairedSurrogate", {**EXAMPLE, "fromCode": "\ud800"}, error("UNICODE", "fromCode")),
        ("capacityBeforeUnicode", {**EXAMPLE, "fromCode": "12345678\ud800"}, error("INPUT_LIMIT", "fromCode")),
        ("rawAmountOneCentAboveMaximum", {**EXAMPLE, "amount": "10000000.00"}, error("RANGE", "amount")),
        ("schemaRejectsNonStringRate", {**EXAMPLE, "rate": 31.5}, error("SCHEMA")),
    ]:
        proofs[name] = {"input": raw, **compare(core(raw), expected)}
    for name, raw, field_name, expected in [
        ("maxForward", {**EXAMPLE, "amount": "9999999.99", "rate": "1000000"}, "convertedCents", 999_999_999_000_000),
        ("maxReverse", {**EXAMPLE, "amount": "9999999.99", "rate": "0.000001",
                        "direction": "b-to-a"}, "convertedCents", 999_999_999_000_000),
        ("sixSignificantDigitsRoundAcrossPowerOfTen", {**EXAMPLE, "rate": "10.000001"}, "inverseRate", "0.1"),
    ]:
        proofs[name] = {"input": raw, "resultField": field_name,
                        **compare(core(raw)["result"][field_name], expected)}

    state = Controller()
    state.load_example()
    state.edit("amount", "200")
    state.start("oldExample")
    state.edit("rate", "32")
    state.start("newManual")
    state.finish("oldExample")
    proofs["lateExampleDuringNewManualJob"] = compare(
        [state.state, state.source, state.active, state.report_bytes() is None,
         state.deliveries[-1]["accepted"]], ["busy", "manual", "newManual", True, False])
    state.finish("newManual")
    report = json.loads(state.report_bytes())
    proofs["manualResultAfterLateExample"] = compare(
        [report["convertedCents"], report["rateSource"]], [640_000, "manual"])
    state.load_example()
    state.edit("direction", "b-to-a")
    state.start("reverseExample")
    state.finish("reverseExample")
    report = json.loads(state.report_bytes())
    proofs["directionEditRetainsExampleSource"] = compare(
        [report["convertedCents"], report["rateSource"]], [317, "example"])
    state.reset()
    proofs["resetAfterSuccessfulReport"] = compare(
        [state.state, state.draft, state.source, state.report_bytes() is None],
        ["empty", INITIAL, None, True])

    example = json.loads(report_files["exampleSuccess"])
    manual = json.loads(report_files["manualSuccess"])
    proofs["reportsDifferOnlyInSource"] = compare(
        [example.pop("rateSource"), manual.pop("rateSource"), example == manual], ["example", "manual", True])
    proofs["legacyReportWithoutSource"] = compare(
        digest(canonical_bytes(manual)),
        {"utf8Bytes": 340, "sha256": "bfa30bc8083bcd1e072745e3c0182823da2fa6bc7627f3ac9a14cd9e1e742547"},
    )
    return proofs


def read_fixture(path):
    data = path.read_bytes()
    fixture = json.loads(data)
    metadata = {key: value for key, value in fixture.items() if key != "cases"}
    if metadata != {"schemaVersion": 1, "slug": "currency-converter",
                    "specId": "spec-currency-converter-20261109", "productChecks": "NOT_RUN"}:
        raise ValueError("unexpected fixture metadata")
    ids = [case["id"] for case in fixture["cases"]]
    if len(set(ids)) != len(ids):
        raise ValueError("duplicate fixture IDs")
    return fixture, {**digest(data), "gitBlob": hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", type=Path, required=True)
    parser.add_argument("--original-fixture", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    current, current_hash = read_fixture(args.fixture)
    original, original_hash = read_fixture(args.original_fixture)
    core_results, controllers, report_files = [], [], {}
    for case in current["cases"]:
        match case["kind"]:
            case "core":
                core_results.append({"id": case["id"], "input": case["input"],
                                     **compare(core(case["input"]), case["expected"])})
            case "controller":
                result, reports = replay(case)
                controllers.append(result)
                report_files.update(reports)
            case _:
                raise ValueError(f"unrecognized fixture kind: {case['kind']}")

    counts = {
        "core": {"pass": sum(row["pass"] for row in core_results), "total": len(core_results)},
        "controller": {"pass": sum(row["pass"] for row in controllers), "total": len(controllers)},
        "checkpoint": {
            "pass": sum(point["pass"] for row in controllers for point in row["checkpoints"].values()),
            "total": sum(len(row["checkpoints"]) for row in controllers),
        },
    }
    if tuple(row["total"] for row in counts.values()) != (22, 4, 29):
        raise ValueError(f"unexpected fixture counts: {counts}")
    proofs = supplemental(report_files)
    diff = check_original(original, current)
    pass_all = (all(row["pass"] == row["total"] for row in counts.values())
                and all(proof["pass"] for proof in proofs.values()) and diff["pass"])
    args.output_dir.mkdir(parents=True, exist_ok=True)
    reports = {}
    for name, at in (("example", "exampleSuccess"), ("manual", "manualSuccess")):
        data = report_files[at]
        path = args.output_dir / f"report-{name}.json"
        path.write_bytes(data)
        reports[name] = {"artifact": path.name, "downloadName": "currency-converter-report.json", **digest(data)}

    evidence = {
        "result": "PASS" if pass_all else "FAIL",
        "scope": "offline document and fixture consistency",
        "productChecks": "NOT_RUN",
        "inputFiles": {"original": original_hash, "candidate": current_hash},
        "counts": counts,
        "core": core_results,
        "controller": controllers,
        "originalFixtureComparison": diff,
        "downloadReports": reports,
        "supplemental": proofs,
    }
    output = args.output_dir / "verification.json"
    output.write_bytes((json.dumps(evidence, ensure_ascii=True, indent=2) + "\n").encode("utf-8"))
    print(json.dumps({"result": evidence["result"], **counts, "reports": reports,
                      "supplemental": {"pass": sum(row["pass"] for row in proofs.values()), "total": len(proofs)},
                      "originalFixtures": "PASS" if diff["pass"] else "FAIL"}, ensure_ascii=True))
    return 0 if pass_all else 1


if __name__ == "__main__":
    raise SystemExit(main())
