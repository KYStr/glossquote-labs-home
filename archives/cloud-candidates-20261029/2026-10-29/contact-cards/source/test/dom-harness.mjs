// 僅受控 DOM 替身：驗證控制器狀態，不冒充真瀏覽器布局／下載驗證。
export class Element {
  constructor(tag='div') { this.tagName=tag;this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.children=[];this.listeners=new Map();this.attributes=new Map();this.textContent='';this.files=[]; }
  addEventListener(type,fn){ const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list); }
  emit(type){ for(const fn of this.listeners.get(type)||[]) fn({target:this,preventDefault(){}}); }
  replaceChildren(...nodes){this.children=nodes;}
  append(...nodes){this.children.push(...nodes);for(const node of nodes)node.parent=this;}
  setAttribute(name,value){this.attributes.set(name,value);}
  removeAttribute(name){this.attributes.delete(name);}
  focus(){this.focused=true;}
  click(){if(this.tagName==='a')this.onAnchorClick?.(this);this.emit('click');}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);}
}
export function harness(language='zh-Hant') {
  const ids=['source','file','header','name','phone','email','preview','vcf','result','ack','download','error','status','mapping','prepare','count','previous','next','editor','parse','clear'];
  const elements=new Map(ids.map(id=>[id,new Element()]));elements.get('header').checked=true;elements.get('editor').disabled=true;elements.get('mapping').disabled=true;
  const downloads=[],urls=[],revoked=[],readers=[],timers=new Map(),events=new Map();let timerId=0;
  const body=new Element('body');
  const document={documentElement:{lang:language},getElementById:id=>elements.get(id),body,createElement:tag=>{const element=new Element(tag);element.onAnchorClick=anchor=>downloads.push({href:anchor.href,download:anchor.download});return element;}};
  class Reader {
    constructor(){this.readyState=0;readers.push(this);}
    readAsArrayBuffer(file){this.file=file;this.readyState=1;}
    abort(){this.readyState=2;this.onabort?.();}
    finish(text){this.readyState=2;this.result=new TextEncoder().encode(text).buffer;this.onload?.();}
    fail(){this.readyState=2;this.onerror?.();}
  }
  const platform={TextEncoder,TextDecoder,FileReader:Reader,Blob,URL:{createObjectURL:blob=>{const url=`blob:fake-${urls.length}`;urls.push({url,blob});return url;},revokeObjectURL:url=>revoked.push(url)},setTimeout:fn=>{const id=++timerId;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),addEventListener:(type,fn)=>events.set(type,fn)};
  return {document,platform,$:id=>elements.get(id),downloads,urls,revoked,readers,timers,fireTimers:()=>{for(const [id,fn]of [...timers]){timers.delete(id);fn();}},pagehide:()=>events.get('pagehide')?.()};
}
