import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root,listFiles,validatePublic} from './check.mjs';
import {releaseOptions,releaseHTML,releaseHeaders,robots,sitemap} from './release.mjs';
export async function verifyBuild(options,output=path.join(root,'dist')) {
  const sources=await validatePublic();
  const expected=sources.map(file=>path.relative(path.join(root,'public'),file));
  expected.push('robots.txt');if(options.release)expected.push('sitemap.xml');
  const actual=(await listFiles(output)).map(file=>path.relative(output,file)).sort();
  if(JSON.stringify(actual)!==JSON.stringify(expected.sort()))throw new Error('Unexpected build inventory');
  for(const source of sources){
    const file=path.relative(path.join(root,'public'),source);
    let expectedBytes=await readFile(source);
    if(options.release && ['index.html','en/index.html'].includes(file.replaceAll(path.sep,'/'))) expectedBytes=Buffer.from(releaseHTML(expectedBytes.toString('utf8'),file.replaceAll(path.sep,'/'),options.origin));
    if(options.release && file==='_headers')expectedBytes=Buffer.from(releaseHeaders(expectedBytes.toString('utf8')));
    if(!(await readFile(path.join(output,file))).equals(expectedBytes))throw new Error('Unexpected emitted asset');
  }
  if(await readFile(path.join(output,'robots.txt'),'utf8')!==robots(options.release))throw new Error('Invalid robots');
  if(options.release && await readFile(path.join(output,'sitemap.xml'),'utf8')!==sitemap())throw new Error('Invalid sitemap');
  console.log(`VERIFY_BUILD_PASS ${options.release?'release':'preview'} ${actual.length} files; exact assets/metadata/MIME/header rules`);
  return actual;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await verifyBuild(releaseOptions(process.argv.slice(2)));
