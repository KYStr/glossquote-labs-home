"""Recalculate the pinned CSV specification fixtures without executing author code."""

import argparse
from copy import deepcopy
import csv
from hashlib import sha256
import io
import json
from math import ceil
from pathlib import Path
import re

from oracle import MAX_CELL, MAX_COLS, MAX_DATA, MAX_INPUT, MAX_OUTPUT, MAX_ROWS, risk, utf16_count, validate_header

NAMES = ("rawCsv", "protectedCsv", "originalJson")
OPTIONS = {"roles": [], "attributeName": "attribute", "valueName": "value", "skipEmpty": False}
PRODUCT_ASPECTS = ["functionality", "boundaries", "privacy", "security", "usability",
                   "accessibility", "localization-seo", "toolchain-provenance", "compatibility"]
DOCUMENT_ASPECTS = ["goal", "scope", "userFlow", "inputsOutputs", "implementation", "acceptance", "tests", "handoff"]


def error(code, record=None, column=None, field=None):
    return {"ok": False, "error": {"code": code, "record": record, "column": column, "field": field}}


def control(ch):
    return ord(ch) < 32 and ch not in "\t\r\n"


def valid_name(text):
    return validate_header(text) and not any(control(ch) or 0xD800 <= ord(ch) <= 0xDFFF for ch in text)


def source_bytes(text, kind="text"):
    if kind == "file":
        return {"kind": "file", "hex": text.encode().hex()}
    return {"kind": "text", "text": text}


def parse_source(source):
    if not isinstance(source, dict):
        return error("SOURCE_SCHEMA")
    if source.get("kind") == "text" and set(source) == {"kind", "text"} and type(source["text"]) is str:
        text = source["text"]
        if utf16_count(text) > MAX_INPUT:
            return error("INPUT_BYTES")
        try:
            if len(text.encode()) > MAX_INPUT:
                return error("INPUT_BYTES")
        except UnicodeEncodeError:
            return error("INVALID_UNICODE")
    elif (source.get("kind") == "file" and set(source) == {"kind", "hex"}
          and type(source["hex"]) is str and re.fullmatch(r"(?:[a-f0-9]{2})*", source["hex"])):
        if len(source["hex"]) > 2 * MAX_INPUT:
            return error("INPUT_BYTES")
        try:
            text = bytes.fromhex(source["hex"]).decode("utf-8", "strict")
        except UnicodeDecodeError:
            return error("INVALID_UTF8")
    else:
        return error("SOURCE_SCHEMA")
    if text.startswith("\ufeff\ufeff"):
        return error("DUPLICATE_BOM", 1, 1)
    text = text.removeprefix("\ufeff")
    if not text:
        return error("EMPTY_SOURCE", 1, 1)

    # Coordinate-aware validation is by field. After validation, values are
    # obtained with Python's independent stdlib CSV decoder and cross-checked
    # against those accumulated by this scanner, including raw quoted CR/LF.
    checked_rows = []
    cell_count = 0
    cursor = 0
    while cursor < len(text):
        row = []
        record = len(checked_rows) + 1
        while True:
            column = len(row) + 1
            units = 0
            chars = []
            quoted_field = cursor < len(text) and text[cursor] == '"'
            cursor += int(quoted_field)
            close_seen = False
            while cursor < len(text):
                ch = text[cursor]
                if control(ch):
                    return error("CONTROL_CHAR", record, column)
                in_quotes = quoted_field and not close_seen
                if not in_quotes:
                    if ch == "\r" and not text.startswith("\r\n", cursor):
                        return error("BARE_CR", record, column)
                    if ch in ",\r\n":
                        break
                    if close_seen:
                        return error("AFTER_QUOTE", record, column)
                    if ch == '"':
                        return error("QUOTE_IN_UNQUOTED", record, column)
                if in_quotes and ch == '"':
                    if text.startswith('""', cursor):
                        cursor += 1
                    else:
                        cursor += 1
                        close_seen = True
                        continue
                chars.append(ch)
                units += 1 + (ord(ch) > 0xFFFF)
                if units > MAX_CELL:
                    return error("FIELD_LIMIT", record, column)
                cursor += 1
            if quoted_field and not close_seen:
                return error("UNCLOSED_QUOTE", record, column)
            if column > MAX_COLS:
                return error("COLUMN_LIMIT", record, column)
            row.append("".join(chars))
            if cursor < len(text) and text[cursor] == ",":
                cursor += 1
                continue
            if cursor < len(text):
                cursor += 2 if text.startswith("\r\n", cursor) else 1
            break
        if record == 1:
            if len(row) < 2:
                return error("HEADER_WIDTH", 1, 2)
            seen = set()
            for column, cell in enumerate(row, 1):
                if not valid_name(cell):
                    return error("HEADER_NAME", 1, column)
                if cell in seen:
                    return error("DUPLICATE_HEADER", 1, column)
                seen.add(cell)
        else:
            expected_width = len(checked_rows[0])
            if len(row) != expected_width:
                return error("ROW_WIDTH", record, min(len(row), expected_width) + 1)
            if record > MAX_DATA + 1:
                return error("ROW_LIMIT", record)
        cell_count += len(row)
        if cell_count > 100_000:
            return error("CELL_LIMIT", record)
        checked_rows.append(row)
    decoded = list(csv.reader(io.StringIO(text, newline=""), strict=True))
    assert decoded == checked_rows
    return {"ok": True, "table": {"headers": decoded[0], "rows": decoded[1:]}}


