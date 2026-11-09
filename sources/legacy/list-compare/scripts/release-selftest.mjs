import assert from 'node:assert/strict';
import { request } from 'node:http';
import path from 'node:path';
import { ROOT, PUBLIC_ASSETS, readAssets } from './files.mjs';
import { makeServer, listenPreferred } from './server.mjs';
import { SECURITY_HEADERS } from './release-contract.mjs';

function httpRead(port, url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: url, method, headers: { Host: 'untrusted.example' } }, response => {
      const chunks=[]; response.on('data',c=>chunks.push(c)); response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,bytes:Buffer.concat(chunks)}));
    });
    req.setTimeout(5000,()=>req.destroy(new Error('Local HTTP timeout'))); req.on('error',reject); req.end();
  });
}
export async function releaseSelfTest() {
  const tree = await readAssets(path.join(ROOT,'dist-production'), { production:true, source:false });
  const server = await makeServer(path.join(ROOT,'dist-production'), { production:true });
  const { address } = await listenPreferred(server, 0); const records=[];
  try {
    for (const file of PUBLIC_ASSETS.filter(f=> !['_headers','404.html'].includes(f))) {
      const got=await httpRead(address.port,'/'+file); assert.equal(got.status,200); assert.deepEqual(got.bytes,tree.get(file));
      for(const [key,value] of Object.entries(SECURITY_HEADERS)) assert.equal(got.headers[key.toLowerCase()],value);
      assert.equal(got.headers['x-robots-tag'],undefined);
      const expected=file.endsWith('.html')?'text/html':file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.xml')?'application/xml':'text/plain'; assert.ok(got.headers['content-type'].startsWith(expected));
      const head=await httpRead(address.port,'/'+file,'HEAD');assert.equal(head.status,200);assert.equal(head.bytes.length,0);assert.equal(Number(head.headers['content-length']),got.bytes.length);
      records.push({file,status:got.status,bytes:got.bytes.length,mime:got.headers['content-type']});
    }
    for(const url of ['/404.html','/not-found','/en/not-found','/_headers','/package.json','/%2e%2e/package.json']){const got=await httpRead(address.port,url);assert.equal(got.status,404);assert.deepEqual(got.bytes,tree.get('404.html'));assert.equal(got.headers['x-robots-tag'],'noindex, nofollow');assert.ok(got.headers['content-type'].startsWith('text/html'));}
    assert.equal((await httpRead(address.port,'/index.html','POST')).status,405);
    assert.deepEqual((await httpRead(address.port,'/index.html?host=https://malicious.example')).bytes,tree.get('index.html'));
    return {status:'PASS',gate:'production HTTP GET/HEAD/MIME/security/404/405/Host-query isolation',host:address.address,port:address.port,files:records,liveCloudflare:'NOT_RUN'};
  } finally { await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve())); }
}
