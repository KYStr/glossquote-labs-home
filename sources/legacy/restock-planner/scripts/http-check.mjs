import { runHttpChecks } from './lib/http-harness.mjs';
const result = await runHttpChecks();
process.stdout.write(`PASS loopback HTTP: ${result.requests} requests, ${result.routes} exact asset routes; own child stopped\n`);
