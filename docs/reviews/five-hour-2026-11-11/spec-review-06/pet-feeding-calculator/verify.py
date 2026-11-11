"""Independent arithmetic checks of the synthetic fixtures in PR #263."""

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
    "species": "dog", "lifeStage": "adult-neutered", "weightKg": "10",
    "foodKcalPer100g": "360", "foodKcalPerCup": "", "mealsPerDay": "2",
}
STAGES = {
    "dog": {
        "puppy-under-4-months": "3", "puppy-4-months-to-adult": "2",
        "adult-intact": "1.8", "adult-neutered": "1.6", "adult-inactive": "1.4",
        "weight-loss": "1",
    },
    "cat": {
        "kitten": "2.5", "adult-intact": "1.4", "adult-neutered": "1.2",
        "adult-inactive": "1", "weight-loss": "0.8",
    },
}


def split(total, count):
    quotient, remainder = divmod(total, count)
    return [quotient + 1] * remainder + [quotient] * (count - remainder)


def amounts(draft):
    if type(draft) is not dict or draft.keys() != DEFAULT.keys():
        return invalid("SCHEMA")
    if any(type(value) is not str for value in draft.values()):
        return invalid("SCHEMA")
    values = {}
    species = draft["species"]
    for field in DEFAULT:
        text = draft[field]
        if utf16_units(text) > (32 if field == "lifeStage" else 8):
            return invalid("INPUT_LIMIT", field)
        if unpaired_surrogate(text):
            return invalid("UNICODE", field)
        if text == "":
            if field == "foodKcalPerCup":
                values[field] = None
                continue
            return invalid("EMPTY", field)
        if field == "species":
            if text not in STAGES:
                return invalid("ENUM", field)
            continue
        if field == "lifeStage":
            if text not in STAGES[species]:
                return invalid("ENUM", field)
            continue
        if field == "mealsPerDay":
            if re.fullmatch(r"0|[1-9][0-9]*", text) is None:
                return invalid("INTEGER_FORMAT", field)
            parsed = int(text)
            lower, upper = 1, 6
        else:
            if re.fullmatch(r"(0|[1-9][0-9]*)(\.[0-9]{1,2})?", text) is None:
                return invalid("DECIMAL_FORMAT", field)
            parsed = float(text)
            if field == "weightKg":
                lower, upper = 0.5, 100 if species == "dog" else 20
            elif field == "foodKcalPer100g":
                lower, upper = 20, 900
            else:
                lower, upper = 50, 1500
        if not lower <= parsed <= upper:
            return invalid("RANGE", field)
        values[field] = parsed

    stage = draft["lifeStage"]
    multiplier = float(STAGES[species][stage])
    rer_raw = math.pow(values["weightKg"], 0.75) * 70
    rer_kcal = math.floor(rer_raw + 0.5)
    der_kcal = math.floor(rer_raw * multiplier + 0.5)
    grams = math.floor(der_kcal * 100 / values["foodKcalPer100g"] + 0.5)
    count = values["mealsPerDay"]
    per_meal_grams = split(grams, count)
    per_meal_kcal = split(der_kcal, count)
    assert sum(per_meal_grams) == grams and sum(per_meal_kcal) == der_kcal
    cups = values["foodKcalPerCup"]
    if cups is not None:
        raw_cups = der_kcal / cups
        cups_daily = math.floor(raw_cups * 100 + 0.5) / 100
        each_cups = math.floor(raw_cups / count * 100 + 0.5) / 100
        cups_meals = [each_cups] * count
    else:
        cups_daily = cups_meals = None
    return {"ok": True, "result": {
        "species": species, "lifeStage": stage, "multiplier": multiplier, "rerKcal": rer_kcal,
        "derKcal": der_kcal, "gramsPerDay": grams, "cupsPerDay": cups_daily,
        "mealsPerDay": count, "perMealKcal": per_meal_kcal, "perMealGrams": per_meal_grams,
        "perMealCups": cups_meals,
    }}


