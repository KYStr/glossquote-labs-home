"""Independent replay of the fixed synthetic controller traces, without browser APIs."""

from collections import Counter
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import sys

from verify_candidate import FILES, error, outcome, settings_error


TITLE = {"zh-Hant": "練習題", "en": "Practice quiz"}
ROUTE = {"zh-Hant": "/index.html", "en": "/en/index.html"}
COUNTERS = ("starts", "posts", "terminates", "staticRevokes", "downloads", "outputRevokes", "navigations")


class Trace:
    def __init__(self, fixture, locale):
        self.fixture = fixture
        self.locale, self.epoch = locale, 1
        self.run = 0
        self.lease_number = 0
        self.counts = Counter()
        self.papers = {item["id"]: item for item in fixture["successCases"]}
        self.clear()
        self.suspended = False

    def clear(self):
        self.phase = "empty"
        self.source = None
        self.bank = None
        self.active = None
        self.worker_ready = False
        self.output = None
        self.preview = None
        self.leases = []
        self.notice = None
        self.problem = None
        self.settings = dict(title=TITLE[self.locale], seed="lesson-1", quotas=[])

    def snapshot(self):
        available = self.output is not None and len(self.leases) < 4
        return deepcopy(dict(
            phase=self.phase, locale=self.locale, epoch=self.epoch,
            hasSource=self.source is not None,
            bank=(None if self.bank is None else {
                "questions": len(self.bank["rows"]), "topics": self.bank["topics"]
            }),
            settings=self.settings, active=self.active, preview=self.preview,
            downloads=dict(student=available, answer=available),
            downloadCount=len(self.leases), notice=self.notice, error=self.problem,
        ))

    def stop(self):
        if self.active is None:
            return None
        run = self.active["run"]
        if not self.worker_ready:
            self.counts["staticRevokes"] += 1
        self.counts["terminates"] += 1
        self.active = None
        self.worker_ready = False
        return dict(kind="terminate", run=run)

    def invalidate(self):
        leases, self.leases = self.leases, []
        self.counts["outputRevokes"] += len(leases)
        self.output = self.preview = self.notice = self.problem = None
        return dict(kind="revoke", leaseIds=leases) if leases else None

    def fail(self, problem):
        self.invalidate()
        self.phase = "error"
        self.problem = problem

    def start(self, kind, constructor_fails=False):
        self.run += 1
        if constructor_fails:
            self.counts["staticRevokes"] += 1
            self.fail(error("WORKER_UNAVAILABLE", "worker"))
            return
        self.counts["starts"] += 1
        self.active = dict(kind=kind, epoch=self.epoch, run=self.run)
        self.worker_ready = False
        self.phase = "reading" if kind == "read" else "generating"

    def worker(self, event):
        if self.active is None or self.active["run"] != event["fromRun"]:
            return
        msg = event["message"]
        kind = msg["kind"]
        if kind == "ready":
            if not self.worker_ready:
                self.worker_ready = True
                self.counts["staticRevokes"] += 1
                self.counts["posts"] += 1
            return
        if (msg.get("epoch"), msg.get("run")) != (self.epoch, self.active["run"]):
            return
        allowed = {"read": "loaded", "generate": "generated"}[self.active["kind"]]
        allowed_result = self.worker_ready and kind in (allowed, "failed")
        self.stop()
        if not allowed_result:
            self.fail(error("WORKER_FAILED", "worker"))
        elif kind == "failed":
            problem = msg["error"]
            if problem["code"].startswith("CSV_"):
                assert problem == outcome(self.fixture["sources"][self.source])
            self.fail(problem)
        elif kind == "loaded":
            self.bank = self.fixture["banks"][msg["bankRef"]]
            assert outcome(self.fixture["sources"][self.source]) == self.fixture["bankSummaries"][msg["bankRef"]]
            self.settings["quotas"] = ["0"] * len(self.bank["topics"])
            self.phase = "configured"
        else:
            self.output = self.papers[msg["outputRef"]]
            assert self.output["locale"] == self.locale and self.output["settings"] == self.settings
            self.phase, self.preview = "ready", "student"

    def step(self, e):
        kind = e["type"]
        if kind in ("sample", "source"):
            source = "sample" if kind == "sample" else e.get("sourceRef")
            if source == self.source:
                return None
            revocation = self.invalidate()
            stopped = self.stop()
            self.source, self.bank = source, None
            self.settings["quotas"] = []
            self.phase = "dirty-source" if source else "empty"
            return revocation or stopped
        if kind in ("title", "seed", "quota"):
            if kind == "quota":
                quota = self.settings["quotas"]
                if not 0 <= e["index"] < len(quota) or quota[e["index"]] == e["value"]:
                    return None
                quota[e["index"]] = e["value"]
            else:
                if self.settings[kind] == e["value"]:
                    return None
                self.settings[kind] = e["value"]
            revocation = self.invalidate()
            stopped = self.stop()
            self.phase = "dirty-settings" if self.bank else "dirty-source" if self.source else "empty"
            return revocation or stopped
        if kind in ("read", "generate"):
            if self.active or self.suspended or (kind == "read" and self.bank) or (kind == "generate" and not self.bank):
                return None
            revocation = self.invalidate()
            problem = (
                (None if self.source else error("SOURCE_EMPTY")) if kind == "read"
                else settings_error(self.bank, self.settings)
            )
            if problem:
                self.fail(problem)
            else:
                self.start(kind, e.get("adapterCreateFails", False))
            return revocation
        if kind == "worker":
            self.worker(e)
        elif kind in ("cancel", "timeout"):
            if self.active is None:
                return None
            if kind == "timeout" and (e["epoch"], e["run"]) != (self.epoch, self.active["run"]):
                return None
            stopped = self.stop()
            if kind == "cancel":
                self.invalidate()
                self.phase = "cancelled"
            else:
                self.fail(error("WORKER_TIMEOUT", "worker"))
            return stopped
        elif kind == "select" and self.output:
            self.preview = e["role"]
        elif kind == "download" and self.output and len(self.leases) < 4:
            self.lease_number += 1
            lease = f"lease-{self.lease_number}"
            self.leases.append(lease)
            self.counts["downloads"] += 1
            self.notice = "download-limit" if len(self.leases) == 4 else "download-requested"
            return dict(kind="download", fileRef=self.output["files"][e["role"]], leaseId=lease)
        elif kind == "lease-expired" and e["leaseId"] in self.leases:
            self.leases.remove(e["leaseId"])
            self.counts["outputRevokes"] += 1
            if self.notice == "download-limit":
                self.notice = None
            return dict(kind="revoke", leaseIds=[e["leaseId"]])
        elif kind in ("reset", "pagehide") or (kind == "pageshow" and e.get("persisted")) or (
            kind == "language" and e.get("confirmed") and e["locale"] != self.locale
        ):
            revoke = self.invalidate()
            stopped = self.stop()
            self.epoch += 1
            self.suspended = kind == "pagehide"
            if kind == "language":
                self.locale = e["locale"]
            self.clear()
            if kind == "language":
                self.counts["navigations"] += 1
                effect = dict(kind="navigate", path=ROUTE[self.locale])
                if revoke:
                    effect["revokeLeaseIds"] = revoke["leaseIds"]
                return effect
            return revoke or stopped
        return None


