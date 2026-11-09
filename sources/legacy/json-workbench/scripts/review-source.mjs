import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {root,listFiles} from './check.mjs';
export async function sourceInventory() {
  const files=['package.json','.gitignore','wrangler.jsonc','README.md','project.json','docs/UI-BRIEF.md','docs/VALIDATION.md','docs/RELEASE-CANDIDATE.md','docs/U02-ERROR-LOCATION.md'];
  for(const dir of ['public','scripts','test']) {
    const found=await listFiles(path.join(root,dir));
    files.push(...found.map(file=>path.relative(root,file).replaceAll(path.sep,'/')));
  }
  const records=[];
  for(const file of [...new Set(files)].sort()) {
    if(/(?:^|\/)(?:\.git|\.env|\.runs|node_modules|dist)(?:\/|$)|\.token$|secret|credentials/iu.test(file))throw new Error('Forbidden publication path');
    await access(path.join(root,file));
    const data=await readFile(path.join(root,file));
    const text=data.toString('utf8');
    if(/-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:ghp_|github_pat_|sk_live_|AKIA)[A-Za-z0-9_]{12,}|C:\\Users\\|C:\/Users\//u.test(text))throw new Error(`Publication content needs review: ${file}`);
    records.push({path:file,bytes:data.byteLength,sha256:createHash('sha256').update(data).digest('hex')});
  }
  return records;
}
