"""Offline verification of documentation literals. No product runtime is used."""
import argparse
import hashlib
import importlib.util
import json
import re
from decimal import Decimal, ROUND_HALF_EVEN, ROUND_HALF_UP
from fractions import Fraction
from math import ceil
from pathlib import Path

EVIDENCE = Path(__file__).resolve().parent
CANDIDATE = EVIDENCE.parents[3] / "docs/specs"
FIXED = None

def load_initial(slug):
    spec = importlib.util.spec_from_file_location(slug, EVIDENCE / (slug + "-oracle.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def read(path):
    return path.read_text(encoding="utf-8")

def file_identity(path):
    data = path.read_bytes()
    return {"path": path.relative_to(CANDIDATE).as_posix(), "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
            "gitBlob": hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()}

def offline_result(cases, run, flow):
    rows = []
    for case in cases:
        args = case["input"]
        observed = run(args) if case["kind"] == "core" else flow(case["id"], args)
        assert observed == case["expected"], (case["id"], observed, case["expected"])
        rows.append({"id": case["id"], "kind": case["kind"], "input": args, "expected": case["expected"], "observed": observed})
    return rows

def fixture_dict(path):
    data = json.loads(read(path))
    assert data["productChecks"] == "NOT_RUN"
    cases = {row["id"]: row for row in data["cases"]}
    assert len(cases) == len(data["cases"])
    return cases

def document_checks(slug, cases):
    folder = CANDIDATE / slug
    spec = read(folder / "SPEC.md")
    sections = re.findall(r"^## (\w+)$", spec, re.M)
    assert sections == ["goal", "scope", "userFlow", "inputsOutputs", "implementation", "acceptance", "tests", "handoff"]
    rubric = spec.split("## acceptance\n", 1)[1].split("## tests\n", 1)[0]
    ids = re.findall(r"^\| ([a-z][\w-]*) \|", rubric, re.M)
    assert ids == ["functionality", "boundaries", "privacy", "security", "usability", "accessibility",
                   "localization-seo", "toolchain-provenance", "compatibility"]
    test_table = spec.split("## tests\n", 1)[1].split("## handoff\n", 1)[0]
    table_ids = re.findall(r"^\| `([\w-]+)` \|", test_table, re.M)
    assert len(table_ids) == len(cases) and set(table_ids) == set(cases), (set(cases)-set(table_ids), set(table_ids)-set(cases))
    return spec

def fixed_deltas(slug, cases):
    if FIXED is None:
        return {"changedExisting": [], "addedIds": []}
    original = fixture_dict(FIXED / slug / "fixtures.json")
    assert set(original) <= set(cases)
    changes = []
    for cid, before in original.items():
        after = cases[cid]
        assert before["input"] == after["input"] and before["kind"] == after["kind"]
        if before["expected"] == after["expected"]:
            continue
        assert before["expected"]["ok"] and after["expected"]["ok"]
        previous = before["expected"]["result"]
        current = after["expected"]["result"]
        assert set(previous) <= set(current)
        old_values = {k: {"before": v, "after": current[k]} for k, v in previous.items() if v != current[k]}
        added = {k: v for k, v in current.items() if k not in previous}
        if cid == "solve-markup-repeating":
            assert old_values == {
                "priceCents": {"before": 1333, "after": 1334},
                "profitCents": {"before": 333, "after": 334},
                "marginHundredths": {"before": 2498, "after": 2504},
            }
        else:
            assert not old_values
        assert set(added) == {{"solve-markup": "actualMarkupHundredths", "solve-margin": "actualMarginHundredths"}[previous["mode"]]}
        changes.append({"id": cid, "existingValues": old_values, "addedFields": added})
    return {"changedExisting": changes, "addedIds": [cid for cid in cases if cid not in original]}

def breakeven():
    slug = "breakeven-calculator"
    original_oracle = load_initial(slug)
    cases = fixture_dict(CANDIDATE / slug / "fixtures.json")
    rows = offline_result(cases.values(), original_oracle.independently_compute, original_oracle.flow)
    spec = document_checks(slug, cases)
    deltas = fixed_deltas(slug, cases)
    assert len(rows) == 24 and not deltas["changedExisting"]
    copy_rows = [
        ("no-margin-equal", (-50000, -50000), "每賣一件的貢獻為零", "At any sales volume, the loss equals fixed costs."),
        ("no-margin-equal-zero-fixed", (0, 0), "任何銷量都剛好打平", "Every sales volume breaks even"),
        ("no-margin-negative", (-50000, -50100), "每多賣一件，虧損就增加", "Every sale increases the loss."),
        ("no-margin-negative-zero-fixed", (0, -2), "零銷量剛好打平", "Zero sales break even. Selling any units produces a loss."),
    ]
    profit_checks = []
    for cid, expected, zh, en in copy_rows:
        values = cases[cid]["input"]
        unit = Fraction(values["price"]) - Fraction(values["variableCost"])
        profits = tuple(q * unit - Fraction(values["fixedCost"]) for q in (0, 2))
        assert profits == expected
        assert cases[cid]["expected"] == {"ok": False, "error": {"code": "NO_MARGIN", "field": None, "row": None}}
        assert any(zh in row and en in row for row in spec.splitlines())
        profit_checks.append({"id": cid, "Q0": str(profits[0]), "Q2": str(profits[1]), "zhHant": zh, "en": en})
    ties = []
    for cid, exact, up, even in [
        ("ratio-half-up-tie", "2.675", "2.68", "2.68"),
        ("ratio-half-up-distinguishes-half-even", "2.665", "2.67", "2.66"),
    ]:
        values = cases[cid]["input"]
        p = Fraction(values["price"])
        fraction = (p - Fraction(values["variableCost"])) / p * 100
        decimal = Decimal(fraction.numerator) / Decimal(fraction.denominator)
        assert decimal == Decimal(exact)
        assert str(decimal.quantize(Decimal(".01"), rounding=ROUND_HALF_UP)) == up
        assert str(decimal.quantize(Decimal(".01"), rounding=ROUND_HALF_EVEN)) == even
        assert cases[cid]["expected"]["result"]["contributionMarginRatioPercent"] == up
        ties.append({"id": cid, "exactPercent": exact, "halfUp": up, "halfEven": even})
    return {"cases": rows, "deltas": deltas, "profitAndCopy": profit_checks, "ties": ties}

def markup_margin():
    slug = "markup-margin-calculator"
    oracle = load_initial(slug)
    report = oracle.do_calc
    cases = fixture_dict(CANDIDATE / slug / "fixtures.json")
    spec = document_checks(slug, cases)
    deltas = fixed_deltas(slug, cases)
    minimality = []
    def run(args):
        if not isinstance(args, dict) or args.get("mode") not in ("solve-markup", "solve-margin"):
            return report(args)
        if set(args) != oracle.FIELDS or not isinstance(args.get("cost"), str):
            return report(args)
        mode = args["mode"]
        k = oracle.MODES[mode]
        if not isinstance(args[k], str) or any(args[field] is not None for field in oracle.OTHER - {k}):
            return report(args)
        try:
            c = oracle.numeric(args["cost"], "cost", 2, 10, 1)
            milli = oracle.numeric(args[k], k, 3, 9, 0)
            t = Fraction(milli, 100_000)
            if k == "marginPercent" and t >= 1:
                raise oracle.Invalid("NO_SOLUTION", k)
            threshold = c * (1 + t) if k == "markupPercent" else c / (1 - t)
            price = ceil(threshold)
            if price > oracle.CAP:
                raise oracle.Invalid("RANGE", k)
        except oracle.Invalid as e:
            return e.receipt
        assert price - 1 < threshold <= price
        use_markup = mode == "solve-markup"
        current = Fraction(price - c, c if use_markup else price)
        previous = Fraction(price - 1 - c, c if use_markup else price - 1) if use_markup or price > 1 else None
        assert current >= t and (previous is None or previous < t)
        report_args = {"mode": "report", "cost": args["cost"], "price": f"{price // 100}.{price % 100:02}", "markupPercent": None, "marginPercent": None}
        rates = report(report_args)["result"]
        assert rates["profitCents"] == price - c
        minimality.append({"mode": mode, "costCents": c, "targetMilli": milli, "exactThresholdCents": str(threshold),
                           "priceCents": price, "targetMetricAtPrice": str(current),
                           "targetMetricOneCentLess": None if previous is None else str(previous)})
        actual = ("actualMarkupHundredths", "marginHundredths") if use_markup else ("markupHundredths", "actualMarginHundredths")
        result = {"mode": mode, "costCents": c, k + "Milli": milli, "priceCents": price, "profitCents": price - c,
                  actual[0]: rates["markupHundredths"], actual[1]: rates["marginHundredths"]}
        return {"ok": True, "result": result}
    oracle.do_calc = run
    rows = offline_result(cases.values(), run, oracle.derive_flow)
    assert len(rows) == 41 and len(minimality) == 13
    if FIXED is not None:
        assert len(deltas["changedExisting"]) == 10
    assert any(row["mode"] == "solve-margin" and row["targetMetricOneCentLess"] is None for row in minimality)
    for case_id in ("report-one-cent-at-cost", "report-two-cent-actual-rates"):
        price = cases[case_id]["expected"]["result"]["priceCents"]
        assert price in (1, 2)
        vals = cases[case_id]["expected"]["result"]
        assert [vals[k] for k in ("markupHundredths", "marginHundredths")] == ([0, 0] if price == 1 else [10000, 5000])
    free = cases["report-free-price"]["expected"]["result"]
    assert free["belowCost"] and free["marginHundredths"] is None and free["markupHundredths"] == -10000
    assert "售價低於成本。 / The price is below cost." in spec
    assert "毛利率無法定義（售價為零）/ Margin is undefined (the price is zero)." in spec
    assert "兩率為負" not in spec and "both rates are negative" not in spec
    for label in ("Target markup", "Target margin", "Actual markup", "Actual margin", "This price meets the target."):
        assert label in spec
    cap = Fraction(99992000 * 100008, 100000)
    assert oracle.CAP < cap < oracle.CAP + Fraction(1, 2) and ceil(cap) == oracle.CAP + 1
    downloads = []
    for cid, literal in [
        ("solve-markup-one-cent-target", '{"actualMarkupHundredths":10000,"costCents":1,"marginHundredths":5000,"markupPercentMilli":25000,"mode":"solve-markup","priceCents":2,"profitCents":1}\n'),
        ("solve-margin-one-cent-target", '{"actualMarginHundredths":5000,"costCents":1,"marginPercentMilli":25000,"markupHundredths":10000,"mode":"solve-margin","priceCents":2,"profitCents":1}\n'),
    ]:
        payload = (json.dumps(cases[cid]["expected"]["result"], sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
        assert payload == literal.encode("utf-8")
        downloads.append({"id": cid, "name": "markup-margin-report.json", "bytes": len(payload),
                          "sha256": hashlib.sha256(payload).hexdigest(), "text": literal})
    return {"cases": rows, "deltas": deltas, "minimality": minimality, "downloads": downloads, "capThresholdCents": str(cap)}

def main():
    global FIXED
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixed", type=Path, help="Optional directory containing the two original slug folders")
    FIXED = parser.parse_args().fixed
    manifest = json.loads(read(EVIDENCE / "manifest.json"))
    results = {"breakeven-calculator": breakeven(), "markup-margin-calculator": markup_margin()}
    expected = {f"{slug}/{name}" for slug in results for name in ("BRIEF.md", "SPEC.md", "fixtures.json", "AUTHOR-CHECK.md")}
    paths = sorted(path for slug in results for path in (CANDIDATE / slug).rglob("*") if path.is_file())
    assert {p.relative_to(CANDIDATE).as_posix() for p in paths} == expected
    identity = [file_identity(path) for path in paths]
    assert identity == manifest["candidateFiles"]
    if FIXED is not None:
        for row in manifest["originalFiles"]:
            fixed = FIXED / row["slug"] / row["file"]
            data = fixed.read_bytes()
            assert len(data) == row["bytes"]
            assert hashlib.sha256(data).hexdigest() == row["sha256"]
            assert hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest() == row["blob"]
        print("Fixed original files and fixture deltas PASS")
    for slug, report in results.items():
        core = sum(row["kind"] == "core" for row in report["cases"])
        print(f"{slug}: {core} core + {len(report['cases']) - core} state models PASS")
    print("Candidate SHA-256, scope, exact minimality, bilingual contract text and document download bytes PASS")

if __name__ == "__main__":
    main()
