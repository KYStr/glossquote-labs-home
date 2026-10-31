// 僅受控 DOM test double：執行原 app handlers，不代表瀏覽器排版／原生 API。
import { readFileSync } from 'node:fs';
let serial=0;
class Element {
  constructor(tag,document){this.tagName=tag;this.ownerDocument=document;this.children=[];this.listeners=new Map();this.attributes={};this.value='';this._text='';this.hidden=false;this.disabled=false;this.open=false;}
  set id(value){this.attributes.id=value;} get id(){return this.attributes.id??'';}
  set textContent(value){this.replaceChildren();this._text=String(value);} get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
  set innerHTML(_){throw new Error('Forbidden HTML sink');} set outerHTML(_){throw new Error('Forbidden HTML sink');}
  insertAdjacentHTML(){throw new Error('Forbidden HTML sink');}
  setAttribute(key,value){this.attributes[key]=String(value);}
  removeAttribute(key){delete this.attributes[key];if(key==='open')this.open=false;}
  getAttribute(key){return this.attributes[key]??null;}
  append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  replaceChildren(...nodes){for(const child of this.children)child.parentElement=null;this.children=[];this._text='';this.append(...nodes);}
  remove(){if(this.parentElement){const parent=this.parentElement;parent.children=parent.children.filter(n=>n!==this);this.parentElement=null;}}
  get blocked(){if(this.disabled)return true;let parent=this.parentElement;while(parent){if(parent.tagName==='fieldset'&&parent.disabled)return true;parent=parent.parentElement;}return false;}
  focus(){if(!this.blocked)this.ownerDocument.activeElement=this;}
  addEventListener(type,handler){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(handler);}
  fire(type,extra={}){const event={target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...extra};for(const fn of this.listeners.get(type)??[])fn(event);return event;}
  click(){if(this.blocked)return;if(this.tagName==='a'&&this.download){this.ownerDocument.download(this);return;}this.fire('click');if(this.type==='submit'){let parent=this.parentElement;while(parent&&parent.tagName!=='form')parent=parent.parentElement;parent?.fire('submit');}}
  showModal(){if(this.open)throw new Error('Already open');this.open=true;}
  close(){this.open=false;}
}
class Document extends Element {
  constructor(locale,html){super('#document',null);this.ownerDocument=this;this.activeElement=null;this.documentElement={lang:locale};this.download=()=>{};this.body=new Element('body',this);this.append(this.body);
    // 此小型 fixture parser 只載入作者自己的固定 HTML，不處理使用者資料。
    const stack=[this.body];const body=html.split('<body>')[1].split('</body>')[0];
    for(const match of body.matchAll(/<\/?([a-z][a-z0-9]*)([^>]*?)>|([^<]+)/g)){
      if(match[3])continue;
      const closing=match[0].startsWith('</');if(closing){if(stack.length>1)stack.pop();continue;}
      const node=new Element(match[1],this);for(const attr of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)){const key=attr[1],value=attr[2]??'';node.setAttribute(key,value);if(['id','type','href'].includes(key))node[key]=value;if(['hidden','disabled','readonly'].includes(key))node[key]=true;}
      stack.at(-1).append(node);if(!['input','meta','link','br','hr'].includes(node.tagName))stack.push(node);
    }
  }
  createElement(tag){return new Element(tag,this);}
  all(){const result=[];const walk=node=>{result.push(node);node.children.forEach(walk);};walk(this.body);return result;}
  getElementById(id){return this.all().find(node=>node.id===id)??null;}
  querySelectorAll(selector){return this.all().filter(node=>selector.split(',').map(s=>s.trim()).includes(node.tagName));}
}
export async function harness(locale,run){
  const html=readFileSync(new URL(locale==='en'?'../public/en/index.html':'../public/index.html',import.meta.url),'utf8');const doc=new Document(locale,html);
  const originals=new Map();const set=(key,value)=>{originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
  const listeners=new Map(),timers=new Map(),urls=new Map(),revoked=[],clicked=[],navigation=[];let nextTimer=0,nextUrl=0,failCreate=false,failClick=false;
  const createOriginal=URL.createObjectURL,revokeOriginal=URL.revokeObjectURL;
  URL.createObjectURL=blob=>{if(failCreate)throw Error('blocked');const url=`blob:agenda-fixture-${++nextUrl}`;urls.set(url,blob);return url;};
  URL.revokeObjectURL=url=>{revoked.push(url);urls.delete(url);};
  doc.download=link=>{if(failClick)throw Error('click failed');clicked.push({url:link.href,filename:link.download,blob:urls.get(link.href)});};
  set('document',doc);set('addEventListener',(name,fn)=>listeners.set(name,fn));set('location',{assign:path=>navigation.push(path)});
  set('setTimeout',function(fn,delay){if(this!==globalThis)throw Error('Illegal timer receiver');const id=++nextTimer;timers.set(id,{fn,delay});return id;});
  set('clearTimeout',function(id){if(this!==globalThis)throw Error('Illegal timer receiver');timers.delete(id);});
  for(const key of ['fetch','XMLHttpRequest','WebSocket','localStorage','sessionStorage','indexedDB'])set(key,()=>{throw Error('Forbidden side effect');});
  const api={doc,timers,urls,revoked,clicked,navigation,get:id=>doc.getElementById(id),click:id=>doc.getElementById(id).click(),event:(name,arg={})=>listeners.get(name)?.(arg),timer:id=>{const timer=timers.get(id);timers.delete(id);timer?.fn();},failCreate:value=>{failCreate=value;},failClick:value=>{failClick=value;}};
  try{await import(`../public/js/app.mjs?controlled=${++serial}`);await run(api);}
  finally{URL.createObjectURL=createOriginal;URL.revokeObjectURL=revokeOriginal;for(const[key,value]of originals){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
}
export function fill(api){
  const values={dateRaw:'2026-10-28',timeBasisRaw:'UTC+08:00',roomBufferRaw:'5',speakerBufferRaw:'10','r1-titleRaw':'Opening','r1-roomRaw':'Hall A','r1-speakersRaw':'Ada','r1-startRaw':'09:00','r1-endRaw':'10:00','r2-titleRaw':'Discussion','r2-roomRaw':'Hall B','r2-speakersRaw':'Ada','r2-startRaw':'09:30','r2-endRaw':'10:30'};
  for(const[id,value]of Object.entries(values)){const input=api.get(id);input.value=value;input.fire('input');}
}
