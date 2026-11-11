"""Independent volume, unit conversion, and state traces for PR #261."""

from decimal import Decimal, ROUND_HALF_UP, localcontext
from hashlib import sha256
import json
import math
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fixture_support import derive_lifecycle, invalid, unpaired_surrogate, utf16_units, verify_all


DEFAULT = {
    "shape": "rectangular", "depthMode": "single", "lengthM": "8", "widthM": "4",
    "diameterM": "5", "depthM": "1.5", "shallowDepthM": "1", "deepDepthM": "2",
    "flowRateLMin": "40",
}
CAPS = {"shape": 12, "depthMode": 8}
ENUMS = {"shape": ("rectangular", "circular", "oval"), "depthMode": ("single", "sloped")}
UPPER = {"lengthM": 100, "widthM": 100, "diameterM": 100,
         "depthM": 10, "shallowDepthM": 10, "deepDepthM": 10, "flowRateLMin": 10000}
PI_DECIMAL = Decimal("3.141592653589793238462643383279502884197169399375105820974944")
LITRES_PER_US_GALLON = Decimal(231) * Decimal("0.0254") ** 3 * 1000


def dimensions(shape, depth_mode):
    footprint = {"diameterM"} if shape == "circular" else {"lengthM", "widthM"}
    depth = {"depthM"} if depth_mode == "single" else {"shallowDepthM", "deepDepthM"}
    return footprint | depth | {"shape", "depthMode", "flowRateLMin"}


def volume(draft, allow_inactive_surrogate=False):
    if type(draft) is not dict or draft.keys() != DEFAULT.keys():
        return invalid("SCHEMA")
    if any(type(value) is not str for value in draft.values()):
        return invalid("SCHEMA")
    shape = draft["shape"]
    depth_mode = draft["depthMode"]
    active = dimensions(shape, depth_mode)
    parsed = {}
    for field in DEFAULT:
        text = draft[field]
        if utf16_units(text) > CAPS.get(field, 8):
            return invalid("INPUT_LIMIT", field)
        if allow_inactive_surrogate and field not in active:
            continue
        if unpaired_surrogate(text):
            return invalid("UNICODE", field)
        if field not in active or (field == "flowRateLMin" and text == ""):
            continue
        if text == "":
            return invalid("EMPTY", field)
        if field in ENUMS:
            if text not in ENUMS[field]:
                return invalid("ENUM", field)
            continue
        if re.fullmatch(r"[0-9]+(\.[0-9]{1,2})?", text) is None:
            return invalid("DECIMAL_FORMAT", field)
        value = float(text)
        if not 0.1 <= value <= UPPER[field]:
            return invalid("RANGE", field)
        parsed[field] = value

    if depth_mode == "sloped":
        shallow = parsed["shallowDepthM"]
        deep = parsed["deepDepthM"]
        if shallow > deep:
            return invalid("DEPTH_ORDER", "deepDepthM")
        average = (shallow + deep) / 2
    else:
        average = parsed["depthM"]
    if shape == "circular":
        radius = parsed["diameterM"] / 2
        area = (math.pi * radius) * radius
    elif shape == "oval":
        major, minor = parsed["lengthM"] / 2, parsed["widthM"] / 2
        area = (math.pi * major) * minor
    else:
        area = parsed["lengthM"] * parsed["widthM"]
    cubic_metres = area * average
    litres = cubic_metres * 1000
    flow = parsed.get("flowRateLMin")
    minutes = None if flow is None else math.floor(litres / flow + 0.5)
    hours, remainder = (None, None) if minutes is None else divmod(minutes, 60)
    return {"ok": True, "result": {
        "shape": shape, "depthMode": depth_mode, "avgDepthM": average,
        "volumeM3": math.floor(cubic_metres * 100 + 0.5) / 100,
        "volumeLitres": math.floor(litres + 0.5),
        "volumeGallonsUs": math.floor(litres / float(LITRES_PER_US_GALLON) + 0.5),
        "flowRateLMin": flow, "fillTotalMinutes": minutes, "fillHours": hours, "fillMinutes": remainder,
    }}


