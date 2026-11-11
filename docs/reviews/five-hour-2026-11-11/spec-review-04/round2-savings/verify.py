"""Independent, offline specification verifier for fixed savings proposal PR #306."""

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path
from random import Random


HERE = Path(__file__).resolve().parent
LIMIT = 1200
RATE_DIVISOR = 120_000
AMOUNT_LIMIT = 99_999_999_999
DEFAULT = {
    "mode": "payment", "targetAmount": "100000", "initialAmount": "10000",
    "annualRate": "3", "months": "60", "monthlyPayment": "3000",
}
CAPS = dict(zip(DEFAULT, (16, 16, 16, 8, 8, 16), strict=True))
INACTIVE = {"payment": "monthlyPayment", "months": "months"}
FIXTURES = {
    "original": "b4115210a148532133b2ec728ed87772b59ca3af98a76adc28cccaa014405979",
    "revised": "7ccf7239d2b5bfe209a69c9b711b4533f8d1ae231b84e160ac02d08caf1f3632",
}


def reject(code, field=None):
    return {"ok": False, "error": {"code": code, "field": field, "row": None}}


def first_error_or_parse(draft):
    if type(draft) is not dict or draft.keys() != DEFAULT.keys():
        return None, reject("SCHEMA")
    if any(type(value) is not str for value in draft.values()):
        return None, reject("SCHEMA")
    values = {}
    for field, limit in CAPS.items():
        raw = draft[field]
        utf16 = raw.encode("utf-16-le", errors="surrogatepass")
        if len(utf16) > 2 * limit:
            return None, reject("INPUT_LIMIT", field)
        if INACTIVE.get(draft["mode"]) == field:
            continue
        try:
            utf16.decode("utf-16-le")
        except UnicodeDecodeError:
            return None, reject("UNICODE", field)
        if raw == "":
            return None, reject("EMPTY", field)
        if field == "mode":
            if raw not in INACTIVE:
                return None, reject("ENUM", field)
            continue
        if field == "months":
            if not re.fullmatch(r"[0-9]+", raw):
                return None, reject("INTEGER_FORMAT", field)
            value, lower, upper = int(raw), 1, 600
        else:
            if not re.fullmatch(r"[0-9]+(?:\.[0-9]{1,2})?", raw):
                return None, reject("DECIMAL_FORMAT", field)
            whole, _, fraction = raw.partition(".")
            value = 100 * int(whole) + int(fraction.ljust(2, "0"))
            lower = int(field == "targetAmount")
            upper = 10_000 if field == "annualRate" else AMOUNT_LIMIT
        if not lower <= value <= upper:
            return None, reject("RANGE", field)
        values[field] = value
    return values, None


def amount(cents):
    assert type(cents) is int and cents >= 0
    whole, fraction = divmod(cents, 100)
    return f"{whole}.{fraction:02d}"


def half_up(value):
    value = Fraction(value)
    whole, remainder = divmod(value.numerator, value.denominator)
    return whole + int(2 * remainder >= value.denominator)


def decimal_cents(value, places=8):
    scale = 10 ** places
    whole, digits = divmod(half_up(value * scale), scale)
    return f"{whole}.{digits:0{places}d}"


def ledger(initial, payment, rate, term):
    paid = initial
    earned = Fraction(0)
    for month in range(1, term + 1):
        prior = paid + earned
        earned += prior * rate
        yield month, prior, paid + earned, earned
        paid += payment


