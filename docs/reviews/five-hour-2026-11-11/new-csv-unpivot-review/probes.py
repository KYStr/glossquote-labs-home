"""Reviewer-authored literal edge probes, derived from the fixed research brief."""

import argparse
import csv
import io
import json
from pathlib import Path

from oracle import (
    BOM, MAX_INPUT, MAX_OUTPUT, Invalid, csv_bytes, digest, flatten, json_bytes, parse, risk,
)


def independent_lexical_crosscheck(text, expected):
    # Python's CSV dialect accepts some constructs the brief excludes.
    # Use it to cross-check successful records, then use the explicit grammar
    # in oracle.py for strict syntax, coordinates, and blank-row rules.
    observed = list(csv.reader(io.StringIO(text, newline=""), strict=True))
    assert observed == expected


def cancellation_probe():
    # A compact event oracle models the commitment boundary. A delivery must
    # carry the exact active capability, including the operation kind.
    serial = 0
    current_job = None
    columns = None
    current_result = None
    roles = None
    approved = False

    def invalidate(source_changed=False):
        nonlocal current_job, columns, current_result, roles, approved
        current_job, current_result, approved = None, None, False
        if source_changed:
            columns, roles = None, None

    def begin(kind):
        nonlocal serial, current_job
        invalidate(source_changed=kind == "parse")
        serial += 1
        current_job = (serial, kind)
        return current_job

    def deliver(job, result):
        nonlocal current_job, columns, current_result
        if job != current_job:
            return False
        current_job = None
        if job[1] == "parse":
            columns = result
        else:
            current_result = result
        return True

    stale_parse = begin("parse")
    live_parse = begin("parse")
    assert not deliver(stale_parse, ["old", "value"])
    assert columns is None
    assert deliver(live_parse, ["id", "x", "y"])
    roles = ["keep", "expand", "omit"]
    assert deliver(begin("unpivot"), {"name": "protected CSV"})
    approved = True
    old_unpivot = begin("unpivot")
    invalidate()
    roles = ["keep", "omit", "expand"]
    new_unpivot = begin("unpivot")
    assert not deliver(old_unpivot, {"name": "old CSV"})
    assert current_result is None and approved is False
    invalidate()
    assert not deliver(new_unpivot, {"name": "cancelled CSV"})
    assert columns == ["id", "x", "y"] and roles == ["keep", "omit", "expand"]
    assert current_result is None and approved is False
    invalidate(source_changed=True)
    assert columns is None and roles is None and current_result is None
    return {"modelOnly": True, "staleParseDiscarded": True, "staleTransformDiscarded": True,
            "cancelledTransformDiscarded": True, "editAndCancelRevokeApproval": True,
            "cancelRetainsColumnsAndCurrentRoles": True, "sourceEditDropsColumns": True}


