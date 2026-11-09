import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { ROOT, MIME } from './lib/files.mjs';
import { checkProduction, headersFor } from './lib/production.mjs';

export async function createProductionServer(root=ROOT) {
  const checked=await checkProduction(root),directory=path.join(root,'dist-production'),assets=new Map();
  for(const file of checked.files.filter(file=>file.path!=='_headers'))assets.set('/'+file.path,await readFile(path.join(directory,file.path)));
  const respond=(request,response)=>{
    const hosts=request.rawHeaders.filter((_,i)=>i%2===0).filter(name=>name.toLowerCase()==='host');
    let status=200,body,type='text/plain; charset=utf-8';
    if(hosts.length!==1||!['127.0.0.1:5217','localhost:5217'].includes(request.headers.host?.toLowerCase())){status=421;body=Buffer.from('Misdirected request\n');}
    else if(!['GET','HEAD'].includes(request.method)){status=405;body=Buffer.from('Method not allowed\n');}
    else if(!assets.has(request.url)){status=404;body=assets.get('/404.html');type='text/html; charset=utf-8';}
    else {body=assets.get(request.url);type=MIME[path.posix.extname(request.url)];}
    const policyTarget=request.url.startsWith('/')?request.url:'/404.html';
    const headers={...headersFor(checked.headerRules,policyTarget),'content-type':type,'content-length':body.length};
    if(status>=400)headers['x-robots-tag']='noindex, nofollow';
    if(status===405)headers.allow='GET, HEAD';
    response.sendDate=false;response.writeHead(status,headers);response.end(request.method==='HEAD'?undefined:body);
  };
  const server=http.createServer({maxHeaderSize:8192,requestTimeout:5000,headersTimeout:5000,requireHostHeader:false},respond);
  const direct=(request,socket)=>{const response=new http.ServerResponse(request);response.assignSocket(socket);response.shouldKeepAlive=false;response.once('finish',()=>socket.end());respond(request,response);};
  server.on('connect',direct);server.on('upgrade',direct);return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const server=await createProductionServer();
  server.on('error',()=>{process.stderr.write('Production preview could not start; existing processes preserved.\n');process.exitCode=1;});
  server.listen(5217,'127.0.0.1',()=>process.stdout.write('Restock production preview listening at 127.0.0.1:5217\n'));
}
