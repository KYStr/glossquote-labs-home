import { mkdir, readdir, readFile, writeFile, lstat, realpath } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, PUBLIC_ASSETS } from './files.mjs';
import { WRANGLER_VERSION } from './release-contract.mjs';

export function isolatedEnvironment(directory) {
  const env = {};
  for (const name of ['SystemRoot','WINDIR','ComSpec','PATH','Path','PATHEXT','NUMBER_OF_PROCESSORS','PROCESSOR_ARCHITECTURE']) if (process.env[name] !== undefined) env[name] = process.env[name];
  return Object.assign(env,{ USERPROFILE:path.join(directory,'home'),APPDATA:path.join(directory,'home/roaming'),LOCALAPPDATA:path.join(directory,'home/local'),XDG_CONFIG_HOME:path.join(directory,'config'),XDG_CACHE_HOME:path.join(directory,'cache'),TEMP:path.join(directory,'temp'),TMP:path.join(directory,'temp'),WRANGLER_LOG_PATH:path.join(directory,'wrangler.log'),WRANGLER_SEND_METRICS:'false',CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false',CI:'true',BROWSER:'none',NO_COLOR:'1' });
}
export async function runIsolated({ wrangler, state, help=false }) {
  if (!path.isAbsolute(wrangler ?? '') || !path.isAbsolute(state ?? '')) throw new Error('Absolute CLI and fresh state paths required');
  const cliInfo=await lstat(wrangler); if(!cliInfo.isFile()||cliInfo.isSymbolicLink()||cliInfo.nlink!==1)throw new Error('Unsafe CLI');
  const packageInfo=JSON.parse(await readFile(path.resolve(path.dirname(wrangler),'../package.json'),'utf8'));
  if(packageInfo.name!=='wrangler'||packageInfo.version!==WRANGLER_VERSION)throw new Error('Pinned Wrangler 4.147.0 required');
  const parent=path.dirname(path.resolve(state));const parentInfo=await lstat(parent);if(!parentInfo.isDirectory()||parentInfo.isSymbolicLink()||path.resolve(await realpath(parent)).toLowerCase()!==parent.toLowerCase())throw new Error('Unsafe state parent');
  const normalized=path.resolve(state).replaceAll('\\','/');if(!normalized.includes('/.runs/github-publish/glossquote-labs-list-compare/'))throw new Error('State must be in the owned publication evidence');
  await mkdir(state); // Refuse existing login/config state.
  for(const dir of ['home','home/roaming','home/local','config','cache','temp','project','bundle'])await mkdir(path.join(state,dir),{recursive:true});
  if(!help){
    if((await readdir(ROOT)).some(name=>/^\.env(?:\.|$)|^\.dev\.vars(?:\.|$)/.test(name)))throw new Error('Secret file present');
    const { checkProduction } = await import('./production.mjs'); await checkProduction();
    await writeFile(path.join(state,'project/wrangler.jsonc'),await readFile(path.join(ROOT,'wrangler.jsonc')),{flag:'wx'});
    for(const file of PUBLIC_ASSETS){const dest=path.join(state,'project/dist-production',file);await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,await readFile(path.join(ROOT,'dist-production',file)),{flag:'wx'});}
  }
  const args=[wrangler,'deploy',...(help?['--help']:['--dry-run','--autoconfig=false','--config',path.join(state,'project/wrangler.jsonc'),'--outdir',path.join(state,'bundle')])];
  return await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{cwd:path.join(state,'project'),env:isolatedEnvironment(state),windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
    const timer=setTimeout(()=>{child.kill();reject(new Error('Owned dry-run timeout'));},55000);
    const append=(target,chunk)=>{if(stdout.length+stderr.length+chunk.length>2097152){child.kill();reject(new Error('Dry-run output limit'));return;}if(target==='out')stdout+=chunk.toString();else stderr+=chunk.toString();};
    child.stdout.on('data',c=>append('out',c));child.stderr.on('data',c=>append('err',c));child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',exitCode=>{clearTimeout(timer);resolve({command:[process.execPath,...args],wrangler:packageInfo.version,node:process.version,state,isolated:true,exitCode,stdout,stderr});});
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);const options={};for(let i=0;i<args.length;i++){if(args[i]==='--help-only'){options.help=true;continue;}if(!['--wrangler','--state-dir'].includes(args[i]))throw new Error('Unknown argument');options[args[i]==='--wrangler'?'wrangler':'state']=args[++i];}
  const result=await runIsolated(options);console.log(JSON.stringify(result));process.exitCode=result.exitCode===0?0:1;
}