def option_errors(headers, options):
    if (type(options) is not dict or set(options) != set(OPTIONS) or type(options["roles"]) is not list
            or type(options["attributeName"]) is not str or type(options["valueName"]) is not str
            or type(options["skipEmpty"]) is not bool):
        return error("OPTIONS_SCHEMA")
    roles = options["roles"]
    if len(roles) != len(headers):
        return error("ROLE_LENGTH", field="roles")
    for i, role in enumerate(roles, 1):
        if role not in ("keep", "expand", "omit"):
            return error("ROLE_VALUE", column=i, field="roles")
    for role, code in [("keep", "KEEP_REQUIRED"), ("expand", "EXPAND_REQUIRED")]:
        if role not in roles:
            return error(code, field="roles")
    names = {heading for heading, role in zip(headers, roles) if role == "keep"}
    for field in ("attributeName", "valueName"):
        name = options[field]
        if not valid_name(name):
            return error("OUTPUT_NAME", field=field)
        if name in names:
            return error("OUTPUT_NAME_COLLISION", field=field)
        names.add(name)
    return None


def encode_csv(matrix):
    buf = io.StringIO(newline="")
    csv.writer(buf, quoting=csv.QUOTE_ALL, lineterminator="\r\n").writerows(matrix)
    written = buf.getvalue()
    assert written.endswith("\r\n")
    return written[:-2]


def encode_json(headers, rows):
    return json.dumps({"schemaVersion": 1, "columns": headers, "rows": rows},
                      ensure_ascii=False, separators=(",", ":")) + "\n"


def file_status(text=None, unavailable=None):
    if unavailable is not None:
        return {"status": unavailable, "byteLength": None, "utf8": None}
    length = len(text.encode())
    available = length <= MAX_OUTPUT
    return {"status": "ready" if available else "too-large", "byteLength": length,
            "utf8": text if available else None}


