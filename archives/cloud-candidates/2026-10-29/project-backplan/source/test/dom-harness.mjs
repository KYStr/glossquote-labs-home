// 受控 DOM 只驗控制層狀態；不是實瀏覽器、版面、原生複製/下載、IME 或 BFCache 證據。
let run = 0;
export async function harness(language = 'en') {
  const saved = new Map();
  const setGlobal = (name, value) => { saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { value, writable: true, configurable: true }); };
  const windowHandlers = new Map(); const documentHandlers = new Map(); const timers = new Map();
  const urls = new Map(); const revoked = []; const downloads = []; let nextTimer = 0; let document;
  class Element {
    constructor(tag='div') { this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.handlers=new Map();this.attributes={};this.dataset={};this.value='';this.defaultValue='';this.textContent='';this.disabled=false;this.hidden=false;this.checked=false;this.open=false;this.className='';this.id=''; }
    addEventListener(type, callback) { if(!this.handlers.has(type))this.handlers.set(type,[]);this.handlers.get(type).push(callback); }
    dispatch(type, extra={}) { const event={type,target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...extra};let current=this;do{for(const callback of current.handlers.get(type)||[])callback(event);current=current.parentElement;}while(current&&extra.bubbles!==false);return event; }
    append(...nodes) { for(const node of nodes){node.parentElement=this;this.children.push(node);} }
    replaceChildren(...nodes) { for(const node of this.children)node.parentElement=null;this.children=[];this.append(...nodes); }
    remove() { if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null; }
    get nextElementSibling(){const list=this.parentElement?.children||[];return list[list.indexOf(this)+1]||null;}
    get previousElementSibling(){const list=this.parentElement?.children||[];return list[list.indexOf(this)-1]||null;}
    setAttribute(name,value){this.attributes[name]=String(value);}
    getAttribute(name){return this.attributes[name]??null;}
    removeAttribute(name){delete this.attributes[name];}
    hasAttribute(name){return Object.hasOwn(this.attributes,name);}
    matches(selector){return selector.split(',').some(s=>s==='input'?this.tagName==='INPUT':s==='textarea'?this.tagName==='TEXTAREA':s==='button'?this.tagName==='BUTTON':s==='[aria-invalid]'?this.hasAttribute('aria-invalid'):s==='.weekday'?this.className==='weekday':s==='.weekday:checked'?this.className==='weekday'&&this.checked:false);}
    querySelectorAll(selector){const out=[];const visit=node=>{for(const child of node.children){if(child.matches(selector))out.push(child);visit(child);}};visit(this);return out;}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    focus(){document.activeElement=this;}
    select(){this.selectionStart=0;this.selectionEnd=this.value.length;}
    click(){if(this.disabled)return;if(this.tagName==='A')downloads.push({name:this.download,url:this.href,liveAtClick:urls.has(this.href)});this.dispatch('click');}
    reset(){for(const input of this.querySelectorAll('input,textarea')){input.value=input.defaultValue;input.checked=Boolean(input.defaultChecked);}}
    showModal(){this.open=true;document.getElementById('cancel-clear').focus();}
    close(){this.open=false;}
  }
  const body=new Element('body');
  const fixed=new Map();
  const make=(id,tag,parent=body)=>{const node=new Element(tag);node.id=id;fixed.set(id,node);parent.append(node);return node;};
  const form=make('planner','form');const editor=make('editor','fieldset',form);editor.disabled=true;
  for(const id of ['project','deadline'])make(id,'input',editor);
  make('holidays','textarea',editor);const week=make('weekdays','fieldset',editor);
  for(let i=0;i<7;i++){const el=make(`weekday-${i}`,'input',week);el.className='weekday';el.type='checkbox';el.value=String(i);el.defaultValue=String(i);el.checked=el.defaultChecked=i<5;}
  make('tasks','div',editor);make('task-count','span',editor);
  for(const id of ['add-task','example','clear','calculate'])make(id,'button',editor);
  fixed.get('calculate').disabled=true;
  for(const id of ['error-box','error-text','result','summary','schedule','adjustment','status','init-status'])make(id,'div');
  make('report','textarea');for(const id of ['copy','download']){make(id,'button');fixed.get(id).disabled=true;}
  make('language-link','a');const dialog=make('clear-dialog','dialog');for(const id of ['cancel-clear','confirm-clear'])make(id,'button',dialog);
  const find=(node,id)=>node.id===id?node:node.children.map(child=>find(child,id)).find(Boolean);
  document={body,documentElement:{lang:language},visibilityState:'visible',activeElement:null,getElementById:id=>find(body,id),createElement:tag=>new Element(tag),querySelectorAll:selector=>body.querySelectorAll(selector),querySelector:selector=>body.querySelector(selector),addEventListener:(type,fn)=>{if(!documentHandlers.has(type))documentHandlers.set(type,[]);documentHandlers.get(type).push(fn);}};
  setGlobal('document',document);setGlobal('window',{addEventListener:(type,fn)=>{if(!windowHandlers.has(type))windowHandlers.set(type,[]);windowHandlers.get(type).push(fn);}});setGlobal('navigator',{});
  setGlobal('setTimeout',(callback,delay)=>{const id=++nextTimer;timers.set(id,{callback,delay});return id;});setGlobal('clearTimeout',id=>timers.delete(id));
  const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;
  URL.createObjectURL=blob=>{const url=`blob:controlled-${++nextTimer}`;urls.set(url,blob);return url;};URL.revokeObjectURL=url=>{revoked.push(url);urls.delete(url);};
  await import(`../public/js/app.mjs?controlled=${++run}`);
  const spin=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};
  const node=id=>document.getElementById(id);
  const serialize=element=>({tag:element.tagName,id:element.id,attributes:{...element.attributes},value:element.value,text:element.textContent,hidden:element.hidden,disabled:element.disabled,checked:element.checked,open:element.open,children:element.children.map(serialize)});
  return {document,urls,revoked,downloads,timers,node,spin,
    snapshot:()=>JSON.stringify({body:serialize(body),focus:document.activeElement?.id}),
    event:(type,extra={})=>{for(const callback of windowHandlers.get(type)||[])callback(extra);},
    documentEvent:(type)=>{for(const callback of documentHandlers.get(type)||[])callback({});},
    async click(id){node(id).focus();node(id).click();await spin();},
    async change(id,value,type='input'){node(id).value=value;node(id).dispatch(type);await spin();},
    async submit(){const event=form.dispatch('submit');await spin();return event;},
    async example(){node('example').click();await spin();},
    clipboard(writeText){navigator.clipboard=writeText?{writeText}:undefined;},
    async tick(){for(const [id,timer]of [...timers]){timers.delete(id);timer.callback();}await spin();},
    async cleanup(){for(const cb of windowHandlers.get('pagehide')||[])cb({});await spin();URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;for(const [name,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}
  };
}
export function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
