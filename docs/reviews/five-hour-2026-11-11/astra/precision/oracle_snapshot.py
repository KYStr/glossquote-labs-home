"""FH-QC-A independent document oracle; imports no product or author tests.
Uses Python Fraction/date/Decimal against literal fixtures at PR 283.
Only writes this review directory. Controller results are document checks,
not evidence that a product controller or GUI has executed.
"""
import json, re, math, calendar, platform, hashlib
from pathlib import Path
from fractions import Fraction as F
from decimal import Decimal as D, localcontext, ROUND_FLOOR
from datetime import date, timedelta, datetime, timezone

ROOT = Path(__file__).resolve().parent
SPECS = ROOT / 'candidate/docs/specs'
SLUGS = ['cooking-measurement-converter','age-calculator','workdays-calculator','salary-converter','bill-split-calculator','calories-burned-calculator','dew-point-calculator','nhi-premium-calculator','race-time-predictor']
class Invalid(Exception):
    def __init__(self, code, field=None, row=None): self.error=dict(code=code,field=field,row=row)
def fail(code, field=None, row=None): raise Invalid(code,field,row)
def schema(i, keys, arrays=()):
    if type(i) is not dict or set(i)!=set(keys): fail('SCHEMA')
    for k in keys:
        if k in arrays:
            if type(i[k]) is not list or any(type(v) is not str for v in i[k]): fail('SCHEMA')
        elif type(i[k]) is not str: fail('SCHEMA')
def common(s,field,cap,row=None,empty=False):
    if len(s.encode('utf-16-le','surrogatepass'))//2>cap: fail('INPUT_LIMIT',field,row)
    if any(0xD800<=ord(c)<=0xDFFF for c in s): fail('UNICODE',field,row)
    if not s and not empty: fail('EMPTY',field,row)
def decimal(s,field,cap,pattern,low,high,row=None,strict=False,code='DECIMAL_FORMAT'):
    common(s,field,cap,row)
    if not re.fullmatch(pattern,s): fail(code,field,row)
    x=F(s)
    if x<low or x>high or (strict and x==low): fail('RANGE',field,row)
    return x
def enum(s,field,cap,values):
    common(s,field,cap)
    if s not in values: fail('ENUM',field)
    return s
def parse_date(s,field,row=None):
    common(s,field,10,row)
    if not re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}',s): fail('DATE_FORMAT',field,row)
    try: d=date.fromisoformat(s)
    except ValueError: fail('INVALID_DATE',field,row)
    if not date(1900,1,1)<=d<=date(2100,12,31): fail('RANGE',field,row)
    return d
def rhu(x): return (2*x.numerator+x.denominator)//(2*x.denominator)
def ok(r): return dict(ok=True,result=r)
DEC=r'(0|[1-9][0-9]*)(\.[0-9]{1,2})?'
INTEGER=r'(0|[1-9][0-9]*)'
DENSITY={'water':227,'all-purpose-flour':120,'granulated-sugar':198,'brown-sugar':213,'powdered-sugar':113,'butter':227,'vegetable-oil':198,'honey':336,'cocoa-powder':84,'milk':227,'long-grain-rice':198,'rolled-oats':89}
UNITS={'ml':1,'tsp':5,'tbsp':15,'cup':240,'g':None}
def cooking(i):
    schema(i,['amount','fromUnit','toUnit','ingredient'])
    a=decimal(i['amount'],'amount',12,r'[0-9]+(\.[0-9]+)?',0,100000,strict=True)
    u=enum(i['fromUnit'],'fromUnit',4,UNITS);v=enum(i['toUnit'],'toUnit',4,UNITS)
    ing=enum(i['ingredient'],'ingredient',32,dict(none=0,**DENSITY))
    cross=(u=='g') != (v=='g')
    if cross and ing=='none': fail('INGREDIENT_REQUIRED','ingredient')
    density=DENSITY[ing] if cross else None
    if u==v: value=a
    elif u=='g': value=a*240/(density*UNITS[v])
    elif v=='g': value=a*UNITS[u]*density/240
    else: value=a*UNITS[u]/UNITS[v]
    ft=None
    if v=='cup':
        eighths=rhu(value*8); whole,rem=divmod(eighths,8); frac=F(rem,8)
        ft=str(whole) if not rem else (str(whole)+' ' if whole else '')+str(frac)
    return dict(value=float(F(rhu(value*100),100)),unit=v,fractionText=ft,ingredient=ing if cross else None,gramsPerCup=density)
