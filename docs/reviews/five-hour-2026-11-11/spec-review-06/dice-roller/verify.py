"""Independent grammar, uint32 arithmetic, and lifecycle checks for PR #260."""

from hashlib import sha256
import json
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fixture_support import derive_lifecycle, invalid, unpaired_surrogate, utf16_units, verify_all


DEFAULT = {"notation": "2d6", "seed": ""}
UINT32_SIZE = 2 ** 32


def digits_at(text, start):
    end = start
    while end < len(text) and "0" <= text[end] <= "9":
        end += 1
    return text[start:end], end


def scan(text):
    count, index = digits_at(text, 0)
    if index == len(text) or text[index] not in "dD":
        return index
    sides, index = digits_at(text, index + 1)
    if not sides:
        return index
    if index == len(text):
        return count, sides, "", ""
    sign = text[index]
    if sign not in "+-":
        return index
    modifier, end = digits_at(text, index + 1)
    if not modifier or end != len(text):
        return end
    return count, sides, sign, modifier


def draw_numerators(seed, count):
    for roll in range(1, count + 1):
        state = (seed + roll * 0x6D2B79F5) % UINT32_SIZE
        multiplied = ((state ^ (state >> 15)) * (state | 1)) % UINT32_SIZE
        added = (multiplied + (multiplied ^ (multiplied >> 7)) * (multiplied | 61)) % UINT32_SIZE
        mixed = multiplied ^ added
        yield mixed ^ (mixed >> 14)


def roll(draft):
    if type(draft) is not dict or draft.keys() != DEFAULT.keys():
        return invalid("SCHEMA")
    if any(type(value) is not str for value in draft.values()):
        return invalid("SCHEMA")

    def field_error(field, text, limit):
        if utf16_units(text) > limit:
            return invalid("INPUT_LIMIT", field)
        if unpaired_surrogate(text):
            return invalid("UNICODE", field)
        if text == "":
            return invalid("EMPTY", field)
        return None

    notation = draft["notation"]
    if error := field_error("notation", notation, 32):
        return error
    grammar = scan(notation)
    if type(grammar) is int:
        result = invalid("NOTATION", "notation")
        result["error"]["position"] = utf16_units(notation[:grammar])
        return result
    count_text, sides_text, sign, modifier_text = grammar
    parsed = {}
    for component, text, default, low, high in (
        ("count", count_text, 1, 1, 100),
        ("sides", sides_text, None, 2, 1000),
        ("modifier", modifier_text, 0, 0, 10000),
    ):
        if len(text) > 10 or (text and not low <= int(text) <= high):
            result = invalid("RANGE", "notation")
            result["error"]["component"] = component
            return result
        parsed[component] = int(text) if text else default

    seed_text = draft["seed"]
    if error := field_error("seed", seed_text, 10):
        return error
    if not re.fullmatch(r"0|[1-9][0-9]*", seed_text):
        return invalid("INTEGER_FORMAT", "seed")
    seed = int(seed_text)
    if seed >= UINT32_SIZE:
        return invalid("RANGE", "seed")

    count, sides = parsed["count"], parsed["sides"]
    modifier = parsed["modifier"] * (-1 if sign == "-" else 1)
    rolls = [1 + k * sides // UINT32_SIZE for k in draw_numerators(seed, count)]
    assert len(rolls) == count and all(1 <= face <= sides for face in rolls)
    expression = f"{count}d{sides}"
    if modifier:
        expression += f"{modifier:+d}"
    return {"ok": True, "result": {
        "expression": expression, "count": count, "sides": sides, "modifier": modifier,
        "seed": seed, "rolls": rolls, "sum": sum(rolls), "total": sum(rolls) + modifier,
    }}


def derive(case_id, kind, source):
    if kind == "core":
        return roll(source)
    return derive_lifecycle(case_id, source, DEFAULT, roll)


def probes():
    first_input = {"notation": "2d6", "seed": "42"}
    alternate_input = first_input | {"notation": "2d20"}
    first_result = roll(first_input)["result"]
    alternate_result = roll(alternate_input)["result"]
    assert first_result["rolls"] == [4, 3] and alternate_result["rolls"] == [13, 9]
    assert roll(first_input)["result"] == first_result
    normalized = {"notation": "002D06-00", "seed": "42"}
    assert roll(normalized)["result"] == first_result
    smallest = {"notation": "1d2-10000", "seed": "0"}
    assert roll(smallest)["result"]["total"] == -9999
    malformed = {"notation": "101d6x", "seed": "042"}
    assert roll(malformed)["error"] == {
        "code": "NOTATION", "field": "notation", "row": None, "position": 5,
    }
    first_error = {"notation": "00000000001d1", "seed": ""}
    assert roll(first_error)["error"]["component"] == "count"
    surrogate = {"notation": "\ud800", "seed": "42"}
    assert roll(surrogate) == invalid("UNICODE", "notation")
    blank = DEFAULT.copy()
    after_mock_entropy = blank | {"seed": "0"}
    assert roll(blank) == invalid("EMPTY", "seed")
    assert roll(after_mock_entropy)["result"]["seed"] == 0
    serialized = (json.dumps(first_result, sort_keys=True, separators=(",", ":")) + "\n").encode()
    return {
        "sameSeedDifferentNotation": [
            {"input": first_input, "derived": first_result},
            {"input": alternate_input, "derived": alternate_result},
        ],
        "normalizedEquivalent": {"input": normalized, "derived": roll(normalized)},
        "firstFiveNumeratorsFor42": list(draw_numerators(42, 5)),
        "lowestSidesWithNegativeCap": {"input": smallest, "derived": roll(smallest)},
        "grammarBeforeCountAndSeed": {"input": malformed, "derived": roll(malformed)},
        "componentLengthBeforeValue": {"input": first_error, "derived": roll(first_error)},
        "unpairedSurrogate": {"input": surrogate, "derived": roll(surrogate)},
        "syntheticSeedInjection": {"initialDraft": blank, "mockUint32": 0,
                                   "completedDraft": after_mock_entropy, "derived": roll(after_mock_entropy)},
        "documentReport": {"utf8Bytes": len(serialized), "sha256": sha256(serialized).hexdigest(),
                           "jsonPlusLf": serialized.decode()},
    }


if __name__ == "__main__":
    raise SystemExit(verify_all(derive, probes))
