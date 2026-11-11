"""Check fixed documentation literals without importing the author's verifier or product."""

from collections import Counter
from copy import deepcopy
from hashlib import sha256
import json
from pathlib import Path
import re
import sys

from oracle import assignment_rows, csv_bytes, exhaustive_assignment, roster_bytes


SOURCES = ("workshops", "preferences")
HEADERS = {
    "workshops": ("workshop_id", "title", "capacity"),
    "preferences": ("participant_id", "pref1", "pref2", "pref3"),
}
ROW_LIMITS = {"workshops": 30, "preferences": 500}
BYTE_LIMIT = 131072
ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,31}")
SURROGATE = re.compile(r"[\ud800-\udfff]")
ECMA_WHITESPACE = re.compile(r"[ \u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]+")
MIME = "text/csv;charset=utf-8"


def error(source, code, record=None, column=None):
    return dict(source=source, code=code, record=record, column=column)


class Invalid(ValueError):
    def __init__(self, source, code, record=None, column=None):
        self.error = error(source, code, record, column)
        super().__init__(str(self.error))


def decoded_envelope(source, envelope):
    kind = envelope.get("kind")
    if kind == "text" and set(envelope) == {"kind", "text"} and isinstance(envelope["text"], str):
        text = envelope["text"]
        if len(text.encode("utf-16-le", "surrogatepass")) // 2 > BYTE_LIMIT:
            raise Invalid(source, "INPUT_TOO_LARGE")
        size = len(SURROGATE.sub("\ufffd", text).encode("utf-8"))
        if size > BYTE_LIMIT:
            raise Invalid(source, "INPUT_TOO_LARGE")
        return text, None
    if kind != "bytes" or set(envelope) != {"kind", "hex"} or not isinstance(envelope["hex"], str):
        raise Invalid(source, "SOURCE_SCHEMA")
    raw = bytes.fromhex(envelope["hex"])
    if len(raw) > BYTE_LIMIT:
        raise Invalid(source, "INPUT_TOO_LARGE")
    try:
        return raw.decode("utf-8"), None
    except UnicodeDecodeError as err:
        return raw[:err.start].decode("utf-8"), "INVALID_UTF8"


def csv_records(source, envelope):
    text, end_fault = decoded_envelope(source, envelope)
    position = int(text.startswith("\ufeff"))
    records = []
    width = len(HEADERS[source])

    def token(index, record, column):
        if index == len(text) and end_fault:
            raise Invalid(source, end_fault, record, column)
        if index >= len(text):
            return ""
        value = text[index]
        codepoint = ord(value)
        if value == "\ufeff":
            raise Invalid(source, "UNEXPECTED_BOM", record, column)
        if 0xd800 <= codepoint <= 0xdfff:
            raise Invalid(source, "INVALID_UNICODE", record, column)
        if (codepoint < 0x20 and value not in "\r\n") or 0x7f <= codepoint <= 0x9f or value in "\u2028\u2029":
            raise Invalid(source, "CONTROL_CHARACTER", record, column)
        return value

    while position < len(text) or end_fault:
        record = len(records) + 1
        if record > ROW_LIMITS[source] + 1:
            raise Invalid(source, "ROW_LIMIT", record, 1)
        fields = []
        while True:
            column = len(fields) + 1
            first = token(position, record, column)
            if first == '"':
                value = []
                position += 1
                while True:
                    current = token(position, record, column)
                    if not current:
                        raise Invalid(source, "CSV_SYNTAX", record, column)
                    if current in "\r\n":
                        raise Invalid(source, "CONTROL_CHARACTER", record, column)
                    position += 1
                    if current == '"':
                        if text[position:position + 1] != '"':
                            break
                        position += 1
                    value.append(current)
                separator = token(position, record, column)
                if separator and separator not in ",\r\n":
                    raise Invalid(source, "CSV_SYNTAX", record, column)
                fields.append("".join(value))
            else:
                start = position
                separator = first
                while separator and separator not in ",\r\n":
                    if separator == '"':
                        raise Invalid(source, "CSV_SYNTAX", record, column)
                    position += 1
                    separator = token(position, record, column)
                fields.append(text[start:position])
            if separator == ",":
                if column == width:
                    raise Invalid(source, "COLUMN_COUNT", record, width + 1)
                position += 1
                continue
            if separator == "\r":
                if token(position + 1, record, column) != "\n":
                    raise Invalid(source, "CSV_SYNTAX", record, column)
                position += 2
            elif separator == "\n":
                position += 1
            if len(fields) < width:
                raise Invalid(source, "COLUMN_COUNT", record, len(fields) + 1)
            break
        if record == 1:
            for column, (observed, required) in enumerate(zip(fields, HEADERS[source], strict=True), 1):
                if observed != required:
                    raise Invalid(source, "HEADER_MISMATCH", 1, column)
        records.append(fields)
    if not records:
        raise Invalid(source, "SOURCE_EMPTY", 1, 1)
    if len(records) == 1:
        raise Invalid(source, "DATA_ROWS_REQUIRED", 2, 1)
    return records[1:]


