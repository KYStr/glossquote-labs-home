"""Independent document contract replay. No author or product module is loaded.
The unchanged 20 MET core cases are compared and prior evidence reused, not rerun.
Only controller delivery inputs receive Fraction arithmetic plausibility checks.
"""
from pathlib import Path, PurePosixPath
from fractions import Fraction
from copy import deepcopy
from datetime import datetime, timezone
import json, re, hashlib, difflib, platform, posixpath

import argparse
HERE=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-root',type=Path,required=True)
parser.add_argument('--candidate-root',type=Path,required=True)
parser.add_argument('--output-dir',type=Path,required=True)
args=parser.parse_args();ROOT=args.output_dir.resolve();SOURCE=args.source_root.resolve();CANDIDATE=args.candidate_root.resolve()
for input_root in [SOURCE,CANDIDATE]:
 if ROOT==input_root or ROOT in input_root.parents or input_root in ROOT.parents:raise ValueError('Output must not overlap inputs')
ROOT.mkdir(parents=True,exist_ok=True)
REL=Path('docs/specs/calories-burned-calculator')
NAMES=['SPEC.md','fixtures.json','BRIEF.md','AUTHOR-CHECK.md','PROVENANCE-RECHECK.md']
DEFAULT={'weight':'60','durationMinutes':'30','activities':['walking-moderate']}
report={'observedAt':datetime.now(timezone.utc).isoformat(),'python':platform.python_version(),
 'candidate':'76aeb64235e82de05970e18a2e1231859aa1ee2a','source':'448bd9fc9865fe65f6014b66f4a2e2d54b76f539',
 'checks':[],'files':[],'steps':[],'payloads':[],'downloads':[],'additionalProbes':[],'relativeLinks':[]}
def digest(b):return hashlib.sha256(b).hexdigest()
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def check(name,passed,detail=None):
 report['checks'].append(dict(id=name,status='PASS' if passed else 'FAIL',detail=detail))
 if not passed:raise AssertionError(name)
source_manifest={r['path']:r for r in json.loads((HERE/'source-blob-manifest.json').read_text(encoding='utf-8'))}
verified=[]
candidate_manifest=json.loads((HERE/'input-manifest.json').read_text(encoding='utf-8'))['files']
shared_manifest=json.loads((HERE/'shared-link-targets.json').read_text(encoding='utf-8'))
for kind,base,manifest in [('source',SOURCE,list(source_manifest.values())),('candidate',CANDIDATE,candidate_manifest+shared_manifest)]:
 for row in manifest:
  rel=Path(row['path'])
  if rel.is_absolute() or '..' in rel.parts:raise ValueError('Unsafe manifest path')
  b=(base/rel).read_bytes();actual=blob(b)
  if actual!=row.get('blobSha',row.get('blob')):raise ValueError('Input Git blob mismatch: '+kind+'/'+rel.as_posix())
  verified.append(dict(input=kind,path=rel.as_posix(),gitBlob=actual,status='PASS'))
report['inputBlobChecks']=verified
changed=[];diff=[]
for name in NAMES:
 p=REL/name;old=(SOURCE/p).read_bytes();new=(CANDIDATE/p).read_bytes()
 check('pinned-source-'+name,blob(old)==source_manifest[p.as_posix()]['blobSha'])
 changed.append(name) if old!=new else None
 report['files'].append(dict(path=p.as_posix(),beforeBlob=blob(old),afterBlob=blob(new),beforeSha256=digest(old),afterSha256=digest(new),changed=old!=new))
 diff.extend(difflib.unified_diff(old.decode().splitlines(True),new.decode().splitlines(True),fromfile='a/'+p.as_posix(),tofile='b/'+p.as_posix()))
check('exact-three-spec-files-changed',set(changed)=={'SPEC.md','BRIEF.md','fixtures.json'})
(ROOT/'independent-diff.patch').write_text(''.join(diff),encoding='utf-8')
oldtext=(SOURCE/REL/'fixtures.json').read_bytes().decode('utf-8');newtext=(CANDIDATE/REL/'fixtures.json').read_bytes().decode('utf-8')
old=json.loads(oldtext);new=json.loads(newtext)
check('all-twenty-core-records-deep-identical',len([x for x in new if x.get('kind')!='controller'])==20 and old[:20]==new[:20])
def object_spans(text):
 decoder=json.JSONDecoder();i=1;spans=[]
 while i<len(text):
  while text[i].isspace() or text[i]==',':i+=1
  if text[i]==']':break
  _,end=decoder.raw_decode(text,i);spans.append(text[i:end]);i=end
 return spans