def convert_table(table, options):
    headers, data = table["headers"], table["rows"]
    invalid = option_errors(headers, options)
    if invalid is not None:
        return invalid
    roles = options["roles"]
    keep = [c for c, role in enumerate(roles) if role == "keep"]
    expand = [c for c, role in enumerate(roles) if role == "expand"]
    names = [headers[c] for c in keep] + [options["attributeName"], options["valueName"]]
    header_origin = [(1, c + 1) for c in keep] + [(None, None)] * 2
    emitted = []
    empty = 0
    for ri, row in enumerate(data, 2):
        identifiers = [row[c] for c in keep]
        identifier_origins = [(ri, c + 1) for c in keep]
        for c in expand:
            blank = row[c] == ""
            empty += blank
            if options["skipEmpty"] and blank:
                continue
            emitted.append((identifiers + [headers[c], row[c]], (ri, c + 1),
                            identifier_origins + [(1, c + 1), (ri, c + 1)]))
    if len(emitted) > MAX_ROWS:
        return error("RESULT_ROWS")
    rows = [row for row, _, _ in emitted]
    origins = [list(position) for _, position, _ in emitted]
    counts = {"potential": len(data) * len(expand), "actual": len(rows), "emptyCells": empty,
              "skippedEmpty": empty if options["skipEmpty"] else 0,
              "omittedColumns": [i for i, role in enumerate(roles, 1) if role == "omit"]}
    positions = [header_origin] + [cells for _, _, cells in emitted]
    matrix = [names] + rows
    marks = []
    protected = []
    for ri, (row, location) in enumerate(zip(matrix, positions), 1):
        sanitized = row.copy()
        for ci, (value, (r, c)) in enumerate(zip(row, location), 1):
            if risk(value):
                marks.append({"record": ri, "column": ci, "sourceRecord": r, "sourceColumn": c})
                sanitized[ci - 1] = "'" + value
        protected.append(sanitized)
    files = {
        "rawCsv": file_status(unavailable="formula-risk") if marks else file_status(encode_csv(matrix)),
        "protectedCsv": file_status(encode_csv(protected)) if marks else file_status(unavailable="unavailable"),
        "originalJson": file_status(encode_json(names, rows)),
    }
    return {"ok": True, "result": {"columns": names, "rows": rows, "origins": origins,
                                   "counts": counts, "risk": marks, "files": files}}


def convert(source, options):
    parsed = parse_source(source)
    return convert_table(parsed["table"], options) if parsed["ok"] else parsed


def size_state(length):
    return {"status": "ready" if length <= MAX_OUTPUT else "too-large", "byteLength": length}


def calc_artifact_bound(args):
    # Inputs are ASCII and the only changes are one apostrophe per flagged
    # cell and arbitrary trailing spaces in one value. Sum lengths directly.
    total_ids = args["keepChars"]
    pad = args["padding"]
    m = 20_000
    marked = args["marked"]
    value_len = 1 + marked
    source_len = len("id" + 20 * ",x01") + total_ids + 1000 * (1 + 20 * (1 + value_len)) + pad
    csv_header = len(encode_csv([["id", "attribute", "value"]]))
    # There are eight quote/comma bytes in a data row with three plain cells.
    # CSV adds a two-byte separator per data row; JSON adds two brackets per
    # row and a comma between adjacent data rows.
    raw_len = csv_header + 20 * total_ids + m * (3 + value_len + 10) + pad
    json_base = len(encode_json(["id", "attribute", "value"], []))
    json_len = json_base + 20 * total_ids + m * (3 + value_len + 10) + pad + m - 1
    marks = 2 * m if marked else 0
    return {"ok": True, "inputBytes": source_len, "rows": m, "riskCount": marks,
            "files": {"rawCsv": {"status": "formula-risk", "byteLength": None} if marked else size_state(raw_len),
                      "protectedCsv": size_state(raw_len + marks) if marked else {"status": "unavailable", "byteLength": None},
                      "originalJson": size_state(json_len)}}


def size_source(target, multi=False):
    header = "éid,x" if multi else "id,x"
    additional = target - len(header.encode())
    record_count = ceil(additional / (MAX_CELL + 3))
    base, extra = divmod(additional - 3 * record_count, record_count)
    return header + "".join("\na," + "v" * (base + (i < extra)) for i in range(record_count))