def salary(i):
    schema(i,['sourceBasis','amount','bonusMonths'])
    basis=enum(i['sourceBasis'],'sourceBasis',7,['monthly','daily','hourly','annual'])
    a=decimal(i['amount'],'amount',12,DEC,0,{'monthly':99999999,'daily':9999999,'hourly':999999,'annual':999999999}[basis],strict=True)
    b=decimal(i['bonusMonths'],'bonusMonths',4,r'(0|[1-9][0-9]*)(\.[0-9])?',0,24)
    m={'monthly':a,'daily':a*30,'hourly':a*240,'annual':a/(12+b)}[basis]
    return {k:rhu(v) for k,v in dict(monthly=m,daily=m/30,hourly=m/240,annualBase=m*12,bonusAmount=m*b,annualTotal=m*(12+b)).items()}
def bill(i):
    schema(i,['bill','taxPercent','tipPercent','tipBase','people'])
    b=decimal(i['bill'],'bill',9,DEC,0,F('999999.99'))*100
    tax=decimal(i['taxPercent'],'taxPercent',7,r'(0|[1-9][0-9]*)(\.[0-9]{1,3})?',0,100)
    tip=decimal(i['tipPercent'],'tipPercent',7,r'(0|[1-9][0-9]*)(\.[0-9]{1,3})?',0,100)
    basis=enum(i['tipBase'],'tipBase',8,['pre-tax','post-tax'])
    n=int(decimal(i['people'],'people',3,INTEGER,1,100,code='INTEGER_FORMAT'))
    tc=rhu(b*tax/100);base=int(b)+(tc if basis=='post-tax' else 0);pc=rhu(F(base)*tip/100);total=int(b)+tc+pc
    q,r=divmod(total,n)
    return dict(billCents=int(b),taxCents=tc,tipBaseCents=base,tipCents=pc,totalCents=total,sharesCents=[q+(k<r) for k in range(n)])
def weekday(d): return (d.weekday()+1)%7
def age(i):
    schema(i,['birthDate','referenceDate']);b=parse_date(i['birthDate'],'birthDate');ref=parse_date(i['referenceDate'],'referenceDate')
    if ref<b: fail('DATE_ORDER','referenceDate')
    y,m,days=ref.year-b.year,ref.month-b.month,ref.day-b.day; cursor=date(ref.year,ref.month,1)
    while days<0:
        prev=cursor-timedelta(days=1);days+=prev.day;m-=1;cursor=date(prev.year,prev.month,1)
    if m<0:y-=1;m+=12
    def birthday(year): return date(year,3,1) if (b.month,b.day)==(2,29) and not calendar.isleap(year) else date(year,b.month,b.day)
    nex=birthday(ref.year)
    if nex<ref:nex=birthday(ref.year+1)
    w=weekday(b)
    return dict(ageYears=y,ageMonths=m,ageDays=days,totalDays=(ref-b).days,birthWeekdayIndex=w,birthWeekdayZh=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][w],birthWeekdayEn=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][w],isBirthdayToday=birthday(ref.year)==ref,nextBirthday=str(nex),daysUntilNextBirthday=(nex-ref).days,turningAge=nex.year-b.year)