def checked_table(source, envelope, known_workshops=None):
    records = csv_records(source, envelope)
    identifiers = set()
    checked = []
    for record, (identifier, *fields) in enumerate(records, 2):
        if not ID.fullmatch(identifier):
            raise Invalid(source, "ID_FORMAT", record, 1)
        if identifier in identifiers:
            raise Invalid(source, "DUPLICATE_ID", record, 1)
        identifiers.add(identifier)
        if source == "workshops":
            title, capacity = fields
            if not 1 <= len(title) <= 80:
                raise Invalid(source, "TITLE_LENGTH", record, 2)
            if ECMA_WHITESPACE.fullmatch(title):
                raise Invalid(source, "TITLE_BLANK", record, 2)
            if not re.fullmatch(r"[1-9][0-9]*", capacity):
                raise Invalid(source, "CAPACITY_FORMAT", record, 3)
            if len(capacity) > 3 or int(capacity) > 500:
                raise Invalid(source, "CAPACITY_RANGE", record, 3)
            checked.append((identifier, title, int(capacity)))
        else:
            found_gap = False
            preferences = []
            for column, choice in enumerate(fields, 2):
                if not choice:
                    found_gap = True
                    continue
                if found_gap:
                    raise Invalid(source, "PREFERENCE_GAP", record, column)
                if not ID.fullmatch(choice):
                    raise Invalid(source, "ID_FORMAT", record, column)
                if choice in preferences:
                    raise Invalid(source, "DUPLICATE_PREFERENCE", record, column)
                if known_workshops is not None and choice not in known_workshops:
                    raise Invalid(source, "UNKNOWN_WORKSHOP", record, column)
                preferences.append(choice)
            checked.append((identifier, tuple(preferences)))
    return checked


def allocate(workshops, people):
    rooms = [(identifier, capacity) for identifier, _, capacity in workshops]
    if len(people) > 9:
        # The only large fixture has a single room, one choice and one seat per person.
        assert len(rooms) == 1 and rooms[0][1] == len(people)
        assert all(choices == (rooms[0][0],) for _, choices in people)
        rows = [(identifier, rooms[0][0], "assigned", "1") for identifier, _ in people]
        maximum = len(people)
    else:
        ranks, identifiers, maximum = exhaustive_assignment(rooms, people)
        rows = assignment_rows(people, ranks, identifiers)
    assigned = Counter(workshop for _, workshop, status, _ in rows if status == "assigned")
    statuses = Counter(status for _, _, status, _ in rows)
    capacity = sum(count for _, count in rooms)
    assert sum(statuses.values()) == len(people)
    assert statuses["assigned"] == sum(assigned.values())
    result = {
        "totals": dict(participants=len(people), assigned=statuses["assigned"],
            choicesFull=statuses["choices_full"], noPreference=statuses["no_preference"],
            capacity=capacity, remaining=capacity - statuses["assigned"]),
        "workshops": [
            dict(workshopId=identifier, title=title, capacity=count,
                assigned=assigned[identifier], remaining=count - assigned[identifier])
            for identifier, title, count in workshops
        ],
        "rows": [
            dict(participantId=identifier, workshopId=workshop or None, status=status,
                preferenceRank=int(rank) if rank else None)
            for identifier, workshop, status, rank in rows
        ],
    }
    assert all(room["remaining"] >= 0 for room in result["workshops"])
    return result, rows, maximum


