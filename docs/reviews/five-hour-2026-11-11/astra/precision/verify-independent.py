"""Independent round-2 precision review. No maker/product code is executed.
Reads pinned downloaded source/candidate docs and the bundled independent oracle.
All generated evidence goes only to the explicit output directory.
"""
from pathlib import Path
from fractions import Fraction
from decimal import Decimal, localcontext, ROUND_FLOOR
import json, hashlib, difflib, math, platform
from datetime import datetime, timezone

import argparse, sys
sys.dont_write_bytecode=True
import oracle_snapshot
HERE=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-root',type=Path,required=True)
parser.add_argument('--candidate-root',type=Path,required=True)
parser.add_argument('--output-dir',type=Path,required=True)
args=parser.parse_args()
ROOT=args.output_dir.resolve(); OLD=args.source_root.resolve(); WORK=args.candidate_root.resolve()
for input_root in [OLD,WORK]:
    if ROOT==input_root or ROOT in input_root.parents or input_root in ROOT.parents:
        raise ValueError('Output directory must not overlap either input directory')
ROOT.mkdir(parents=True,exist_ok=True)
verified=[]
for label,base,manifest in [('source',OLD,json.loads((HERE/'source-blob-manifest.json').read_text(encoding='utf-8'))),
    ('candidate',WORK,json.loads((HERE/'public-blob-manifest.json').read_text(encoding='utf-8'))['files'])]:
    for row in manifest:
        p=Path(row['path'])
        if p.is_absolute() or '..' in p.parts:raise ValueError('Unsafe manifest path')
        data=(base/p).read_bytes()
        actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
        if actual!=row.get('blobSha',row.get('sha')):raise ValueError('Input Git blob mismatch: '+label+'/'+p.as_posix())
        verified.append(dict(input=label,path=p.as_posix(),gitBlob=actual,status='PASS'))
SLUGS = ['cooking-measurement-converter','nhi-premium-calculator','race-time-predictor']
NAMES = ['SPEC.md','fixtures.json','BRIEF.md','AUTHOR-CHECK.md']
PATHS = [Path('docs/specs')/s/n for s in SLUGS for n in NAMES]
PATHS.append(Path('docs/specs/nhi-premium-calculator/PROVENANCE-RECHECK.md'))
EXPECTED_CHANGED = {
'docs/specs/cooking-measurement-converter/SPEC.md',
'docs/specs/cooking-measurement-converter/BRIEF.md',
'docs/specs/cooking-measurement-converter/AUTHOR-CHECK.md',
'docs/specs/nhi-premium-calculator/SPEC.md',
'docs/specs/race-time-predictor/SPEC.md',
'docs/specs/race-time-predictor/BRIEF.md',
'docs/specs/race-time-predictor/AUTHOR-CHECK.md',
'docs/specs/race-time-predictor/fixtures.json'
}
report = dict(observedAt=datetime.now(timezone.utc).isoformat(),python=platform.python_version(),
scope='Portable independent reproduction against pinned public document bytes; no product execution or registry mutation.',
candidateCommit='23fa1265837f66fbedc04441db260dbb2a5ed924',inputBlobChecks=verified,
sourceCommit='448bd9fc9865fe65f6014b66f4a2e2d54b76f539',
files=[],checks=[],raceRecomputed=[],raceShape=[])
def sha(b):return hashlib.sha256(b).hexdigest()
def check(name,value,details=None):
    report['checks'].append(dict(id=name,status='PASS' if value else 'FAIL',details=details))
    if not value:raise AssertionError(name)
changed=[];patch=[]
for p in PATHS:
    before=(OLD/p).read_bytes();after=(WORK/p).read_bytes()
    different=before!=after
    if different:changed.append(p.as_posix())
    blob=hashlib.sha1(b'blob '+str(len(after)).encode()+b'\0'+after).hexdigest()
    report['files'].append(dict(path=p.as_posix(),bytes=len(after),sha256=sha(after),gitBlob=blob,
        oldSha256=sha(before),changed=different))
    if different:patch.extend(difflib.unified_diff(before.decode().splitlines(True),after.decode().splitlines(True),
        fromfile='a/'+p.as_posix(),tofile='b/'+p.as_posix()))
