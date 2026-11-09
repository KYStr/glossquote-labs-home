import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { verifyProduction, applyHeaderRules } from './production.mjs';

export function createProductionModel(files) {
  const ruleText=files.get('_headers').toString('utf8');
  const types={html:'text/html;charset=utf-8',css:'text/css;charset=utf-8',js:'text/javascript;charset=utf-8',txt:'text/plain;charset=utf-8',xml:'application/xml;charset=utf-8'};
  return createServer((request,response)=>{
    const raw=request.url ?? '';
    let status=200, path=raw, body, type;
    if (!['GET','HEAD'].includes(request.method)) { status=405; body=Buffer.from('Method not allowed\n'); type=types.txt; }
    else {
      const valid=raw.startsWith('/') && !/[?%#\\]/u.test(raw) && !raw.includes('//') && !raw.split('/').some(part=>part==='.'||part==='..');
      const key=raw.slice(1);
      if (valid && key!=='_headers' && key!=='manifest.json' && files.has(key)) { body=files.get(key); type=types[key.split('.').at(-1)]; }
      else { status=404; body=files.get('404.html'); type=types.html; }
    }
    // Invalid requests and methods never acquire a canonical's indexing permission.
    if(status!==200) path='/404.html';
    const computed=applyHeaderRules(ruleText,path);
    response.writeHead(status,{...computed,'Content-Type':type,'Content-Length':body.length,...(status===405?{Allow:'GET, HEAD'}:{})});
    response.end(request.method==='HEAD'?undefined:body);
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2);
    if(args.length && (args.length!==2||args[0]!=='--port'||!/^[0-9]{1,5}$/u.test(args[1]))) throw Error('arguments');
    const port=args.length?Number(args[1]):5208;if(port>65535)throw Error('port');
    const {files}=await verifyProduction();const server=createProductionModel(files);
    server.on('error',()=>{process.stderr.write('Production model could not start; existing services are unchanged.\n');process.exitCode=1;});
    server.listen(port,'127.0.0.1',()=>process.stdout.write(`Production HTTP model http://127.0.0.1:${server.address().port}/index.html (local model only)\n`));
  }catch{process.stderr.write('Production model configuration failed.\n');process.exitCode=1;}
}
