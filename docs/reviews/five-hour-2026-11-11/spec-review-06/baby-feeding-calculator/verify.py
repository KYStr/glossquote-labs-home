"""Independent arithmetic checks of the synthetic fixtures in PR #262."""

from fractions import Fraction
from hashlib import sha256
import json
from math import floor
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fixture_support import derive_lifecycle, invalid, unpaired_surrogate, utf16_units, verify_all


DEFAULT = {"weight": "", "factor": "150", "feedsPerDay": "8", "ageMonths": ""}
VALID_BOUNDS = {"weight": (1, 15), "factor": (150, 200), "feedsPerDay": (1, 24), "ageMonths": (0, 24)}


def amounts(draft):
    if type(draft) is not dict or draft.keys() != DEFAULT.keys():
        return invalid("SCHEMA")
    if any(type(value) is not str for value in draft.values()):
        return invalid("SCHEMA")

    values = {}
    for field, (lower, upper) in VALID_BOUNDS.items():
        text = draft[field]
        if utf16_units(text) > 8:
            return invalid("INPUT_LIMIT", field)
        if unpaired_surrogate(text):
            return invalid("UNICODE", field)
        if text == "":
            if field == "ageMonths":
                values[field] = None
                continue
            return invalid("EMPTY", field)
        is_weight = field == "weight"
        pattern = r"[0-9]+(\.[0-9]{1,2})?" if is_weight else r"[0-9]+"
        if not re.fullmatch(pattern, text):
            return invalid("DECIMAL_FORMAT" if is_weight else "INTEGER_FORMAT", field)
        value = Fraction(text) if is_weight else int(text)
        if not lower <= value <= upper:
            return invalid("RANGE", field)
        values[field] = value

    weight, factor = values["weight"], values["factor"]
    meals, months = values["feedsPerDay"], values["ageMonths"]
    day_total = floor(weight * factor + Fraction(1, 2))
    quotient, extra = divmod(day_total, meals)
    portions = [quotient + 1] * extra + [quotient] * (meals - extra)
    average = floor(Fraction(day_total * 10, meals) + Fraction(1, 2)) / 10
    assert len(portions) == meals and min(portions) >= 6 and sum(portions) == day_total
    notices = []
    if months == 0:
        notices.append("early-newborn-amounts-differ")
    elif months is not None and months >= 7:
        notices.append("guideline-covers-to-about-6-months")
    return {"ok": True, "result": {
        "weightKg": float(weight), "factorMlPerKgDay": factor, "feedsPerDay": meals,
        "ageMonths": months, "dailyTotalMl": day_total, "perFeedMl": portions,
        "perFeedAverageMl": average, "notices": notices,
    }}


def derive(case_id, kind, source):
    if kind == "core":
        return amounts(source)
    return derive_lifecycle(case_id, source, DEFAULT, amounts)


def compact_result(result):
    canonical = {key: int(value) if type(value) is float and value.is_integer() else value
                 for key, value in result.items()}
    return (json.dumps(canonical, sort_keys=True, separators=(",", ":")) + "\n").encode()


def probes():
    typical = DEFAULT | {"weight": "4"}
    age_variants = []
    for age in ("", "0", "01", "6", "7", "9", "24"):
        draft = typical | {"ageMonths": age}
        result = amounts(draft)["result"]
        assert result["dailyTotalMl"] == 600 and result["perFeedMl"] == [75] * 8
        age_variants.append({"input": draft, "derived": result})
    assert age_variants[0]["derived"]["notices"] == []
    assert age_variants[1]["derived"]["notices"] == ["early-newborn-amounts-differ"]
    assert age_variants[-1]["derived"]["notices"] == ["guideline-covers-to-about-6-months"]

    just_outside = typical | {"weight": "15.01", "factor": "149", "ageMonths": "25"}
    assert amounts(just_outside) == invalid("RANGE", "weight")
    invalid_unicode = typical | {"factor": "\ud800"}
    assert amounts(invalid_unicode) == invalid("UNICODE", "factor")
    age_too_high = typical | {"ageMonths": "25"}
    assert amounts(age_too_high) == invalid("RANGE", "ageMonths")

    newborn = typical | {"weight": "3.5", "ageMonths": "0"}
    older = typical | {"weight": "8", "feedsPerDay": "5", "ageMonths": "9"}
    one_feed = typical | {"weight": "15", "factor": "200", "feedsPerDay": "1"}
    synthetic_coverage = [{"input": draft, "derivedUnderCandidate": amounts(draft)}
                          for draft in (newborn, older, one_feed)]
    assert [c["derivedUnderCandidate"]["result"]["dailyTotalMl"] for c in synthetic_coverage] == [525, 1200, 3000]
    report = compact_result(amounts(older)["result"])
    assert set(json.loads(report)) == {
        "weightKg", "factorMlPerKgDay", "feedsPerDay", "ageMonths", "dailyTotalMl",
        "perFeedMl", "perFeedAverageMl", "notices",
    }
    return {
        "ageIsLabelOnly": age_variants,
        "syntheticApplicabilityProbes": synthetic_coverage,
        "firstFieldError": {"input": just_outside, "derived": amounts(just_outside)},
        "unpairedSurrogate": {"input": invalid_unicode, "derived": amounts(invalid_unicode)},
        "ageAboveCap": {"input": age_too_high, "derived": amounts(age_too_high)},
        "detachedDocumentReport": {"input": older, "utf8Bytes": len(report),
                                   "sha256": sha256(report).hexdigest(), "jsonPlusLf": report.decode()},
    }


if __name__ == "__main__":
    raise SystemExit(verify_all(derive, probes))
