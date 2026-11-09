import { spawn } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { ROOT } from './files.mjs';

const oracleFiles=[['/index.html','text/html; charset=utf-8'],['/en/index.html','text/html; charset=utf-8'],['/styles/tokens.css','text/css; charset=utf-8'],['/styles/app.css','text/css; charset=utf-8'],['/js/app.js','text/javascript; charset=utf-8'],['/js/copy.mjs','text/javascript; charset=utf-8'],['/js/state.mjs','text/javascript; charset=utf-8'],['/js/core/schema.mjs','text/javascript; charset=utf-8'],['/js/core/calculate.mjs','text/javascript; charset=utf-8'],['/js/core/report.mjs','text/javascript; charset=utf-8'],['/404.html','text/html; charset=utf-8'],['/robots.txt','text/plain; charset=utf-8'],['/sitemap.xml','application/xml; charset=utf-8'],['/favicon.svg','image/svg+xml; charset=utf-8']];
export async function startProductionPreview(root=ROOT) {
  const args=root===ROOT?[path.join(ROOT,'scripts/serve-production.mjs')]:[path.join(ROOT,'scripts/test-support/production-child.mjs'),root];
  const child=spawn(process.execPath,args,{cwd:ROOT,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
  const exited=once(child,'exit');exited.catch(()=>{});let done=false;child.once('exit',()=>{done=true;});
  const stop=async()=>{if(!done)child.kill();await exited;};
  try {await new Promise((resolve,reject)=>{let stdout='';const timeout=setTimeout(()=>reject(new Error('Production preview startup timed out')),5000);child.stdout.on('data',bytes=>{stdout+=bytes;if(stdout.includes('Restock production preview listening at 127.0.0.1:5217')){clearTimeout(timeout);resolve();}});child.stderr.resume();child.once('error',()=>{clearTimeout(timeout);reject(new Error('Production preview launch failed'));});child.once('exit',()=>{clearTimeout(timeout);reject(new Error('Production preview exited; possible port conflict; existing processes preserved'));});});}catch(error){await stop().catch(()=>{});throw error;}
  return {stop,pid:child.pid};
}
export function productionRequest({target='/index.html',method='GET',host='127.0.0.1:5217'}={}) {
  return new Promise((resolve,reject)=>{const request=http.request({hostname:'127.0.0.1',port:5217,path:target,method,headers:{Host:host},agent:false},response=>{const chunks=[];response.on('data',bytes=>chunks.push(bytes));response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks)}));});request.setTimeout(5000,()=>request.destroy(new Error('Production loopback timeout')));request.on('error',reject);request.end();});
}
function raw(lines) {
  return new Promise((resolve,reject)=>{const socket=net.createConnection({host:'127.0.0.1',port:5217}),chunks=[];socket.setTimeout(5000,()=>socket.destroy(new Error('Production raw loopback timeout')));socket.on('connect',()=>socket.write(lines.join('\r\n')+'\r\nConnection: close\r\n\r\n'));socket.on('data',bytes=>chunks.push(bytes));socket.on('error',reject);socket.on('end',()=>{const bytes=Buffer.concat(chunks),split=bytes.indexOf('\r\n\r\n'),[status,...lines]=bytes.subarray(0,split).toString().split('\r\n'),headers={};for(const line of lines){const i=line.indexOf(':');headers[line.slice(0,i).toLowerCase()]=line.slice(i+1).trim();}resolve({status:Number(status.split(' ')[1]),headers,body:bytes.subarray(split+4)});});});
}
export async function assertProductionHttp(root=ROOT) {
  const hashes=[];
  for(const file of ['index.html','en/index.html']){const html=await readFile(path.join(root,'dist-production',file),'utf8'),payload=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];assert.equal(payload.length,1);hashes.push(`'sha256-${createHash('sha256').update(payload[0][1]).digest('base64')}'`);}
  const csp=`default-src 'none'; script-src 'self' ${hashes.join(' ')}; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
  const security=result=>{assert.equal(result.headers['content-security-policy'],csp);assert.equal(result.headers['x-content-type-options'],'nosniff');assert.equal(result.headers['referrer-policy'],'no-referrer');assert.equal(result.headers['cache-control'],'no-store');};
  let requests=0;
  for(const [target,mime] of oracleFiles){const get=await productionRequest({target}),head=await productionRequest({target,method:'HEAD'});requests+=2;security(get);security(head);assert.equal(get.status,200);assert.equal(head.status,200);assert.equal(get.headers['content-type'],mime);assert.deepEqual(get.headers,head.headers);assert.equal(head.body.length,0);assert.deepEqual(get.body,await readFile(path.join(root,'dist-production',target.slice(1))));if(['/index.html','/en/index.html'].includes(target)){assert.equal(get.headers['x-robots-tag'],undefined);assert.ok(get.body.toString().includes('<meta name="robots" content="index,follow">'));}else assert.equal(get.headers['x-robots-tag'],'noindex, nofollow');}
  for(const target of ['/','/en/','/unknown','/index.html?x=1','/en/index.html?','/styles/app.css?v=1','/INDEX.html','//index.html','/%69ndex.html','/../package.json','/%2e%2e/package.json','/public/index.html','/dist-production/index.html','/package.json','/scripts/serve-production.mjs','/test/production.test.mjs','/HANDOFF.md','/_headers','/.git/config','/manifest.json']){const get=await productionRequest({target}),head=await productionRequest({target,method:'HEAD'});requests+=2;security(get);security(head);assert.equal(get.status,404,target);assert.equal(head.status,404);assert.deepEqual(head.headers,get.headers);assert.equal(head.body.length,0);assert.equal(get.headers['content-type'],'text/html; charset=utf-8');assert.equal(get.headers['x-robots-tag'],'noindex, nofollow');assert.ok(get.body.toString().includes('<meta name="robots" content="noindex,nofollow">'));}
  for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS','TRACE']){const response=await productionRequest({method,target:'/unknown'});requests++;security(response);assert.equal(response.status,405);assert.equal(response.headers.allow,'GET, HEAD');assert.equal(response.headers['content-type'],'text/plain; charset=utf-8');}
  for(const host of ['localhost:5217','LOCALHOST:5217','LocalHost:5217']){const response=await productionRequest({host});requests++;security(response);assert.equal(response.status,200);}
  for(const host of ['evil.invalid:5217','127.0.0.1','localhost','127.0.0.1:4217','localhost:5218'])for(const method of ['GET','HEAD','POST']){const response=await productionRequest({host,method,target:'/unknown'});requests++;security(response);assert.equal(response.status,421);assert.equal(response.headers.allow,undefined);if(method==='HEAD')assert.equal(response.body.length,0);}
  for(const [lines,status] of [[['GET /index.html HTTP/1.1'],421],[['POST /unknown HTTP/1.1'],421],[['GET /index.html HTTP/1.1','Host: localhost:5217','Host: evil.invalid:5217'],421],[['CONNECT localhost:5217 HTTP/1.1','Host: localhost:5217'],405],[['CONNECT localhost:5217 HTTP/1.1','Host: evil.invalid:5217'],421]]){const response=await raw(lines);requests++;security(response);assert.equal(response.status,status);if(status===405)assert.equal(response.headers.allow,'GET, HEAD');}
  return {requests,assetRoutes:oracleFiles.length};
}
export async function runProductionHttp(root=ROOT){const child=await startProductionPreview(root);try{return await assertProductionHttp(root);}finally{await child.stop();}}
