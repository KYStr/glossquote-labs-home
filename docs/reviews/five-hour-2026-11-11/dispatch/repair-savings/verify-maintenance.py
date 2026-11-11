"""Verify the maintenance fixtures with an exact recurrence and audit the proposed bound.

Parser, mode-A recurrence and controller cases derive from the fixed initial review
verifier. The recurrence supplies the oracle. A separate closed-form check measures
which indices the proposed bounded search requests. No product modules are imported.
"""
import hashlib
import json
import math
import re
import sys
from fractions import Fraction as Q
from pathlib import Path

RESET={"mode":"payment","targetAmount":"100000","initialAmount":"10000","annualRate":"3","months":"60","monthlyPayment":"3000"}
KEYS=list(RESET)
CAP={"mode":16,"targetAmount":16,"initialAmount":16,"annualRate":8,"months":8,"monthlyPayment":16}
HORIZON=1200
AMOUNT_MAX=99_999_999_999

class Invalid(Exception):
    def __init__(self,code,field=None):
        self.receipt={"ok":False,"error":{"code":code,"field":field,"row":None}}

def parse(d):
    if not isinstance(d,dict) or set(d)!=set(KEYS) or any(type(d[k]) is not str for k in KEYS): raise Invalid("SCHEMA")
    mode=d["mode"]
    out={}
    for k in KEYS:
        s=d[k]
        if len(s.encode("utf-16-le",errors="surrogatepass"))//2>CAP[k]: raise Invalid("INPUT_LIMIT",k)
        if (k=="months" and mode=="months") or (k=="monthlyPayment" and mode=="payment"): continue
        try: s.encode("utf-16-le")
        except UnicodeEncodeError: raise Invalid("UNICODE",k)
        if not s: raise Invalid("EMPTY",k)
        if k=="mode":
            if s not in ("payment","months"): raise Invalid("ENUM",k)
            continue
        if k=="months":
            if not re.fullmatch(r"[0-9]+",s): raise Invalid("INTEGER_FORMAT",k)
            x=int(s); lo,hi=1,600
        else:
            if not re.fullmatch(r"[0-9]+(?:\.[0-9]{1,2})?",s): raise Invalid("DECIMAL_FORMAT",k)
            x=int(Q(s)*100)
            lo=1 if k=="targetAmount" else 0
            hi=10000 if k=="annualRate" else AMOUNT_MAX
        if not lo<=x<=hi: raise Invalid("RANGE",k)
        out[k]=x
    return mode,out

def round_cent(q):
    return math.floor(q+Q(1,2))

def money(c):
    return f"{'-' if c<0 else ''}{abs(c)//100}.{abs(c)%100:02d}"

def unreachable(reason, goal):
    return {
        "mode": "months", "status": "unreachable", "reason": reason,
        "targetAmount": money(goal), "monthsRequired": None,
        "finalMonthPayment": None, "balanceIfFullPayment": None,
        "totalDeposits": None, "totalInterest": None, "finalBalance": None,
    }


def bounded_index(start, payment, goal, q):
    indices = []

    def evaluate(n):
        if type(n) is not int or not 0 <= n <= HORIZON:
            raise ValueError("Balance and exponent index outside 0–1200")
        indices.append(n)
        if q == 1:
            return start + n * payment
        power = q ** n
        return start * power + payment * (power - 1) / (q - 1)

    for forbidden in (-1, HORIZON + 1):
        try:
            evaluate(forbidden)
        except ValueError:
            pass
        else:
            raise AssertionError("Out-of-range evaluation passed the index guard")

    horizon_balance = evaluate(HORIZON)
    if horizon_balance < goal:
        return None, horizon_balance, indices

    if q == 1:
        month = (goal - start + payment - 1) // payment
    else:
        low, high = 1, HORIZON
        while low < high:
            mid = (low + high) // 2
            if evaluate(mid) >= goal:
                high = mid
            else:
                low = mid + 1
        assert len(indices) <= 12  # Horizon preflight plus at most 11 comparisons.
        month = low
    assert evaluate(month - 1) < goal <= evaluate(month)
    return month, None, indices


