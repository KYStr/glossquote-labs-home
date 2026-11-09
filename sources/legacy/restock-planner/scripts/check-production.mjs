import { checkProduction } from './lib/production.mjs';
const result=await checkProduction();
process.stdout.write(`PASS production SEO/CSP/headers/robots/sitemap/404: ${result.files.length} assets, ${result.payloadHashes.length} exact JSON-LD hashes\n`);
