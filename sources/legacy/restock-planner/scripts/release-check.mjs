import { checkProduction } from './lib/production.mjs';
import { runProductionHttp } from './lib/production-http.mjs';
const files=await checkProduction();const http=await runProductionHttp();
process.stdout.write(`PASS production release model: ${files.files.length} assets, ${http.assetRoutes} served routes, ${http.requests} HTTP requests; own child stopped; not a live deployment\n`);
