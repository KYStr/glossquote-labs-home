import { createController, createBrowserPlatform } from './controller.mjs';
import zh from './locales/zh-Hant.mjs';
import en from './locales/en.mjs';

export function mount(doc, win) {
  const t=doc.documentElement.lang === 'en' ? en : zh;
  const get=id => doc.getElementById(id);
  const numbers=new Intl.NumberFormat(t.numberLocale,{maximumFractionDigits:0});
  const percentages=new Intl.NumberFormat(t.numberLocale,{maximumFractionDigits:2});
  const workIds=['left-file','right-file','sample','mode-blend','mode-difference','opacity','threshold','clear'];
  let platform, controller;
  try { platform=createBrowserPlatform(get('comparison'),doc,win); }
  catch { get('unsupported').hidden=false; get('status').textContent=t.errors.UNSUPPORTED_BROWSER; return null; }

  function render(s) {
    const ready=s.phase === 'ready', running=s.phase === 'running';
    get('compare').disabled=!s.canCompare;
    get('compare').textContent=ready ? t.refresh : t.compare;
    get('compare').classList.toggle('primary',!ready);
    get('download-png').classList.toggle('primary',ready);
    get('cancel').disabled=!running;
    get('clear').disabled=!s.hasData && s.phase === 'idle';
    get('download-png').disabled=!s.canDownload; get('download-json').disabled=!s.canDownload;
    get('results').hidden=!ready; get('comparison').hidden=!ready; get('empty').hidden=ready;
    get('view').disabled=!ready; get('legend').hidden=!ready || s.result?.mode !== 'difference';
    get('viewport').setAttribute('aria-busy',String(running));
    get('progress').hidden=!running; get('progress').value=s.progress;
    get('opacity').disabled=s.settings.mode !== 'blend';
    for (const [side,index] of [['left',0],['right',1]]) {
      const source=s.sources[index];
      get(`${side}-name`).textContent=source ? source.name : t.noFile;
      const details=source ? [source.sample ? t.sampleTag : null, source.dimensions ? `${numbers.format(source.dimensions.width)} × ${numbers.format(source.dimensions.height)} px` : t.notInspected, `${percentages.format(source.size/1_048_576)} MiB`].filter(Boolean).join(' · ') : t.notInspected;
      get(`${side}-info`).textContent=details;
      get(`${side}-file`).setAttribute('aria-invalid',String(s.errorField === side && !!s.error));
      get(`${side}-error`).hidden=s.errorField !== side || !s.error;
      get(`${side}-error`).textContent=s.errorField === side && s.error ? (t.errors[s.error] ?? t.errors.PROCESSING_FAILED) : '';
    }
    const settingError=!!s.error && ['settings','opacity','threshold','mode'].includes(s.errorField);
    get('settings-error').hidden=!settingError;
    get('settings-error').textContent=settingError ? t.errors.SETTINGS_INVALID : '';
    for (const key of ['opacity','threshold']) get(key).setAttribute('aria-invalid',String(settingError && (s.errorField === key || s.errorField === 'settings')));
    let status=t.statusIdle;
    if (s.error) status=`${t.statusInvalid} ${t.errors[s.error] ?? t.errors.PROCESSING_FAILED}`;
    else if (running) status=({reading:t.statusReading,decoding:t.statusDecoding,comparing:t.statusComparing,encoding:t.statusEncoding,example:t.statusExample})[s.note] ?? t.statusReading;
    else if (s.note === 'cancelled') status=t.statusCancelled;
    else if (s.note === 'exampleLoaded') status=t.statusExampleLoaded;
    else if (s.note === 'downloadStarted') status=t.statusDownload;
    else if (ready) status=s.result.changed === 0 ? `${t.statusReady} ${t.statusSame}` : t.statusReady;
    else if (s.sources.filter(Boolean).length === 1) status=t.statusPartial;
    else if (s.phase === 'editing') status=t.statusEditing;
    if (get('status').textContent !== status) get('status').textContent=status;
    if (ready) {
      get('changed').textContent=numbers.format(s.result.changed); get('total').textContent=numbers.format(s.result.total);
      get('percent').textContent=`${percentages.format(s.result.percent)}%`;
      get('dimensions').textContent=`${numbers.format(s.result.width)} × ${numbers.format(s.result.height)} px`;
      get('used-threshold').textContent=numbers.format(s.result.threshold);
      get('used-mode').textContent=s.result.mode === 'blend' ? t.blend : t.difference;
      get('comparison').setAttribute('aria-label',`${t.canvasHeading}. ${t.changed}: ${numbers.format(s.result.changed)} / ${numbers.format(s.result.total)}. ${t.percent}: ${percentages.format(s.result.percent)}%.`);
    } else for (const key of ['changed','total','percent','dimensions','used-threshold','used-mode']) get(key).textContent='';
  }
  controller=createController(platform,render);
  for (const id of workIds) get(id).disabled=false;
  function resetFields() {
    get('left-file').value=''; get('right-file').value=''; get('mode-blend').checked=true; get('mode-difference').checked=false;
    get('opacity').value='50'; get('threshold').value='0'; get('view').value='fit'; get('viewport').dataset.view='fit';
    get('language-confirm').hidden=true; get('sample-confirm').hidden=true;
  }
  const integer=element => /^\d{1,3}$/.test(element.value) ? Number(element.value) : NaN;
  function settings(field) {
    controller.setSettings({mode:get('mode-difference').checked ? 'difference' : 'blend',opacity:integer(get('opacity')),threshold:integer(get('threshold'))},field);
  }
  for (const [side,index] of [['left',0],['right',1]]) get(`${side}-file`).addEventListener('change',() => {
    const file=get(`${side}-file`).files?.[0];
    if (file) { void controller.selectFile(index,file); get(`${side}-file`).value=''; }
  });
  for (const key of ['opacity','threshold']) get(key).addEventListener('input',() => settings(key));
  for (const key of ['mode-blend','mode-difference']) get(key).addEventListener('change',() => settings('mode'));
  get('compare').addEventListener('click',() => { void controller.compare(); });
  get('cancel').addEventListener('click',() => controller.cancel());
  get('clear').addEventListener('click',() => { resetFields(); controller.clear(); });
  for (const format of ['png','json']) get(`download-${format}`).addEventListener('click',() => controller.download(format));
  get('view').addEventListener('change',() => { get('viewport').dataset.view=get('view').value === 'actual' ? 'actual' : 'fit'; });
  function example() { resetFields(); void controller.loadExample(); }
  get('sample').addEventListener('click',() => {
    if (!controller.snapshot().hasData) example();
    else { get('sample-confirm').hidden=false; get('sample-stay').focus(); }
  });
  get('sample-proceed').addEventListener('click',example);
  get('sample-stay').addEventListener('click',() => { get('sample-confirm').hidden=true; get('sample').focus(); });
  get('language-link').addEventListener('click',event => {
    if (controller.snapshot().hasData) { event.preventDefault(); get('language-confirm').hidden=false; get('language-stay').focus(); }
  });
  get('language-stay').addEventListener('click',() => { get('language-confirm').hidden=true; get('language-link').focus(); });
  get('language-proceed').addEventListener('click',() => controller.dispose());
  win.addEventListener('pagehide',() => { resetFields(); controller.clear(); controller.dispose(); });
  win.addEventListener('pageshow',event => { if (event.persisted) { controller=createController(platform,render); resetFields(); render(controller.snapshot()); } });
  resetFields(); render(controller.snapshot());
  return { snapshot:() => controller.snapshot() };
}
if (typeof document !== 'undefined' && typeof window !== 'undefined') mount(document,window);
