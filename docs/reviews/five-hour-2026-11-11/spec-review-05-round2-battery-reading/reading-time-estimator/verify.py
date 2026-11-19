"""Replay the pinned reading specification fixtures using the Python standard library."""

import json
import re
import sys
from fractions import Fraction
from pathlib import Path

DEFAULTS = {
    "text": "",
    "zhSilentRate": "400",
    "zhSpeakRate": "240",
    "enSilentRate": "200",
    "enSpeakRate": "150",
}
RATE_MAX = {"zhSilentRate": 2000, "zhSpeakRate": 1200, "enSilentRate": 1000, "enSpeakRate": 600}
CJK = ((0x3400, 0x4DBF), (0x4E00, 0x9FFF), (0xF900, 0xFAFF), (0x20000, 0x2A6DF))
SEPARATORS = {
    *range(0x9, 0xE), 0x20, 0x85, 0xA0, 0x1680, *range(0x2000, 0x200B),
    0x2028, 0x2029, 0x202F, 0x205F, 0x3000,
}


def fail(code, field=None):
    return {"ok": False, "error": {"code": code, "field": field, "row": None}}


def utf16_units(value):
    return len(value.encode("utf-16-le", errors="surrogatepass")) // 2


def validate(data):
    if type(data) is not dict or set(data) != set(DEFAULTS) or any(type(data[k]) is not str for k in DEFAULTS):
        return fail("SCHEMA")
    for key in DEFAULTS:
        raw = data[key]
        if utf16_units(raw) > (100_000 if key == "text" else 8):
            return fail("INPUT_LIMIT", key)
        if any(0xD800 <= ord(char) <= 0xDFFF for char in raw):
            return fail("UNICODE", key)
        if not raw:
            return fail("EMPTY", key)
        if key != "text":
            if not re.fullmatch(r"(?:0|[1-9][0-9]*)", raw):
                return fail("INTEGER_FORMAT", key)
            if not 50 <= int(raw) <= RATE_MAX[key]:
                return fail("RANGE", key)
    return None


def counts(text):
    """One code-point scan. A separator closes the current ASCII-bearing token."""
    ideographs = words = 0
    token_has_ascii = False
    for char in text:
        point = ord(char)
        if any(low <= point <= high for low, high in CJK):
            ideographs += 1
        if point in SEPARATORS:
            words += token_has_ascii
            token_has_ascii = False
        elif 48 <= point <= 57 or 65 <= point <= 90 or 97 <= point <= 122:
            token_has_ascii = True
    return ideographs, words + token_has_ascii