def first_integer(lo, hi, condition):
    while lo < hi:
        mid = (lo + hi) // 2
        if condition(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo


def display_cash(initial, deposited, ending, earned):
    assert earned >= 0 and ending == initial + deposited + earned
    final = half_up(ending)
    displayed_interest = final - initial - deposited
    assert displayed_interest == half_up(earned)
    return {
        "totalDeposits": amount(deposited), "totalInterest": amount(displayed_interest),
        "finalBalance": amount(final),
    }


def payment_plan(initial, target, bp, term):
    rate = Fraction(bp, RATE_DIVISOR)
    # Evaluate the ledger at zero and one cent. The balance is affine in the deposit.
    for _, _, before, _ in ledger(initial, 0, rate, term):
        base = before
    for _, _, before, _ in ledger(0, 1, rate, term):
        per_cent = before + 1
    payment = first_integer(0, target, lambda cents: base + cents * per_cent >= target)
    ending = base + payment * per_cent
    assert ending >= target and (payment == 0 or ending - per_cent < target)
    deposits = payment * term
    status = "ok"
    if payment == 0:
        status = "already-funded" if initial >= target else "growth-sufficient"
    return {
        "mode": "payment", "status": status, "months": term, "monthlyPayment": amount(payment),
        **display_cash(initial, deposits, ending, ending - initial - deposits),
    }


def months_plan(initial, target, bp, payment):
    result = {"mode": "months", "targetAmount": amount(target), "reason": None}
    if initial >= target:
        return {
            **result, "status": "already-funded", "monthsRequired": 0,
            "finalMonthPayment": "0.00", "balanceIfFullPayment": amount(initial),
            **display_cash(initial, 0, initial, 0),
        }, None

    reason = "no-growth" if payment == 0 and initial * bp == 0 else "beyond-horizon"
    horizon = None
    if reason == "beyond-horizon":
        rate = Fraction(bp, RATE_DIVISOR)
        for month, prior, before_tail, earned in ledger(initial, payment, rate, LIMIT):
            full = before_tail + payment
            if full < target:
                horizon = full
                continue
            # Target is an integer number of cents. Its difference from floor(before_tail)
            # is the least integer credit that brings the exact balance to target.
            tail = max(0, target - (before_tail.numerator // before_tail.denominator))
            final = before_tail + tail
            deposited = payment * (month - 1) + tail
            assert prior < target <= full and 0 <= tail <= payment
            assert (final - 1 < target <= final) if tail else (before_tail >= target)
            return {
                **result, "status": "ok", "monthsRequired": month,
                "finalMonthPayment": amount(tail), "balanceIfFullPayment": amount(half_up(full)),
                **display_cash(initial, deposited, final, earned),
            }, {
                "priorMonthCents": decimal_cents(prior),
                "beforeTailCents": decimal_cents(before_tail),
                "plannedEndingCents": decimal_cents(final),
                "earnedInterestCents": decimal_cents(earned),
                "exactPriorBelowGoal": prior < target,
                "oneCentLessFails": final - 1 < target if tail else None,
            }
    return {
        **result, "status": "unreachable", "reason": reason, "monthsRequired": None,
        "finalMonthPayment": None, "balanceIfFullPayment": None, "totalDeposits": None,
        "totalInterest": None, "finalBalance": None,
    }, {
        "exactHorizonBelowGoal": horizon < target,
        "horizonCents": decimal_cents(horizon),
        "horizonDisplay": amount(half_up(horizon)),
    } if horizon is not None else None


def calculate(draft):
    values, error = first_error_or_parse(draft)
    if error:
        return error, None
    params = (values["initialAmount"], values["targetAmount"], values["annualRate"])
    if draft["mode"] == "payment":
        return {"ok": True, "result": payment_plan(*params, values["months"])}, None
    result, facts = months_plan(*params, values["monthlyPayment"])
    return {"ok": True, "result": result}, facts


def bounded_evaluator(initial, payment, bp, evaluated):
    def at(month):
        if type(month) is not int or not 0 <= month <= LIMIT:
            raise ValueError("Month index outside 0–1200")
        evaluated.append(month)
        if bp == 0:
            return initial + payment * month
        power = Fraction((RATE_DIVISOR + bp) ** month, RATE_DIVISOR ** month)
        return initial * power + payment * (power - 1) * RATE_DIVISOR / bp
    return at


def inspect_bounded_search(draft, answer):
    values, error = first_error_or_parse(draft)
    if error or draft["mode"] != "months" or answer["status"] == "already-funded":
        return None
    if answer["reason"] == "no-growth":
        return None
    initial, target, bp, payment = (values[k] for k in (
        "initialAmount", "targetAmount", "annualRate", "monthlyPayment",
    ))
    evaluated = []
    at = bounded_evaluator(initial, payment, bp, evaluated)
    horizon = at(LIMIT)
    if horizon < target:
        assert answer["reason"] == "beyond-horizon" and evaluated == [LIMIT]
        return {"preflightMonth": LIMIT, "preflightDisplay": amount(half_up(horizon)),
                "binaryIndices": [], "verificationIndices": []}

    if bp == 0:
        needed = target - initial
        first = (needed + payment - 1) // payment
    else:
        first = first_integer(1, LIMIT, lambda month: at(month) >= target)
    midpoints = evaluated[1:]
    assert len(midpoints) <= 11 and first == answer["monthsRequired"]
    assert at(first - 1) < target <= at(first)
    assert max(evaluated) == LIMIT and min(evaluated) >= 0
    return {"preflightMonth": LIMIT, "preflightDisplay": amount(half_up(horizon)),
            "binaryIndices": midpoints, "verificationIndices": evaluated[1 + len(midpoints):]}


def search_limit_proof():
    evaluated = []
    at = bounded_evaluator(1, 0, 1, evaluated)
    rejected = [-1, LIMIT + 1, 3_039_425, 1.5, True]
    for month in rejected:
        try:
            at(month)
        except ValueError:
            continue
        raise AssertionError(f"Index unexpectedly accepted: {month}")
    assert evaluated == []
    assert 10 ** 6136 <= 130_000 ** LIMIT < 10 ** 6137
    comparisons = Counter()
    for crossing in range(1, LIMIT + 1):
        visited = []

        def reaches(index):
            visited.append(index)
            return index >= crossing

        assert first_integer(1, LIMIT, reaches) == crossing
        assert all(1 <= index <= LIMIT for index in visited)
        comparisons[len(visited)] += 1
    assert max(comparisons) == 11
    return {"rejectedBeforeArithmetic": rejected, "integerCrossings": LIMIT,
            "midpointCountDistribution": dict(sorted(comparisons.items())),
            "maximumMidpoints": max(comparisons), "maxUnreducedPowerDigits": 6137}


@dataclass
class Model:
    state: str = "empty"
    draft: dict | None = None
    active: object | None = None
    error: dict | None = None

    def stage(self, state, draft):
        self.state, self.draft, self.active, self.error = state, draft, None, None

    def begin(self, draft):
        self.stage("busy", draft)
        self.active = object()
        return self.active, calculate(draft)[0]

    def deliver(self, token, response):
        if self.state == "busy" and token is self.active:
            self.stage("success" if response["ok"] else "error", self.draft)
            self.error = response.get("error")

    def see(self, with_draft=False):
        result = {"state": self.state, "reportAvailable": self.state == "success"}
        if self.error:
            result["error"] = self.error
        if with_draft:
            result["draft"] = self.draft
        return result


def controller(case_id, inputs):
    model = Model()
    if case_id == "state-dirty-error":
        model.deliver(*model.begin(inputs["initial"]))
        ran = model.see()
        model.stage("dirty", inputs["edit"])
        edited = model.see()
        model.deliver(*model.begin(inputs["edit"]))
        return {"afterRun": ran, "afterEdit": edited, "afterRerun": model.see()}
    if case_id == "state-cancel-late":
        old = model.begin(inputs["draft"])
        assert old[1]["result"] == inputs["lateResult"]
        pending = model.see()
        model.stage("cancelled", inputs["draft"])
        cancelled = model.see(with_draft=True)
        model.deliver(*old)
        late = model.see()
        model.stage("empty", DEFAULT)
        return {"whilePending": pending, "afterCancel": cancelled, "afterLateResult": late,
                "afterReset": model.see(with_draft=True)}
    assert case_id == "state-replace-late"
    old = model.begin(inputs["olderDraft"])
    assert old[1]["result"] == inputs["olderLateResult"]
    model.deliver(*model.begin(inputs["newerDraft"]))
    fresh = model.see()
    model.deliver(*old)
    return {"afterNewerResult": fresh, "afterOlderLateResult": model.see()}


def load_fixture(name):
    data = (HERE / "fixtures" / f"{name}.json").read_bytes()
    assert hashlib.sha256(data).hexdigest() == FIXTURES[name]
    return json.loads(data)


def compare_versions(old, new):
    assert {k: v for k, v in old.items() if k != "cases"} == {
        k: v for k, v in new.items() if k != "cases"
    }
    prior = {case["id"]: case for case in old["cases"]}
    revised = {case["id"]: case for case in new["cases"]}
    assert len(prior) == len(old["cases"]) == 21
    assert len(revised) == len(new["cases"]) == 26
    assert prior.keys() <= revised.keys()
    changes = {}
    purpose_edits = {}
    for case_id, before in prior.items():
        after = revised[case_id]
        assert {k: v for k, v in before.items() if k not in ("expected", "purpose")} == {
            k: v for k, v in after.items() if k not in ("expected", "purpose")
        }
        if before["purpose"] != after["purpose"]:
            purpose_edits[case_id] = {"before": before["purpose"], "after": after["purpose"]}
        if before["expected"] == after["expected"]:
            continue
        older = before["expected"]["result"]
        newer = after["expected"]["result"]
        assert older.keys() < newer.keys() and newer.keys() - older.keys() == {"targetAmount"}
        changes[case_id] = {
            key: {"before": older.get(key), "after": value}
            for key, value in newer.items() if key not in older or older[key] != value
        }
        expected = {"targetAmount"}
        if case_id in ("months-with-interest", "months-growth-only-crossing"):
            expected |= {"finalBalance", "totalInterest"}
        assert changes[case_id].keys() == expected
    assert len(changes) == 7
    assert purpose_edits.keys() == {
        "months-with-interest", "months-growth-only-crossing",
        "months-unreachable-no-growth", "months-unreachable-horizon",
    }
    return {"retained": len(prior), "unchanged": len(prior) - len(changes),
            "removed": [], "added": sorted(revised.keys() - prior.keys()),
            "expectedChanges": changes, "purposeEdits": purpose_edits}


def draft(**changes):
    return {**DEFAULT, **changes}


def extra_checks():
    math_cases = [
        ("positive-rate-at-month-1200", draft(mode="months", targetAmount="1205.50",
         initialAmount="0", annualRate="0.01", monthlyPayment="1"), {"monthsRequired": 1200}),
        ("rounded-horizon-still-short", draft(mode="months", targetAmount="0.56",
         initialAmount="0.55", annualRate="0.01", monthlyPayment="0"),
         {"status": "unreachable", "reason": "beyond-horizon"}),
        ("zero-tail-with-positive-deposit", draft(mode="months", targetAmount="101",
         initialAmount="100", annualRate="12", monthlyPayment="10"),
         {"finalMonthPayment": "0.00", "balanceIfFullPayment": "111.00", "finalBalance": "101.00"}),
        ("mode-a-largest-initial-and-term", draft(targetAmount="999999999.99",
         initialAmount="999999999.99", annualRate="100", months="600"),
         {"status": "already-funded", "monthlyPayment": "0.00", "totalDeposits": "0.00"}),
    ]
    results = {}
    for case_id, inputs, expected in math_cases:
        response, facts = calculate(inputs)
        result = response["result"]
        assert all(result[key] == value for key, value in expected.items()), case_id
        if case_id == "rounded-horizon-still-short":
            assert facts["horizonDisplay"] == result["targetAmount"] and facts["exactHorizonBelowGoal"]
        results[case_id] = {"input": inputs, "result": result, "ledger": facts,
                            "search": inspect_bounded_search(inputs, result)}

    error_cases = [
        (draft(targetAmount="0", annualRate="12.345"), reject("RANGE", "targetAmount")),
        (draft(unknown=""), reject("SCHEMA")),
        (draft(months=12), reject("SCHEMA")),
        (draft(targetAmount="999999999.99", initialAmount="1000000000"),
         reject("RANGE", "initialAmount")),
        (draft(annualRate="100.01"), reject("RANGE", "annualRate")),
        (draft(annualRate="\ud800"), reject("UNICODE", "annualRate")),
        (draft(monthlyPayment="🙂" * 9), reject("INPUT_LIMIT", "monthlyPayment")),
        (draft(mode="months", months="x" * 9), reject("INPUT_LIMIT", "months")),
    ]
    for inputs, expected in error_cases:
        assert calculate(inputs)[0] == expected, inputs
    results["first-error"] = [{"input": inputs, "result": expected} for inputs, expected in error_cases]

    rng = Random(306)
    for _ in range(48):
        principal = rng.randrange(0, 2500)
        rate = rng.randrange(0, 10_001)
        target = rng.randrange(1, 5001)
        term = rng.randrange(1, 35)
        payment_plan(principal, target, rate, term)
        monthly = rng.randrange(5, 201)
        result, _ = months_plan(principal, target, rate, monthly)
        assert result["status"] in ("ok", "already-funded")
    results["nonnegative-interest-sweep"] = {"seed": 306, "paymentCases": 48, "monthsCases": 48}
    return results


def rounded_model_comparison():
    old_balance = 1
    old_rate = Fraction(1, 100)
    for _ in range(600):
        old_balance += half_up(old_balance * old_rate)
    assert old_balance == 1
    new_balances = {
        month: decimal_cents(before)
        for month, _, before, _ in ledger(1, 0, old_rate, 70) if month in (69, 70)
    }
    return {"oldBalanceCentsAt600": old_balance, "preciseBalanceCentsByMonth": new_balances}


def canonical_report(inputs, result):
    # All keys in the fixed input and result shape are ASCII. Lone surrogate
    # code units in inactive raw drafts must be escaped before encoding UTF-8.
    compact = json.dumps({"input": inputs, "result": result}, ensure_ascii=False,
                         sort_keys=True, separators=(",", ":"))
    compact = re.sub(r"[\ud800-\udfff]", lambda m: f"\\u{ord(m[0]):04x}", compact)
    return (compact + "\n").encode("utf-8")


def reports(cases):
    baseline = cases["months-with-interest"]["input"]
    examples = [
        ("months-with-interest", baseline,
         '{"input":{"annualRate":"6","initialAmount":"5000","mode":"months",'
         '"monthlyPayment":"300","months":"60","targetAmount":"20000"},'
         '"result":{"balanceIfFullPayment":"20147.13","finalBalance":"20000.01",'
         '"finalMonthPayment":"152.88","mode":"months","monthsRequired":42,"reason":null,'
         '"status":"ok","targetAmount":"20000.00","totalDeposits":"12452.88",'
         '"totalInterest":"2547.13"}}\n'),
        ("payment-preserves-unused-deposit", draft(targetAmount="13", initialAmount="10",
         annualRate="0", months="3", monthlyPayment="試算🙂"),
         '{"input":{"annualRate":"0","initialAmount":"10","mode":"payment",'
         '"monthlyPayment":"試算🙂","months":"3","targetAmount":"13"},'
         '"result":{"finalBalance":"13.00","mode":"payment","monthlyPayment":"1.00",'
         '"months":3,"status":"ok","totalDeposits":"3.00","totalInterest":"0.00"}}\n'),
        ("months-preserves-unused-term", {**cases["months-one-cent-tail"]["input"],
         "months": "壞🙂\ud800"},
         '{"input":{"annualRate":"12","initialAmount":"0.50","mode":"months",'
         '"monthlyPayment":"0.01","months":"壞🙂\\ud800","targetAmount":"0000.51"},'
         '"result":{"balanceIfFullPayment":"0.52","finalBalance":"0.52",'
         '"finalMonthPayment":"0.01","mode":"months","monthsRequired":1,"reason":null,'
         '"status":"ok","targetAmount":"0.51","totalDeposits":"0.01","totalInterest":"0.01"}}\n'),
    ]
    receipt = {}
    for case_id, inputs, literal in examples:
        result = calculate(inputs)[0]["result"]
        data = canonical_report(inputs, result)
        assert data == literal.encode("utf-8"), case_id
        assert json.loads(data) == {"input": inputs, "result": result}
        assert not data.startswith(b"\xef\xbb\xbf") and data[-1:] == b"\n"
        receipt[case_id] = {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
                            "text": data.decode("utf-8")}
    return receipt


def verify():
    old, new = (load_fixture(name) for name in FIXTURES)
    delta = compare_versions(old, new)
    cases = {case["id"]: case for case in new["cases"]}
    rows = {}
    kinds = Counter()
    for case_id, case in cases.items():
        kinds[case["kind"]] += 1
        if case["kind"] == "core":
            answer, facts = calculate(case["input"])
            search = inspect_bounded_search(case["input"], answer["result"]) if answer["ok"] else None
        else:
            assert case["kind"] == "controller"
            answer, facts, search = controller(case_id, case["input"]), None, None
        assert answer == case["expected"], (case_id, answer, case["expected"])
        rows[case_id] = {"actual": answer, "ledger": facts, "search": search}
    assert kinds == {"core": 23, "controller": 3}
    return {
        "fixtureSha256": FIXTURES, "literalChecks": dict(kinds), "cases": rows,
        "originalDelta": delta, "boundedSearchProof": search_limit_proof(),
        "previousModel": rounded_model_comparison(), "canonicalReports": reports(cases),
        "extraChecks": extra_checks(), "productAndBrowserChecks": "NOT_RUN",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="compare to bundled verification.json")
    mode.add_argument("--write", action="store_true", help="write verification.json beside this script")
    args = parser.parse_args()
    data = (json.dumps(verify(), indent=2, ensure_ascii=True) + "\n").encode()
    evidence = HERE / "verification.json"
    if args.write:
        evidence.write_bytes(data)
        print("Wrote verification.json.")
        return
    if args.check:
        assert data == evidence.read_bytes(), "Verification evidence changed"
        print("26/26 literal fixtures, 21 original cases, 1,200 search thresholds and 3 reports verified.")
    else:
        sys.stdout.buffer.write(data)


if __name__ == "__main__":
    main()