def decimal_cross_check(draft, derived):
    with localcontext() as context:
        context.prec = 60
        fourth_root = Decimal(draft["weightKg"]).sqrt().sqrt()
        rer = Decimal(70) * fourth_root ** 3

        def half_up(value, unit="1"):
            return value.quantize(Decimal(unit), rounding=ROUND_HALF_UP)

        multiplier = Decimal(STAGES[draft["species"]][draft["lifeStage"]])
        daily = half_up(rer * multiplier)
        assert derived["rerKcal"] == int(half_up(rer))
        assert derived["derKcal"] == int(daily)
        grams = half_up(daily / (Decimal(draft["foodKcalPer100g"]) / 100))
        assert derived["gramsPerDay"] == int(grams)
        if draft["foodKcalPerCup"]:
            cups = daily / Decimal(draft["foodKcalPerCup"])
            assert derived["cupsPerDay"] == float(half_up(cups, "0.01"))
            each = half_up(cups / derived["mealsPerDay"], "0.01")
            assert derived["perMealCups"] == [float(each)] * derived["mealsPerDay"]


def derive(case_id, kind, source):
    if kind == "core":
        result = amounts(source)
        if result["ok"]:
            decimal_cross_check(source, result["result"])
        return result
    return derive_lifecycle(case_id, source, DEFAULT, amounts)


def probes():
    target = DEFAULT | {"species": "cat", "lifeStage": "weight-loss", "weightKg": "6",
                        "foodKcalPer100g": "330"}
    entered_current = target | {"weightKg": "12"}
    target_result = amounts(target)["result"]
    current_result = amounts(entered_current)["result"]
    assert (target_result["derKcal"], current_result["derKcal"]) == (215, 361)
    assert (target_result["gramsPerDay"], current_result["gramsPerDay"]) == (65, 109)
    assert "weightKg" not in target_result and "weightBasis" not in target_result

    tiny = target | {"weightKg": "0.5", "foodKcalPer100g": "900",
                     "foodKcalPerCup": "1500", "mealsPerDay": "6"}
    low = amounts(tiny)["result"]
    decimal_cross_check(tiny, low)
    assert low["derKcal"] == 33 and low["gramsPerDay"] == 4 and low["cupsPerDay"] == 0.02
    assert low["perMealGrams"] == [1, 1, 1, 1, 0, 0] and low["perMealCups"] == [0] * 6
    assert all(kcal > 0 for kcal in low["perMealKcal"])

    rounded_der = DEFAULT | {"foodKcalPer100g": "400"}
    value = amounts(rounded_der)["result"]
    wrong_raw_grams = math.floor(70 * math.pow(10, 0.75) * 1.6 * 100 / 400 + 0.5)
    assert (value["gramsPerDay"], wrong_raw_grams) == (158, 157)
    no_mass_density = DEFAULT | {"foodKcalPer100g": "", "foodKcalPerCup": "390"}
    assert amounts(no_mass_density) == invalid("EMPTY", "foodKcalPer100g")
    biggest = DEFAULT | {"weightKg": "100", "foodKcalPer100g": "20", "foodKcalPerCup": "50",
                         "mealsPerDay": "6"}
    assert amounts(biggest)["ok"]
    invalid_first = DEFAULT | {"species": "cat", "lifeStage": "puppy-under-4-months", "weightKg": "100"}
    assert amounts(invalid_first) == invalid("ENUM", "lifeStage")
    result = amounts(DEFAULT)["result"]
    serialized = (json.dumps(result, sort_keys=True, separators=(",", ":")) + "\n").encode()
    return {
        "weightLossWeightBasis": [{"input": target, "derived": target_result},
                                  {"input": entered_current, "derived": current_result}],
        "zeroRoundedPortions": {"input": tiny, "derived": low},
        "useRoundedDer": {"input": rounded_der, "derived": value, "rawDerGrams": wrong_raw_grams},
        "onlyCupDensity": {"input": no_mass_density, "derived": amounts(no_mass_density)},
        "largestDogAndMinimumDensities": {"input": biggest, "derived": amounts(biggest)},
        "wrongStageBeforeWeight": {"input": invalid_first, "derived": amounts(invalid_first)},
        "documentReport": {"utf8Bytes": len(serialized), "sha256": sha256(serialized).hexdigest(),
                           "jsonPlusLf": serialized.decode()},
    }


if __name__ == "__main__":
    raise SystemExit(verify_all(derive, probes))
