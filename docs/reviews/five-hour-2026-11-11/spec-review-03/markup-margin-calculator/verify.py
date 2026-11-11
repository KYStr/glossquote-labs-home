"""Independent oracle for the fixed markup/margin document; offline stdlib only."""
import hashlib
import json
import math
import re
import sys
from fractions import Fraction as Q
from pathlib import Path

MODES={"report":"price","solve-markup":"markupPercent","solve-margin":"marginPercent"}
OTHER=set(MODES.values())
FIELDS={"mode","cost"}|OTHER
CAP=99_999_999
RESET={"mode":"report","cost":"80.00","price":"100.00","markupPercent":None,"marginPercent":None}

class Invalid(Exception):
    def __init__(self,code,field=None):
        self.receipt={"ok":False,"error":{"code":code,"field":field,"row":None}}

def lexical(s,field,maximum):
    if len(s.encode("utf-16-le",errors="surrogatepass"))//2 > maximum:
        raise Invalid("INPUT_LIMIT",field)
    try: s.encode("utf-16-le")
    except UnicodeEncodeError: raise Invalid("UNICODE",field)
    if not s: raise Invalid("EMPTY",field)

def numeric(s,field,places,maximum,minimum):
    lexical(s,field,maximum)
    if not re.fullmatch(r"(0|[1-9][0-9]*)(\.[0-9]{1,"+str(places)+r"})?",s):
        raise Invalid("DECIMAL_FORMAT",field)
    v=Q(s)*10**places
    if not minimum <= v <= CAP:
        raise Invalid("RANGE",field)
    return int(v)

def rounding(q):
    return (-1 if q<0 else 1)*math.floor(abs(q)+Q(1,2))

def do_calc(d):
    try:
        if not isinstance(d,dict) or set(d)!=FIELDS or any(type(d[k]) is not str for k in ("mode","cost")) or any(d[k] is not None and type(d[k]) is not str for k in OTHER):
            raise Invalid("SCHEMA")
        mode=d["mode"]
        lexical(mode,"mode",12)
        if mode not in MODES:
            raise Invalid("ENUM","mode")
        k=MODES[mode]
        if any((d[x] is not None)!=(x==k) for x in OTHER):
            raise Invalid("SCHEMA")
        cost=numeric(d["cost"],"cost",2,10,1)
        v=numeric(d[k],k,2 if mode=="report" else 3,10 if mode=="report" else 9,0)
        if mode=="report":
            price=v
        else:
            target=Q(v,100000)
            if k=="marginPercent" and target>=1:
                raise Invalid("NO_SOLUTION",k)
            exact=cost*(1+target) if k=="markupPercent" else cost/(1-target)
            price=rounding(exact)
            if price>CAP:
                raise Invalid("RANGE",k)
            assert abs(exact-price)<=Q(1,2)
        profit=price-cost
        markup=Q(profit,cost)
        margin=Q(profit,price) if price else None
        if price:
            assert margin==markup/(1+markup)
        obj={"mode":mode,"costCents":cost,"priceCents":price,"profitCents":profit}
        if mode!="solve-markup":
            obj["markupHundredths"]=rounding(markup*10000)
        if mode!="solve-margin":
            obj["marginHundredths"]=None if margin is None else rounding(margin*10000)
        if mode=="report":
            obj["belowCost"]=profit<0
        else:
            obj[k+"Milli"]=v
        return {"ok":True,"result":obj}
    except Invalid as e:
        return e.receipt

def derive_flow(cid,d):
    ticket=0; phase="empty"; result=None; draft=RESET
    def set_phase(new,new_draft=None):
        nonlocal ticket,phase,result,draft
        ticket+=1; phase=new; result=None
        if new_draft is not None: draft=new_draft
        return ticket
    def settle(seq,payload):
        nonlocal phase,result
        if seq==ticket and phase=="busy":
            phase="success" if payload["ok"] else "error"
            result=payload
    def snap(keep=False):
        o={"state":phase,"reportAvailable":phase=="success"}
        if phase=="error": o["error"]=result["error"]
        if keep: o["draft"]=draft
        return o
    def start(x):
        t=set_phase("busy",x)
        return t,do_calc(draft)
    p={}
    if cid=="state-dirty-error":
        settle(*start(d["initial"])); p["afterRun"]=snap()
        set_phase("dirty",d["edit"]); p["afterEdit"]=snap()
        settle(*start(draft)); p["afterRerun"]=snap()
    elif cid=="state-cancel-late":
        old=start(d["draft"]); assert old[1]["result"]==d["lateResult"]
        p["whilePending"]=snap()
        set_phase("cancelled"); p["afterCancel"]=snap(True)
        settle(*old); p["afterLateResult"]=snap()
        set_phase("empty",RESET); p["afterReset"]=snap(True)
    elif cid=="state-replace-late":
        old=start(d["olderDraft"]); assert old[1]["result"]==d["olderLateResult"]
        settle(*start(d["newerDraft"])); p["afterNewerResult"]=snap()
        settle(*old); p["afterOlderLateResult"]=snap()
    else:
        raise ValueError(cid)
    return p

def main():
    blob=Path(sys.argv[1]).read_bytes()
    out=[]
    for c in json.loads(blob)["cases"]:
        d=c["input"]
        got=do_calc(d) if c["kind"]=="core" else derive_flow(c["id"],d)
        out.append({"id":c["id"],"kind":c["kind"],"input":d,"fixtureExpected":c["expected"],"derived":got,
                    "status":"PASS" if got==c["expected"] else "FAIL"})
    table=[{"marginPercent":m,"markupHundredths":rounding(Q(m,100-m)*10000)} for m in (0,10,20,25,30,40,50,60,70,75,80,90,95)]
    assert [r["markupHundredths"] for r in table]==[0,1111,2500,3333,4286,6667,10000,15000,23333,30000,40000,90000,190000]
    probes=[]
    for mode,k in (("solve-markup","markupPercent"),("solve-margin","marginPercent")):
        d=RESET|{"mode":mode,"cost":"0.01","price":None,k:"25"}
        derived=do_calc(d)
        p=derived["result"]["priceCents"]
        m=Q(p-1,1 if k=="markupPercent" else p)*100
        required=math.ceil(Q(5,4) if k=="markupPercent" else Q(4,3))
        probes.append({"id":"MM-01","input":d,"result":derived,"achievedTargetMetricPercent":str(m),"minimumCentsForAtLeastTarget":required})
    d=RESET|{"cost":"50.00","price":"0"}
    probes.append({"id":"MM-02","input":d,"result":do_calc(d),"exactIdentityDenominator":0})
    d=RESET|{"mode":"solve-margin","price":None,"cost":"10.00","marginPercent":"99.9"}
    p=do_calc(d)["result"]["priceCents"]
    probes.append({"id":"description-high","input":d,"priceCents":p,"multipleOfCost":p//1000})
    d=RESET|{"cost":"160.00","price":"159.96"}
    probes.append({"id":"negative-tie","input":d,"result":do_calc(d),"rawMarkupHundredths":"-5/2"})
    b=(json.dumps(out[0]["derived"]["result"],sort_keys=True,separators=(",",":"))+"\n").encode()
    n=sum(x["status"]=="PASS" for x in out)
    print(json.dumps({"fixtureSha256":hashlib.sha256(blob).hexdigest(),"summary":{"pass":n,"total":len(out)},
      "cases":out,"probes":probes,"referenceTable":table,
      "reportSample":{"name":"markup-margin-report.json","text":b.decode(),"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()}},indent=2))
    return int(n!=len(out))
if __name__=="__main__": sys.exit(main())
