import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { ROOT } from './files.mjs';
import { calculateShopping, shoppingText, serializeReport } from '../public/js/core/shopping.mjs';
import { serializeProject, parseProject } from '../public/js/core/schema.mjs';
import zh from '../public/js/locales/zh-Hant.mjs';
import en from '../public/js/locales/en.mjs';

// Fictional fixtures only. This does not simulate a browser download.
const records = [];
for (const words of [zh, en]) {
  const item = (ingredient, quantity, unit = 'g') => ({ ingredient, quantity, unit, unitLabel: '' });
  const project = { schema: 1, meals: [
    { id: 'fake-1', name: words.sampleMeal1, items: [item(words.sampleRice, '500'), item(words.sampleEgg, '3', 'piece')] },
    { id: 'fake-2', name: words.sampleMeal2, items: [item(words.sampleRice, '0.75', 'kg'), item(words.sampleMilk, '500', 'g'), item(words.sampleMilk, '500', 'ml')] },
  ], stock: [item(words.sampleRice, '300'), item(words.sampleEgg, '5', 'piece')] };
  const result = calculateShopping(project);
  assert.deepEqual(result.buy.map(row => [row.ingredient, row.unit, row.buy.toString()]), [[words.sampleRice, 'g', '950000'], [words.sampleMilk, 'g', '500000'], [words.sampleMilk, 'ml', '500000']]);
  assert.equal(result.enough[0].surplus, 2000n);
  const outputs = [
    ['pantry-shopping-list.txt', shoppingText(result, words)],
    ['pantry-shopping-report.json', serializeReport(result, new Set(), words)],
    ['pantry-project.json', serializeProject(project)],
  ];
  const directory = join(ROOT, 'evidence/m1/outputs', words.language);
  await mkdir(directory, { recursive: true });
  for (const [name, text] of outputs) {
    const path = join(directory, name); await writeFile(path, text, 'utf8');
    const bytes = await readFile(path);
    assert.deepEqual(bytes, Buffer.from(text, 'utf8'));
    if (name === 'pantry-project.json') assert.deepEqual(parseProject(bytes.toString('utf8')), project);
    records.push({ path: `outputs/${words.language}/${name}`, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
}
await writeFile(join(ROOT, 'evidence/m1/output-manifest.json'), JSON.stringify({ scope: 'Offline fictional UTF-8 outputs, not browser download acceptance', files: records }, null, 2) + '\n');
console.log(JSON.stringify({ status: 'PASS', files: records.length, bytes: records.reduce((n, file) => n + file.bytes, 0) }));
