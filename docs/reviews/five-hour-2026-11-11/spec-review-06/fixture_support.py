"""Offline review helpers. Each verifier derives values before comparing literals."""

import json
import sys
from pathlib import Path


def utf16_units(text):
    return len(text.encode("utf-16-le", errors="surrogatepass")) // 2


def unpaired_surrogate(text):
    try:
        text.encode("utf-16-le")
    except UnicodeEncodeError:
        return True
    return False


def invalid(code, field=None, row=None):
    return {"ok": False, "error": {"code": code, "field": field, "row": row}}


class Trial:
    """Review-only model of the specified asynchronous lifecycle."""

    def __init__(self, default):
        self.default = default.copy()
        self.reset()

    def invalidate(self, state):
        self.token = object()
        self.state = state
        self.reply = None

    def reset(self):
        self.draft = self.default.copy()
        self.invalidate("empty")

    def edit(self, draft):
        self.draft = draft.copy()
        self.invalidate("dirty")

    def start(self):
        self.invalidate("busy")
        return self.token

    def finish(self, token, reply):
        if self.state == "busy" and token is self.token:
            self.reply = reply
            self.state = "success" if reply["ok"] else "error"

    def cancel(self):
        self.invalidate("cancelled")

    def snapshot(self, include_draft=False, include_error=False):
        current = {"state": self.state, "reportAvailable": self.state == "success"}
        if include_draft:
            current["draft"] = self.draft.copy()
        if include_error:
            current["error"] = self.reply["error"]
        return current


def derive_lifecycle(case_id, source, default, evaluate):
    state = Trial(default)
    if case_id == "state-dirty-error":
        state.edit(source["initial"])
        state.finish(state.start(), evaluate(state.draft))
        after_run = state.snapshot()
        state.edit(source["edit"])
        after_edit = state.snapshot()
        state.finish(state.start(), evaluate(state.draft))
        return {"afterRun": after_run, "afterEdit": after_edit,
                "afterRerun": state.snapshot(include_error=True)}
    if case_id == "state-cancel-late":
        state.edit(source["draft"])
        previous = state.start()
        pending = state.snapshot()
        state.cancel()
        after_cancel = state.snapshot(include_draft=True)
        assert source["lateResult"] == evaluate(source["draft"])["result"]
        state.finish(previous, {"ok": True, "result": source["lateResult"]})
        late = state.snapshot()
        state.reset()
        return {"whilePending": pending, "afterCancel": after_cancel,
                "afterLateResult": late, "afterReset": state.snapshot(include_draft=True)}
    if case_id == "state-replace-late":
        state.edit(source["olderDraft"])
        previous = state.start()
        state.edit(source["newerDraft"])
        state.finish(state.start(), evaluate(state.draft))
        after_newer = state.snapshot(include_error=True)
        assert source["olderLateResult"] == evaluate(source["olderDraft"])["result"]
        state.finish(previous, {"ok": True, "result": source["olderLateResult"]})
        return {"afterNewerResult": after_newer,
                "afterOlderLateResult": state.snapshot(include_error=True)}
    raise ValueError(f"Unhandled case {case_id}")


def verify_all(derive, probes):
    source = Path(sys.argv[1])
    data = json.loads(source.read_text(encoding="utf-8"))
    results = []
    for case in data["cases"]:
        derived = derive(case["id"], case["kind"], case["input"])
        matches = case["expected"] == derived
        results.append({
            "id": case["id"], "kind": case["kind"], "input": case["input"],
            "expected": case["expected"], "derived": derived, "match": matches,
        })
    counts = {}
    for row in results:
        by_kind = counts.setdefault(row["kind"], {"total": 0, "matched": 0})
        by_kind["total"] += 1
        by_kind["matched"] += int(row["match"])
    print(json.dumps({
        "slug": data["slug"], "pythonVersion": sys.version.split()[0],
        "counts": counts, "fixtures": results, "additionalProbes": probes(),
    }, ensure_ascii=True, indent=2))
    return 0 if all(row["match"] for row in results) else 1
