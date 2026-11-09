import { verifyProduction, auditProduction, verifyPreviewIfPresent } from './production.mjs';

try {
  const { files }=await verifyProduction(); auditProduction(files); await verifyPreviewIfPresent();
  process.stdout.write('PASS production bytes/manifest, config, SEO, CSP hashes, header inheritance, robots assets, preview isolation\n');
} catch { process.stderr.write('FAIL production check\n'); process.exitCode=1; }
