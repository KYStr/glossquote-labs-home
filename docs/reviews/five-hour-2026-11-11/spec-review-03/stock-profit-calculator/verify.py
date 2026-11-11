"""Independent exact stock oracle. Computes theoretical thresholds only."""
import hashlib
import json
import math
import re
import sys
from decimal import Decimal
from fractions import Fraction as Q
from pathlib import Path

RESET={"buyPrice":"100","buyQty":"1000","buyUnit":"share","sellPrice":"110","sellQty":"1000","sellUnit":"share","feeRatePct":"0.1425","feeDiscount":"1","minFeeTwd":"20","taxMode":"standard","taxRatePct":"0.3"}
RULES={
 "buyPrice":(9,2,Q(".01"),Q("999999.99")),"buyQty":(6,0,1,999999),"buyUnit":(8,("share","lot"),None,None),
 "sellPrice":(9,2,Q(".01"),Q("999999.99")),"sellQty":(6,0,1,999999),"sellUnit":(8,("share","lot"),None,None),
 "feeRatePct":(8,4,0,1),"feeDiscount":(5,3,Q(".001"),1),"minFeeTwd":(5,0,0,99999),
 "taxMode":(8,("standard","day"),None,None),"taxRatePct":(8,4,0,1),
}

class Invalid(Exception):
    def __init__(self,code,field=None):
        self.receipt={"ok":False,"error":{"code":code,"field":field,"row":None}}

def parse(d):
    if not isinstance(d,dict) or set(d)!=set(RULES) or any(type(d[x]) is not str for x in RULES):
        raise Invalid("SCHEMA")
    out={}
    for k,(cap,syntax,lo,hi) in RULES.items():
        s=d[k]
        if len(s.encode("utf-16-le",errors="surrogatepass"))//2>cap: raise Invalid("INPUT_LIMIT",k)
        try: s.encode("utf-16-le")
        except UnicodeEncodeError: raise Invalid("UNICODE",k)
        if not s: raise Invalid("EMPTY",k)
        if isinstance(syntax,tuple):
            if s not in syntax: raise Invalid("ENUM",k)
            out[k]=s
        else:
            grammar=r"[0-9]+"+(r"(?:\.[0-9]{1,"+str(syntax)+r"})?" if syntax else "")
            if not re.fullmatch(grammar,s): raise Invalid("DECIMAL_FORMAT" if syntax else "INTEGER_FORMAT",k)
            n=Q(s) if syntax else int(s)
            if not lo<=n<=hi: raise Invalid("RANGE",k)
            out[k]=n
    return out

def half_up(x):
    return math.floor(x+Q(1,2))

def dec(x,places):
    return Decimal(half_up(x*10**places)).scaleb(-places)

def threshold(qty, basis, a, b, minimum):
    # Unrounded L(G) = min((1-a-b)G, (1-b)G - minFee), G = price * qty.
    # Actual net differs from L by at most one dollar (two separate roundings).
    # Invert L at basis +/- 1; enumerate only the possible crossing window.
    inverse = lambda goal: max(goal/(1-a-b),(goal+minimum)/(1-b))
    low=max(1,math.ceil(inverse(basis-1)*100/qty))
    high=max(low,math.ceil(inverse(basis+1)*100/qty))
    def net(p):
        gross=Q(p*qty,100)
        return gross-max(minimum,half_up(a*gross))-half_up(b*gross)
    assert high-low+1<=206
    assert net(high)>=basis
    first=next(p for p in range(low,high+1) if net(p)>=basis)
    assert first == 1 or net(first-1)<basis
    return first,{"lowCents":low,"highCents":high,"candidateCount":high-low+1,"priorNet":None if first==1 else str(net(first-1)),"thresholdNet":str(net(first))}

def solve(d):
    try:
        x=parse(d)
        qb=x["buyQty"]*(1000 if x["buyUnit"]=="lot" else 1)
        qs=x["sellQty"]*(1000 if x["sellUnit"]=="lot" else 1)
        if qs>qb: raise Invalid("SELL_EXCEEDS_BUY","sellQty")
        buy=x["buyPrice"]*qb
        sale=x["sellPrice"]*qs
        rate_pct=Q(".15") if x["taxMode"]=="day" else x["taxRatePct"]
        a=x["feeRatePct"]*x["feeDiscount"]/100
        b=rate_pct/100
        minimum=x["minFeeTwd"]
        bf,sf=(max(minimum,half_up(g*a)) for g in (buy,sale))
        tax=half_up(sale*b)
        total=buy+bf
        exact_basis=total*qs/qb
        proceeds=sale-sf-tax
        exact_profit=proceeds-exact_basis
        first, proof=threshold(qs,exact_basis,a,b,minimum)
        assert exact_basis*Q(qb,qs)==total
        return {"ok":True,"result":{"buyShares":qb,"sellShares":qs,"remainingShares":qb-qs,
           "buyGross":dec(buy,2),"buyFee":bf,"buyTotal":dec(total,2),"sellGross":dec(sale,2),
           "sellFee":sf,"sellTax":tax,"sellNet":dec(proceeds,2),"costBasisSold":dec(exact_basis,2),
           "netProfitLoss":half_up(exact_profit),"returnPct":dec(exact_profit/exact_basis*100,2),
           "breakevenPrice":dec(Q(first,100),2),
           "effectiveTaxRatePct":(Decimal(rate_pct.numerator)/Decimal(rate_pct.denominator)).normalize()}}, proof
    except Invalid as e:
        return e.receipt,None