def verify_traces(fixture):
    results = []
    for trace in fixture["controllerTraces"]:
        model = Trace(fixture, trace["initial"]["locale"])
        assert model.snapshot() == trace["initial"], trace["id"]
        for index, item in enumerate(trace["steps"], 1):
            actual_effect = model.step(item["event"])
            actual_snapshot = model.snapshot()
            assert actual_snapshot == item["expected"], (trace["id"], index, actual_snapshot, item["expected"])
            assert actual_effect == item["effect"], (trace["id"], index, actual_effect, item["effect"])
        assert {key: model.counts[key] for key in COUNTERS} == trace["adapterCounts"], trace["id"]
        results.append(dict(trace=trace["id"], steps=len(trace["steps"]), adapterCounts=trace["adapterCounts"]))
    return results


def composition_gap(fixture):
    # A legal ready prefix plus a student download lease, then an event absent from the pinned dispatcher.
    trace = fixture["controllerTraces"][0]
    model = Trace(fixture, "zh-Hant")
    for step in trace["steps"][:13]:
        model.step(step["event"])
    before = model.snapshot()
    assert before["phase"] == "ready" and before["downloadCount"] == 1
    event = dict(type="composition-start", field="title")
    effect = model.step(event)
    after = model.snapshot()
    assert after == before and effect is None
    return dict(
        startingPoint=f"{trace['id']}, step 13",
        input=event,
        expectedByUserFlow=dict(preview=None, downloads=dict(student=False, answer=False), downloadCount=0),
        derivedUsingPinnedDispatcher=dict(preview=after["preview"], downloads=after["downloads"],
                                         downloadCount=after["downloadCount"], effect=effect),
    )


if __name__ == "__main__":
    folder = Path(sys.argv[1])
    raw = (folder / "fixtures.json").read_bytes()
    assert hashlib.sha256(raw).hexdigest() == FILES["fixtures.json"]
    fixture = json.loads(raw)
    print(json.dumps(dict(traces=verify_traces(fixture), compositionGap=composition_gap(fixture),
                          productChecks="NOT_RUN"), indent=2))