def artifact(filename, raw):
    return dict(filename=filename, mime=MIME, text=raw.decode("ascii"))


def batch(rows):
    return artifact("workshop-assignments.csv", csv_bytes(rows))


def roster(rows, workshops, selected):
    order = next(index for index, row in enumerate(workshops, 1) if row[0] == selected)
    return artifact(f"workshop-{order:02d}-roster.csv", roster_bytes(rows, selected))


def run_pair(inputs):
    workshops = checked_table("workshops", inputs["workshops"])
    people = checked_table("preferences", inputs["preferences"], {row[0] for row in workshops})
    return workshops, people


def core_case(case):
    try:
        workshops, people = run_pair(case["input"])
    except Invalid as invalid:
        return dict(ok=False, error=invalid.error, downloads=[]), {}
    result, rows, maximum = allocate(workshops, people)
    downloads = [batch(rows), *(roster(rows, workshops, workshop[0]) for workshop in workshops)]
    observed = dict(ok=True, result=result, downloads=downloads)
    witness = dict(maxFeasibleAssigned=maximum, files=[
        dict(filename=item["filename"], bytes=len(item["text"]), sha256=sha256(item["text"].encode()).hexdigest())
        for item in downloads
    ])
    return observed, witness


def generated(form):
    kind = form["form"]
    if kind == "literal":
        return form["text"]
    if kind == "repeat":
        return form["prefix"] + form["unit"] * form["count"] + form["suffix"]
    assert kind == "numbered"
    rows = (form["pattern"].replace("{n}", f"{value:0{form['width']}d}")
        for value in range(form["first"], form["last"] + 1))
    return "\n".join([form["header"], *rows])


def boundary_case(case):
    raw = {key: generated(value) for key, value in case["input"].items()}
    wanted = case["expected"]
    inputs = {key: dict(kind="text", text=value) for key, value in raw.items()}
    try:
        workshops, people = run_pair(inputs)
    except Invalid as invalid:
        observed = dict(ok=False, error=invalid.error, downloads=[])
    else:
        result, rows, _ = allocate(workshops, people)
        observed = dict(ok=True, totals=result["totals"], workshopCount=len(workshops),
            firstRow=result["rows"][0], lastRow=result["rows"][-1])
        extra = {
            "lastRoster": lambda: roster(rows, workshops, workshops[-1][0]),
            "batchLineCount": lambda: len(csv_bytes(rows).split(b"\r\n")),
            "rosterLineCount": lambda: len(roster_bytes(rows, workshops[0][0]).split(b"\r\n")),
            "titleCodePoints": lambda: len(workshops[0][1]),
            "titleUtf16Units": lambda: len(workshops[0][1].encode("utf-16-le")) // 2,
        }
        observed.update({key: compute() for key, compute in extra.items() if key in wanted})
    if "workshopsBytes" in wanted:
        observed["workshopsBytes"] = len(raw["workshops"].encode("utf-8"))
    return observed


