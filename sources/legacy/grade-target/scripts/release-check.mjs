import assert from 'node:assert/strict';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { root, inventory, publicFiles } from './assets.mjs';
import { verifyProduction, auditProduction, verifyPreviewIfPresent } from './production.mjs';

export const scriptFiles=['assets.mjs','build-production.mjs','build.mjs','check-production.mjs','check.mjs','generate-pages.mjs','production.mjs','release-check.mjs','serve-production.mjs','serve.mjs'];
export const testFiles=['build-report.test.mjs','calculate-target.test.mjs','lifecycle.test.mjs','production.test.mjs','static-contract.test.mjs'];
export const docFiles=['BRAND.md','DESIGN-SYSTEM.md','ENGINEERING.md','GIT-PUBLICATION-SAFETY.md','PRIVACY-SECURITY.md','RELEASE-CANDIDATE.md','RELEASE.md'];
export const rootFiles=['.gitignore','ACCEPTANCE.md','AGENTS.md','HANDOFF.md','PRODUCT.md','README.md','START-HERE.md','TASK-ENTRY.md','TASKS.md','TECHNICAL.md','UX-SEO.md','package.json','project.json','wrangler.jsonc'];
export const sourceFiles=[...rootFiles,...publicFiles.map(path=>'public/'+path),...scriptFiles.map(path=>'scripts/'+path),...testFiles.map(path=>'test/'+path),...docFiles.map(path=>'docs/'+path)].sort();
export async function auditSourceList() {
  for(const [dir,expected]of [['public',publicFiles],['scripts',scriptFiles],['test',testFiles],['docs',docFiles]])assert.deepEqual(await inventory(join(root,dir)),[...expected].sort());
  const allowedTop=[...rootFiles,'public','scripts','test','docs','dist','dist-production','.git'];
  assert.ok((await readdir(root)).every(path=>allowedTop.includes(path)),'unknown-source-root');
  for(const path of sourceFiles){const s=await lstat(join(root,path));assert.ok(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1);}
  const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
  assert.deepEqual(pkg.dependencies??{},{});assert.deepEqual(pkg.devDependencies??{},{});assert.equal(pkg.type,'module');assert.equal(pkg.engines.node,'>=24');
  return sourceFiles;
}
export async function releaseCheck() {
  assert.ok(Number(process.versions.node.split('.')[0])>=24);
  await auditSourceList(); const {files,manifest}=await verifyProduction();auditProduction(files);await verifyPreviewIfPresent();
  return manifest;
}
if(process.argv[1] && process.argv[1].replaceAll('\\','/').endsWith('/scripts/release-check.mjs')) {
  try {const manifest=await releaseCheck();process.stdout.write(`PASS release candidate: ${sourceFiles.length} allowlisted source files, ${manifest.files.length} production files; local model only\n`);}
  catch {process.stderr.write('FAIL release check\n');process.exitCode=1;}
}
