import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,readFile,link,symlink,rm,rmdir,unlink } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { ROOT,ASSETS,OUTPUT,DIST,HEADERS_TEXT,SECURITY_HEADERS,inspectTree,manifest,builtAssets,contained } from '../scripts/assets.mjs';
import { build } from '../scripts/build.mjs';
import { startServer } from '../scripts/server.mjs';
test('source, preview build, fixed manifest and initially disabled unnamed controls',async()=>{
  const out=await build();assert.equal(out.size,OUTPUT.length);assert.equal((await builtAssets()).size,OUTPUT.length);
  const expected=manifest(new Map([...out].filter(([name])=>name!=='asset-manifest.json')));
  assert.deepEqual(JSON.parse(await readFile(path.join(DIST,'asset-manifest.json'),'utf8')),expected);
  assert.equal(out.get('_headers').toString(),HEADERS_TEXT);
  for(const name of ['index.html','en/index.html']){
    const html=out.get(name).toString();assert.match(html,/name="robots" content="noindex,nofollow"/);assert.match(html,/<fieldset id="work-fields" disabled>/);assert.doesNotMatch(html,/<(?:input|textarea|select)\b[^>]*\bname=/);
    for(const tag of html.matchAll(/<button\b[^>]*>/g))assert.match(tag[0],/\bdisabled\b/);
    assert.doesNotMatch(html,/type="number"|maxlength=|<script[^>]*>[^<]+<\/script>/);
  }
  assert.match(out.get('index.html').toString(),/不計兩端修邊切鋸的鋸縫，也不在最後成品與餘料間另扣鋸縫。餘料不保證可回用/);
  assert.match(out.get('en/index.html').toString(),/It excludes the saw kerf from end-trim cuts/);
});
test('asset gates reject unknown files/dirs, links, oversized files, traversal and stale outputs',async()=>{
  const testRoot=path.join(ROOT,'tests'),fixture=await mkdtemp(path.join(testRoot,'.scratch-cut-'));
  // Recursive removal is bounded to this exact task-owned fixture after resolving it.
  const relative=path.relative(testRoot,path.resolve(fixture));assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
  try{
    const base=path.join(fixture,'assets');await mkdir(base);await writeFile(path.join(base,'ok.txt'),'fake');
    assert.equal((await inspectTree(base,['ok.txt'])).size,1);
    await writeFile(path.join(base,'extra.txt'),'fake');await assert.rejects(inspectTree(base,['ok.txt']),/unknown asset file/);await rm(path.join(base,'extra.txt'));
    await mkdir(path.join(base,'unknown'));await assert.rejects(inspectTree(base,['ok.txt']),/unknown asset directory/);await rmdir(path.join(base,'unknown'));
    await writeFile(path.join(base,'ok.txt'),Buffer.alloc(1048577));await assert.rejects(inspectTree(base,['ok.txt']),/size cap/);await writeFile(path.join(base,'ok.txt'),'fake');
    await link(path.join(base,'ok.txt'),path.join(base,'hard.txt'));await assert.rejects(inspectTree(base,['ok.txt','hard.txt']),/hardlinked/);await rm(path.join(base,'hard.txt'));
    const target=path.join(fixture,'target');await mkdir(target);await writeFile(path.join(target,'item.txt'),'fake');
    await symlink(target,path.join(base,'nested'),process.platform==='win32'?'junction':'dir');await assert.rejects(inspectTree(base,['ok.txt','nested/item.txt']),/linked/);await unlink(path.join(base,'nested'));
    await Promise.all(['a.txt','b.txt','c.txt'].map(name=>writeFile(path.join(base,name),Buffer.alloc(800000))));
    await assert.rejects(inspectTree(base,['ok.txt','a.txt','b.txt','c.txt']),/tree exceeds/);
    assert.throws(()=>contained(base,'../outside'),/unsafe/);assert.throws(()=>contained(base,'nested\\outside'),/unsafe/);
    const built=path.join(DIST,'robots.txt'),original=await readFile(built);try{await writeFile(built,'stale fake');await assert.rejects(builtAssets(),/stale build/);}finally{await writeFile(built,original);}
  }finally{await rm(fixture,{recursive:true,force:true});}
});
function request(port,route,method='GET'){
  return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path:route,method},res=>{const bytes=[];res.on('data',chunk=>bytes.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(bytes)}));});req.on('error',reject);req.end();});
}
test('loopback HTTP GET/HEAD, MIME, CSP, noindex and no fallback for unsafe routes',async()=>{
  const server=await startServer(0),port=server.address().port;assert.equal(server.address().address,'127.0.0.1');
  try{
    for(const file of ASSETS){const route=`/${file}`,get=await request(port,route),head=await request(port,route,'HEAD');
      assert.equal(get.status,200);assert.equal(head.status,200);assert.equal(head.body.length,0);assert.equal(Number(head.headers['content-length']),get.body.length);
      for(const [key,value]of Object.entries(SECURITY_HEADERS))assert.equal(get.headers[key.toLowerCase()],value);
      const ext=path.extname(file),type={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.txt':'text/plain','.xml':'application/xml'}[ext];assert.ok(get.headers['content-type'].startsWith(type));
    }
    for(const route of ['/','/en/'])assert.equal((await request(port,route)).status,200);
    for(const route of ['/missing','/en/missing','/../package.json','/%2e%2e/package.json','/js/%63ore/cut-planner.mjs','/js\\app.mjs','/index.html?stock=FAKE','/_headers','/package.json','/robots.txt/','//index.html','/%','/.git/config']){
      const r=await request(port,route);assert.equal(r.status,404);assert.match(r.body.toString(),/Page not found/);assert.doesNotMatch(r.body.toString(),/cut-form/);assert.equal(r.headers['x-robots-tag'],'noindex,nofollow');
    }
    for(const method of ['POST','PUT','DELETE','OPTIONS']){const r=await request(port,'/index.html',method);assert.equal(r.status,405);assert.equal(r.headers.allow,'GET, HEAD');}
    const fallback=await startServer(port);try{assert.notEqual(fallback.address().port,port);assert.equal(fallback.address().address,'127.0.0.1');}finally{await new Promise(resolve=>fallback.close(resolve));}
  }finally{await new Promise(resolve=>server.close(resolve));}
});