def verify_bound(item):
    recipe, args = item["recipe"], item["args"]
    if recipe == "artifact-bytes":
        return calc_artifact_bound(args)
    if recipe == "expanded-rows":
        n, e = args["rows"], args["expand"]
        potential = n * e
        empty = e if args["lastEmpty"] else 0
        skipped = empty if args["skipEmpty"] else 0
        actual = potential - skipped
        if actual > MAX_ROWS:
            return error("RESULT_ROWS")
        return {"ok": True, "counts": {"potential": potential, "actual": actual, "emptyCells": empty,
                "skippedEmpty": skipped, "omittedColumns": []}, "firstOrigin": [2, 2],
                "lastOrigin": [n + 1 - bool(skipped), e + 1]}
    if recipe in {"ascii-source-bytes", "utf8-header-source-bytes"}:
        text = size_source(args["targetBytes"], recipe == "utf8-header-source-bytes")
        assert len(text.encode()) == args["targetBytes"]
        source = source_bytes(text, args.get("kind", "text"))
    elif recipe == "header-codepoints":
        source = source_bytes("🙂" * args["count"] + ",x")
    elif recipe == "field-units":
        n, remainder = divmod(args["count"], 2)
        source = source_bytes("id,x\n001," + "🙂" * n + "a" * remainder)
    elif recipe == "rectangle":
        cols, rows = args["columns"], args["rows"]
        header = ",".join(f"col{i}" for i in range(cols))
        record = ",".join(["a"] * cols)
        source = source_bytes("\n".join([header, *([record] * rows)]))
        if args.get("shortLast"):
            source["text"] = source["text"].rsplit("\n", 1)[0] + "\na"
    else:
        raise ValueError(recipe)
    parsed = parse_source(source)
    if not parsed["ok"]:
        return parsed
    table = parsed["table"]
    shape = {"ok": True, "rows": len(table["rows"]), "columns": len(table["headers"])}
    if recipe == "ascii-source-bytes":
        shape["bytes"] = len(text.encode())
    if recipe == "header-codepoints":
        shape["firstHeaderCodePoints"] = len(table["headers"][0])
    if recipe == "field-units":
        shape["firstDataValueUnits"] = utf16_count(table["rows"][0][1])
    if recipe == "rectangle" and args["columns"] == 48 and args["rows"] == 2000:
        shape["totalCells"] = (shape["rows"] + 1) * shape["columns"]
    return shape


def trace(steps, computed_cases):
    def fresh(run, version):
        return {"phase": "empty", "source": "none", "sourceVersion": version, "run": run,
                "headers": [], "dataRows": None, "options": deepcopy(OPTIONS),
                "pending": None, "error": None, "page": None, "review": False, "result": None}

    state = fresh(0, 0)
    current_source, parsed_table, current_result = None, None, None
    stale = effects = 0
    output = []
    for step in steps:
        event = step["event"]
        action = event["type"]
        writes = []
        run, version = state["run"], state["sourceVersion"]
        reset = action in {"RESET", "PAGEHIDE"} or (action == "PAGESHOW" and event["persisted"] and state["phase"] != "empty")
        if reset:
            state = fresh(run + 1, version + 1)
            current_source, parsed_table, current_result = None, None, None
        elif action == "EDIT_SOURCE":
            current_source = event["source"]
            kind = current_source["kind"]
            state = fresh(run + 1, version + 1) | {"source": kind, "phase": "source-dirty" if kind != "none" else "empty"}
            parsed_table, current_result = None, None
        elif action == "READ" and state["source"] != "none" and state["pending"] is None:
            state = fresh(run + 1, version) | {"source": state["source"], "phase": "reading",
                     "pending": {"kind": "read", "sourceVersion": version, "run": run + 1}}
            parsed_table, current_result = None, None
        elif action == "EDIT_OPTIONS" and parsed_table is not None:
            updated = state["options"] | event["patch"]
            if updated != state["options"]:
                state.update(options=updated, phase="loaded", run=run + 1, pending=None,
                             error=None, page=None, review=False, result=None)
                current_result = None
        elif action == "PREVIEW" and parsed_table is not None and state["pending"] is None:
            state.update(phase="converting", run=run + 1, page=None, review=False, result=None, error=None,
                         pending={"kind": "preview", "sourceVersion": version, "run": run + 1})
            current_result = None
        elif action == "CANCEL" and state["pending"] is not None:
            state.update(phase="canceled", run=run + 1, pending=None, page=None,
                         review=False, result=None, error=None)
            current_result = None
        elif action == "DELIVER":
            key = {name: event[name] for name in ("kind", "sourceVersion", "run")}
            if key != state["pending"]:
                stale += 1
            else:
                body = event["payload"]
                if "caseId" in body:
                    payload = computed_cases[body["caseId"]]
                    assert payload == convert_table(parsed_table, state["options"]), body["caseId"]
                else:
                    payload = body
                    if event["kind"] == "read" and (body["ok"] or body["error"]["code"] != "FILE_READ"):
                        assert payload == parse_source(current_source)
                state["pending"] = None
                if not payload["ok"]:
                    state.update(phase="error", error=payload["error"], result=None, review=False, page=None)
                    current_result = None
                elif event["kind"] == "read":
                    parsed_table = payload["table"]
                    names = parsed_table["headers"]
                    state.update(phase="loaded", headers=names, dataRows=len(parsed_table["rows"]),
                                 options=OPTIONS | {"roles": ["omit"] * len(names)})
                else:
                    current_result = payload["result"]
                    summary = {"counts": current_result["counts"], "riskCount": len(current_result["risk"]),
                               "files": {name: {k: value[k] for k in ("status", "byteLength")}
                                         for name, value in current_result["files"].items()}}
                    state.update(phase="result", result=summary, page=1)
        elif action == "PAGE" and current_result is not None:
            page = event["page"]
            if type(page) is int and 1 <= page <= max(1, ceil(current_result["counts"]["actual"] / 25)):
                state["page"] = page
        elif action == "OPEN_PROTECTION" and current_result is not None:
            state["review"] = current_result["files"]["protectedCsv"]["status"] == "ready"
        elif action == "CLOSE_PROTECTION":
            state["review"] = False
        elif action == "DOWNLOAD" and current_result is not None:
            name = event["file"]
            file = current_result["files"][name]
            if file["status"] == "ready" and (name != "protectedCsv" or state["review"]):
                filename = dict(zip(NAMES, ("unpivot.csv", "unpivot-protected.csv", "unpivot-original.json")))[name]
                mime = "application/json;charset=utf-8" if name == "originalJson" else "text/csv;charset=utf-8"
                writes.append({"kind": "download", "filename": filename, "mime": mime, "utf8": file["utf8"]})
                effects += 1
                if name == "protectedCsv":
                    state["review"] = False
        downloads = {
            name: bool(current_result and current_result["files"][name]["status"] == "ready"
                       and (name != "protectedCsv" or state["review"])) for name in NAMES
        }
        output.append((deepcopy(state | {"downloads": downloads}), writes))
    return output, {"stale": stale, "effects": effects}


