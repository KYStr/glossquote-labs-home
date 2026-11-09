import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {verifyCLI} from '../batch20-live-release-2026-10-27/release-tools.mjs';
const base=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
function physical(p){for(let x=path.resolve(p);;x=path.dirname(x)){assert(!fs.lstatSync(x).isSymbolicLink(),'Linked deployment ancestor');if(x===path.dirname(x))break;}}
function files(root){
 const out=[];
 for(const e of fs.readdirSync(root,{withFileTypes:true})){
  const p=path.join(root,e.name),s=fs.lstatSync(p);assert(!s.isSymbolicLink());
  if(s.isDirectory())out.push(...files(p).map(f=>({...f,path:e.name+'/'+f.path})));
  else{assert(s.isFile()&&s.nlink===1);out.push({path:e.name,bytes:s.size,sha256:sha(fs.readFileSync(p))});}
 }
 return out.sort((a,b)=>a.path.localeCompare(b.path));
}
function validate(expectedCommit,expectedDigest){
 assert.match(expectedCommit||'',/^[a-f0-9]{40}$/);assert.match(expectedDigest||'',/^[a-f0-9]{64}$/);
 physical(path.join(base,'batch-plan.json'));const plan=read(path.join(base,'batch-plan.json'));
 assert.equal(plan.stage,path.join(base,'release'));physical(plan.stage);
 assert.equal(plan.commit,expectedCommit,'Commit differs from externally reviewed release');
 assert.equal(sha(Buffer.from(JSON.stringify(plan.files))),expectedDigest,'Manifest differs from externally reviewed release');
 assert.deepEqual(plan.helpers.map(h=>h.name),['release-tools.mjs','deploy.ps1']);
 assert.deepEqual(files(plan.stage),plan.files);
 for(const h of plan.helpers){physical(path.join(base,h.name));assert.equal(sha(fs.readFileSync(path.join(base,h.name))),h.sha256);}
 const c=read(path.join(plan.stage,'wrangler.jsonc')),sites=read(path.join(plan.stage,'sites.json'));
 assert.deepEqual(Object.keys(c).sort(),['name','main','compatibility_date','workers_dev','preview_urls','send_metrics','observability','assets','routes'].sort());
 assert.equal(c.name,'glossquote-inspection-tools');assert.equal(c.main,'worker.mjs');
 assert.deepEqual(c.assets,{directory:'./assets',binding:'ASSETS',run_worker_first:true,html_handling:'none',not_found_handling:'none'});
 assert.deepEqual(c.observability,{enabled:false,logs:{enabled:false,invocation_logs:false},traces:{enabled:false}});
 for(const key of ['workers_dev','preview_urls','send_metrics'])assert.equal(c[key],false);
 const occupied=new Set(read(path.join(base,'existing-domains.json')).map(x=>x.hostname));
 for(const host of Object.keys(sites))assert(/^[a-z0-9-]+\.glossquote\.com$/.test(host)&&!occupied.has(host));
 assert.deepEqual(c.routes,Object.keys(sites).map(h=>({pattern:h+'/*',zone_name:'glossquote.com'})));
 assert(plan.files.length<20000&&plan.files.every(f=>f.bytes<=25*1024*1024));
 return {plan,sites,cli:verifyCLI()};
}
function headersFor(site,p){
 const result={'Content-Security-Policy':site.csp};
 for(const rule of site.headerRules||[]){const parts=rule.pattern.split('*');assert(parts.length<=2);const matches=parts.length===1?p===rule.pattern:p.startsWith(parts[0])&&p.endsWith(parts[1]);if(matches)Object.assign(result,rule.headers);}
 result['X-Robots-Tag']='noindex, follow';
 result['Strict-Transport-Security']='max-age=31536000';
 result['X-Frame-Options']='DENY';
 result['Content-Security-Policy']=result['Content-Security-Policy'].replace(/(?:^|;)\s*frame-ancestors\b[^;]*/gi, '')+"; frame-ancestors 'none'";
 return result;
}
async function live(expectedCommit,expectedDigest){
 const {plan,sites}=validate(expectedCommit,expectedDigest),results=[],edge=[];
 const selected=['percentage-calculator.glossquote.com','overtime-pay-calculator.glossquote.com','review.glossquote.com'];
 const jobs=Object.entries(sites).filter(([host])=>selected.includes(host)).flatMap(([host,site])=>site.paths.map(p=>({host,site,p})));let next=0;
 async function worker(){
  while(next<jobs.length){
   const {host,site,p}=jobs[next++];const expected=plan.files.find(f=>f.path==='assets/__sites/'+site.slug+p);
   try{
    const r=await fetch('https://'+host+p,{redirect:'manual',signal:AbortSignal.timeout(30000)}),bytes=Buffer.from(await r.arrayBuffer());assert.equal(r.status,200);
    const mime=r.headers.get('content-type')||'',ext=p.split('.').pop();
    const types={html:/text\/html/i,js:/javascript/i,mjs:/javascript/i,css:/text\/css/i,json:/application\/json/i,xml:/(application|text)\/xml/i,svg:/image\/svg\+xml/i};
    if(types[ext])assert(types[ext].test(mime),'Invalid MIME '+mime);
    assert.equal(sha(bytes),expected.sha256);assert.equal(r.headers.get('referrer-policy'),'no-referrer');
    for(const [h,v]of Object.entries(headersFor(site,p)))assert.equal(r.headers.get(h),v,'Source header '+h+' changed');
    assert(!r.headers.has('nel')&&!r.headers.has('report-to'));
    if(p.endsWith('index.html')){assert(bytes.toString().includes('rel="canonical" href="https://'+host+p+'"'));assert(bytes.toString().includes('hreflang="x-default"'));assert(!/cloudflareinsights|cdn-cgi\/rum/.test(bytes.toString()));}
    results.push({host,path:p,status:r.status,sha256:sha(bytes),pass:true,headers:Object.fromEntries(['content-type','content-security-policy','x-robots-tag','referrer-policy','x-content-type-options','cross-origin-opener-policy','cross-origin-resource-policy','permissions-policy','cache-control'].map(h=>[h,r.headers.get(h)]))});
   }catch(e){results.push({host,path:p,pass:false,error:e.message});}
   fs.writeFileSync(path.join(base,'live-progress.json'),JSON.stringify({at:new Date().toISOString(),done:results.length,total:jobs.length,failed:results.filter(r=>!r.pass).length},null,2));
  }
 }
 await Promise.all([worker(),worker(),worker(),worker()]);
 for(const host of selected)for(const [p,status]of [['/',301],['/en/',301],['/not-a-release-file',404]]){
  try{const r=await fetch('https://'+host+p,{redirect:'manual',signal:AbortSignal.timeout(20000)});await r.arrayBuffer();assert.equal(r.status,status);if(status===301)assert.equal(r.headers.get('location'),'https://'+host+(p==='/en/'?'/en/index.html':'/index.html'));const security=Object.fromEntries(['strict-transport-security','x-frame-options','content-security-policy','x-robots-tag'].map(h=>[h,r.headers.get(h)]));assert.equal(security['strict-transport-security'],'max-age=31536000');assert.equal(security['x-frame-options'],'DENY');assert.match(security['content-security-policy']||'',/frame-ancestors 'none'/);assert.equal(security['x-robots-tag'],'noindex, follow');edge.push({host,path:p,status:r.status,pass:true,security});}
  catch(e){edge.push({host,path:p,pass:false,error:e.message});}
 }
 const out={at:new Date().toISOString(),commit:plan.commit,scope:'Actual public HTTPS file bytes, bilingual SEO metadata, headers and canonical redirects; not full product/browser/device acceptance',results,edge};
 fs.writeFileSync(path.join(base,'live-verification.json'),JSON.stringify(out,null,2)+'\n');
 const failed=[...results,...edge].filter(r=>!r.pass).length;console.log(JSON.stringify({assets:results.length,edge:edge.length,failed}));if(failed)process.exitCode=1;
}
const [mode,site,commit,digest]=process.argv.slice(2);
if(mode==='validate'){const r=validate(commit,digest);console.log(JSON.stringify({status:'PASS_FROZEN_RELEASE',hosts:Object.keys(r.sites).length,files:r.plan.files.length,cli:r.cli}));}
else if(mode==='plan'){
 assert.match(site,/^[a-f0-9]{40}$/);const plan={id:'batch',commit:site,stage:path.join(base,'release'),files:files(path.join(base,'release')),helpers:['release-tools.mjs','deploy.ps1'].map(name=>({name,sha256:sha(fs.readFileSync(path.join(base,name)))}))};fs.writeFileSync(path.join(base,'batch-plan.json'),JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify({files:plan.files.length,commit:site}));
}else if(mode==='live')await live(commit,digest);else throw Error('Unknown operation');