class ControllerOracle:
    """Declarative event replay for the documented snapshots and fake effects."""

    def __init__(self, example):
        self.example = example
        self.revision = 0
        self.sources = {source: self.draft(0) for source in SOURCES}
        self.allocated = None
        self.selected = None
        self.urls = {}
        self.url_number = 0
        self.needs_reallocation = False
        self.export_error = None

    @staticmethod
    def draft(generation):
        return dict(generation=generation, origin="empty", text="", reading=False, issue=None)

    def validate_drafts(self):
        if any(src["reading"] or src["issue"] for src in self.sources.values()):
            return None, None, None
        valid = {}
        for source, src in self.sources.items():
            if not src["text"]:  # Literal nonempty-draft rule in §implementation.
                continue
            known = {row[0] for row in valid["workshops"]} if "workshops" in valid else None
            try:
                valid[source] = checked_table(source, dict(kind="text", text=src["text"]), known)
            except Invalid as invalid:
                return invalid.error, None, None
        if len(valid) == 2:
            return None, valid["workshops"], valid["preferences"]
        return None, None, None

    def snapshot(self):
        validation, workshops, people = self.validate_drafts()
        issues = [src["issue"]["code"] for src in self.sources.values() if src["issue"]]
        present = sum(bool(src["text"]) for src in self.sources.values())
        if any(src["reading"] for src in self.sources.values()):
            phase = "loading"
        elif any(code != "READ_CANCELLED" for code in issues):
            phase = "error"
        elif issues:
            phase = "cancelled"
        elif validation:
            phase = "error"
        elif present < 2:
            phase = "partial" if present else "empty"
        elif self.allocated:
            phase = "complete"
        else:
            phase = "dirty" if self.needs_reallocation else "ready"
        return dict(
            revision=self.revision, phase=phase, sources=deepcopy(self.sources), validation=validation,
            preview=dict(workshopCount=len(workshops), participantCount=len(people)) if workshops is not None else None,
            result=deepcopy(self.allocated[0]["totals"]) if self.allocated else None, selected=self.selected,
            downloads=dict(batch=bool(self.allocated), roster=bool(self.allocated) and self.selected != "@unassigned"),
            activeExports=list(self.urls), needsReallocation=self.needs_reallocation, exportError=self.export_error,
        )

    def invalidate(self, affected, effects):
        self.revision += 1
        self.needs_reallocation |= self.allocated is not None
        self.allocated = self.selected = self.export_error = None
        effects.extend(dict(type="revoke", url=url) for url in self.urls.values())
        self.urls.clear()
        for source in affected:
            src = self.sources[source]
            previous_generation = src["generation"]
            src["generation"] += 1
            if src["reading"]:
                src["reading"] = False
                effects.append(dict(type="abort", source=source, generation=previous_generation))

    def export(self, event, effects):
        kind = event["kind"]
        if not self.allocated or (kind == "roster" and self.selected == "@unassigned"):
            return
        _, rows, workshops = self.allocated
        item = batch(rows) if kind == "batch" else roster(rows, workshops, self.selected)
        filename = item["filename"]
        url = self.urls.get(filename)
        if not url:
            self.url_number += 1
            url = f"blob:fixture/{self.url_number}"
            self.urls[filename] = url
            effects.append(dict(type="createURL", artifact=item, url=url))
        attempt = dict(type="download", url=url, filename=filename)
        effects.append(attempt)
        if event.get("fixtureThrow") == "download":
            attempt["throws"] = True
            effects.append(dict(type="revoke", url=self.urls.pop(filename)))
            self.export_error = "DOWNLOAD_FAILED"
        else:
            self.export_error = None

    def step(self, event):
        effects = []
        kind = event["type"]
        source = event.get("source")
        src = self.sources.get(source)
        if kind == "INIT":
            pass
        elif kind in {"RESET", "LEAVE", "RESTORE", "EXAMPLE"}:
            self.invalidate(SOURCES, effects)
            if kind == "EXAMPLE":
                for source, src in self.sources.items():
                    src.update(text=self.example[source], origin="paste", issue=None)
            else:
                self.needs_reallocation = False
                self.sources = {name: self.draft(previous["generation"]) for name, previous in self.sources.items()}
        elif kind == "EDIT":
            self.invalidate((source,), effects)
            src.update(text=event["text"], origin="paste" if event["text"] else "empty", issue=None)
        elif kind == "READ":
            self.invalidate((source,), effects)
            src["issue"] = None
            if event["size"] > BYTE_LIMIT:
                src["issue"] = error(source, "INPUT_TOO_LARGE")
            else:
                src["reading"] = True
                effects.append(dict(type="read", source=source, generation=src["generation"]))
        elif kind in {"LOAD", "READ_ERROR"}:
            if src["reading"] and event["generation"] == src["generation"]:
                src["reading"] = False
                if kind == "READ_ERROR":
                    src["issue"] = error(source, "READ_FAILED")
                else:
                    envelope = dict(kind="bytes", hex=event["hex"])
                    try:
                        value, fault = decoded_envelope(source, envelope)
                        if fault:
                            csv_records(source, envelope)
                            raise AssertionError("Fault should have been surfaced")
                    except Invalid as invalid:
                        src["issue"] = invalid.error
                    else:
                        src.update(text=value, origin="file", issue=None)
        elif kind == "CANCEL":
            if src["reading"]:
                self.invalidate((source,), effects)
                src["issue"] = error(source, "READ_CANCELLED")
        elif kind == "RETAIN":
            if not src["reading"] and src["issue"]:
                self.invalidate((source,), effects)
                src["issue"] = None
        elif kind == "ALLOCATE":
            if self.snapshot()["phase"] in {"ready", "dirty"}:
                _, workshops, people = self.validate_drafts()
                result, rows, _ = allocate(workshops, people)
                self.allocated = result, rows, workshops
                self.selected = workshops[0][0]
                self.needs_reallocation = False
                self.export_error = None
        elif kind == "SELECT":
            if self.allocated:
                result, _, _ = self.allocated
                valid_views = {room["workshopId"] for room in result["workshops"]} | {"@unassigned"}
                if event["view"] in valid_views:
                    self.selected = event["view"]
                    self.export_error = None
        elif kind == "EXPORT":
            self.export(event, effects)
        else:
            raise AssertionError(kind)
        return dict(snapshot=self.snapshot(), effects=effects)