check('all-twenty-core-record-bytes-preserved',object_spans(oldtext)[:20]==object_spans(newtext)[:20])
prior=json.loads((HERE/'prior-core-evidence.json').read_text(encoding='utf-8'))
prior_core=[x for x in prior['core'] if x['slug']=='calories-burned-calculator']
check('prior-twenty-core-pass-evidence-available',len(prior_core)==20 and all(x['status']=='PASS' for x in prior_core))
report['unchangedCoreEvidence']=dict(priorReportSha256=digest((HERE/'prior-core-evidence.json').read_bytes()),cases=20,status='REUSED_PRIOR_PASS_NOT_RECALCULATED')
os=(SOURCE/REL/'SPEC.md').read_text(encoding='utf-8');ns=(CANDIDATE/REL/'SPEC.md').read_text(encoding='utf-8')
table=lambda t:re.findall(r'^\| \d+ \|.*$',t,re.M)
check('all-fourteen-met-table-rows-identical',len(table(os))==14 and table(os)==table(ns))
section=lambda t,a,b:t.split(a,1)[1].split(b,1)[0]
for a,b in [('### 2.2','### 2.3'),('### 2.3','### 2.4')]:check('unchanged-range-'+a,section(os,a,b)==section(ns,a,b))
check('unchanged-exact-formula-block',section(section(os,'### 2.5','### 2.6'),'```text','```')==section(section(ns,'### 2.5','### 2.6'),'```text','```'))

def canonical(value):return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n'
def report_text(inp,result):return canonical(dict(tool='calories-burned-calculator',version=1,**inp,**result))
def delivery_oracle(inp):
 # Independently derived for the four distinct inputs in the new controller fixtures.
 if not re.fullmatch(r'(0|[1-9][0-9]*)(\.[0-9]{1,2})?',inp['weight']):return {'error':{'code':'DECIMAL_FORMAT','field':'weight','row':None}}
 rates={'walking-moderate':('17190',Fraction(19,5)),'walking-brisk':('17200',Fraction(24,5)),'jogging-general':('12020',Fraction(15,2))}
 rows=[]
 for activity in inp['activities']:
  code,met=rates[activity];q=met*Fraction(inp['weight'])*Fraction(inp['durationMinutes'])/60
  kcal=(q.numerator*2+q.denominator)//(q.denominator*2)
  rows.append(dict(activityId=activity,code=code,met={'walking-moderate':'3.8','walking-brisk':'4.8','jogging-general':'7.5'}[activity],kcal=kcal))
 return {'result':dict(rows=rows,totalKcal=sum(x['kcal'] for x in rows))}

class Contract:
 def __init__(self,initial=None):
  self.active=True;self.epoch=0;self.state='empty';self.draft=deepcopy(initial or DEFAULT)
  self.pending=None;self.accepted=None;self.error=None;self.live=None;self.revoked=[];self.counter=0
  self.jobs={} # Audit adapter history only, not production controller retention.
 def revoke(self):
  if self.live is not None:self.revoked.append(self.live);self.live=None
 def invalidate(self):
  self.epoch+=1;self.pending=None;self.accepted=None;self.error=None;self.revoke()
 def snapshot(self):
  return dict(state=self.state,active=self.active,epoch=self.epoch,pendingEpoch=None if self.pending is None else self.pending[0],
   draft=deepcopy(self.draft),result=None if self.accepted is None else deepcopy(self.accepted[2]),error=deepcopy(self.error),
   reportAvailable=self.active and self.state=='success' and self.accepted is not None and self.accepted[0]==self.epoch,
   liveUrl=self.live,revokedUrls=self.revoked[:])
 def event(self,e):
  kind=e['type'];download=None
  if kind=='cleanup':
   if e['url']==self.live:self.revoke()
   return download
  if kind=='pageshow':
   if not self.active:self.active=True;self.draft=deepcopy(DEFAULT);self.state='empty'
   return download
  if not self.active:return download
  if kind=='edit':self.invalidate();self.draft[e['field']]=deepcopy(e['value']);self.state='dirty'
  elif kind=='start':
   self.invalidate();self.pending=(self.epoch,deepcopy(self.draft));self.jobs[self.epoch]=deepcopy(self.draft);self.state='busy'
  elif kind=='deliver':
   if self.state=='busy' and self.pending is not None and e['epoch']==self.epoch==self.pending[0]:
    captured=self.pending[1];self.pending=None
    if 'result' in e:self.accepted=(self.epoch,captured,deepcopy(e['result']));self.state='success'
    else:self.accepted=None;self.error=deepcopy(e['error']);self.state='error'
  elif kind=='cancel':
   if self.state=='busy':self.invalidate();self.state='cancelled'
  elif kind in ['reset','pagehide']:
   self.invalidate();self.draft=deepcopy(DEFAULT);self.state='empty'
   if kind=='pagehide':self.active=False
  elif kind=='download':
   if self.snapshot()['reportAvailable']:
    text=report_text(self.accepted[1],self.accepted[2])
    if len(text.encode('utf-8'))>e.get('testEncoderLimit',2*1024*1024):return None
    self.revoke();self.counter+=1;self.live='blob:fixture/'+str(self.counter)
    download=dict(filename='calories-burned-report.json',utf8=text)
  else:raise AssertionError('Unknown event '+kind)
  return download