def decimal_volume(draft):
    """Cross-check rounded values via high precision geometry."""
    with localcontext() as context:
        context.prec = 60
        number = {field: Decimal(draft[field]) for field in dimensions(
            draft["shape"], draft["depthMode"]
        ) - {"shape", "depthMode"} if draft[field] != ""}
        if draft["shape"] == "circular":
            area = PI_DECIMAL * (number["diameterM"] / 2) ** 2
        else:
            area = number["lengthM"] * number["widthM"]
            if draft["shape"] == "oval":
                area *= PI_DECIMAL / 4
        depth = number.get("depthM")
        if depth is None:
            depth = (number["shallowDepthM"] + number["deepDepthM"]) / 2
        cubic_metres = area * depth
        litres = cubic_metres * 1000

        def half_up(value, unit="1"):
            return value.quantize(Decimal(unit), rounding=ROUND_HALF_UP)

        flow = number.get("flowRateLMin")
        return {
            "volumeM3": float(half_up(cubic_metres, "0.01")),
            "volumeLitres": int(half_up(litres)),
            "volumeGallonsUs": int(half_up(litres / LITRES_PER_US_GALLON)),
            "fillTotalMinutes": None if flow is None else int(half_up(litres / flow)),
        }


def derive(case_id, kind, source):
    if kind == "core":
        result = volume(source)
        if result["ok"]:
            for field, value in decimal_volume(source).items():
                assert result["result"][field] == value, (case_id, field)
        return result
    return derive_lifecycle(case_id, source, DEFAULT, volume)


def probes():
    assert LITRES_PER_US_GALLON == Decimal("3.785411784")
    hidden = DEFAULT | {"shape": "circular", "lengthM": "\ud800"}
    pipeline = volume(hidden)
    bypass = volume(hidden, allow_inactive_surrogate=True)
    assert pipeline == invalid("UNICODE", "lengthM")
    assert bypass["ok"] and bypass["result"]["volumeLitres"] == 29452
    oversized_hidden = hidden | {"lengthM": "123456789"}
    assert volume(oversized_hidden) == volume(oversized_hidden, allow_inactive_surrogate=True) == invalid("INPUT_LIMIT", "lengthM")
    fill = DEFAULT | {"lengthM": "0.1", "widthM": "0.1", "depthM": "0.14", "flowRateLMin": "0.1"}
    assert volume(fill)["result"]["fillTotalMinutes"] == 14
    assert volume(fill)["result"]["volumeLitres"] == 1
    whole_hour = DEFAULT | {"lengthM": "1", "widthM": "1", "depthM": "1.19", "flowRateLMin": "20"}
    clock = volume(whole_hour)["result"]
    assert (clock["fillTotalMinutes"], clock["fillHours"], clock["fillMinutes"]) == (60, 1, 0)
    earlier_error = DEFAULT | {"depthMode": "sloped", "shallowDepthM": "2", "deepDepthM": "1", "flowRateLMin": "0"}
    assert volume(earlier_error) == invalid("RANGE", "flowRateLMin")
    result = volume(DEFAULT)["result"]
    canonical = {key: int(value) if type(value) is float and value.is_integer() else value
                 for key, value in result.items()}
    report = (json.dumps(canonical, sort_keys=True, separators=(",", ":")) + "\n").encode()
    return {
        "usGallonFrom231CubicInches": str(LITRES_PER_US_GALLON),
        "inactiveSurrogate": {"input": hidden, "specPipeline": pipeline, "specTestsText": bypass},
        "inactiveCap": {"input": oversized_hidden, "derived": volume(oversized_hidden)},
        "useUnroundedLitresForFill": {"input": fill, "derived": volume(fill)},
        "minuteRollover": {"input": whole_hour, "derived": volume(whole_hour)},
        "fieldErrorBeforeDepthOrder": {"input": earlier_error, "derived": volume(earlier_error)},
        "documentReport": {"utf8Bytes": len(report), "sha256": sha256(report).hexdigest(),
                           "jsonPlusLf": report.decode()},
    }


if __name__ == "__main__":
    raise SystemExit(verify_all(derive, probes))
