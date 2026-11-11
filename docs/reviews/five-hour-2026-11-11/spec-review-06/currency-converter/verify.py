"""Independent exact money conversion and controller trace for PR #258."""

from decimal import Decimal, ROUND_HALF_UP, localcontext
from fractions import Fraction
from hashlib import sha256
import json
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fixture_support import Trial, invalid, unpaired_surrogate, utf16_units, verify_all


FIELDS = {"fromCode": 8, "toCode": 8, "rate": 14, "amount": 12, "direction": 8}
DEFAULT = {"fromCode": "USD", "toCode": "TWD", "rate": "31.5",
           "amount": "100", "direction": "a-to-b"}


def half_up(value):
    return (value + Fraction(1, 2)).__floor__()


def inverse_display(rate):
    with localcontext() as context:
        context.prec = 60
        inverse = Decimal(rate.denominator) / Decimal(rate.numerator)
        step = Decimal(1).scaleb(inverse.adjusted() - 5)
        text = format(inverse.quantize(step, rounding=ROUND_HALF_UP), "f")
        return text.rstrip("0").rstrip(".") if "." in text else text


def convert(draft):
    if type(draft) is not dict or draft.keys() != FIELDS.keys():
        return invalid("SCHEMA")
    if any(type(value) is not str for value in draft.values()):
        return invalid("SCHEMA")

    numbers = {}
    for field, cap in FIELDS.items():
        text = draft[field]
        if utf16_units(text) > cap:
            return invalid("INPUT_LIMIT", field)
        if unpaired_surrogate(text):
            return invalid("UNICODE", field)
        if text == "":
            return invalid("EMPTY", field)
        if field.endswith("Code"):
            if re.fullmatch("[A-Za-z]{3}", text) is None:
                return invalid("CODE_FORMAT", field)
        elif field == "direction":
            if text not in ("a-to-b", "b-to-a"):
                return invalid("ENUM", field)
        else:
            precision = 6 if field == "rate" else 2
            if re.fullmatch(rf"(0|[1-9][0-9]*)(\.[0-9]{{1,{precision}}})?", text) is None:
                return invalid("DECIMAL_FORMAT", field)
            value = Fraction(text)
            if field == "rate" and not Fraction(1, 1_000_000) <= value <= 1_000_000:
                return invalid("RANGE", field)
            if field == "amount" and value > Fraction(999_999_999, 100):
                return invalid("RANGE", field)
            numbers[field] = value

    rate, amount = numbers["rate"], numbers["amount"]
    forward = draft["direction"] == "a-to-b"
    value = amount * rate if forward else amount / rate
    return {"ok": True, "result": {
        "fromCode": draft["fromCode"].upper(), "toCode": draft["toCode"].upper(),
        "direction": draft["direction"], "amountCents": int(amount * 100),
        "rateMicro": int(rate * 1_000_000), "convertedCents": half_up(value * 100),
        "inverseRate": inverse_display(rate),
        "quickTable": [
            {"amountCents": denomination * 100, "convertedCents": half_up(denomination * rate * 100)}
            for denomination in (1, 10, 100, 1000)
        ],
    }}


def derive(case_id, kind, source):
    if kind == "core":
        return convert(source)
    state = Trial(DEFAULT)
    if case_id == "state-dirty-error":
        state.edit(source["initial"])
        state.finish(state.start(), convert(state.draft))
        after_run = state.snapshot()
        state.edit(source["edit"])
        after_edit = state.snapshot()
        state.finish(state.start(), convert(state.draft))
        return {"afterRun": after_run, "afterEdit": after_edit,
                "afterRerun": state.snapshot(include_error=True)}
    if case_id == "state-cancel-late":
        state.edit(source["draft"])
        previous = state.start()
        pending = state.snapshot()
        state.cancel()
        after_cancel = state.snapshot(include_draft=True)
        assert source["lateResult"] == convert(source["draft"])["result"]
        state.finish(previous, {"ok": True, "result": source["lateResult"]})
        late = state.snapshot()
        state.reset()
        return {"whilePending": pending, "afterCancel": after_cancel,
                "afterLateResult": late, "afterReset": state.snapshot(include_draft=True)}
    if case_id == "state-replace-late":
        state.edit(source["olderDraft"])
        previous = state.start()
        state.edit(source["newerDraft"])
        state.finish(state.start(), convert(state.draft))
        after_newer = state.snapshot(include_error=True)
        assert source["olderLateResult"] == convert(source["olderDraft"])["result"]
        state.finish(previous, {"ok": True, "result": source["olderLateResult"]})
        return {"afterNewerResult": after_newer,
                "afterOlderLateResult": state.snapshot(include_error=True)}
    raise ValueError(f"Unhandled case {case_id}")


def probes():
    rows = []
    for rate, amount in [("31.5", "100"), ("31.5", "3150"), ("3", "30000")]:
        draft = DEFAULT | {"rate": rate, "amount": amount, "direction": "b-to-a"}
        result = convert(draft)["result"]
        rounded_inverse_cents = half_up(Fraction(amount) * Fraction(result["inverseRate"]) * 100)
        rows.append({"input": draft, "exactCents": result["convertedCents"],
                     "displayInverse": result["inverseRate"],
                     "usingDisplayInverseCents": rounded_inverse_cents})
    assert rows[0]["exactCents"] == rows[0]["usingDisplayInverseCents"] == 317
    assert rows[1]["exactCents"] == rows[1]["usingDisplayInverseCents"] == 10000
    assert (rows[2]["exactCents"], rows[2]["usingDisplayInverseCents"]) == (1_000_000, 999_999)
    carry = DEFAULT | {"rate": "10.000001"}
    assert convert(carry)["result"]["inverseRate"] == "0.1"
    largest = DEFAULT | {"rate": "1000000", "amount": "9999999.99"}
    assert convert(largest)["result"]["convertedCents"] == 999_999_999_000_000
    reverse_largest = largest | {"rate": "0.000001", "direction": "b-to-a"}
    assert convert(reverse_largest)["result"]["convertedCents"] == 999_999_999_000_000
    first_error = DEFAULT | {"fromCode": "12!", "toCode": "", "rate": "0"}
    assert convert(first_error) == invalid("CODE_FORMAT", "fromCode")
    schema_first = first_error | {"extra": "ignored"}
    assert convert(schema_first) == invalid("SCHEMA")
    surrogate = DEFAULT | {"rate": "\ud800"}
    assert convert(surrogate) == invalid("UNICODE", "rate")
    report = (json.dumps(convert(DEFAULT)["result"], sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
    return {
        "reverseComparison": rows,
        "inverseCarry": {"input": carry, "derived": convert(carry)["result"]},
        "largestForward": {"input": largest, "derived": convert(largest)["result"]},
        "largestReverse": {"input": reverse_largest, "derived": convert(reverse_largest)["result"]},
        "firstError": {"input": first_error, "derived": convert(first_error)},
        "schemaFirst": {"input": schema_first, "derived": convert(schema_first)},
        "unpairedSurrogate": {"input": surrogate, "derived": convert(surrogate)},
        "documentReport": {"utf8Bytes": len(report), "sha256": sha256(report).hexdigest(),
                           "jsonPlusLf": report.decode("utf-8")},
    }


if __name__ == "__main__":
    raise SystemExit(verify_all(derive, probes))