def workdays(i):
    if type(i) is not dict or type(i.get('mode')) is not str: fail('SCHEMA')
    mode=i['mode']
    if mode not in ['count','shift']:fail('ENUM','mode')
    schema(i,['mode','startDate','endDate' if mode=='count' else 'days','holidays'])
    start=parse_date(i['startDate'],'startDate')
    if mode=='count':end=parse_date(i['endDate'],'endDate')
    else:n=int(decimal(i['days'],'days',5,r'(0|-?[1-9][0-9]*)',-3660,3660,code='INTEGER_FORMAT'))
    common(i['holidays'],'holidays',8192,empty=True); holidays=[]
    for row,line in enumerate(re.split(r'\r?\n',i['holidays']),1):
        if not line:continue
        if len(holidays)==400:fail('ROW_LIMIT','holidays',row)
        holidays.append(parse_date(line,'holidays',row))
    h=set(holidays)
    def iswork(d):return d.weekday()<5 and d not in h
    if mode=='count':
        low,high=sorted([start,end]);span=[low+timedelta(days=d) for d in range(1,(high-low).days+1)];weekend=sum(d.weekday()>=5 for d in span);inside=set(span)
        return dict(mode=mode,startDate=str(start),endDate=str(end),startWeekday=weekday(start),endWeekday=weekday(end),calendarDays=(end-start).days,businessDays=sum(iswork(d) for d in span)*(-1 if end<start else 1),weekendDays=weekend,holidaysSubtracted=sum(d in inside and d.weekday()<5 for d in h),holidaysOnWeekends=sum(d in inside and d.weekday()>=5 for d in h),holidaysOutOfRange=len(h-inside),duplicateHolidayLines=len(holidays)-len(h))
    cursor=start;left=abs(n)
    while left:
        cursor+=timedelta(days=1 if n>0 else -1)
        if iswork(cursor):left-=1
    return dict(mode=mode,startDate=str(start),days=n,resultDate=str(cursor),resultWeekday=weekday(cursor),resultIsBusinessDay=iswork(cursor),calendarDaysMoved=(cursor-start).days)
def dew(i):
    schema(i,['temperature','relativeHumidity']);p=r'-?[0-9]+(\.[0-9]+)?'
    t=decimal(i['temperature'],'temperature',8,p,-50,60);h=decimal(i['relativeHumidity'],'relativeHumidity',8,p,0,100,strict=True)
    with localcontext() as c:
        c.prec=55;t=D(t.numerator)/D(t.denominator);h=D(h.numerator)/D(h.denominator);a=D('17.27');b=D('237.7');gamma=(h/100).ln()+a*t/(b+t)
        td=b*gamma/(a-gamma);ah=D('216.7')*D('6.112')*(a*t/(b+t)).exp()*h/100/(D('273.15')+t)
        rounded=lambda x:float((x*10+D('0.5')).to_integral_value(rounding=ROUND_FLOOR)/10)
        td=rounded(td);ah=rounded(ah)
    bands=['dry','comfortable','mostly-comfortable','slightly-humid','humid','oppressive','extremely-oppressive'];band=bands[sum(td>=x for x in [10,13,16,18,21,24])]
    return dict(dewPointC=td,absoluteHumidityGm3=ah,comfortBand=band)
GRADES=[29500,30300,31800,33300,34800,36300,38200,40100,42000,43900,45800,48200,50600,53000,55400,57800,60800,63800,66800,69800,72800,76500,80200,83900,87600,92100,96600,101100,105600,110100,115500,120900,126300,131700,137100,142500,147900,150000,156400,162800,169200,175600,182000,189500,197000,204500,212000,219500,228200,236900,245600,254300,263000,273000,283000,293000,303000,313000]
def nhi(i):
    schema(i,['monthlySalary','dependents']);salary=decimal(i['monthlySalary'],'monthlySalary',8,INTEGER,1,99999999,code='INTEGER_FORMAT');deps=int(decimal(i['dependents'],'dependents',8,INTEGER,0,99,code='INTEGER_FORMAT'))
    idx=next((x for x,v in enumerate(GRADES) if salary<=v),57);amt=GRADES[idx];sp=rhu(F(amt*1551,100000));charged=min(deps,3)
    return dict(grade=idx+1,insuredAmount=amt,dependentsCharged=charged,dependentsCapped=deps>3,selfPremium=sp,dependentPremiumEach=sp,employeeTotalPremium=sp*(charged+1),employerPremium=rhu(F(amt*483912,10000000)),governmentPremium=rhu(F(amt*80652,10000000)))
