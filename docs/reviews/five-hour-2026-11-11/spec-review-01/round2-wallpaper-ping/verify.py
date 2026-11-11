"""Independent document oracle for the two fixtures at repair PR #299."""

from fractions import Fraction
import hashlib
import json
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parent
FIXTURE_HASHES = {
    "wallpaper-calculator": "e3b30a07cac0547afd15d33a82b635eb21e6bf40af21ec07c33db9bef70def97",
    "ping-area-converter": "8d8c00c25b78a564574666cef43b458530edf9722fc85055b4180b1bea4badf9",
}
WALL_DEFAULT = dict(wallMode="perimeter", perimeterM="12", heightM="2.5",
                    rollWidthM="0.53", rollLengthM="10.05", patternRepeatCm="0",
                    openingsMode="none", wastePercent="0")
PING_DEFAULT = {"amount": "", "unit": "ping"}
INTEGER = re.compile(r"(?:0|[1-9][0-9]*)")
WALL_DECIMAL = re.compile(r"(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?")
PING_DECIMAL = re.compile(r"(?:0|[1-9][0-9]*)(?:\.[0-9]{1,3})?")
# International foot squared; traditional ping and the disclosed Tatami convention.
M2_PER_UNIT = {
    "ping": Fraction(400, 121),
    "m2": Fraction(1),
    "ft2": Fraction("0.3048") ** 2,
    "tatami": Fraction("1.62"),
}


class Rejected(Exception):
    def __init__(self, code, field=None, row=None):
        self.error = {"code": code, "field": field, "row": row}


def text_field(raw, key, cap, row=None):
    if len(raw.encode("utf-16-le", "surrogatepass")) // 2 > cap:
        raise Rejected("INPUT_LIMIT", key, row)
    try:
        raw.encode("utf-16-le")
    except UnicodeEncodeError:
        raise Rejected("UNICODE", key, row) from None
    if not raw:
        raise Rejected("EMPTY", key, row)


def wall_measure(raw, key, lower, upper, factor, row=None):
    text_field(raw, key, 8, row)
    pattern = INTEGER if factor == 1 else WALL_DECIMAL
    if pattern.fullmatch(raw) is None:
        raise Rejected("INTEGER_FORMAT" if factor == 1 else "DECIMAL_FORMAT", key, row)
    scaled = Fraction(raw) * factor
    assert scaled.denominator == 1
    if not lower <= scaled <= upper:
        raise Rejected("RANGE", key, row)
    return scaled.numerator


def exact_keys(obj, keys):
    return type(obj) is dict and set(obj) == set(keys)


def wall_shape(raw):
    common = {"wallMode", "openingsMode", "rollWidthM", "rollLengthM",
              "patternRepeatCm", "wastePercent"}
    if type(raw) is not dict or any(type(raw.get(k)) is not str for k in common):
        raise Rejected("SCHEMA")
    wall_mode = raw["wallMode"]
    opening_mode = raw["openingsMode"]
    if wall_mode not in {"perimeter", "walls"}:
        raise Rejected("ENUM", "wallMode")
    if opening_mode not in {"none", "list", "area"}:
        raise Rejected("ENUM", "openingsMode")
    keys = common | ({"perimeterM", "heightM"} if wall_mode == "perimeter" else {"walls"})
    keys |= {"none": set(), "area": {"openingsAreaM2"}, "list": {"openings"}}[opening_mode]
    if not exact_keys(raw, keys):
        raise Rejected("SCHEMA")
    for key in keys - {"walls", "openings"}:
        if type(raw[key]) is not str:
            raise Rejected("SCHEMA")
    for key in ("walls", "openings"):
        if key not in raw:
            continue
        if type(raw[key]) is not list:
            raise Rejected("SCHEMA")
        for row, entry in enumerate(raw[key], 1):
            if not exact_keys(entry, {"widthM", "heightM"}) or any(type(v) is not str for v in entry.values()):
                raise Rejected("SCHEMA", row=row)
    if wall_mode == "walls" and opening_mode == "list":
        raise Rejected("MODE_COMBINATION", "openingsMode")
    return wall_mode, opening_mode


def wall_rows(raw, key, cap):
    if not raw:
        raise Rejected("EMPTY", key)
    if len(raw) > cap:
        raise Rejected("ROW_LIMIT", key)
    return [
        (wall_measure(item["widthM"], "widthM", 1, 10000, 100, row),
         wall_measure(item["heightM"], "heightM", 1, 2000, 100, row))
        for row, item in enumerate(raw, 1)
    ]


