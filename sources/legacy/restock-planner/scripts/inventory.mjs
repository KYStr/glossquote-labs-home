import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, inventory } from './lib/files.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const source = [];
async function walk(relative = '') {
  for (const name of (await readdir(path.join(ROOT,relative))).sort()) {
    if (relative === '' && ['dist','dist-production','.git','node_modules'].includes(name)) continue;
    const file = relative ? `${relative}/${name}` : name;
    const stat = await lstat(path.join(ROOT,file));
    if (stat.isSymbolicLink()) throw new Error('Linked source file');
    if (stat.isDirectory()) await walk(file);
    else {
      if (!stat.isFile() || stat.nlink !== 1) throw new Error('Nonregular or hardlinked source');
      const bytes = await readFile(path.join(ROOT,file));
      source.push({path:file,bytes:bytes.length,sha256:sha(bytes)});
    }
  }
}
await walk();
source.sort((a,b)=>a.path.localeCompare(b.path,'en'));
const publicFiles = await inventory(path.join(ROOT,'public'));
const distFiles = await inventory(path.join(ROOT,'dist'));
if (JSON.stringify(publicFiles) !== JSON.stringify(distFiles)) throw new Error('Public/dist mismatch');
// Hashes identify the exact UTF-8 JSON serialization of the ordered file records.
const group = files => ({files:files.length,bytes:files.reduce((sum,file)=>sum+file.bytes,0),inventorySha256:sha(Buffer.from(JSON.stringify(files))),entries:files});
process.stdout.write(JSON.stringify({schemaVersion:1,hashAlgorithm:'SHA-256',source:group(source),public:group(publicFiles),dist:group(distFiles)},null,2)+'\n');
