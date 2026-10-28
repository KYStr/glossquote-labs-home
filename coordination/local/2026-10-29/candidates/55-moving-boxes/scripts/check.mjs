import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, validatePublic } from './contract.mjs';
import { validateDeploymentConfig } from './deploy-config.mjs';

export async function check() {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('NODE_24_REQUIRED');
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  if (pkg.private !== true || pkg.type !== 'module' || pkg.engines?.node !== '>=24' || Object.hasOwn(pkg, 'dependencies') || Object.hasOwn(pkg, 'devDependencies')) throw new Error('INVALID_ZERO_DEPENDENCY_PACKAGE');
  const files = await validatePublic(path.join(ROOT, 'public'));
  await validateDeploymentConfig(ROOT);
  const scripts = (await readdir(path.join(ROOT, 'scripts'))).filter(name => name.endsWith('.mjs')).map(name => 'scripts/' + name);
  const tests = (await readdir(path.join(ROOT, 'test'))).filter(name => name.endsWith('.mjs')).map(name => 'test/' + name);
  for (const file of [...files.filter(file => file.endsWith('.mjs')).map(file => 'public/' + file), ...scripts, ...tests]) {
    const result = spawnSync(process.execPath, ['--check', path.join(ROOT, file)], { shell: false, windowsHide: true, encoding: 'utf8' });
    if (result.status !== 0) throw new Error('INVALID_ESM: ' + file);
  }
  process.stdout.write('PASS: closed public allowlist, UTF-8, bilingual preview, safety scan, fixed assets-only deploy config and ESM syntax. Static checks are not browser evidence.\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'scripts', 'check.mjs')) {
  check().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
}