def verify():
    results = {}
    source = 'id,Apr,note,May\r\n001,"A,\r\nB",ignore,"he said ""Hi"""\r\n001,,skip,0\r\n002," ",,\r\n'
    original = ["id", "Apr", "note", "May"]
    expected_data = [["001", "A,\r\nB", "ignore", 'he said "Hi"'],
                     ["001", "", "skip", "0"], ["002", " ", "", ""]]
    table = parse(BOM + source.encode(), "file")
    assert table == (original, expected_data)
    independent_lexical_crosscheck(source, [original, *expected_data])
    unpivoted = flatten(table, ["keep", "expand", "omit", "expand"], "period", "loan", True)
    expected_rows = [["001", "Apr", "A,\r\nB"], ["001", "May", 'he said "Hi"'],
                     ["001", "May", "0"], ["002", "Apr", " "]]
    expected_csv = '"id","period","loan"\r\n"001","Apr","A,\r\nB"\r\n"001","May","he said ""Hi"""\r\n"001","May","0"\r\n"002","Apr"," "'
    assert unpivoted == {"columns": ["id", "period", "loan"], "rows": expected_rows,
                         "coordinates": [[2, 2], [2, 4], [3, 4], [4, 2]], "skipped": 2, "risk": []}
    assert csv_bytes(unpivoted) == expected_csv.encode()
    pasted = flatten(parse(source), ["keep", "expand", "omit", "expand"], "period", "loan", True)
    assert pasted["rows"][0][2] == "A,\nB"
    assert pasted["coordinates"] == unpivoted["coordinates"]
    results["bom-quotes-file-v-paste"] = {
        "input": source, "fileLeadingBOM": True, "fileExpected": unpivoted,
        "pasteFirstValue": "A,\nB", "expectedCsv": expected_csv,
        "csv": digest(csv_bytes(unpivoted)),
    }

    terminal = parse("id,w\n,")
    assert terminal == (["id", "w"], [["", ""]])
    assert flatten(terminal, ["keep", "expand"], skip=False)["rows"] == [["", "w", ""]]
    assert flatten(terminal, ["keep", "expand"], skip=True)["rows"] == []
    header = flatten(parse("id,w\r\n"), ["keep", "expand"])
    assert csv_bytes(header) == b'"id","attribute","value"'
    results["empty-cells-and-terminal-boundary"] = {"terminalData": terminal[1], "headerOnlyCsv": csv_bytes(header).decode()}

    errors = [
        ("quoted-lf-and-blank-record", b'id,w\n001,"x\ny"\n\n002,1', ("ragged", 3, 2)),
        ("short-record", b"id,w\n001\n", ("ragged", 2, 2)),
        ("extra-field", b"id,w\n001,2,", ("ragged", 2, 3)),
        ("duplicate-header", b"id,x,x\n001,2,3", ("duplicate-header", 1, 3)),
        ("text-after-quote", b'id,w\n001,"a" ', ("syntax", 2, 2)),
        ("quote-in-bare", b'id,w\n001,a"b', ("syntax", 2, 2)),
        ("unclosed-quote", b'id,w\n001,"a\nb', ("syntax", 2, 2)),
        ("bare-cr-file", b"id,w\r001,2", ("syntax", 1, 2)),
        ("nul-in-data", b"id,w\n001,a\x00b", ("control", 2, 2)),
        ("fatal-utf8", b"id,w\n001,\xed\xa0\x80", ("utf8", None, None)),
        ("fatal-overlong-utf8", b"id,w\n001,\xc0\xaf", ("utf8", None, None)),
    ]
    for label, payload, expected in errors:
        try:
            parse(payload, "file")
        except Invalid as exc:
            assert exc.args == expected, (label, exc.args, expected)
            results[label] = {"inputHex": payload.hex(), "expected": exc.receipt()}
        else:
            raise AssertionError(label)
    try:
        parse("id,w\n001,\ud800")
    except Invalid as exc:
        assert exc.code == "surrogate"
        results["lone-surrogate"] = {"inputEscaped": "id,w\\n001,\\ud800", "expected": exc.receipt()}
    else:
        raise AssertionError("lone-surrogate")

    risk_source = '" =team","＋Week",note\n001,"\u00a0=1+1","001"\n001,"\t","0"'
    unsafe = flatten(parse(risk_source), ["keep", "expand", "expand"])
    assert unsafe["risk"] == [[1, 1], [2, 2], [2, 3], [4, 2], [4, 3]]
    expected_json = '{"schemaVersion":1,"columns":[" =team","attribute","value"],"rows":[["001","＋Week","\u00a0=1+1"],["001","note","001"],["001","＋Week","\\t"],["001","note","0"]]}\n'
    expected_protected = '"\' =team","attribute","value"\r\n"001","\'＋Week","\'\u00a0=1+1"\r\n"001","note","001"\r\n"001","\'＋Week","\'\t"\r\n"001","note","0"'
    assert json_bytes(unsafe) == expected_json.encode()
    assert csv_bytes(unsafe, True) == expected_protected.encode()
    try:
        csv_bytes(unsafe)
    except Invalid as exc:
        assert exc.code == "original-risk"
    else:
        raise AssertionError("raw CSV exposed")
    risk_cases = {"": False, " ": False, "001": False, "0": False, "a=1": False, "'=1+1": False,
                  "\u200b=1+1": False, "\t": True, " \r": True, "\n": True, "\ufeff=1+1": True,
                  "\u1680+1": True, "\u200a-1": True, "\u2028@x": True, "＝1+1": True, "＠x": True}
    assert {cell: risk(cell) for cell in risk_cases} == risk_cases
    results["risk-roles-and-coordinate"] = {"input": risk_source, "positions": unsafe["risk"],
                                           "rawCsv": "suppressed", "protectedCsv": expected_protected,
                                           "originalJson": expected_json, "predicate": risk_cases}

    collision_input = "=1+1,'=1+1,w\n001,002,1"
    collision = flatten(parse(collision_input), ["keep", "keep", "expand"])
    protected_header = csv_bytes(collision, True).split(b"\r\n", 1)[0].decode()
    assert protected_header == '"\'=1+1","\'=1+1","attribute","value"'
    results["protected-header-collision"] = {"input": collision_input, "logicalHeaders": collision["columns"],
                                             "protectedHeaderByPrefixRule": protected_header}

    headers = ["id"] + [f"w{i:02d}" for i in range(20)]
    roles = ["keep"] + ["expand"] * 20
    # Header 24 bytes. Each emitted data record including CRLF costs id
    # length + 14. 20,000 * 419 + 24 + 429 * 20 + 4 = 8,388,608.
    rows = [["x" * (406 if r < 429 else 405)] + ["0"] * 20 for r in range(1000)]
    rows[0][1] = "00000"
    at_limit = flatten((headers, rows), roles)
    assert len(at_limit["rows"]) == 20_000
    assert len(csv_bytes(at_limit)) == MAX_OUTPUT
    rows[0][1] += "0"
    over = flatten((headers, rows), roles)
    assert len(csv_bytes(over)) == MAX_OUTPUT + 1
    assert len(json_bytes(over)) > MAX_OUTPUT
    rows.append(["a"] + ["0"] * 20)
    try:
        flatten((headers, rows), roles)
    except Invalid as exc:
        assert exc.code == "output-rows"
    else:
        raise AssertionError("rows exceeded")
    results["byte-and-row-bounds"] = {
        "generator": "1000 input records, 20 short expansion headers, first 429 IDs len 406 and rest len 405",
        "exactCsvBytes": MAX_OUTPUT, "oneByteOverCsv": digest(csv_bytes(over)),
        "oneByteOverJson": digest(json_bytes(over)), "extraInputRecordMakesRows": 20_020,
    }
    risky_headers = ["id"] + [f"=w{i:02d}" for i in range(20)]
    risky_rows = [["=" + "x" * 402] + ["0"] * 20 for _ in range(1000)]
    risky_result = flatten((risky_headers, risky_rows), roles)
    protected_size = len(csv_bytes(risky_result, True))
    original_json_size = len(json_bytes(risky_result))
    assert original_json_size < MAX_OUTPUT < protected_size
    results["independent-output-caps"] = {
        "generator": "1000 source records, 20 risky four-character headers, one 403-character risk-marked ID",
        "expected": "protected CSV over cap; original JSON available; raw CSV suppressed by formula-risk rule",
        "protectedCsvBytes": protected_size, "originalJsonBytes": original_json_size,
    }

    # All records and cells fit their limits. Use the available bytes of
    # padding within the first cells to hit the input cap including the BOM.
    cells = ["x" * 16378 for _ in range(64)]
    def payload():
        return BOM + ("id,w\n" + "".join("001," + cell + "\n" for cell in cells)).encode()
    needed = MAX_INPUT - len(payload())
    assert 0 < needed < len(cells)
    for i in range(needed):
        cells[i] += "x"
    exact = payload()
    assert len(exact) == MAX_INPUT and len(parse(exact, "file")[1]) == 64
    oversized = exact + b"\x80"
    try:
        parse(oversized, "file")
    except Invalid as exc:
        assert exc.args == ("size", None, None)
    else:
        raise AssertionError("1 MiB cap")
    results["input-size-before-decode"] = {
        "exactInputBytes": len(exact), "exactRows": 64, "oneByteOver": len(oversized),
        "oneByteOverAndInvalidUtf8": "size before decode", "bytesIncludeBom": True,
    }

    astral = "📦"
    assert parse("id," + astral * 120 + "\n001," + astral * 8192)[1][0][1] == astral * 8192
    for label, text, expected in [
        ("header-code-point-limit", "id," + astral * 121, ("header-name", 1, 2)),
        ("astral-cell-unit-limit", "id,w\n001," + astral * 8193, ("cell-limit", 2, 2)),
    ]:
        try:
            parse(text)
        except Invalid as exc:
            assert exc.args == expected
            results[label] = {"literalShape": "astral character repeated", "expected": exc.receipt()}
        else:
            raise AssertionError(label)
    results["cancel-and-source-generation"] = cancellation_probe()
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    result = verify()
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(f"PASS {len(result)} reviewer probe groups")
