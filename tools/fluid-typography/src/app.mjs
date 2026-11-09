import{fields,decimal,number,sampleValid}from'./core.mjs';import{initial,transition,canPreview}from'./state.mjs';import{messages}from'./messages.mjs';
const $ = id => document.getElementById(id);
const initialLanguage = document.documentElement.lang;
let state = initial(initialLanguage);
const languageLink = $('language');
const homeLink = $('labs-home');
const canonical = document.querySelector('link[rel="canonical"]');
const description = document.querySelector('meta[name="description"]');
const alternates = {
  'zh-Hant': document.querySelector('link[hreflang="zh-Hant"]') ?? document.querySelector('link[hreflang="zh-TW"]'),
  en: document.querySelector('link[hreflang="en"]'),
};
const defaultAlternate = document.querySelector('link[hreflang="x-default"]');
const canonicalUrls = { 'zh-Hant': alternates['zh-Hant'].href, en: alternates.en.href };
const routes = { 'zh-Hant': new URL(canonicalUrls['zh-Hant']), en: new URL(canonicalUrls.en) };
const homeFilename = new URL(homeLink.href).pathname.endsWith('/index.html') ? 'index.html' : '';
const homes = initialLanguage === 'en'
  ? { en: homeLink.href, 'zh-Hant': new URL('../' + homeFilename, homeLink.href).href }
  : { 'zh-Hant': homeLink.href, en: new URL('en/' + homeFilename, homeLink.href).href };
const descriptions = {
  'zh-Hant': '以兩個 rem 端點計算流動字級 CSS，並預覽字級在不同視窗寬度下的變化。',
  en: 'Generate fluid typography CSS from two rem endpoints and preview how font size changes with viewport width.',
};

function otherLanguage(lang) {
  return lang === 'en' ? 'zh-Hant' : 'en';
}

function switchLanguage(lang) {
  const next = otherLanguage(lang);
  languageLink.href = routes[next].href;
  languageLink.lang = next;
  languageLink.hreflang = next;
  homeLink.href = homes[lang];
  homeLink.setAttribute('aria-label', messages[lang].home);
  canonical.href = canonicalUrls[lang];
  alternates.en.href = canonicalUrls.en;
  alternates['zh-Hant'].href = canonicalUrls['zh-Hant'];
  defaultAlternate.href = canonicalUrls['zh-Hant'];
  description.content = descriptions[lang];
  dispatch({ type: 'language', lang });
  $('live').textContent = '';
}
const units={vmin:'rem',vmax:'rem',fmin:'rem',fmax:'rem',root:'px/rem',width:'px'};
for (const key of fields) {
  const input = $(key);
  input.addEventListener('input', () => dispatch({ type: 'number', field: key, value: input.value }));
}
function dispatch(e){state=transition(state,e);render();if(e.type==='number')$('live').textContent='';}
function render(){const t=messages[state.lang];document.documentElement.lang=state.lang;document.title=t.title+' · GlossQuote Labs';for(const e of document.querySelectorAll('[data-t]'))e.textContent=t[e.dataset.t];$('language').textContent=t.language;for(const k of fields){document.querySelector(`[data-field-label="${k}"]`).textContent=t[k]+' ('+units[k]+')';if($(k).value!==state.raw[k])$(k).value=state.raw[k];const error=state.errors[k];$(k).setAttribute('aria-invalid',String(Boolean(error)));$(k+'-error').hidden=!error;$(k+'-error').textContent=error?t[error]:'';}$('sample').value=state.sample;const textOK=sampleValid(state.sample);$('sample').setAttribute('aria-invalid',String(!textOK));$('sample-error').hidden=textOK;$('sample-error').textContent=textOK?'':t.sampleError;$('sample-count').textContent=Array.from(state.sample).length+' / 240';$('select').disabled=!state.result;$('empty').hidden=Boolean(state.result);$('empty').textContent=state.dirty?t.dirty:t.empty;$('result-content').hidden=!state.result;$('details').hidden=!state.result;$('css').value=state.result?.css??'';$('preview').textContent=canPreview(state)?state.sample:'';$('preview').style.fontSize=canPreview(state)?number(state.result.size)+'px':'';$('table-body').replaceChildren();$('state').textContent='';$('size').textContent='';$('root-note').textContent='';if(state.result){const r=state.result;$('state').textContent=t[r.state];$('size').textContent=t.approx+' '+decimal(r.size,2,false)+' px';$('root-note').textContent=t.rootNote+state.raw.root+' px/rem';for(const [label,v,f,vpx,fpx]of[[t.lower,state.raw.vmin,state.raw.fmin,r.vminPx,r.min],[t.upper,state.raw.vmax,state.raw.fmax,r.vmaxPx,r.max]]){const tr=document.createElement('tr');const th=document.createElement('th');th.scope='row';th.textContent=label;tr.append(th);for(const [rem,px]of[[v,vpx],[f,fpx]]){const td=document.createElement('td');td.textContent=rem+' rem';const sub=document.createElement('span');sub.textContent=t.approx+' '+decimal(px,2,false)+' px';td.append(sub);tr.append(td);}$('table-body').append(tr);}}}
$('form').addEventListener('submit',e=>{e.preventDefault();const start=performance.now();dispatch({type:'generate'});const bad=fields.find(k=>state.errors[k]);if(bad)$(bad).focus();$('live').textContent=bad?messages[state.lang][state.errors[bad]]:messages[state.lang].generated;requestAnimationFrame(()=>{const duration=performance.now()-start;document.dispatchEvent(new CustomEvent('fluid-generation-rendered',{detail:{duration}}));});});
$('sample').addEventListener('input',()=>dispatch({type:'sample',value:$('sample').value}));$('reset').addEventListener('click',()=>{dispatch({type:'reset'});$('live').textContent='';$('vmin').focus();});
languageLink.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const lang = otherLanguage(state.lang);
  const url = routes[lang];
  if (url.origin !== location.origin) return;
  try {
    history.pushState(null, '', url);
  } catch {
    return; // Leave the link's native navigation available.
  }
  event.preventDefault();
  switchLanguage(lang);
});
addEventListener('popstate', () => {
  const directory = new URL('./', location.href);
  for (const lang of ['zh-Hant', 'en']) {
    if (directory.pathname === new URL('./', routes[lang]).pathname && lang !== state.lang) switchLanguage(lang);
  }
});
$('select').addEventListener('click',()=>{if(!state.result)return;$('css').focus();$('css').select();$('live').textContent=messages[state.lang].selected;});
addEventListener('pagehide',()=>{state=initial(state.lang);render();$('live').textContent='';});addEventListener('pageshow',e=>{if(e.persisted){state=initial(state.lang);render();$('live').textContent='';}});render();
