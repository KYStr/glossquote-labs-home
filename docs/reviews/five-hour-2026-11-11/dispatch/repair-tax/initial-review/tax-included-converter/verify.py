"""Review only. SPEC.md is truncated. Inputs below exercise rules from surviving
text plus AUTHOR-CHECK.md. Unknown precedence/output packaging is not certified."""
import hashlib
import json
import math
import re
import sys
from fractions import Fraction
from pathlib import Path

KEYS = {"mode","ratePercent","basis","amount","lines"}
LIMIT = 999_999_999_999
RESET = {"mode":"single","basis":"net","amount":"10000","ratePercent":"5","lines":None}

class Reject(Exception):
    def __init__(self,code,field=None,row=None):
        self.error = {"code":code,"field":field,"row":row}

def rounded(q):
    return math.floor(q + Fraction(1,2))

def amount(raw,row=None):
    if raw == "":
        raise Reject("EMPTY","amount",row)
    if not re.fullmatch(r"0|[1-9][0-9]*",raw):
        raise Reject("INTEGER_FORMAT","amount",row)
    x = int(raw)
    if x > LIMIT:
        raise Reject("RANGE","amount",row)
    return x

def arithmetic(d):
    try:
        if not isinstance(d,dict) or set(d) != KEYS or any(type(d[k]) is not str for k in ("mode","ratePercent")):
            raise Reject("SCHEMA")
        if any(d[k] is not None and type(d[k]) is not str for k in ("basis","amount")):
            raise Reject("SCHEMA")
        L = d["lines"]
        if L is not None and (not isinstance(L,list) or any(type(x) is not dict or set(x)!={"amount"} or type(x["amount"]) is not str for x in L)):
            raise Reject("SCHEMA")
        raw, mode, basis = d["ratePercent"], d["mode"],d["basis"]
        if not re.fullmatch(r"(0|[1-9][0-9]*)(\.[0-9]{1,2})?",raw):
            raise Reject("DECIMAL_FORMAT","ratePercent")
        rate = Fraction(raw)/100
        if not Fraction(1,10000) <= rate <= 1:
            raise Reject("RANGE","ratePercent")
        canonical = raw.rstrip("0").rstrip(".") if "." in raw else raw
        if mode == "single":
            a = amount(d["amount"])
            if basis == "net":
                net,tax = a,rounded(a*rate)
                gross = net+tax
            elif basis == "gross":
                gross,net = a,rounded(a/(1+rate))
                tax = gross-net
            else:
                raise ValueError("outside observed fixture basis")
            assert gross == net + tax
            obj = {"mode":mode,"basis":basis,"ratePercent":canonical,"net":net,"tax":tax,"gross":gross}
        elif mode == "lines":
            if not L:
                raise Reject("EMPTY","lines")
            if len(L)>20:
                raise Reject("ROW_LIMIT","lines")
            lines = [{"row":i,"net":amount(x["amount"],i)} for i,x in enumerate(L,1)]
            total=sum(x["net"] for x in lines)
            if total>LIMIT:
                raise ValueError("total exceeds upper bound; error precedence absent from SPEC")
            tax=rounded(total*rate)
            per_line=sum(rounded(x["net"]*rate) for x in lines)
            obj = {"mode":mode,"ratePercent":canonical,"lines":lines,"subtotalNet":total,"tax":tax,
                   "gross":total+tax,"perLineTaxSum":per_line,"roundingDifference":tax-per_line}
        else:
            raise ValueError("outside observed fixture mode; continuation missing from SPEC")
        return {"ok":True,"result":obj}
    except Reject as e:
        return {"ok":False,"error":e.error}

def controller(id,d):
    phase,g,report,err = "empty",0,False,None
    draft=RESET.copy()
    def mutate(state, new_draft=None):
        nonlocal phase,g,report,err,draft
        g+=1; phase,report,err=state,False,None
        if new_draft is not None: draft=new_draft.copy()
        return g
    def done(token,r):
        nonlocal phase,report,err
        if phase=="busy" and g==token:
            report=r["ok"]; phase="success" if report else "error"; err=r.get("error")
    def state(include_draft=False):
        o={"state":phase,"reportAvailable":report}
        if err is not None: o["error"]=err
        if include_draft: o["draft"]=draft
        return o
    p={}
    if id=="state-dirty-error":
        k=mutate("busy",d["initial"]); done(k,arithmetic(draft)); p["afterRun"]=state()
        mutate("dirty",d["edit"]); p["afterEdit"]=state()
        k=mutate("busy"); done(k,arithmetic(draft)); p["afterRerun"]=state()
    elif id=="state-cancel-late":
        old=mutate("busy",d["draft"]); late=arithmetic(draft); p["whilePending"]=state()
        assert late["result"]==d["lateResult"]
        mutate("cancelled"); p["afterCancel"]=state(True)
        done(old,late); p["afterLateResult"]=state()
        mutate("empty",RESET); p["afterReset"]=state(True)
    elif id=="state-replace-late":
        old=mutate("busy",d["olderDraft"]); late=arithmetic(draft)
        assert late["result"]==d["olderLateResult"]
        k=mutate("busy",d["newerDraft"]); done(k,arithmetic(draft)); p["afterNewerResult"]=state()
        done(old,late); p["afterOlderLateResult"]=state()
    else:
        raise ValueError(id)
    return p

def main():
    f=Path(sys.argv[1]).read_bytes()
    spec=Path(sys.argv[1]).with_name("SPEC.md").read_bytes()
    data=json.loads(f)
    out=[]
    for c in data["cases"]:
        d=c["input"]
        got=arithmetic(d) if c["kind"]=="core" else controller(c["id"],d)
        out.append({"id":c["id"],"kind":c["kind"],"input":d,"fixtureExpected":c["expected"],"derived":got,
                    "status":"PASS" if got==c["expected"] else "FAIL"})
    doc=spec.decode()
    headings=re.findall(r"^## (\w+)\s*$",doc,re.M)
    probes=[{"id":"TAX-01","sha256":hashlib.sha256(spec).hexdigest(),"size":len(spec),"headings":headings,
             "finalLine":doc.splitlines()[-1]}]
    for gross,rate in [(10,"5"),(13,"4"),(105000,"5")]:
        d=RESET|{"basis":"gross","amount":str(gross),"ratePercent":rate}
        q=Fraction(rate)/100
        got=arithmetic(d)["result"]
        exact_net=gross/(1+q)
        tax_on_exact=rounded(exact_net*q)
        lower=math.floor(exact_net)
        probes.append({"id":"TAX-02","input":d,"netFirst":got,"rawNet":str(exact_net),
            "taxFirstOnExactNet":{"net":gross-tax_on_exact,"tax":tax_on_exact,"gross":gross},
            "forwardNearExact":[{"net":n,"tax":rounded(n*q),"gross":n+rounded(n*q)} for n in [lower,lower+1]]})
    n=sum(c["status"]=="PASS" for c in out)
    print(json.dumps({"fixtureSha256":hashlib.sha256(f).hexdigest(),"summary":{"pass":n,"total":len(out)},
                      "qualification":"Fixture consistency with surviving SPEC + AUTHOR-CHECK only. Missing normative contract is FAIL.",
                      "cases":out,"probes":probes},ensure_ascii=True,indent=2))
    return int(n!=len(out))
if __name__=="__main__": sys.exit(main())
