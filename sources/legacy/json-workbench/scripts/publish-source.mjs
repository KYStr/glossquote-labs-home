// Prepares a reviewed copy only. GitHub publication is a separate explicit step.
import {readFile,writeFile,mkdir,lstat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root} from './check.mjs';
import {sourceInventory} from './review-source.mjs';

export async function preparePublication() {
  if(path.basename(root)!=='02-json-workbench' || path.basename(path.dirname(root))!=='tool-projects')throw new Error('Publication preparation runs only in the assigned tool directory');
  const workspace=path.resolve(root,'../..');
  let copyRoot=workspace;
  for(const component of ['.runs','github-publish','glossquote-labs-json-workbench']){
    copyRoot=path.join(copyRoot,component);
    let info;try{info=await lstat(copyRoot);}catch(error){if(error.code!=='ENOENT')throw error;}
    if(info?.isSymbolicLink() || (info && !info.isDirectory()))throw new Error('Unsafe publication directory');
    if(!info)await mkdir(copyRoot);
  }
  const existing=await readdir(copyRoot);
  // Preserve an existing copy/history for human inspection; never reset or overwrite it.
  if(existing.length)throw new Error('Publication copy already exists; inspect history and changes before updating it');
  const records=await sourceInventory();
  for(const record of records){
    const data=await readFile(path.join(root,record.path));
    if(createHash('sha256').update(data).digest('hex')!==record.sha256)throw new Error('Source changed during review');
    const target=path.join(copyRoot,record.path);
    await mkdir(path.dirname(target),{recursive:true});
    await writeFile(target,data,{flag:'wx'});
  }
  const manifest=JSON.stringify({schemaVersion:1,repository:'https://github.com/KYStr/glossquote-labs-json-workbench',note:'Hashes cover reviewed source files; this manifest is excluded from its own inventory.',files:records},null,2)+'\n';
  await writeFile(path.join(copyRoot,'docs/SOURCE-MANIFEST.json'),manifest,{flag:'wx'});
  await writeFile(path.join(root,'docs/SOURCE-MANIFEST.json'),manifest);
  console.log(`PUBLICATION_COPY_READY ${records.length} source files plus manifest; no Git or hosting mutation`);
  return {copyRoot,files:records.length,manifestSha256:createHash('sha256').update(manifest).digest('hex')};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.slice(2).length!==1 || process.argv[2]!=='--prepare-reviewed-copy')throw new Error('Use --prepare-reviewed-copy after final checks');
  console.log(JSON.stringify(await preparePublication()));
}