def check(actual, expected, label, failures):
    if actual != expected:
        failures.append({"id": label, "observed": actual, "expected": expected})


def compound_errors(failures):
    cases = [
        ("c0-on-full-field", source_bytes("id,x\n001," + "a" * MAX_CELL + "\0"),
         error("CONTROL_CHAR", 2, 2)),
        ("overlong-field-before-later-c0", source_bytes("id,x\n001," + "a" * (MAX_CELL + 1) + "\0"),
         error("FIELD_LIMIT", 2, 2)),
        ("syntax-in-field49-before-column-limit",
         source_bytes(",".join(f"h{i}" for i in range(48)) + ',a"'), error("QUOTE_IN_UNQUOTED", 1, 49)),
        ("raw-utf8-before-earlier-ragged-row",
         {"kind": "file", "hex": (b"id,x\n001\n002,\xed\xa0\x80").hex()}, error("INVALID_UTF8")),
        ("earlier-closed-ragged-row-before-later-c0",
         source_bytes("id,x\n001\n002,\0"), error("ROW_WIDTH", 2, 2)),
        ("escaped-pair-at-eof-remains-unclosed", source_bytes('id,x\n001,"a""'),
         error("UNCLOSED_QUOTE", 2, 2)),
    ]
    result = []
    for label, source, expected in cases:
        observed = parse_source(source)
        check(observed, expected, label, failures)
        if "text" in source and len(source["text"]) > 500:
            text = source["text"]
            source = {"kind": "text", "recipe": "id,x\\n001, followed by repeated a and U+0000",
                      "aCount": text.count("a")}
        result.append({"id": label, "input": source, "expected": expected, "observed": observed})
    return result