def months_plan(start, payment, goal, q):
    if start >= goal:
        return {
            "mode": "months", "status": "already-funded", "reason": None,
            "targetAmount": money(goal), "monthsRequired": 0, "finalMonthPayment": "0.00",
            "balanceIfFullPayment": money(start), "totalDeposits": "0.00",
            "totalInterest": "0.00", "finalBalance": money(start),
        }, None
    if payment == 0 and (start == 0 or q == 1):
        return unreachable("no-growth", goal), None

    expected_month, horizon_balance, indices = bounded_index(start, payment, goal, q)
    assert indices[0] == HORIZON and min(indices) >= 0 and max(indices) == HORIZON
    proof = {"boundedEvaluations": indices, "maxEvaluationMonth": max(indices)}
    balance = Q(start)
    for month in range(1, HORIZON + 1):
        prior = balance
        before_tail = prior * q
        balance = before_tail + payment
        if balance < goal:
            continue
        assert month == expected_month
        assert prior < goal <= balance
        tail = math.ceil(max(0, goal - before_tail))
        assert 0 <= tail <= payment
        actual = before_tail + tail
        assert actual >= goal
        if tail:
            assert actual - 1 < goal
        deposits = payment * (month - 1) + tail
        end = round_cent(actual)
        interest = end - start - deposits
        assert interest >= 0
        assert interest == round_cent(before_tail - start - payment * (month - 1))
        proof.update(
            lastMonthChecked=month,
            balanceAtPriorMonth=money(round_cent(prior)),
            balanceBeforeTail=money(round_cent(before_tail)),
            exactPriorBelowGoal=prior < goal,
            exactFullPaymentReachesGoal=balance >= goal,
            exactPlanReachesGoal=actual >= goal,
            oneCentLessFails=(actual - 1 < goal) if tail else None,
        )
        return {
            "mode": "months", "status": "ok", "reason": None,
            "targetAmount": money(goal), "monthsRequired": month,
            "finalMonthPayment": money(tail), "balanceIfFullPayment": money(round_cent(balance)),
            "totalDeposits": money(deposits), "totalInterest": money(interest),
            "finalBalance": money(end),
        }, proof

    assert expected_month is None and balance == horizon_balance and balance < goal
    proof.update(lastMonthChecked=HORIZON, balanceAtLastMonth=money(round_cent(balance)), exactHorizonBelowGoal=True)
    return unreachable("beyond-horizon", goal), proof

def compute(d):
    try:
        mode,x=parse(d)
    except Invalid as e: return e.receipt,None
    start,goal=x["initialAmount"],x["targetAmount"]
    q=1+Q(x["annualRate"],120000)
    proof=None
    if mode=="payment":
        n=x["months"]
        # Propagate each linear coefficient instead of solving by annuity formula.
        base,weights=Q(start),Q(0)
        for _ in range(n): base*=q; weights=weights*q+1
        amount=max(0,math.ceil((goal-base)/weights))
        status="already-funded" if start>=goal else "growth-sufficient" if base>=goal else "ok"
        actual=base+amount*weights
        assert actual>=goal
        if amount: assert base+(amount-1)*weights<goal
        end=round_cent(actual); total=n*amount
        r={"mode":mode,"status":status,"months":n,"monthlyPayment":money(amount),"totalDeposits":money(total),
           "totalInterest":money(end-start-total),"finalBalance":money(end)}
    else:
        r, proof = months_plan(start, x["monthlyPayment"], goal, q)
    return {"ok":True,"result":r},proof

def previous_simulation(start,target,annual_rate_bp,monthly=None,term=None):
    """Comparison only: fixed prior document uses monthly cent rounding."""
    i=Q(annual_rate_bp,120000)
    def end(p,n):
        b=start
        for _ in range(n): b+=round_cent(b*i)+p
        return b
    if term is not None:
        lo,hi=0,target
        while lo<hi:
            mid=(lo+hi)//2
            if end(mid,term)>=target: hi=mid
            else: lo=mid+1
        return money(lo)
    b=start
    for n in range(1,601):
        b+=round_cent(b*i)+monthly
        if b>=target: return n
    return "not-reached-within-600"

def flow(cid,d):
    state,g,draft,result="empty",0,RESET,None
    def mutate(s,raw=None):
        nonlocal state,g,draft,result
        state,g,result=s,g+1,None
        if raw is not None: draft=raw
        return g
    def start(raw):
        token=mutate("busy",raw)
        return token,compute(draft)[0]
    def deliver(token,ret):
        nonlocal state,result
        if state=="busy" and g==token:
            state="success" if ret["ok"] else "error"
            result=ret
    def snapshot(with_draft=False):
        o={"state":state,"reportAvailable":state=="success"}
        if state=="error": o["error"]=result["error"]
        if with_draft: o["draft"]=draft
        return o
    p={}
    if cid=="state-dirty-error":
        deliver(*start(d["initial"])); p["afterRun"]=snapshot()
        mutate("dirty",d["edit"]); p["afterEdit"]=snapshot()
        deliver(*start(draft)); p["afterRerun"]=snapshot()
    elif cid=="state-cancel-late":
        old=start(d["draft"]); assert old[1]["result"]==d["lateResult"]
        p["whilePending"]=snapshot()
        mutate("cancelled"); p["afterCancel"]=snapshot(True)
        deliver(*old); p["afterLateResult"]=snapshot()
        mutate("empty",RESET); p["afterReset"]=snapshot(True)
    elif cid=="state-replace-late":
        old=start(d["olderDraft"]); assert old[1]["result"]==d["olderLateResult"]
        deliver(*start(d["newerDraft"])); p["afterNewerResult"]=snapshot()
        deliver(*old); p["afterOlderLateResult"]=snapshot()
    else: raise ValueError(cid)
    return p


