from pathlib import Path
import json,hashlib,zipfile,re,urllib.parse,csv
b=Path(__file__).parent
root=b/'delivery'
manifest=json.loads((root/'FILES.json').read_text(encoding='utf-8'))
for f in manifest:
 p=root/f['path'];assert p.resolve().is_relative_to(root.resolve());d=p.read_bytes();assert len(d)==f['bytes'] and hashlib.sha256(d).hexdigest()==f['sha256'],f['path']
links=[]
for name in ['00-START-HERE.md','previous/ARCHIVED-START-HERE.md','previous/M1/ARCHIVED-START-HERE.md']:
 content=re.sub(r'```.*?```','',(root/name).read_text(encoding='utf-8'),flags=re.S)
 for dest in re.findall(r'\]\(([^)]+)\)',content):
  if re.match(r'^(?:https?://|#)',dest):continue
  dest=urllib.parse.unquote(dest.split('#')[0].strip('<>'));p=(root/name).parent/dest
  assert p.resolve().is_relative_to(root.resolve()) and p.exists(),(name,dest)
  links.append({'document':name,'target':dest})
status=json.loads((root/'STATUS.json').read_text(encoding='utf-8'))
with (root/'STATUS.csv').open(encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
assert len(rows)==len(status['tools'])==190
assert len(set(r['slug'] for r in rows))==190
out=b/'glossquote-remaining-releases-2026-11-09.zip'
assert not out.exists(),'Preserve existing archives'
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(root.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(root).as_posix())
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 names=z.namelist();assert len(names)==len(set(n.casefold() for n in names))
 assert sum(Path(n).name=='00-START-HERE.md' for n in names)==1
 for n in names:assert not n.startswith(('/','\\')) and '\\' not in n and ':' not in n and '..' not in Path(n).parts,n
 for f in manifest:
  d=z.read(f['path']);assert len(d)==f['bytes'] and hashlib.sha256(d).hexdigest()==f['sha256']
receipt={'file':out.name,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'manifestFiles':len(manifest),'zipEntries':len(names),'relativeDocumentLinks':len(links),'statusRows':len(rows),'status':'PASS','scope':'CRC, safe paths, case uniqueness, bytes/SHA256 and main/archived entry relative links; historical source docs keep their original scope'}
(b/'archive-verification.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt))