def display(total_seconds):
    minutes, seconds = divmod(total_seconds, 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    return f"{minutes}:{seconds:02d}"


def derive(data):
    error = validate(data)
    if error:
        return error, None
    han, words = counts(data["text"])
    silent_minutes = Fraction(han, int(data["zhSilentRate"])) + Fraction(words, int(data["enSilentRate"]))
    speak_minutes = Fraction(han, int(data["zhSpeakRate"])) + Fraction(words, int(data["enSpeakRate"]))
    silent_seconds = (silent_minutes * 60 + Fraction(1, 2)) // 1
    speak_seconds = (speak_minutes * 60 + Fraction(1, 2)) // 1
    witness = {
        "utf16Units": utf16_units(data["text"]),
        "codePointCount": len(data["text"]),
        "exactSilentMinutes": str(silent_minutes),
        "exactSpeakMinutes": str(speak_minutes),
    }
    if len(data["text"]) <= 16:
        witness["codePoints"] = [f"U+{ord(char):04X}" for char in data["text"]]
    return {"ok": True, "result": {
        "cjkChars": han,
        "latinWords": words,
        "silentSeconds": silent_seconds,
        "speakSeconds": speak_seconds,
        "silentDisplay": display(silent_seconds),
        "speakDisplay": display(speak_seconds),
    }}, witness


class Controller:
    def __init__(self):
        self.state = "empty"
        self.generation = 0
        self.error = None
        self.draft = DEFAULTS

    def transition(self, state, draft=None):
        self.state = state
        self.error = None
        if draft is not None:
            self.draft = draft
        self.generation += 1
        return self.generation

    def finish(self, generation, result):
        if self.state != "busy" or generation != self.generation:
            return
        self.state = "success" if result["ok"] else "error"
        self.error = result.get("error")

    def submit(self, data):
        self.finish(self.transition("busy", data), derive(data)[0])

    def view(self, include_draft=False):
        view = {"state": self.state, "reportAvailable": self.state == "success"}
        if include_draft:
            view["draft"] = self.draft
        if self.error is not None:
            view["error"] = self.error
        return view


def controller(fixture):
    source = fixture["input"]
    model = Controller()
    name = fixture["id"]
    if name == "state-dirty-error":
        model.submit(source["initial"])
        after_run = model.view()
        model.transition("dirty", source["edit"])
        after_edit = model.view()
        model.submit(source["edit"])
        return {"afterRun": after_run, "afterEdit": after_edit, "afterRerun": model.view()}
    if name == "state-cancel-late":
        original = derive(source["draft"])[0]
        if original.get("result") != source["lateResult"]:
            raise ValueError("Late result differs from independent computation")
        pending = model.transition("busy", source["draft"])
        while_pending = model.view()
        model.transition("cancelled")
        after_cancel = model.view(include_draft=True)
        model.finish(pending, original)
        after_late = model.view()
        model.transition("empty", DEFAULTS)
        return {"whilePending": while_pending, "afterCancel": after_cancel,
                "afterLateResult": after_late, "afterReset": model.view(include_draft=True)}
    if name == "state-replace-late":
        original = derive(source["olderDraft"])[0]
        if original.get("result") != source["olderLateResult"]:
            raise ValueError("Replaced result differs from independent computation")
        pending = model.transition("busy", source["olderDraft"])
        model.submit(source["newerDraft"])
        after_newer = model.view()
        model.finish(pending, original)
        return {"afterNewerResult": after_newer, "afterOlderLateResult": model.view()}
    raise ValueError(f"Unhandled fixture {name}")


def check(before_file, after_file):
    original = json.loads(Path(before_file).read_bytes())["cases"]
    candidate = json.loads(Path(after_file).read_bytes())["cases"]
    old_cases = {row["id"]: row for row in original}
    current_cases = {row["id"]: row for row in candidate}
    if len(current_cases) != len(candidate):
        raise ValueError("Duplicate candidate fixture id")
    unchanged = (
        all(current_cases.get(name) == row for name, row in old_cases.items())
        and [row["id"] for row in candidate if row["id"] in old_cases] == list(old_cases)
    )
    evidence = []
    for row in candidate:
        actual, witness = derive(row["input"]) if row["kind"] == "core" else (controller(row), None)
        evidence.append({
            "id": row["id"], "kind": row["kind"],
            "origin": "original" if row["id"] in old_cases else "repair", "input": row["input"],
            "candidateExpected": row["expected"], "independentExpected": actual,
            "exactWitness": witness, "status": "PASS" if actual == row["expected"] else "FAIL",
        })

    probes = [
        ("whitespace-pinned", "one\u0085two\ufeffthree\u3000four"),
        ("cjk-ascii-same-token", "中文abc"),
        ("hangul-only", "한글"),
    ]
    extra = []
    for name, text in probes:
        data = {**DEFAULTS, "text": text}
        actual, witness = derive(data)
        extra.append({"id": name, "input": data, "independentExpected": actual, "exactWitness": witness})
    limit, limit_witness = derive({**DEFAULTS, "text": "\U00020000" * 50_000})
    extra.append({
        "id": "utf16-limit-with-supplementary",
        "inputConstruction": {"repeatCodePoint": "U+20000", "count": 50_000},
        "independentExpected": limit, "exactWitness": limit_witness,
    })
    failures = sum(row["status"] == "FAIL" for row in evidence)
    print(json.dumps({
        "runtime": sys.version.split()[0], "passed": len(evidence) - failures, "failed": failures,
        "unchangedOriginalCases": len(original) if unchanged else 0, "productChecks": "NOT_RUN",
        "cases": evidence, "extra": extra,
    }, indent=2, ensure_ascii=True))
    return 1 if failures or not unchanged else 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Pass original and candidate fixtures.json paths")
    raise SystemExit(check(*sys.argv[1:]))