check('exact-eight-file-scope',set(changed)==EXPECTED_CHANGED,changed)
(ROOT/'independent-diff.patch').write_text(''.join(patch),encoding='utf-8')
def loadcases(root,slug):
    v=json.loads((root/'docs/specs'/slug/'fixtures.json').read_text(encoding='utf-8'))
    return v if isinstance(v,list) else v['cases']

for slug in SLUGS[:2]:
    check(slug+'-fixture-bytes-preserved',
          (OLD/'docs/specs'/slug/'fixtures.json').read_bytes()==(WORK/'docs/specs'/slug/'fixtures.json').read_bytes())
oldrace=loadcases(OLD,SLUGS[2]);newrace=loadcases(WORK,SLUGS[2])
newby={c['id']:c for c in newrace}
check('all-eighteen-old-race-cases-preserved',len(oldrace)==18 and all(newby.get(c['id'])==c for c in oldrace))
check('one-new-core-case-only',len(newrace)==19 and set(newby)-{c['id'] for c in oldrace}=={'custom-source-matching-target'}
      and newby['custom-source-matching-target']['kind']=='core')

# Bundled independent oracle definitions, with original provenance recorded separately.
oracle=HERE/'oracle_snapshot.py'
ns=vars(oracle_snapshot)
report['reusedOracleSha256']=sha(oracle.read_bytes())
for case in newrace:
    if case.get('kind')=='controller':continue
    actual=ns['evaluate']('race-time-predictor',case['input'])
    equal=actual==case['expected']
    report['raceRecomputed'].append(dict(id=case['id'],status='PASS' if equal else 'FAIL',actual=actual,expected=case['expected']))
    check('race-core-'+case['id'],equal)
    if actual['ok']:
        r=actual['result'];rows=r['predictions'];custom=case['input']['targetCustomM']
        expected=[['5k',5000],['10k',10000],['half',21097.5],['marathon',42195]]
        if custom:expected.append(['custom',float(custom)])
        observed=[[x['key'],x['distanceM']] for x in rows]
        identities=[x['key'] for x in rows if x['distanceM']==r['knownDistanceM']]
        check('race-shape-'+case['id'],observed==expected)
        check('race-conditional-identity-'+case['id'],all(x['predictedSeconds']==r['knownTimeSeconds']
            and x['paceSecPerKm']==r['knownPaceSecPerKm'] for x in rows if x['distanceM']==r['knownDistanceM']))
        report['raceShape'].append(dict(id=case['id'],targets=observed,identityRows=identities))
check('custom-15000-no-invented-row',report['raceShape'][[x['id'] for x in report['raceShape']].index('custom-source')]['identityRows']==[])
newresult=newby['custom-source-matching-target']['expected']['result']
check('custom-15000-matching-target-literal',newresult['predictions'][-1]==dict(key='custom',distanceM=15000,predictedSeconds=4050,paceSecPerKm=270))