scenarios=[x for x in new if x.get('kind')=='controller']
check('three-old-controller-identities-preserved',[x['id'] for x in scenarios]==[x['id'] for x in old if x.get('kind')=='controller'])
discarded=0
for case in scenarios:
 model=Contract(case['initialInput'])
 check(case['id']+'-initial',model.snapshot()==case['expectedInitial'])
 for i,step in enumerate(case['steps'],1):
  event=step['event'];was=model.snapshot()
  if event['type']=='deliver':
   inp=model.jobs[event['epoch']];payload={k:event[k] for k in ['result','error'] if k in event};expected=delivery_oracle(inp)
   check(case['id']+'-payload-'+str(i),payload==expected)
   report['payloads'].append(dict(case=case['id'],step=i,input=inp,expected=expected,actual=payload,status='PASS'))
   if not(model.active and model.state=='busy' and model.pending and event['epoch']==model.epoch==model.pending[0]):discarded+=1
  download=model.event(event);snapshot=model.snapshot()
  check(case['id']+'-step-'+str(i),snapshot==step['expected'])
  report['steps'].append(dict(case=case['id'],step=i,event=event,actual=snapshot,status='PASS'))
  if event['type']=='download':
   check(case['id']+'-download-'+str(i),download==step['expectedDownload'])
   report['downloads'].append(dict(case=case['id'],step=i,expected=step['expectedDownload'],actual=download,status='PASS'))
check('exact-thirty-four-checkpoints',len(report['steps'])==34)
check('exact-six-discarded-deliveries',discarded==6)
check('three-downloads-four-refusals',sum(x['actual'] is not None for x in report['downloads'])==3 and sum(x['actual'] is None for x in report['downloads'])==4)
examples=re.findall(r'```json\n(.*?)\n```',section(ns,'### 3.3','## 4.'),re.S)
check('two-report-examples-use-first-two-original-fixtures',len(examples)==2 and all(text+'\n'==report_text(case['input'],case['expected']) for text,case in zip(examples,new[:2])))

def probe(name,value,detail):
 check(name,value,detail);report['additionalProbes'].append(dict(id=name,status='PASS',detail=detail))
def success():
 m=Contract();m.event({'type':'start'});m.event({'type':'deliver','epoch':1,**delivery_oracle(DEFAULT)});return m