def ceil_positive(n, d):
    return -(-n // d)


def area_label(cm_squared):
    centi_m2 = (cm_squared + 50) // 100
    whole, remainder = divmod(centi_m2, 100)
    return f"{whole}.{remainder:02d}"


def wallpaper(raw):
    wall_mode, opening_mode = wall_shape(raw)
    if wall_mode == "perimeter":
        walls = [(wall_measure(raw["perimeterM"], "perimeterM", 1, 20000, 100),
                  wall_measure(raw["heightM"], "heightM", 1, 2000, 100))]
    else:
        walls = wall_rows(raw["walls"], "walls", 12)

    roll_width = wall_measure(raw["rollWidthM"], "rollWidthM", 10, 200, 100)
    roll_length = wall_measure(raw["rollLengthM"], "rollLengthM", 100, 10000, 100)
    repeat = wall_measure(raw["patternRepeatCm"], "patternRepeatCm", 0, 200, 1)
    gross = sum(width * height for width, height in walls)
    openings = []
    removed_area = 0
    if opening_mode == "list":
        openings = wall_rows(raw["openings"], "openings", 20)
        removed_area = sum(width * height for width, height in openings)
    elif opening_mode == "area":
        removed_area = wall_measure(raw["openingsAreaM2"], "openingsAreaM2", 0, 100000000, 10000)
    waste = wall_measure(raw["wastePercent"], "wastePercent", 0, 50, 1)

    for row, (_, opening_height) in enumerate(openings, 1):
        if opening_height > walls[0][1]:
            raise Rejected("OPENING_HEIGHT_EXCEEDS_WALL", "heightM", row)
    combined_width = sum(width for width, _ in openings)
    if (openings and combined_width >= walls[0][0]) or removed_area > gross:
        key = "openings" if opening_mode == "list" else "openingsAreaM2"
        raise Rejected("OPENINGS_EXCEED_WALL", key)

    details = []
    for row, (width, height) in enumerate(walls, 1):
        cut = height + 10
        if repeat:
            cut += (-cut) % repeat
        drops = roll_length // cut
        if drops == 0:
            raise Rejected("STRIP_TOO_LONG", "rollLengthM", None if wall_mode == "perimeter" else row)
        strips = ceil_positive(width, roll_width)
        reserve = ceil_positive(strips * (100 + waste), 100)
        details.append(dict(index=row, widthCm=width, openingsWidthCm=combined_width,
                            effectiveWidthCm=width, strips=strips, stripLengthCm=cut, dropsPerRoll=drops,
                            stripsWithWaste=reserve, rolls=ceil_positive(reserve, drops)))
    totals = {k: sum(line[k] for line in details) for k in ("strips", "stripsWithWaste", "rolls")}
    return dict(walls=details, **totals, grossWallAreaM2=area_label(gross),
                openingsAreaM2=area_label(removed_area), netWallAreaM2=area_label(gross - removed_area))


def display_number(value, digits):
    scale = 10 ** digits
    scaled = value * scale
    integer = (scaled + Fraction(1, 2)).numerator // (scaled + Fraction(1, 2)).denominator
    if integer % scale == 0:
        return integer // scale
    return integer / scale


def outputs_from_m2(m2):
    return {unit: display_number(m2 / ratio, 1 if unit == "tatami" else 2)
            for unit, ratio in M2_PER_UNIT.items()}


def ping(raw):
    if not exact_keys(raw, {"amount", "unit"}) or any(type(v) is not str for v in raw.values()):
        raise Rejected("SCHEMA")
    text_field(raw["amount"], "amount", 12)
    if PING_DECIMAL.fullmatch(raw["amount"]) is None:
        raise Rejected("DECIMAL_FORMAT", "amount")
    amount = Fraction(raw["amount"])
    if not 0 < amount <= 1000000:
        raise Rejected("RANGE", "amount")
    text_field(raw["unit"], "unit", 6)
    if raw["unit"] not in M2_PER_UNIT:
        raise Rejected("ENUM", "unit")
    return outputs_from_m2(amount * M2_PER_UNIT[raw["unit"]])


def quick_table():
    rows = []
    for count in range(1, 101):
        square_meters = count * M2_PER_UNIT["ping"]
        rows.append(dict(ping=count, m2=display_number(square_meters, 2),
                         ft2=display_number(square_meters / M2_PER_UNIT["ft2"], 2)))
    return {"rows": rows}


def outcome(calculate, draft):
    try:
        return {"ok": True, "result": calculate(draft)}
    except Rejected as issue:
        return {"ok": False, "error": issue.error}


class Session:
    """Small model of the documented request generation and available report."""

    def __init__(self, calculate, defaults):
        self.calculate = calculate
        self.defaults = defaults
        self.generation = 0
        self.reset()

    def clear_to(self, state):
        self.generation += 1
        self.state = state
        self.result = None

    def reset(self):
        self.clear_to("empty")
        self.draft = self.defaults

    def edit(self, draft):
        self.clear_to("dirty")
        self.draft = draft

    def start(self, draft):
        self.clear_to("busy")
        self.draft = draft
        return self.generation, outcome(self.calculate, draft)

    def cancel(self):
        self.clear_to("cancelled")

    def receive(self, generation, result):
        if generation == self.generation and self.state == "busy":
            self.result = result
            self.state = "success" if result["ok"] else "error"

    def show(self, draft=False):
        data = {"state": self.state, "reportAvailable": self.state == "success"}
        if self.state == "error":
            data["error"] = self.result["error"]
        if draft:
            data["draft"] = self.draft
        return data


def controller(case_id, raw, calculate, defaults):
    session = Session(calculate, defaults)
    if case_id == "state-dirty-error":
        session.receive(*session.start(raw["initial"]))
        after_run = session.show()
        session.edit(raw["edit"])
        after_edit = session.show()
        session.receive(*session.start(raw["edit"]))
        return dict(afterRun=after_run, afterEdit=after_edit, afterRerun=session.show())
    if case_id == "state-cancel-late":
        generation, result = session.start(raw["draft"])
        assert result == {"ok": True, "result": raw["lateResult"]}
        pending = session.show()
        session.cancel()
        cancelled = session.show(draft=True)
        session.receive(generation, result)
        after_late = session.show()
        session.reset()
        return dict(whilePending=pending, afterCancel=cancelled, afterLateResult=after_late,
                    afterReset=session.show(draft=True))
    if case_id == "state-replace-late":
        older, payload = session.start(raw["olderDraft"])
        assert payload == {"ok": True, "result": raw["olderLateResult"]}
        session.receive(*session.start(raw["newerDraft"]))
        newer = session.show()
        session.receive(older, payload)
        return dict(afterNewerResult=newer, afterOlderLateResult=session.show())
    raise ValueError(case_id)


def canonical(data):
    return (json.dumps(data, separators=(",", ":"), sort_keys=True) + "\n").encode("utf-8")


def report(data):
    blob = canonical(data)
    return {"text": blob.decode("utf-8"), "bytes": len(blob), "sha256": hashlib.sha256(blob).hexdigest()}


def emit(data):
    print(json.dumps(data, separators=(",", ":"), ensure_ascii=True))


def audit(slug, fixture, calculate, defaults):
    raw = fixture.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == FIXTURE_HASHES[slug]
    document = json.loads(raw)
    assert document["slug"] == slug and document["productChecks"] == "NOT_RUN"
    totals = {}
    for case in document["cases"]:
        raw_input = case["input"]
        kind = case["kind"]
        if kind == "core":
            derived = outcome(calculate, raw_input)
        elif kind == "controller":
            derived = controller(case["id"], raw_input, calculate, defaults)
        elif kind == "table" and slug == "ping-area-converter":
            derived = quick_table()
        else:
            raise ValueError(kind)
        match = derived == case["expected"]
        count = totals.setdefault(kind, {"cases": 0, "matched": 0})
        count["cases"] += 1
        count["matched"] += match
        emit(dict(slug=slug, id=case["id"], kind=kind, status="PASS" if match else "FAIL",
                  input=raw_input, derived=derived, literalExpected=case["expected"]))
    emit(dict(slug=slug, totals=totals))
    assert all(row["cases"] == row["matched"] for row in totals.values()), totals
    return {case["id"]: case for case in document["cases"]}


def extra_wall(cases):
    normal = cases["openings-list-deduction"]["input"]
    wall_01 = cases["partial-height-opening-full-strips"]["input"]
    net_cm2 = 318 * 250 - 159 * 120
    roll_cm2 = 53 * 780
    result = wallpaper(wall_01)
    assert roll_cm2 < net_cm2 <= result["rolls"] * roll_cm2
    assert result["strips"] == 6 and result["rolls"] == 2 and result["netWallAreaM2"] == "6.04"
    emit(dict(check="WALL-01-material-floor", netCm2=net_cm2, oneRollCm2=roll_cm2,
              twoRollsCm2=2 * roll_cm2, minRollsByArea=ceil_positive(net_cm2, roll_cm2),
              derived=result, status="PASS"))
    list_result = wallpaper(normal)
    area_result = wallpaper(cases["openings-area-only"]["input"])
    none_result = wallpaper(WALL_DEFAULT)
    assert all(list_result[k] == area_result[k] == none_result[k] for k in ("strips", "stripsWithWaste", "rolls"))
    assert list_result["netWallAreaM2"] == area_result["netWallAreaM2"] == "26.31"
    assert list_result["walls"][0]["openingsWidthCm"] == 240
    assert list_result["walls"][0]["effectiveWidthCm"] == 1200
    emit(dict(check="opening-modes-same-purchase", listAndAreaNet="26.31",
              noDeductionNet=none_result["netWallAreaM2"], strips=23, rolls=8, status="PASS"))
    too_high = cases["opening-height-exceeds-wall"]["input"]
    invalid_waste = dict(too_high, wastePercent="1.5")
    expected_error = {"ok": False, "error": {"code": "INTEGER_FORMAT", "field": "wastePercent", "row": None}}
    assert outcome(wallpaper, invalid_waste) == expected_error
    emit(dict(check="all-field-validation-precedes-opening-height", input=invalid_waste,
              derived=expected_error, status="PASS"))
    round_inputs = (49, 50, 149, 150)
    round_labels = list(map(area_label, round_inputs))
    assert round_labels == ["0.00", "0.01", "0.01", "0.02"]
    emit(dict(check="cm2-to-m2-half-up", input=round_inputs, derived=round_labels, status="PASS"))
    for label, data in (("openings-list-deduction", list_result), ("partial-height-opening-full-strips", result)):
        emit(dict(check="canonical-download", slug="wallpaper-calculator", fixture=label, report=report(data)))


def extra_ping(cases):
    rows = quick_table()["rows"]
    for quantity, key, expected in ((30, "example-thirty-ping", (1067.50, 1067.50)),
                                    (100, "hundred-ping-precision", (3558.32, 3558.33))):
        exact = Fraction(quantity) * M2_PER_UNIT["ping"] / M2_PER_UNIT["ft2"]
        approximate = Fraction(quantity) * Fraction("3.3058") / M2_PER_UNIT["ft2"]
        shown = (display_number(exact, 2), display_number(approximate, 2))
        assert shown == expected
        fixture = cases[key]
        result = ping(fixture["input"])
        assert rows[quantity - 1] == {k: result[k] for k in ("ping", "m2", "ft2")}
        emit(dict(check="ping-precision-and-table", amount=quantity, exactRational=str(exact),
                  approxRational=str(approximate), exactShown=f"{shown[0]:.2f}",
                  approxShown=f"{shown[1]:.2f}", tableRow=rows[quantity - 1], status="PASS"))
        if quantity == 30:
            emit(dict(check="canonical-download", slug="ping-area-converter", fixture=key,
                      report=report({"input": fixture["input"], "result": result})))


if __name__ == "__main__":
    wall_slug, ping_slug = ("wallpaper-calculator", "ping-area-converter")
    if len(sys.argv) not in (1, 3):
        sys.exit("Usage: python -B -X utf8 verify.py [wallpaper-fixtures.json ping-fixtures.json]")
    wall_path, ping_path = (tuple(map(Path, sys.argv[1:])) if len(sys.argv) == 3 else
                           (ROOT / "fixtures" / f"{wall_slug}.json", ROOT / "fixtures" / f"{ping_slug}.json"))
    emit(dict(runtime=sys.version.split()[0], candidate="c2c3f7715023990b1427e052a25c52f1987eaca9",
              fixtureSHA256=FIXTURE_HASHES, scope="document-only"))
    extra_wall(audit(wall_slug, wall_path, wallpaper, WALL_DEFAULT))
    extra_ping(audit(ping_slug, ping_path, ping, PING_DEFAULT))
