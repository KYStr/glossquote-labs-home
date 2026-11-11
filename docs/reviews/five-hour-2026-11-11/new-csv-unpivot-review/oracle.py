"""Independent CSV specification oracle, using a field grammar and Python stdlib."""

from hashlib import sha256
from itertools import product
import json
import re

MAX_INPUT = 1_048_576
MAX_CELL = 16_384
MAX_COLS = 48
MAX_DATA = 2_000
MAX_OUTPUT = 8_388_608
MAX_ROWS = 20_000
BOM = b"\xef\xbb\xbf"
FIELD = re.compile(r'(?:"((?:[^"]|"")*)"|([^",\r\n]*))(?=,|\r\n|\n|\Z)')
RISK_SPACES = "\x09\x0a\x0d \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
RISK_MARKS = "=+-@＝＋－＠"


class Invalid(ValueError):
    def __init__(self, code, record=None, column=None):
        super().__init__(code, record, column)
        self.code, self.record, self.column = code, record, column

    def receipt(self):
        return {"code": self.code, "record": self.record, "column": self.column}


def encode(text):
    return text.encode("utf-8", "strict")


def utf16_count(text):
    return len(text.encode("utf-16-le", "surrogatepass")) // 2


def input_text(value, mode):
    if mode == "file":
        if len(value) > MAX_INPUT:
            raise Invalid("size")
        try:
            return value.decode("utf-8-sig", "strict")
        except UnicodeDecodeError:
            raise Invalid("utf8") from None
    if mode != "paste":
        raise ValueError(mode)
    # Model the textarea API value before core parsing.
    normalized = value.replace("\r\n", "\n").replace("\r", "\n")
    try:
        if len(encode(normalized)) > MAX_INPUT:
            raise Invalid("size")
    except UnicodeEncodeError:
        raise Invalid("surrogate") from None
    return normalized


def validate_header(name):
    return 1 <= len(name) <= 120 and bool(name.strip(" ")) and not any(c in name for c in "\r\n\t")


def lexical_records(text):
    """Use anchored field recognition rather than a CSV state machine.

    The grammar consumes a separator only after the field is recognized.
    The Boolean after_comma distinguishes EOF after a comma from EOF after a
    record separator. Only test data enters this regular-expression oracle.
    """
    cursor, record, col = 0, 1, 1
    row = []
    after_comma = False
    while cursor < len(text) or after_comma:
        match = FIELD.match(text, cursor)
        if match is None:
            raise Invalid("syntax", record, col)
        quoted, bare = match.groups()
        value = bare if quoted is None else quoted.replace('""', '"')
        if any(ord(c) < 32 and c not in "\t\r\n" for c in value):
            raise Invalid("control", record, col)
        if utf16_count(value) > MAX_CELL:
            raise Invalid("cell-limit", record, col)
        if col > MAX_COLS:
            raise Invalid("column-limit", record, col)
        row.append(value)
        cursor = match.end()
        after_comma = cursor < len(text) and text[cursor] == ","
        if after_comma:
            cursor, col = cursor + 1, col + 1
        else:
            if cursor < len(text):
                cursor += 2 if text.startswith("\r\n", cursor) else 1
            yield row
            row, record, col = [], record + 1, 1


def parse(value, mode="paste"):
    rows = iter(lexical_records(input_text(value, mode)))
    columns = next(rows, None)
    if columns is None:
        raise Invalid("empty")
    if len(columns) < 2:
        raise Invalid("header-width", 1, 2)
    used = set()
    for col, name in enumerate(columns, 1):
        if not validate_header(name):
            raise Invalid("header-name", 1, col)
        if name in used:
            raise Invalid("duplicate-header", 1, col)
        used.add(name)
    data = []
    for record, row in enumerate(rows, 2):
        if record - 1 > MAX_DATA:
            raise Invalid("row-limit", record, 1)
        if len(row) != len(columns):
            raise Invalid("ragged", record, min(len(columns), len(row)) + 1)
        data.append(row)
    return columns, data


def risk(value):
    """Equivalent to the fixed CSV Workbench rule, using lstrip only to find its prefix."""
    suffix = value.lstrip(RISK_SPACES)
    prefix = value[:len(value) - len(suffix)]
    return any(c in prefix for c in "\t\r\n") or bool(suffix and suffix[0] in RISK_MARKS)


def flatten(table, roles, attribute="attribute", value="value", skip=False):
    columns, data = table
    assert len(roles) == len(columns)
    keep = [i for i, role in enumerate(roles) if role == "keep"]
    expand = [i for i, role in enumerate(roles) if role == "expand"]
    assert keep and expand
    names = [columns[i] for i in keep] + [attribute, value]
    assert len(names) == len(set(names)) and all(validate_header(name) for name in names)
    cells = [(r, c) for (r, row), c in product(enumerate(data), expand) if not (skip and row[c] == "")]
    if len(cells) > MAX_ROWS:
        raise Invalid("output-rows")
    out = [[data[r][i] for i in keep] + [columns[c], data[r][c]] for r, c in cells]
    return {
        "columns": names,
        "rows": out,
        "coordinates": [[r + 2, c + 1] for r, c in cells],
        "skipped": len(data) * len(expand) - len(cells),
        "risk": [[r, c] for r, row in enumerate([names, *out], 1)
                 for c, text in enumerate(row, 1) if risk(text)],
    }


def quote(value):
    return '"' + value.replace('"', '""') + '"'


def record_bytes(row, protect=False):
    return encode(",".join(quote("'" + s if protect and risk(s) else s) for s in row))


def csv_bytes(result, protect=False):
    if result["risk"] and not protect:
        raise Invalid("original-risk")
    return b"\r\n".join(record_bytes(row, protect) for row in [result["columns"], *result["rows"]])


def json_bytes(result):
    doc = {"schemaVersion": 1, "columns": result["columns"], "rows": result["rows"]}
    return encode(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n")


def digest(data):
    return {"bytes": len(data), "sha256": sha256(data).hexdigest()}