# Hand-selected negative sequences target gaps between the three supplied scenarios.
m=Contract();m.event({'type':'start'});m.event({'type':'start'});m.event({'type':'deliver','epoch':1,**delivery_oracle(DEFAULT)})
probe('second-start-supersedes-same-draft',m.snapshot()['state']=='busy' and m.snapshot()['pendingEpoch']==2,'The old epoch 1 cannot settle pending epoch 2.')
m.event({'type':'deliver','epoch':2,**delivery_oracle(DEFAULT)});accepted=m.snapshot();m.event({'type':'deliver','epoch':2,'error':{'code':'SCHEMA','field':None,'row':None}})
probe('duplicate-delivery-after-success-ignored',m.snapshot()==accepted,'Even matching epoch cannot replace an already settled result.')
m=success();m.event({'type':'download'});m.event({'type':'download'});m.event({'type':'cleanup','url':'blob:fixture/1'})
probe('old-cleanup-cannot-revoke-new-url',m.live=='blob:fixture/2' and m.revoked==['blob:fixture/1'],'Second download supersedes first URL; the old callback has no effect on URL 2.')
m.event({'type':'cleanup','url':'blob:fixture/2'});m.event({'type':'cleanup','url':'blob:fixture/2'})
probe('cleanup-token-idempotence',m.live is None and m.revoked==['blob:fixture/1','blob:fixture/2'],'Each actual URL is revoked exactly once.')
m=success();m.event({'type':'edit','field':'weight','value':'61'});m.event({'type':'edit','field':'weight','value':'60'})
probe('edit-back-does-not-restore-success',m.state=='dirty' and m.accepted is None and m.event({'type':'download'}) is None,'Returning raw input to the old text still needs a fresh calculation.')
m=Contract();m.event({'type':'start'});m.event({'type':'pagehide'});before=m.snapshot()
for e in [{'type':'start'},{'type':'edit','field':'weight','value':'99'},{'type':'reset'},{'type':'cancel'},{'type':'deliver','epoch':1,**delivery_oracle(DEFAULT)},{'type':'download'}]:m.event(e)
probe('pagehide-busy-and-inactive-events-ignored',m.snapshot()==before and not m.active and m.epoch==2,'Hidden page clears pending work; all six inactive user/delivery events leave cleared state unchanged.')
m.event({'type':'pageshow','persisted':True});m.event({'type':'deliver','epoch':1,**delivery_oracle(DEFAULT)})
probe('bfcache-restoration-keeps-hide-epoch',m.active and m.epoch==2 and m.state=='empty' and m.draft==DEFAULT,'Restore remains empty at epoch 2; old epoch 1 is still invalid.')
m=success();before=m.snapshot();m.event({'type':'cancel'});m.event({'type':'pageshow','persisted':False})
probe('nonbusy-cancel-and-active-pageshow-noop',m.snapshot()==before,'No current job or inactive page means both events are no-ops.')
m=success();before=m.snapshot();download=m.event({'type':'download','testEncoderLimit':1})
probe('encoder-refusal-preserves-success-without-url',download is None and m.snapshot()==before,'Injected one-byte cap exercises OUTPUT_LIMIT without a file or URL; calculation success remains usable. Feedback rendering is not executed.')
arr=['walking-brisk','jogging-general'];m=Contract();m.event({'type':'edit','field':'activities','value':arr});arr.clear();m.event({'type':'start'});captured=deepcopy(m.pending[1]);m.draft['activities'].clear()
probe('draft-and-job-array-snapshots-are-independent',captured['activities']==['walking-brisk','jogging-general'] and m.pending[1]['activities']==captured['activities'],'Mutating original event array or editable draft cannot mutate the captured job input.')

available={x['path'] for x in json.loads((HERE/'input-manifest.json').read_text())['files']}
available|={x['path'] for x in json.loads((HERE/'shared-link-targets.json').read_text())}
for filename in {x['path'] for x in candidate_manifest}:
 p=CANDIDATE/filename
 if not p.is_file() or not filename.endswith('.md'):continue
 for link in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8')):
  if re.match(r'https?:|#',link):continue
  target=posixpath.normpath(posixpath.join(posixpath.dirname(filename),link.split('#')[0]))
  check('relative-link-'+filename+'-'+link,target in available)
  report['relativeLinks'].append(dict(source=filename,target=link,resolved=target,status='PASS'))
report['summary']=dict(checks=len(report['checks']),passed=sum(x['status']=='PASS' for x in report['checks']),
 inputGitBlobs=len(verified),controllerCases=len(scenarios),literalSteps=len(report['steps']),initialSnapshots=3,deliveryPayloads=len(report['payloads']),discardedDeliveries=discarded,
 successfulDownloads=3,refusals=4,additionalProbes=len(report['additionalProbes']),relativeLinks=len(report['relativeLinks']),
 unchangedCore='20 prior PASS reused; bytes preserved; not rerun',unchangedMetRows=14,productController='NOT_RUN',productGui='NOT_RUN',registryMutation='NOT_RUN')
(ROOT/'independent-controller-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report['summary']))
