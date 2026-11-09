// Explicitly invoked remote-browser QA only. Never linked by product HTML.
(async () => {
  const records=[];const el=id=>document.getElementById(id);const pause=ms=>new Promise(r=>setTimeout(r,ms));
  const until=async check=>{for(let i=0;i<100;i++){if(check())return;await pause(40);}throw Error('Expected visible UI state did not arrive');};
  const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
  const fill=(id,value)=>{const node=el(id);assert(node,'Missing field '+id);node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));if(node.tagName==='SELECT')node.dispatchEvent(new Event('change',{bubbles:true}));};
  const row=(index,date,kind,hours)=>{fill('entry-'+index+'-date',date);fill('entry-'+index+'-kind',kind);fill('entry-'+index+'-hours',hours);};
  const total=(s,value)=>s.summary===(document.documentElement.lang==='en'?'2026-11 overtime pay totals NT$'+value+'.':'2026-11 加班費合計新台幣 '+value+' 元。');
  const start=()=>{fill('field-monthlySalary','36000');fill('field-month','2026-11');};
  const observe=()=>({summary:el('summary').textContent,status:el('status').textContent,hidden:el('results').hidden,busy:el('status').getAttribute('aria-busy'),disabled:el('run-btn').disabled,rows:document.querySelectorAll('[data-result-date]').length});
  try {
    await until(()=>el('add-entry')&&el('status').textContent.length>0);start();
    row(0,'2026-11-02','weekday','1');el('add-entry').click();row(1,'2026-11-03','weekday','1');el('add-entry').click();row(2,'2026-11-04','weekday','1');el('run-btn').click();await until(()=>!el('results').hidden);
    let s=observe();assert(total(s,'600')&&s.rows===3&&!s.disabled&&s.busy==='false','Three daily records not reflected');records.push({id:'three-days-600',pass:true,observed:s});
    fill('entry-2-date','2026-11-03');assert(el('results').hidden,'Editing left stale result');el('run-btn').click();await until(()=>el('entry-2-date').getAttribute('aria-invalid')==='true');s=observe();assert(s.hidden&&!s.disabled&&s.busy==='false','Duplicate date not rendered');records.push({id:'duplicate-date',pass:true,observed:s,error:el('error-entry-2-date').textContent});
    el('reset-btn').click();start();row(0,'2026-11-01','holiday','1');el('add-entry').click();row(1,'2026-11-02','holiday','1');el('run-btn').click();await until(()=>!el('results').hidden);s=observe();assert(total(s,'2,400')&&s.rows===2,'Separate holidays were combined');records.push({id:'two-holidays-2400',pass:true,observed:s});
    el('reset-btn').click();start();row(0,'2026-11-02','weekday','3');el('run-btn').click();await until(()=>!el('results').hidden);s=observe();assert(total(s,'650')&&s.rows===1,'Single-day control failed');assert(document.documentElement.scrollWidth<=innerWidth+1,'Page overflows viewport');records.push({id:'single-day-650-and-reflow',pass:true,observed:s,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth});
    el('add-entry').click();row(1,'2026-11-03','weekday','1');assert(el('results').hidden,'Added row left stale output');document.querySelector('[data-entry-row] [data-remove-entry]').click();el('run-btn').click();await until(()=>!el('results').hidden);s=observe();assert(total(s,'200')&&s.rows===1,'Remove did not retain the other row');records.push({id:'add-remove-recalculate',pass:true,observed:s});
    el('run-btn').click();el('cancel-btn').click();await pause(180);s=observe();assert(s.hidden&&s.busy==='false'&&!s.disabled,'Cancelled job revived output');el('run-btn').click();el('reset-btn').click();await pause(180);s=observe();assert(s.hidden&&s.busy==='false'&&!s.disabled&&document.querySelectorAll('[data-entry-row]').length===1,'Reset did not clear rows/job');records.push({id:'cancel-reset-race',pass:true,observed:s});
    start();for(let i=0;i<12;i++){if(i)el('add-entry').click();row(i,'2026-11-'+String(i+1).padStart(2,'0'),'weekday',i===11?'2':'4');}el('run-btn').click();await until(()=>!el('results').hidden);assert(el('cap-note').hidden,'46h warning should not fire');fill('entry-11-hours','2.5');el('run-btn').click();await until(()=>!el('results').hidden);assert(!el('cap-note').hidden,'46.5h warning missing');records.push({id:'46-and-46point5-month-warning',pass:true,observed:observe(),warning:el('cap-note').textContent});
    el('reset-btn').click();start();row(0,'2026-11-02','weekday','3');el('run-btn').click();await until(()=>!el('results').hidden);
  }catch(error){records.push({pass:false,error:String(error.message)});}
  const out=document.createElement('pre');out.id='gq-r3-result';out.textContent=JSON.stringify({language:document.documentElement.lang,source:'actual live page and real Blob Worker; DOM-driven fake-data probe',records,pass:records.length===7&&records.every(r=>r.pass)});out.hidden=true;document.body.append(out);
})();
