"""Independent savings oracle using exact recurrence, not the author's closed form.
It compares literal outputs and separately derives the true plan after the displayed tail."""
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

def unreachable(reason):
    return {"mode":"months","status":"unreachable","reason":reason,"monthsRequired":None,
      "finalMonthPayment":None,"balanceIfFullPayment":None,"totalDeposits":None,"totalInterest":None,"finalBalance":None}

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
        payment=x["monthlyPayment"]
        if start>=goal:
            r={"mode":mode,"status":"already-funded","reason":None,"monthsRequired":0,"finalMonthPayment":"0.00",
               "balanceIfFullPayment":money(start),"totalDeposits":"0.00","totalInterest":"0.00","finalBalance":money(start)}
        elif payment==0 and (start==0 or q==1):
            r=unreachable("no-growth")
        else:
            balance=Q(start)
            for k in range(1,HORIZON+1):
                prior=balance
                with_interest=prior*q
                balance=with_interest+payment
                if balance>=goal:
                    assert prior<goal
                    tail=math.ceil(max(0,goal-with_interest))
                    assert 0<=tail<=payment
                    actual=with_interest+tail
                    assert actual>=goal and (not tail or actual-1<goal)
                    deposits=payment*(k-1)+tail
                    reported_interest=goal-start-deposits
                    r={"mode":mode,"status":"ok","reason":None,"monthsRequired":k,"finalMonthPayment":money(tail),
                      "balanceIfFullPayment":money(round_cent(balance)),"totalDeposits":money(deposits),
                      "totalInterest":money(reported_interest),"finalBalance":money(goal)}
                    actual_end=round_cent(actual)
                    proof={"balanceAtPriorMonth":money(round_cent(prior)),"balanceBeforeTail":money(round_cent(with_interest)),
                       "actualFinalBalanceAfterDisplayedTail":money(actual_end),"actualInterestAfterDisplayedTail":money(actual_end-start-deposits),
                       "differenceFromReportedFinalCents":actual_end-goal,"planSemantics":"PASS" if actual_end==goal else "FAIL"}
                    break
            else:
                r=unreachable("beyond-horizon")
                proof={"lastMonthChecked":HORIZON,"balanceAtLastMonth":money(round_cent(balance))}
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

def main():
    f=Path(sys.argv[1]).read_bytes()
    data=json.loads(f)
    rows=[]
    for c in data["cases"]:
        got,proof=compute(c["input"]) if c["kind"]=="core" else (flow(c["id"],c["input"]),None)
        rows.append({"id":c["id"],"kind":c["kind"],"input":c["input"],"fixtureExpected":c["expected"],"derived":got,
                     "planProof":proof,"status":"PASS" if got==c["expected"] else "FAIL"})
    scopes=[
        (RESET|{"targetAmount":"12000","initialAmount":"0","annualRate":"12","months":"12"},previous_simulation(0,1200000,1200,term=12)),
        (RESET|{"mode":"months","targetAmount":"1000","initialAmount":"0","annualRate":"12","monthlyPayment":"100"},previous_simulation(0,100000,1200,monthly=10000)),
        (RESET|{"mode":"months","targetAmount":"0.02","initialAmount":"0.01","annualRate":"12","monthlyPayment":"0"},previous_simulation(1,2,1200,monthly=0))]
    probes=[{"id":"SG-01","input":d,"derived":compute(d)[0],"priorGoalAnswer":old} for d,old in scopes]
    for row in rows:
        proof=row["planProof"] or {}
        if proof.get("planSemantics")=="FAIL":
            probes.append({"id":"SG-02","case":row["id"],"input":row["input"],"literalResult":row["derived"]["result"],"independentPlan":proof})
    far=RESET|{"mode":"months","targetAmount":"999999999.99","initialAmount":"0.01","annualRate":"0.01","monthlyPayment":"0"}
    hint=math.log(99_999_999_999)/math.log1p(1/120000)
    probes.append({"id":"SG-03","input":far,"uncappedExponentEstimate":round(hint,2),
      "unreducedNumeratorDigitsIfEvaluated":math.floor(math.ceil(hint)*math.log10(120001))+1,
      "boundedProof":compute(far)[1],"derived":compute(far)[0]})
    for target in ("1200","1201"):
        d=RESET|{"mode":"months","targetAmount":target,"initialAmount":"0","annualRate":"0","monthlyPayment":"1"}
        probes.append({"id":"horizon","input":d,"derived":compute(d)[0]})
    n=sum(r["status"]=="PASS" for r in rows)
    b=(json.dumps({"input":rows[0]["input"],"result":rows[0]["derived"]["result"]},sort_keys=True,separators=(",",":"))+"\n").encode()
    print(json.dumps({"fixtureSha256":hashlib.sha256(f).hexdigest(),"summary":{"pass":n,"total":len(rows)},
        "cases":rows,"probes":probes,"reportSample":{"name":"savings-goal-report.json","text":b.decode(),"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()}},ensure_ascii=True,indent=2))
    return int(n!=len(rows))
if __name__=="__main__": sys.exit(main())