def document_probe(example):
    """Apply both clauses to an empty selected file, rather than an empty paste."""
    controller = ControllerOracle(example)
    events = [
        dict(type="EDIT", source="workshops", text="workshop_id,title,capacity\nA,Workshop,1"),
        dict(type="READ", source="preferences", size=0),
        dict(type="LOAD", source="preferences", generation=1, hex=""),
    ]
    snapshots = [controller.step(event) for event in events]
    observed = snapshots[-1]["snapshot"]
    assert observed["sources"]["preferences"]["origin"] == "file"
    assert observed["phase"] == "partial" and observed["validation"] is None
    try:
        checked_table("preferences", dict(kind="bytes", hex=""), {"A"})
    except Invalid as invalid:
        required = invalid.error
    else:
        raise AssertionError("An empty imported source should fail validation")
    return dict(
        id="controller-empty-selected-file",
        events=events,
        observedUnderNonemptyDraftRule=observed,
        requiredBySourceErrorContract=dict(phase="error", validation=required, downloads=dict(batch=False, roster=False)),
    )


def add_comparison(rows, group, case_id, expected, observed, **extra):
    passed = observed == expected
    row = dict(group=group, id=case_id, status="PASS" if passed else "FAIL", **extra)
    if not passed:
        row.update(expected=expected, observed=observed)
    elif group != "controller":
        row["observed"] = observed
    rows.append(row)


def main(filename):
    raw = Path(filename).read_bytes()
    data = json.loads(raw)
    rows = []
    for case in data["coreCases"]:
        observed, witness = core_case(case)
        add_comparison(rows, "core", case["id"], case["expected"], observed, **witness)
    for case in data["generatedBoundaries"]:
        observed = boundary_case(case)
        add_comparison(rows, "boundary", case["id"], case["expected"], observed)
    example = next(case["input"] for case in data["coreCases"] if case["id"] == "standard")
    example = {source: envelope["text"] for source, envelope in example.items()}
    for case in data["controllerCases"]:
        controller = ControllerOracle(example)
        for index, step in enumerate(case["steps"], 1):
            observed = controller.step(step["event"])
            add_comparison(rows, "controller", case["id"], step["expected"], observed,
                step=index, event=step["event"]["type"], phase=observed["snapshot"]["phase"])
    summary = {
        group: dict(passed=sum(row["group"] == group and row["status"] == "PASS" for row in rows),
            total=sum(row["group"] == group for row in rows))
        for group in ("core", "boundary", "controller")
    }
    print(json.dumps(dict(fixtureSha256=sha256(raw).hexdigest(), summary=summary, cases=rows,
        additionalDocumentProbe=document_probe(example), productStatus="NOT_RUN"), ensure_ascii=True, indent=2))
    return int(any(row["status"] != "PASS" for row in rows))


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
