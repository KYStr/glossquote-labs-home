import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MIME } from './assets.mjs';
import { checkProduction,headerModel,FAVICON_PATH } from './production.mjs';
export async function startProductionServer(port=5212){
  const files=await checkProduction(),rules=files.get('_headers').toString();
  const assets=new Map([...files].filter(([name])=>!['_headers','_redirects'].includes(name)).map(([name,bytes])=>['/'+name,{bytes,type:name===FAVICON_PATH?'image/svg+xml;charset=utf-8':MIME[path.extname(name)]}]));
  const redirects=new Map(files.get('_redirects').toString().trim().split('\n').map(line=>{const [from,to,status]=line.split(' ');return [from,{to,status:Number(status)}];}));
  const server=http.createServer((request,response)=>{
    const head=request.method==='HEAD',raw=request.url??'',valid=raw.startsWith('/')&&!/[\\%?#\u0000-\u0020]/.test(raw),headers=headerModel(rules,valid?raw:'/404.html');
    if(request.method!=='GET'&&!head){const bytes=Buffer.from('Method not allowed\n');response.writeHead(405,{...headerModel(rules,'/404.html'),'Content-Type':'text/plain;charset=utf-8','Content-Length':bytes.length,'Allow':'GET, HEAD'});response.end(bytes);return;}
    if(valid&&redirects.has(raw)){const redirect=redirects.get(raw);response.writeHead(redirect.status,{'Location':redirect.to,'Content-Length':0,'Cache-Control':'no-store'});response.end();return;}
    const asset=valid?assets.get(raw):null,selected=asset??assets.get('/404.html');response.writeHead(asset?200:404,{...headers,'Content-Type':selected.type,'Content-Length':selected.bytes.length});response.end(head?undefined:selected.bytes);
  });
  server.requestTimeout=5000;server.headersTimeout=5000;server.keepAliveTimeout=1000;server.maxHeadersCount=40;
  await new Promise((resolve,reject)=>{function failed(error){if(error.code==='EADDRINUSE'&&port!==0){server.removeListener('error',failed);server.once('error',reject);server.listen(0,'127.0.0.1',resolve);}else reject(error);}server.once('error',failed);server.listen(port,'127.0.0.1',resolve);});return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--port'&&/^[0-9]{1,5}$/.test(args[1])&&Number(args[1])<=65535))throw Error('Use --port 0..65535');
  const server=await startProductionServer(args.length?Number(args[1]):5212);console.log(`Production HTTP MODEL http://127.0.0.1:${server.address().port} (PID ${process.pid}; loopback; not a live/CDN acceptance)`);
}