def check_baseline(baseline, current):
    prior = {case["id"]: case for case in baseline["cases"]}
    added_ids = sorted(current.keys() - prior.keys())
    assert len(prior) == 21 and prior.keys() <= current.keys()
    assert len(added_ids) == 5
    changes = []
    for case_id, old in prior.items():
        revised = current[case_id]
        assert old["kind"] == revised["kind"]
        assert old["input"] == revised["input"]
        if revised["kind"] != "core" or revised["input"]["mode"] != "months":
            assert old == revised
            continue
        old_result = old["expected"]["result"]
        result = revised["expected"]["result"]
        differences = {
            key: {"before": old_result.get(key), "after": value}
            for key, value in result.items()
            if key not in old_result or old_result[key] != value
        }
        assert set(old_result) < set(result)
        allowed = {"targetAmount"}
        if case_id in {"months-with-interest", "months-growth-only-crossing"}:
            allowed |= {"finalBalance", "totalInterest"}
        assert set(differences) == allowed
        changes.append({"case": case_id, "fields": differences})
    return {"retained": len(prior), "added": added_ids, "changes": changes}


def report_bytes(case):
    payload = {"input": case["input"], "result": case["expected"]["result"]}
    return (json.dumps(payload, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def main():
    raw = Path(sys.argv[1]).read_bytes()
    data = json.loads(raw)
    baseline = json.loads(Path(sys.argv[2]).read_bytes())
    assert {key: value for key, value in data.items() if key != "cases"} == {
        key: value for key, value in baseline.items() if key != "cases"
    }
    current = {case["id"]: case for case in data["cases"]}
    assert len(current) == len(data["cases"]) == 26
    delta = check_baseline(baseline, current)
    rows = []
    for case in data["cases"]:
        if case["kind"] == "core":
            derived, proof = compute(case["input"])
        else:
            derived, proof = flow(case["id"], case["input"]), None
        rows.append({
            "id": case["id"], "kind": case["kind"], "input": case["input"],
            "fixtureExpected": case["expected"], "derived": derived,
            "planProof": proof, "status": "PASS" if derived == case["expected"] else "FAIL",
        })

    prior_answer = previous_simulation(1, 2, 1200, monthly=0)
    assert prior_answer == "not-reached-within-600"
    assert 10**6136 <= 130000**HORIZON < 10**6137
    by_id = {row["id"]: row for row in rows}
    assert by_id["months-at-horizon"]["planProof"]["lastMonthChecked"] == HORIZON
    for case_id in ("months-first-over-horizon", "months-positive-rate-beyond-horizon"):
        assert by_id[case_id]["planProof"]["boundedEvaluations"] == [HORIZON]
    assert by_id["months-one-cent-tail"]["planProof"]["oneCentLessFails"] is True

    sample = report_bytes(current["months-with-interest"])
    literal = (
        b'{"input":{"annualRate":"6","initialAmount":"5000","mode":"months",'
        b'"monthlyPayment":"300","months":"60","targetAmount":"20000"},'
        b'"result":{"balanceIfFullPayment":"20147.13","finalBalance":"20000.01",'
        b'"finalMonthPayment":"152.88","mode":"months","monthsRequired":42,"reason":null,'
        b'"status":"ok","targetAmount":"20000.00","totalDeposits":"12452.88","totalInterest":"2547.13"}}\n'
    )
    assert sample == literal
    passed = sum(row["status"] == "PASS" for row in rows)
    print(json.dumps({
        "fixtureSha256": hashlib.sha256(raw).hexdigest(),
        "summary": {"pass": passed, "total": len(rows), "productChecks": "NOT_RUN"},
        "cases": rows,
        "baselineDelta": delta,
        "smallBalancePriorModel": {"goalMonths": prior_answer, "balanceCents": 1},
        "reportSample": {
            "name": "savings-goal-report.json", "case": "months-with-interest",
            "text": sample.decode(), "bytes": len(sample), "sha256": hashlib.sha256(sample).hexdigest(),
        },
    }, ensure_ascii=True, indent=2))
    return int(passed != len(rows))


if __name__ == "__main__":
    sys.exit(main())
