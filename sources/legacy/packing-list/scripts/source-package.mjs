import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECT_ROOT, PUBLIC_FILES, verifyRoot, verifyPath, inside, sha256 } from './validation.mjs';
import { checkProduction } from './production-check.mjs';

export const SOURCE_FILES = Object.freeze([
  '.gitignore', 'README.md', 'package.json', 'wrangler.jsonc', 'AGENTS.md', 'PRODUCT.md', 'TECHNICAL.md', 'ACCEPTANCE.md', 'UX-SEO.md', 'TASKS.md',
  'docs/BRAND.md', 'docs/DESIGN-SYSTEM.md', 'docs/ENGINEERING.md', 'docs/PRIVACY-SECURITY.md', 'docs/RELEASE.md',
  ...PUBLIC_FILES.map(file => `public/${file}`),
  ...['build', 'check', 'manifest', 'serve', 'validation', 'production-build', 'production-check', 'production-serve', 'source-archive', 'source-package', 'release-check'].map(file => `scripts/${file}.mjs`),
  ...['packing-list', 'import-export', 'toolchain', 'release'].map(file => `test/${file}.test.mjs`)
].sort());
const publicReadme = `# Packing List & Weight Planner / 行李清單與重量試算\n\nGloss Tools by GlossQuote. A bilingual static tool for one packing list, quantities, measured gram weights and packed status. Blank weight remains unknown, while 0g is known zero. With unknown items only a known subtotal is shown; limit results never represent airline approval.\n\nData remains in the current tab. Reloading, leaving, closing or switching languages clears it. Explicit UTF-8 JSON download is the only backup; imports validate completely, preview and require confirmation. No account, runtime dependency, analytics, remote fonts, storage or input upload.\n\nNode24+ and npm are required for development; no npm install is needed.\n\n- npm test\n- npm run check\n- npm run build\n- npm run build:production\n- npm run check:production\n- npm run dev (loopback127.0.0.1:4202; occupied port falls back without stopping its owner)\n- npm run serve:production (OS-assigned loopback port, local verification only)\n\nPreview public/ stays noindex/nofollow. dist-production/ is generated for https://packing.glossquote.com with bilingual canonical/hreflang, JSON-LD, robots/sitemap, security headers and custom404 pages. The planned origin is not evidence of a live release. Public source publication, Cloudflare hosting and external review are separate milestones.\n\nCore/app/state/i18n/styles bytes are pinned to the primary-reviewed M1 R1. Contract documents record design requirements; test output and release evidence establish acceptance. Actual200% zoom, complete Network/Storage and physical-device/assistive-technology checks remain documented manual gaps.\n\nThe reviewed source package excludes private handoff records, chat IDs, local evidence, generated output, downloads, caches and credentials. No LICENSE has been selected; a public repository alone is not an open-source license.\n`;
export async function prepareSource(destination, boundary, root = PROJECT_ROOT) {
  await checkProduction(root); boundary = await verifyRoot(boundary); destination = resolve(destination);
  if (destination === boundary || !inside(boundary, destination)) throw new Error('SOURCE_DESTINATION');
  await verifyPath(boundary, destination, { missing: true, directory: true });
  const buffers = new Map();
  for (const path of SOURCE_FILES) {
    await verifyPath(root, join(root, path));
    const bytes = path === 'README.md' ? Buffer.from(publicReadme.replace('- npm run check:production\n', '- npm run check:production\n- npm run check:release\n')) : await readFile(join(root, path));
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{20,}|\bAKIA[A-Z0-9]{16}\b/.test(bytes.toString('utf8'))) throw new Error('SOURCE_SECRET_PATTERN');
    buffers.set(path, bytes);
    await verifyPath(boundary, join(destination, path), { missing: true });
  }
  const files = [];
  for (const [path, bytes] of buffers) {
    const target = join(destination, path); await mkdir(dirname(target), { recursive: true });
    await verifyPath(boundary, target, { missing: true }); await writeFile(target, bytes, { flag: 'wx' });
    files.push({ path, bytes: bytes.length, sha256: sha256(bytes), generated: path === 'README.md' });
  }
  return { files, digest: sha256(JSON.stringify(files)), totalBytes: files.reduce((sum, file) => sum + file.bytes, 0) };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4) throw new Error('Usage: source-package destination boundary');
  console.log(JSON.stringify(await prepareSource(process.argv[2], process.argv[3]), null, 2));
}