def verify(folder):
    names = ["AUTHOR-CHECK.md", "BRIEF.md", "SPEC.md", "fixtures.json"]
    assert sorted(file.name for file in folder.iterdir()) == names
    files = {name: (folder / name).read_bytes() for name in names}
    texts = {name: data.decode("utf-8") for name, data in files.items()}
    assert all(not data.startswith(b"\xef\xbb\xbf") and b"\r" not in data and data.endswith(b"\n")
               for data in files.values())
    for name in names[:3]:
        assert all(target.startswith(("https://", "#")) or target in names
                   for target in re.findall(r"\]\(([^)\s]+)\)", texts[name]))
    spec = texts["SPEC.md"]
    assert re.findall(r"^## (\w+)$", spec, flags=re.M) == DOCUMENT_ASPECTS
    assert re.findall(r"^\| `([a-z-]+)` \|", spec.split("## acceptance\n", 1)[1].split("## tests", 1)[0],
                      flags=re.M) == PRODUCT_ASPECTS
    fixture = json.loads(texts["fixtures.json"])
    assert fixture["schemaVersion"] == 1
    failures, parsed, conversions, bounds, risk_checks, traces = [], {}, {}, {}, {}, {}
    for item in fixture["parse"]:
        value = parse_source(item["source"])
        check(value, item["expected"], item["id"], failures)
        parsed[item["id"]] = value
    for item in fixture["conversions"]:
        value = convert(item["source"], item["options"])
        check(value, item["expected"], item["id"], failures)
        conversions[item["id"]] = value
    for i, item in enumerate(fixture["predicate"]):
        flagged = risk(item["value"])
        actual = {"risky": flagged, "protected": "'" + item["value"] if flagged else item["value"]}
        check(actual, {key: item[key] for key in actual}, f"predicate/{i}", failures)
        risk_checks[str(i)] = {"value": item["value"], **actual}
    for item in fixture["bounds"]:
        value = verify_bound(item)
        check(value, item["expected"], item["id"], failures)
        bounds[item["id"]] = value
    for item in fixture["controller"]:
        observed, totals = trace(item["steps"], conversions)
        for i, (step, (snapshot, writes)) in enumerate(zip(item["steps"], observed), 1):
            check(snapshot, step["expected"], f"{item['id']}/{i}/snapshot", failures)
            check(writes, step["effects"], f"{item['id']}/{i}/effects", failures)
        traces[item["id"]] = {"steps": len(observed), **totals}
    compound = compound_errors(failures)
    marks = conversions["formula-risk"]["result"]["risk"]
    offset = (marks[0]["record"] - 1) * 3 + marks[0]["column"] - 1
    assert offset == 5
    bits = 1 << (offset % 8)
    assert bits == 0x20
    summary = {"parse": len(parsed), "conversions": len(conversions), "predicate": len(risk_checks),
               "bounds": len(bounds), "controller": len(traces), "steps": sum(x["steps"] for x in traces.values()),
               "stale": sum(x["stale"] for x in traces.values()), "effects": sum(x["effects"] for x in traces.values()),
               "compoundErrorProbes": len(compound),
               "relativeLinks": sum(sum(not target.startswith(("https://", "#")) for target in
                   re.findall(r"\]\(([^)\s]+)\)", texts[name])) for name in names[:3])}
    return {"status": "FAIL" if failures else "PASS", "summary": summary,
            "files": {name: {"bytes": len(data), "sha256": sha256(data).hexdigest()} for name, data in files.items()},
            "failures": failures, "parse": parsed, "conversions": conversions,
            "predicate": risk_checks, "bounds": bounds, "controller": traces,
            "compoundErrorProbes": compound,
            "riskBitsetProbe": {"fixture": "formula-risk", "width": 3, "offset": offset, "byteHex": f"{bits:02x}"},
            "product": "NOT_RUN"}


if __name__ == "__main__":
    args = argparse.ArgumentParser()
    args.add_argument("fixed", type=Path)
    args.add_argument("output", type=Path)
    options = args.parse_args()
    result = verify(options.fixed)
    options.output.write_text(json.dumps(result, indent=2, ensure_ascii=True) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": result["status"], **result["summary"],
                      "failures": [item["id"] for item in result["failures"]]}))
    raise SystemExit(result["status"] != "PASS")
