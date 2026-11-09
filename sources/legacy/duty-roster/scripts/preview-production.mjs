import http from 'node:http';
import { checkProduction } from './check-production.mjs';
import { productionResponse } from './model.mjs';
const files = await checkProduction();
const server = http.createServer((request, response) => {
  const result = productionResponse(files, request.url, request.method);
  response.writeHead(result.status, { ...result.headers, 'content-length': result.body.length });
  response.end(request.method === 'HEAD' ? undefined : result.body);
});
server.on('error', error => { process.stderr.write(error.code === 'EADDRINUSE' ? 'Production model port 5209 is in use; existing process preserved.\n' : 'Local model could not start.\n'); process.exitCode = 1; });
server.listen(5209, '127.0.0.1', () => process.stdout.write('Local production HTTP model: http://127.0.0.1:5209/index.html (not a live deployment)\n'));
