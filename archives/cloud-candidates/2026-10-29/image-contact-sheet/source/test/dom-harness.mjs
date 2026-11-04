import { inspectImage } from '../public/js/core.mjs';
import { png } from './fixtures.mjs';
// 受控 DOM 只驗狀態機，不是瀏覽器排版、原生下載、解碼或 BFCache 證據。
let run = 0;
export async function harness(language = 'en') {
  const saved = new Map();
  const setGlobal = (name,value) => { saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name)); Object.defineProperty(globalThis,name,{value,writable:true,configurable:true}); };
  const events = new Map(); const nodes = new Map(); const urlMap = new Map(); const downloads = []; const calls = [];
  const timers = new Map(); let nextTimer = 1; let decoder = async file => bitmap(file.meta.width,file.meta.height); let encoder = null;
  let document;
  class Element {
    constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.children=[]; this.handlers=new Map(); this.dataset={}; this.attributes={}; this.disabled=false; this.hidden=false; this.textContent=''; this.value=''; this.checked=false; this.open=false; this.classList={toggle:()=>{}}; }
    addEventListener(type,callback) { if(!this.handlers.has(type))this.handlers.set(type,[]); this.handlers.get(type).push(callback); }
    dispatch(type,extra={}) { const event={preventDefault(){this.defaultPrevented=true;},...extra}; for(const callback of this.handlers.get(type)||[])callback(event); return event; }
    append(...elements) { this.children.push(...elements); for(const el of elements)el.parent=this; }
    replaceChildren(...elements) { this.children=[]; this.append(...elements); }
    setAttribute(name,value){this.attributes[name]=value;}
    querySelectorAll(selector) { const output=[]; const visit=node=>{for(const child of node.children){if(selector==='button'&&child.tagName==='BUTTON')output.push(child);visit(child);}};visit(this);return output; }
    querySelector(selector) { return this.querySelectorAll('button').find(el=>(!selector.includes(':not(:disabled)')||!el.disabled)&&(!selector.includes('data-action=')||el.dataset.action===selector.match(/data-action="([^"]+)"/)[1])); }
    focus(){document.activeElement=this;}
    click(){if(this.disabled)return;if(this.tagName==='A'&&this.download)downloads.push({name:this.download,url:this.href});this.dispatch('click');}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(el=>el!==this);}
    showModal(){this.open=true;} close(){this.open=false;}
  }
  class Canvas extends Element {
    constructor(){super('canvas');this.width=300;this.height=150;}
    getContext(){return {drawImage:(...args)=>calls.push(['draw',...args]),fillRect:()=>{},fillText:(text)=>calls.push(['text',text]),measureText:text=>({width:Array.from(text).length*7})};}
    toBlob(callback,type){if(encoder)return encoder(callback,type,this);callback(new Blob([png(this.width,this.height)],{type:'image/png'}));}
  }
  document={documentElement:{lang:language},activeElement:null,body:new Element('body'),getElementById:id=>nodes.get(id),createElement:tag=>tag==='canvas'?new Canvas():new Element(tag),querySelectorAll:()=>[],addEventListener:(name,callback)=>{if(!events.has(name))events.set(name,[]);events.get(name).push(callback);}};
  for(const id of ['settings','files','items','status','columns','tile','gap','margin','labels','build','png','index','clear','cancel','preview','empty','count','estimate','confirmation','keep','discard'])nodes.set(id,new Element(['build','png','index','clear','cancel','keep','discard'].includes(id)?'button':id==='items'?'ol':'div'));
  for(const [id,value]of Object.entries({columns:'4',tile:'240',gap:'16',margin:'24'}))nodes.get(id).value=value;
  nodes.get('labels').checked=true;
  const windowHandlers=new Map();
  setGlobal('document',document);setGlobal('window',{addEventListener:(name,callback)=>windowHandlers.set(name,callback)});setGlobal('HTMLCanvasElement',Canvas);
  setGlobal('createImageBitmap',file=>decoder(file));
  setGlobal('setTimeout',(callback,delay)=>{const id=nextTimer++;timers.set(id,{callback,delay});return id;});setGlobal('clearTimeout',id=>timers.delete(id));
  const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;
  URL.createObjectURL=blob=>{const url=`blob:fixture-${nextTimer++}`;urlMap.set(url,blob);return url;};URL.revokeObjectURL=url=>urlMap.delete(url);
  await import(`../public/js/app.mjs?harness=${++run}`);
  const spin=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
  function bitmap(width=4,height=3){return {width,height,closed:false,close(){this.closed=true;calls.push(['close',this]);}};}
  return {nodes,document,downloads,urlMap,calls,timers,bitmap,spin,
    node:id=>nodes.get(id), setDecoder:callback=>{decoder=callback;}, setEncoder:callback=>{encoder=callback;},
    emit:(name,extra={})=>windowHandlers.get(name)?.(extra), key:extra=>{for(const callback of events.get('keydown')||[])callback({preventDefault(){},...extra});},
    async add(files){nodes.get('files').files=files;nodes.get('files').dispatch('change');await spin();},
    async build(){nodes.get('settings').dispatch('submit');await spin();},
    async change(id,value){nodes.get(id).value=value;nodes.get(id).dispatch('input');await spin();},
    async tick(delay){for(const [id,timer]of [...timers])if(timer.delay===delay){timers.delete(id);timer.callback();}await spin();},
    cleanup(){windowHandlers.get('pagehide')?.({});URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;for(const [name,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}
  };
}
export function imageFile(name='sample.png',width=4,height=3){const bytes=png(width,height);return {name,size:bytes.length,meta:inspectImage(bytes),arrayBuffer:async()=>bytes.slice().buffer};}
export function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
