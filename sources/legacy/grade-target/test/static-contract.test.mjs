import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { request } from 'node:http';
import { root, sourceContents, publicFiles } from '../scripts/assets.mjs';
import { createPreview } from '../scripts/serve.mjs';

test('B01/B15 fail closed markup, no name, no inline code; preview noindex and matching home',async()=>{
  const files=await sourceContents(); assert.equal(files.size,8);
  for(const path of ['index.html','en/index.html']) {
    const html=files.get(path).toString();
    assert.match(html,/<fieldset id="work" disabled>/u); assert.match(html,/<form[^>]+method="post"/u);
    for(const button of html.matchAll(/<button\b[^>]*>/gu)) assert.match(button[0],/\bdisabled\b/u);
    for(const input of html.matchAll(/<(?:input|textarea)\b[^>]*>/gu)) assert.doesNotMatch(input[0],/\bname\s*=/u);
    assert.match(html,/<meta name="robots" content="noindex,nofollow">/u);assert.doesNotMatch(html,/canonical|application\/ld\+json|sitemap/iu);
    assert.match(html,new RegExp(`href="https://glossquote.com/${path==='en/index.html'?'en/':''}index.html"`,'u'));
  }
  const app=files.get('js/app.js').toString();
  assert.match(app,/form\.addEventListener\('submit', event => \{\s*event\.preventDefault\(\);\s*if \(!ready\) return;/u);
  assert.match(app,/\{ capture: true \}/u);assert.match(app,/addEventListener\('pagehide', blank\)/u);assert.match(app,/event\.persisted/u);
  for(const path of publicFiles.filter(x=>x.endsWith('.js'))) assert.doesNotMatch(files.get(path).toString(),path.includes('/core/')?/\bNumber\s*\(|parseFloat|parseInt/u:/parseFloat|parseInt/u);
});
test('B15 executable initialization-failure fixture keeps controls disabled and synchronously cancels submit',async()=>{
  const source=(await readFile(join(root,'public/js/app.js'),'utf8')).replace(/^import [^\n]+;\n/gmu,'');
  const callbacks=[], order=[]; const controls=Array.from({length:8},()=>({disabled:true}));
  const form={addEventListener:(type,callback,options)=>callbacks.push({type,callback,options})};
  const notice={hidden:false,textContent:''};
  const rows={firstElementChild:{cloneNode(){throw Error('CANARY-NOT-FOR-UI');}}};
  const document={documentElement:{lang:'en'},getElementById:id=>id==='calculator'?form:id==='rows'?rows:id==='initialization'?notice:{disabled:true},querySelectorAll:()=>controls};
  runInNewContext(source,{document});
  assert.equal(callbacks.length,1);assert.equal(callbacks[0].type,'submit');assert.equal(callbacks[0].options.capture,true);
  callbacks[0].callback({preventDefault(){order.push('preventDefault');}});
  assert.deepEqual(order,['preventDefault']);assert.equal(controls.every(c=>c.disabled),true);
  assert.equal(notice.hidden,false);assert.match(notice.textContent,/The form could not start/u);assert.doesNotMatch(notice.textContent,/CANARY/u);
});
function http(port,path,method='GET') {return new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port,path,method},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));});req.on('error',reject);req.end();});}
test('B22 loopback HTTP methods, safe paths, MIME/headers, distinct 404; no static source exposure',async()=>{
  const server=await createPreview();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    assert.equal(server.address().address,'127.0.0.1');const port=server.address().port;
    for(const [path,type]of [['/','text/html'],['/index.html','text/html'],['/en/index.html','text/html'],['/styles/app.css','text/css'],['/js/app.js','text/javascript'],['/robots.txt','text/plain']]){
      const r=await http(port,path);assert.equal(r.status,200,path);assert.equal(r.headers['content-type'].startsWith(type),true);
      assert.match(r.headers['content-security-policy'],/form-action 'none'/u);assert.match(r.headers['content-security-policy'],/connect-src 'none'/u);assert.equal(r.headers['x-content-type-options'],'nosniff');assert.equal(r.headers['referrer-policy'],'no-referrer');assert.equal(r.headers['x-robots-tag'],'noindex, nofollow');
      const head=await http(port,path,'HEAD');assert.equal(head.status,200);assert.equal(head.body,'');assert.equal(head.headers['content-length'],r.headers['content-length']);
    }
    for(const path of ['/not-found','/package.json','/../package.json','/%2e%2e/package.json','//index.html','/en/../index.html','/?targetRaw=CANARY','/sitemap.xml']){const r=await http(port,path);assert.equal(r.status,404,path);assert.doesNotMatch(r.body,/calculator|CANARY|\bform\b/u);}
    for(const method of ['POST','PUT','DELETE','OPTIONS'])assert.equal((await http(port,'/',method)).status,405);
    assert.match((await http(port,'/robots.txt')).body,/Disallow: \//u);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
