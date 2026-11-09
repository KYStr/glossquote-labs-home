import { checkProduction, jsonLdHashes } from './production.mjs';
await checkProduction();
console.log(`PASS: production bytes/SEO/header/config allowlists; JSON-LD SHA-256 ${jsonLdHashes.join(', ')}`);
