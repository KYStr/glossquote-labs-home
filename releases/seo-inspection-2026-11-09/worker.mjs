import sites from './sites.json' with {type:'json'};

const baseHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'X-Robots-Tag': 'noindex, follow',
};
function failure(status, text) {
  return new Response(text, {status, headers: {...baseHeaders, 'Content-Type':'text/plain; charset=utf-8', 'Cache-Control':'no-store'}});
}
export function createHandler(manifest) {
  return async function handle(request, env) {
    const url = new URL(request.url);
    if (!Object.hasOwn(manifest, url.hostname)) return failure(404, 'Not found');
    if (!['GET','HEAD'].includes(request.method)) return failure(405, 'Method not allowed');
    const site = manifest[url.hostname];
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { return failure(400, 'Invalid path'); }
    if (pathname.includes('%') || pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(p => p === '.' || p === '..')) return failure(400, 'Invalid path');
    const aliases = {'/':'/index.html','/en':'/en/index.html','/en/':'/en/index.html'};
    if (Object.hasOwn(aliases, pathname)) return new Response(null, {status:301, headers:{...baseHeaders, Location:'https://'+url.hostname+aliases[pathname]}});
    if (!site.paths.includes(pathname)) return failure(404, 'Not found');
    const headers = new Headers();
    for (const name of ['Range','If-Range','If-None-Match','If-Modified-Since']) if (request.headers.has(name)) headers.set(name, request.headers.get(name));
    // Construct a fresh request: cookies, authorization, query strings and input bodies never reach the asset binding.
    const target = new URL('https://static.invalid');
    target.pathname = '/__sites/'+site.slug+pathname;
    if (!target.pathname.startsWith('/__sites/'+site.slug+'/')) return failure(400,'Invalid path');
    const response = await env.ASSETS.fetch(new Request(target, {method:request.method, headers}));
    if (![200,206,304].includes(response.status)) return failure(404, 'Not found');
    const result = new Response(response.body, response);
    for (const [name,value] of Object.entries(baseHeaders)) result.headers.set(name,value);
    result.headers.set('Content-Security-Policy', site.csp);
    result.headers.set('Cache-Control','public, max-age=0, must-revalidate');
    for(const rule of site.headerRules||[]){
      const pattern='^'+rule.pattern.split('*').map(p=>p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$';
      if(new RegExp(pattern).test(pathname))for(const [name,value]of Object.entries(rule.headers))result.headers.set(name,value);
    }
    result.headers.set('X-Robots-Tag','noindex, follow');
    for (const name of ['Set-Cookie','NEL','Report-To','Reporting-Endpoints']) result.headers.delete(name);
    return result;
  };
}
export default {fetch:createHandler(sites)};