nhi_old=(OLD/'docs/specs/nhi-premium-calculator/SPEC.md').read_text(encoding='utf-8')
nhi_new=(WORK/'docs/specs/nhi-premium-calculator/SPEC.md').read_text(encoding='utf-8')
def appendix(s):return s.split('附錄：58 級保費對照',1)[1].split('## implementation',1)[0]
check('nhi-58-grade-appendix-preserved',appendix(nhi_old)==appendix(nhi_new))
check('nhi-false-float-requirement-removed','457.54499' not in nhi_new and '應得 457 的反例' not in nhi_new)
half=Fraction(150000)*Fraction(517,10000)*Fraction(3,10)
first=Fraction(29500)*Fraction(517,10000)*Fraction(3,10)
check('nhi-first-grade-exact',first==Fraction(91509,200) and (2*first.numerator+first.denominator)//(2*first.denominator)==458)
check('nhi-real-half-up-vs-bankers',half==Fraction(4653,2) and (2*half.numerator+half.denominator)//(2*half.denominator)==2327 and round(half)==2326)
report['nhiArithmetic']=dict(first=str(first),firstHalfUp=458,halfBoundary=str(half),halfUp=2327,bankers=2326,
    binaryFloat=29500*0.0517*0.3,binaryFloatRounded=math.floor(29500*0.0517*0.3+0.5),
    formerlyClaimedApproxRounded=math.floor(457.54499+0.5))
check('nhi-incorrect-example-stays-458',report['nhiArithmetic']['binaryFloatRounded']==458 and report['nhiArithmetic']['formerlyClaimedApproxRounded']==458)
def density(s):
    rows=[]
    for line in s.splitlines():
        c=[x.strip() for x in line.strip('|').split('|')]
        if len(c)==4 and c[-1].isdigit():rows.append([c[0],int(c[-1])])
    return rows
cook_old=(OLD/'docs/specs/cooking-measurement-converter/SPEC.md').read_text(encoding='utf-8')
cook_new=(WORK/'docs/specs/cooking-measurement-converter/SPEC.md').read_text(encoding='utf-8')
check('cooking-twelve-density-values-preserved',len(density(cook_old))==12 and density(cook_old)==density(cook_new))
check('cooking-butter-227g-is-one-cup',Fraction(227,1)/dict(density(cook_new))['butter']==1)
check('cooking-discloses-two-sources-and-226-rounding','EasyAsPie_February2025.pdf#page=1' in cook_new
      and '226 g' in cook_new and '奶油採同出版社教材' in cook_new and '密度表全表同源' not in cook_new)
race_new=(WORK/'docs/specs/race-time-predictor/SPEC.md').read_text(encoding='utf-8')
check('race-no-unconditional-known-row','已知距離本身必為預測列之一' not in race_new and '若自訂已知距離與所有目標距離皆不同' in race_new)
check('race-upgrade-not-new-ready','existing-tool-upgrade' in race_new and '不計新工具 ready 庫存' in race_new and 'tools/race-time-predictor/' not in race_new)
# Reproduce the previously reused unchanged fixture and appendix evidence too.
report['unchangedCoreRecomputed']=[]
for slug in SLUGS[:2]:
    for case in loadcases(WORK,slug):
        if case.get('kind')=='controller':continue
        actual=ns['evaluate'](slug,case['input'])
        check('unchanged-core-'+slug+'-'+case['id'],actual==case['expected'])
        report['unchangedCoreRecomputed'].append(dict(slug=slug,id=case['id'],actual=actual,expected=case['expected'],status='PASS'))
report['nhiAppendixRecomputed']=[]
for line in appendix(nhi_new).splitlines():
    cells=[x.strip().replace(',','') for x in line.strip('|').split('|')]
    if len(cells)==10 and all(x.isdigit() for x in cells):
        for off in [0,5]:
            grade,amount,selfp,employer,gov=map(int,cells[off:off+5])
            actual=ns['nhi'](dict(monthlySalary=str(amount),dependents='0'))
            expected=(grade,amount,selfp,employer,gov)
            observed=tuple(actual[k] for k in ['grade','insuredAmount','selfPremium','employerPremium','governmentPremium'])
            check('nhi-appendix-grade-'+str(grade),observed==expected)
            report['nhiAppendixRecomputed'].append(dict(grade=grade,actual=observed,expected=expected,status='PASS'))
check('nhi-appendix-exactly-58-grades',len(report['nhiAppendixRecomputed'])==58)
report['summary']=dict(files=len(report['files']),changed=len(changed),checks=len(report['checks']),
passCount=sum(x['status']=='PASS' for x in report['checks']),raceCore=len(report['raceRecomputed']),
raceSuccessShapes=len(report['raceShape']),oldCoreAndControllerCasesPreserved=18,
unchangedNhiAndCookingCore=len(report['unchangedCoreRecomputed']),nhiAppendix=len(report['nhiAppendixRecomputed']),inputGitBlobs=len(verified),productGui='NOT_RUN',registryMutation='NOT_RUN')
(ROOT/'offline-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report['summary'],ensure_ascii=False))

