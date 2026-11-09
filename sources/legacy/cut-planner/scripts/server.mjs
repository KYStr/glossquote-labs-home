import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { builtAssets,MIME,SECURITY_HEADERS } from './assets.mjs';
export async function startServer(port=4212){
  const files=await builtAssets();
  const routes=new Map([...files].filter(([name])=>name!=='_headers').map(([name,bytes])=>[`/${name}`,{bytes,type:MIME[path.extname(name)]}]));
  routes.set('/',routes.get('/index.html'));routes.set('/en/',routes.get('/en/index.html'));
  const server=http.createServer((request,response)=>{
    const head=request.method==='HEAD';
    if(request.method!=='GET'&&!head){const bytes=Buffer.from('Method not allowed\n');response.writeHead(405,{...SECURITY_HEADERS,'Allow':'GET, HEAD','Content-Type':'text/plain;charset=utf-8','Content-Length':bytes.length});response.end(bytes);return;}
    const raw=request.url??'',asset=raw.startsWith('/')&&!/[\\%?#\u0000-\u0020]/.test(raw)?routes.get(raw):null;
    const selected=asset??routes.get('/404.html');
    response.writeHead(asset?200:404,{...SECURITY_HEADERS,'Content-Type':selected.type,'Content-Length':selected.bytes.length});response.end(head?undefined:selected.bytes);
  });
  server.requestTimeout=5000;server.headersTimeout=5000;server.maxHeadersCount=40;server.keepAliveTimeout=1000;
  await new Promise((resolve,reject)=>{
    function listenError(error){if(error.code==='EADDRINUSE'&&port!==0){server.removeListener('error',listenError);server.once('error',reject);server.listen(0,'127.0.0.1',resolve);}else reject(error);}
    server.once('error',listenError);server.listen(port,'127.0.0.1',resolve);
  });
  return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--port'&&/^[0-9]{1,5}$/.test(args[1])&&Number(args[1])<=65535))throw Error('Use --port 0..65535');
  const server=await startServer(args.length?Number(args[1]):4212);console.log(`Preview http://127.0.0.1:${server.address().port} (PID ${process.pid}; loopback; noindex)`);
}
