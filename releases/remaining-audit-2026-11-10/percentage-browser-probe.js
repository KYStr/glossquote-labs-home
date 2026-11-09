// Fixed, fake-data QA probe. Not referenced by product HTML. Inject explicitly
// with the isolated remote browser using its same-origin script URL; no storage,
// clipboard, downloads, external requests or changes to the page's CSP.
(async () => {
  const records = [];
  const el = id => document.getElementById(id);
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const until = async check => { for (let n = 0; n < 100; n++) { if (check()) return; await pause(40); } throw Error('Expected visible UI state did not arrive'); };
  const assert = (ok, message) => { if (!ok) throw Error(message); };
  const fill = (id, value) => { el(id).value = value; el(id).dispatchEvent(new Event('input', {bubbles:true})); };
  const snapshot = () => ({busy:el('calc-form').getAttribute('aria-busy'),disabled:el('btn-run').disabled,resultHidden:el('result').hidden,downloadHidden:el('btn-download').hidden,value:el('result-value').textContent,status:el('status').textContent,error:el('error-first').textContent});
  try {
    await until(() => el('btn-run') && el('status').textContent.length > 0);
    fill('input-first','20'); fill('input-second','150'); el('btn-run').click();
    await until(() => !el('result').hidden);
    let s = snapshot(); assert(s.value === '30' && s.busy === 'false' && !s.disabled && !s.downloadHidden,'Success did not update the whole form'); records.push({id:'real-worker-success',pass:true,observed:s});
    fill('input-first',''); assert(el('result').hidden && el('btn-download').hidden,'Edit left stale output'); el('btn-run').click();
    await until(() => el('input-first').getAttribute('aria-invalid') === 'true');
    s=snapshot(); assert(s.busy === 'false' && !s.disabled && s.resultHidden && s.downloadHidden && s.error.length > 0,'Validation did not render'); records.push({id:'real-worker-validation',pass:true,observed:s});
    el('btn-reset').click(); fill('input-first','20'); fill('input-second','150'); el('btn-run').click(); el('btn-reset').click(); await pause(250);
    s=snapshot(); assert(s.resultHidden && s.downloadHidden && s.busy === 'false' && !s.disabled,'Reset allowed stale result');records.push({id:'reset-race',pass:true,observed:s});
    fill('input-first','20'); fill('input-second','150'); el('btn-run').click(); await until(() => !el('result').hidden);
    const overflow=document.documentElement.scrollWidth>innerWidth+1;assert(!overflow,'Page overflows viewport');records.push({id:'recovery-and-reflow',pass:true,value:el('result-value').textContent,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth});
  } catch (error) { records.push({pass:false,error:String(error.message)}); }
  const out=document.createElement('pre');out.id='gq-r3-result';out.textContent=JSON.stringify({language:document.documentElement.lang,source:'actual live page and real Blob Worker; DOM-driven fake-data probe',records,pass:records.length===4&&records.every(r=>r.pass)});out.hidden=true;document.body.append(out);
})();
