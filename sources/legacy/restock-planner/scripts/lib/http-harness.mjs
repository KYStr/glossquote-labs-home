import { spawn } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { ROOT } from './files.mjs';

const oracleCsp = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const routes = [
  ['/index.html','text/html; charset=utf-8'], ['/en/index.html','text/html; charset=utf-8'],
  ['/styles/tokens.css','text/css; charset=utf-8'], ['/styles/app.css','text/css; charset=utf-8'],
  ['/js/app.js','text/javascript; charset=utf-8'], ['/js/state.mjs','text/javascript; charset=utf-8'], ['/js/copy.mjs','text/javascript; charset=utf-8'],
  ['/js/core/schema.mjs','text/javascript; charset=utf-8'], ['/js/core/calculate.mjs','text/javascript; charset=utf-8'], ['/js/core/report.mjs','text/javascript; charset=utf-8'],
];
export async function startPreview(root = ROOT) {
  const args = root === ROOT ? [path.join(ROOT,'scripts/serve.mjs')] : [path.join(ROOT,'scripts/test-support/preview-child.mjs'),root];
  const child = spawn(process.execPath,args,{ cwd: ROOT, shell: false, windowsHide: true, stdio: ['ignore','pipe','pipe'] });
  const exited = once(child,'exit');
  // Observe rejection even if startup fails before the caller receives stop().
  exited.catch(() => {});
  let finished = false; child.once('exit',()=>{finished=true;});
  async function stop() { if (!finished) child.kill(); await exited; }
  try {
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{reject(new Error('Preview startup timed out'));},5000);
      let stdout='';
      child.stdout.on('data',data=>{stdout+=data; if(stdout.includes('Restock preview listening at 127.0.0.1:4217')){clearTimeout(timeout);resolve();}});
      child.once('error',()=>{clearTimeout(timeout);reject(new Error('Preview child could not launch'));});
      child.once('exit',()=>{clearTimeout(timeout);reject(new Error('Preview child exited; possible port conflict. Existing processes preserved.'));});
      child.stderr.resume();
    });
  } catch (error) { await stop().catch(()=>{}); throw error; }
  return { stop, pid: child.pid };
}

export function request({target='/index.html',method='GET',host='127.0.0.1:4217'}={}) {
  return new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port:4217,path:target,method,headers:{Host:host},agent:false},res=>{
      const chunks=[];res.on('data',data=>chunks.push(data));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
    });
    req.setTimeout(5000,()=>req.destroy(new Error('Loopback HTTP timeout')));req.on('error',reject);req.end();
  });
}
function rawRequest(lines) {
  return new Promise((resolve,reject)=>{
    const socket=net.createConnection({host:'127.0.0.1',port:4217});const chunks=[];
    socket.setTimeout(5000,()=>socket.destroy(new Error(`Loopback raw HTTP timeout: ${lines[0]}`)));
    socket.on('connect',()=>socket.write(`${lines.join('\r\n')}\r\nConnection: close\r\n\r\n`));socket.on('data',data=>chunks.push(data));socket.on('error',reject);
    socket.on('end',()=>{
      const bytes=Buffer.concat(chunks), boundary=bytes.indexOf('\r\n\r\n');
      const [statusLine,...headerLines]=bytes.subarray(0,boundary).toString().split('\r\n');const headers={};
      for(const line of headerLines){const colon=line.indexOf(':');headers[line.slice(0,colon).toLowerCase()]=line.slice(colon+1).trim();}
      resolve({status:Number(statusLine.split(' ')[1]),headers,body:bytes.subarray(boundary+4)});
    });
  });
}
function security(response) {
  assert.equal(response.headers['content-security-policy'],oracleCsp);
  assert.equal(response.headers['x-content-type-options'],'nosniff');assert.equal(response.headers['referrer-policy'],'no-referrer');
  assert.equal(response.headers['cache-control'],'no-store');assert.equal(response.headers['x-robots-tag'],'noindex, nofollow');
}
export async function assertHttpOracle(root = ROOT) {
  let requests=0;
  for(const [target,mime] of routes){
    const get=await request({target});const head=await request({target,method:'HEAD'});requests+=2;
    security(get);security(head);assert.equal(get.status,200);assert.equal(head.status,200);assert.equal(get.headers['content-type'],mime);
    assert.deepEqual(head.headers,get.headers);assert.equal(head.body.length,0);assert.deepEqual(get.body,await readFile(path.join(root,'dist',target.slice(1))));
    assert.equal(Number(get.headers['content-length']),get.body.length);
    if(target.endsWith('.html'))assert.ok(get.body.toString().includes('<meta name="robots" content="noindex,nofollow">'));
  }
  for(const target of ['/','/en/','/missing','/index.html?x=1','/en/index.html?','/styles/app.css?v=1','/INDEX.html','//index.html','/%69ndex.html','/../package.json','/%2e%2e/package.json','/public/index.html','/dist/index.html','/package.json','/test/core.test.mjs','/scripts/serve.mjs','/HANDOFF.md','/.git/config','/docs/ENGINEERING.md','/robots.txt','/sitemap.xml']){
    const get=await request({target});const head=await request({target,method:'HEAD'});requests+=2;
    security(get);security(head);assert.equal(get.status,404,target);assert.equal(head.status,404);assert.equal(get.headers['content-type'],'text/plain; charset=utf-8');assert.deepEqual(head.headers,get.headers);assert.equal(head.body.length,0);assert.equal(get.body.toString(),'Not found\n');
  }
  for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS','TRACE']){
    const response=await request({method,target:'/missing'});requests++;
    security(response);assert.equal(response.status,405);assert.equal(response.headers.allow,'GET, HEAD');assert.equal(response.headers['content-type'],'text/plain; charset=utf-8');assert.equal(response.body.toString(),'Method not allowed\n');
  }
  for(const host of ['localhost:4217','LOCALHOST:4217','LocalHost:4217']){const response=await request({host});requests++;security(response);assert.equal(response.status,200);}
  for(const host of ['evil.invalid:4217','127.0.0.1','localhost','127.0.0.1:80','localhost:4218','127.0.0.1:4217.evil.invalid']){
    for(const method of ['GET','POST','HEAD']){
      const response=await request({host,method,target:'/missing'});requests++;security(response);assert.equal(response.status,421);assert.equal(response.headers.allow,undefined);assert.equal(response.headers['content-type'],'text/plain; charset=utf-8');if(method==='HEAD')assert.equal(response.body.length,0);else assert.equal(response.body.toString(),'Misdirected request\n');
    }
  }
  for(const [lines,status] of [
    [['GET /index.html HTTP/1.1'],421], [['POST /missing HTTP/1.1'],421],
    [['GET /index.html HTTP/1.1','Host: localhost:4217','Host: evil.invalid:4217'],421],
    [['CONNECT localhost:4217 HTTP/1.1','Host: localhost:4217'],405],
    [['CONNECT localhost:4217 HTTP/1.1','Host: evil.invalid:4217'],421],
  ]){const response=await rawRequest(lines);requests++;security(response);assert.equal(response.status,status);if(status===405)assert.equal(response.headers.allow,'GET, HEAD');}
  return {requests,routes:routes.length};
}
export async function runHttpChecks(root = ROOT) {const preview=await startPreview(root);try{return await assertHttpOracle(root);}finally{await preview.stop();}}