def flow(id,d):
    state="empty"; epoch=0; result=None; draft=RESET
    def phase(s,x=None):
        nonlocal state,epoch,result,draft
        state=s; epoch+=1; result=None
        if x is not None: draft=x
        return epoch
    def finish(g,r):
        nonlocal state,result
        if state=="busy" and g==epoch:
            state="success" if r["ok"] else "error"; result=r
    def run(x):
        return phase("busy",x),solve(x)[0]
    def snap(with_draft=False):
        o={"state":state,"reportAvailable":state=="success"}
        if state=="error": o["error"]=result["error"]
        if with_draft: o["draft"]=draft
        return o
    p={}
    if id=="state-dirty-error":
        finish(*run(d["initial"])); p["afterRun"]=snap()
        phase("dirty",d["edit"]); p["afterEdit"]=snap()
        finish(*run(draft)); p["afterRerun"]=snap()
    elif id=="state-cancel-late":
        old=run(d["draft"]); assert old[1]["result"]==d["lateResult"]
        p["whilePending"]=snap()
        phase("cancelled"); p["afterCancel"]=snap(True)
        finish(*old); p["afterLateResult"]=snap()
        phase("empty",RESET); p["afterReset"]=snap(True)
    elif id=="state-replace-late":
        old=run(d["olderDraft"]); assert old[1]["result"]==d["olderLateResult"]
        finish(*run(d["newerDraft"])); p["afterNewerResult"]=snap()
        finish(*old); p["afterOlderLateResult"]=snap()
    else: raise ValueError(id)
    return p

def emit(x):
    # Keep Decimal money as exact numeric tokens; JSON.stringify(Number) can't preserve cents here.
    if isinstance(x,Decimal): return format(x,"f")
    if isinstance(x,dict): return "{"+",".join(json.dumps(k)+":"+emit(v) for k,v in sorted(x.items()))+"}"
    if isinstance(x,list): return "["+",".join(emit(v) for v in x)+"]"
    return json.dumps(x,ensure_ascii=True)

def main():
    f=Path(sys.argv[1]).read_bytes()
    source=json.loads(f,parse_float=Decimal)
    rows=[]
    for c in source["cases"]:
        got,trace=solve(c["input"]) if c["kind"]=="core" else (flow(c["id"],c["input"]),None)
        rows.append({"id":c["id"],"kind":c["kind"],"input":c["input"],"fixtureExpected":c["expected"],"derived":got,
                     "thresholdProof":trace,"status":"PASS" if got==c["expected"] else "FAIL"})
    odd=RESET|{"buyQty":"100","sellQty":"100","taxMode":"day"}
    odd_day=solve(odd)[0]["result"]
    odd_standard=solve(odd|{"taxMode":"standard"})[0]["result"]
    nonmono=RESET|{"buyPrice":"49","sellPrice":"51","buyQty":"1","sellQty":"1","feeRatePct":"1","taxRatePct":"1","minFeeTwd":"0"}
    nm,_=solve(nonmono)
    def one_share_net(c):
        g=Q(c,100)
        return str(dec(g-2*half_up(g/100),2))
    large=RESET|{"buyPrice":"999999.99","sellPrice":"999999.99","buyQty":"999999","sellQty":"999998","buyUnit":"lot","sellUnit":"lot"}
    large_data,lt=solve(large)
    cap=RESET|{"buyPrice":"999999.99","sellPrice":"999999.99","buyQty":"1","sellQty":"1","feeRatePct":"1","taxRatePct":"1","minFeeTwd":"99999"}
    max_out,mt=solve(cap)
    assert nm["result"]["breakevenPrice"]==Decimal("49")
    d=large_data["result"]["costBasisSold"]
    assert format(d,".2f")!=format(float(d),".2f")
    def tick_example(p):
        return str(dec(p*1000-half_up(p*1000*Q(".001425"))-half_up(p*1000*Q(".003")),2))
    probes=[{"id":"ST-01","input":odd,"dayTax":odd_day["sellTax"],"standardTax":odd_standard["sellTax"]},
        {"id":"ST-02","input":RESET,"modelBreakeven":"100.59","modelNetAtLegalTicks":{"100.50":tick_example(Q("100.50")),"101.00":tick_example(Q("101.00"))},"basis":"100143.00"},
        {"id":"ST-03","input":nonmono,"correctBreakeven":nm["result"]["breakevenPrice"],
         "netByPriceCents":{str(c):one_share_net(c) for c in (4899,4900,4999,5000,5099,5100)}},
        {"id":"ST-04","input":large,"exactBasisDisplay":format(d,".2f"),"binary64Display":format(float(d),".2f"),"window":lt},
        {"id":"range","input":cap,"breakevenOutsideInputCap":max_out["result"]["breakevenPrice"],"window":mt}]
    n=sum(r["status"]=="PASS" for r in rows)
    b=(emit(rows[0]["derived"]["result"])+"\n").encode()
    print(emit({"fixtureSha256":hashlib.sha256(f).hexdigest(),"summary":{"pass":n,"total":len(rows)},
                "cases":rows,"probes":probes,"reportSample":{"name":"stock-profit-report.json","text":b.decode(),"bytes":len(b),
                "sha256":hashlib.sha256(b).hexdigest()}}))
    return int(n!=len(rows))
if __name__=="__main__": sys.exit(main())
