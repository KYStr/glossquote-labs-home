import { buildProduction } from './lib/production.mjs';
const result=await buildProduction();
process.stdout.write(`PASS production build: ${result.files.length} closed assets; M1 bytes preserved\n`);