ACTIVITIES=[('walking-moderate','17190','3.8'),('walking-brisk','17200','4.8'),('hiking-cross-country','17080','6.0'),('jogging-general','12020','7.5'),('running-6mph','12050','9.3'),('bicycling-leisure','01010','4.0'),('bicycling-moderate','01030','8.0'),('swimming-laps-slow','18240','5.8'),('swimming-laps-fast','18230','9.8'),('aerobic-general','02000','7.3'),('elliptical-moderate','02048','5.0'),('resistance-training','02054','3.5'),('yoga-hatha','02150','2.3'),('tai-chi','15670','3.3')]
AT={i:(code,met) for i,code,met in ACTIVITIES}
def calories(i):
    schema(i,['weight','durationMinutes','activities'],arrays=['activities']);w=decimal(i['weight'],'weight',8,DEC,20,500);dur=decimal(i['durationMinutes'],'durationMinutes',8,r'(0|[1-9][0-9]*)(\.[0-9])?',1,1440);arr=i['activities']
    if not arr:fail('EMPTY','activities')
    if len(arr)>3:fail('ROW_LIMIT','activities',4)
    for row,s in enumerate(arr,1):
        common(s,'activities',32,row)
        if s not in AT:fail('ENUM','activities',row)
    for row,s in enumerate(arr,1):
        if s in arr[:row-1]:fail('DUPLICATE','activities',row)
    rows=[dict(activityId=s,code=AT[s][0],met=AT[s][1],kcal=rhu(F(AT[s][1])*w*dur/60)) for s in arr]
    return dict(rows=rows,totalKcal=sum(row['kcal'] for row in rows))
DIST={'5k':5000,'10k':10000,'half':21097.5,'marathon':42195}
def race(i):
    schema(i,['knownPreset','knownCustomM','knownTime','targetCustomM']);preset=enum(i['knownPreset'],'knownPreset',8,list(DIST)+['custom'])
    if preset=='custom':d1=decimal(i['knownCustomM'],'knownCustomM',12,r'[0-9]+(\.[0-9]{1,2})?',400,42195)
    else:
        if len(i['knownCustomM'].encode('utf-16-le','surrogatepass'))//2>12:fail('INPUT_LIMIT','knownCustomM')
        d1=F(str(DIST[preset]))
    s=i['knownTime'];common(s,'knownTime',10)
    if not re.fullmatch(r'[0-9]{1,3}(:[0-9]{2}){1,2}',s):fail('TIME_FORMAT','knownTime')
    parts=list(map(int,s.split(':')))
    if parts[-1]>59 or (len(parts)==3 and parts[-2]>59):fail('RANGE','knownTime')
    seconds=parts[-1]+parts[-2]*60+(parts[0]*3600 if len(parts)==3 else 0)
    if not 10<=seconds<=359999:fail('RANGE','knownTime')
    target=i['targetCustomM'];common(target,'targetCustomM',12,empty=True);targets=list(DIST.items())
    if target:targets.append(('custom',float(decimal(target,'targetCustomM',12,r'[0-9]+(\.[0-9]{1,2})?',400,42195))))
    rows=[]
    with localcontext() as ctx:
        ctx.prec=55
        def dr(x):return int((x+D('0.5')).to_integral_value(rounding=ROUND_FLOOR))
        d=D(d1.numerator)/D(d1.denominator)
        for key,metres in targets:
            dt=D(str(metres));raw=D(seconds)*(dt/d)**D('1.06')
            rows.append(dict(key=key,distanceM=metres,predictedSeconds=dr(raw),paceSecPerKm=dr(raw/(dt/1000)*10)/10))
        pace=dr(D(seconds)/(d/1000)*10)/10
    return dict(knownDistanceM=float(d1),knownTimeSeconds=seconds,knownPaceSecPerKm=pace,predictions=rows)
FUNCS=dict(zip(SLUGS,[cooking,age,workdays,salary,bill,calories,dew,nhi,race]))
def evaluate(slug,i):
    try:return ok(FUNCS[slug](i))
    except Invalid as e:return dict(ok=False,error=e.error)
def fixtures(slug):
    data=json.loads((SPECS/slug/'fixtures.json').read_text(encoding='utf-8'))
    return data if isinstance(data,list) else data['cases']
