"""Independent document oracle; no product code or author verification imported."""
import hashlib
import json
import math
import re
import sys
from decimal import Decimal, ROUND_HALF_EVEN
from fractions import Fraction
from pathlib import Path

FIELDS = ("fixedCost", "price", "variableCost", "expectedUnits")
DEFAULT = {"fixedCost": "100000", "price": "400", "variableCost": "150", "expectedUnits": ""}

def error(code, field=None):
    return {"ok": False, "error": {"code": code, "field": field, "row": None}}

def fixed(v, places):
    x = math.floor(Fraction(v) * (10**places) + Fraction(1, 2))
    whole, frac = divmod(abs(x), 10**places)
    return f"{'-' if x < 0 else ''}{whole}.{frac:0{places}d}"

def independently_compute(data):
    if not isinstance(data, dict) or set(data) != set(FIELDS) or any(type(data[k]) is not str for k in FIELDS):
        return error("SCHEMA")
    values = {}
    for k in FIELDS:
        s = data[k]
        is_units = k == "expectedUnits"
        if len(s.encode("utf-16-le", errors="surrogatepass")) // 2 > (9 if is_units else 12):
            return error("INPUT_LIMIT", k)
        try:
            s.encode("utf-16-le")
        except UnicodeEncodeError:
            return error("UNICODE", k)
        if not s:
            if is_units:
                values[k] = None
                continue
            return error("EMPTY", k)
        if not re.fullmatch(r"(0|[1-9][0-9]*)" + ("" if is_units else r"(\.[0-9]{1,2})?"), s):
            return error("INTEGER_FORMAT" if is_units else "DECIMAL_FORMAT", k)
        values[k] = int(s) if is_units else Fraction(s)
        lo = Fraction(1,100) if k == "price" else 0
        hi = 100_000_000 if is_units else Fraction("999999999.99")
        if not lo <= values[k] <= hi:
            return error("RANGE", k)
    f,p,v,e = (values[k] for k in FIELDS)
    margin = p-v
    if margin <= 0:
        return error("NO_MARGIN")
    # Solve q*p = f + q*v and check actual profit at adjacent integers.
    exact = f/margin
    u = math.ceil(exact)
    profit = lambda q: q*p - (f+q*v)
    assert profit(u) >= 0 and (not u or profit(u-1) < 0)
    assert 0 <= u*p - exact*p < p
    return {"ok": True, "result": {
        "breakevenRevenue": fixed(u*p, 2), "breakevenRevenueExact": fixed(exact*p, 2),
        "breakevenUnits": u, "breakevenUnitsExact": fixed(exact, 4),
        "contributionMarginPerUnit": fixed(margin, 2), "contributionMarginRatioPercent": fixed(margin/p*100, 2),
        "marginOfSafety": None if e is None else {
            "expectedUnits": e, "units": e-u, "percent": None if not e else fixed(Fraction(e-u,e)*100, 2),
            "expectedProfit": fixed(profit(e), 2), "belowBreakeven": e < u}}}

class State:
    def __init__(self):
        self.g = 0
        self.reset()
    def reset(self):
        self.g += 1
        self.draft, self.state, self.report, self.err = DEFAULT.copy(), "empty", False, None
    def edit(self,draft):
        self.g += 1
        self.draft,self.state,self.report,self.err = draft.copy(),"dirty",False,None
    def start(self):
        self.g += 1
        self.state,self.report,self.err = "busy",False,None
        return self.g
    def cancel(self):
        self.g += 1
        self.state,self.report,self.err = "cancelled",False,None
    def complete(self,g,result):
        if self.g == g and self.state == "busy":
            self.report = result["ok"]
            self.state = "success" if self.report else "error"
            self.err = result.get("error")
    def snapshot(self, draft=False):
        out = {"reportAvailable":self.report,"state":self.state}
        if self.err is not None:
            out["error"] = self.err
        if draft:
            out["draft"] = self.draft
        return out

def flow(id, d):
    s = State()
    p = {}
    if id == "state-dirty-error":
        s.edit(d["initial"]); s.complete(s.start(), independently_compute(s.draft)); p["afterRun"] = s.snapshot()
        s.edit(d["edit"]); p["afterEdit"] = s.snapshot()
        s.complete(s.start(), independently_compute(s.draft)); p["afterRerun"] = s.snapshot()
    elif id == "state-cancel-late":
        s.edit(d["draft"]); g = s.start()
        late = independently_compute(s.draft)
        assert late["result"] == d["lateResult"]
        p["whilePending"] = s.snapshot()
        s.cancel(); p["afterCancel"] = s.snapshot(True)
        s.complete(g,late); p["afterLateResult"] = s.snapshot()
        s.reset(); p["afterReset"] = s.snapshot(True)
    elif id == "state-replace-late":
        s.edit(d["olderDraft"]); old = s.start()
        late = independently_compute(s.draft)
        assert late["result"] == d["olderLateResult"]
        s.edit(d["newerDraft"]); s.complete(s.start(), independently_compute(s.draft))
        p["afterNewerResult"] = s.snapshot()
        s.complete(old,late); p["afterOlderLateResult"] = s.snapshot()
    else:
        raise ValueError(id)
    return p

def main():
    f = Path(sys.argv[1]).read_bytes()
    source = json.loads(f)
    result = []
    for c in source["cases"]:
        derived = independently_compute(c["input"]) if c["kind"] == "core" else flow(c["id"],c["input"])
        status = "PASS" if derived == c["expected"] else "FAIL"
        result.append({"id":c["id"],"kind":c["kind"],"status":status,"input":c["input"],"fixtureExpected":c["expected"],"derived":derived})
    probes = []
    for fc,v in [("0","10"),("0","11"),("20","10")]:
        d = {"fixedCost":fc,"price":"10","variableCost":v,"expectedUnits":"2"}
        profits = {str(q):fixed((10-int(v))*q-int(fc),2) for q in [0,1,2,100]}
        probes.append({"id":"BE-01","input":d,"specResult":independently_compute(d),"profitAtUnits":profits})
    for p,v in [("40.00","38.93"),("200.00","194.67")]:
        ratio = (Fraction(p)-Fraction(v))/Fraction(p)*100
        exact_decimal = Decimal(ratio.numerator)/Decimal(ratio.denominator)
        probes.append({"id":"BE-02","price":p,"variableCost":v,"exact":str(exact_decimal),
                       "halfUp":fixed(ratio,2),"halfEven":str(exact_decimal.quantize(Decimal(".01"),rounding=ROUND_HALF_EVEN))})
    for d in [DEFAULT|{"fixedCost":"999999999.99","price":"0.01","variableCost":"0","expectedUnits":"100000000"},
              DEFAULT|{"price":"0","variableCost":"200","expectedUnits":"2.5"},
              DEFAULT|{"fixedCost":"\ud800"}]:
        probes.append({"id":"boundary","input":d,"derived":independently_compute(d)})
    b = (json.dumps(result[0]["derived"]["result"],separators=(",",":"),sort_keys=True)+"\n").encode("utf8")
    n = sum(r["status"] == "PASS" for r in result)
    print(json.dumps({"fixtureSha256":hashlib.sha256(f).hexdigest(),"summary":{"pass":n,"total":len(result)},
                      "cases":result,"probes":probes,
                      "reportSample":{"name":"breakeven-report.json","text":b.decode(),"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()}},ensure_ascii=True,indent=2))
    return int(n != len(result))

if __name__ == "__main__":
    sys.exit(main())
