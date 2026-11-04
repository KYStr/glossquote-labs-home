// 受控DOM只執行真app與固定合成事件；不是HTML parser、瀏覽器或版面證據。
import { readFile } from 'node:fs/promises';
import { mount } from '../public/js/app.mjs';
export async function harness(locale='en') {
  const html=await readFile(new URL(locale==='en'?'../public/en/index.html':'../public/index.html',import.meta.url),'utf8');
  const events=new Map(), timers=new Map(), urls=new Map(), downloads=[], created=[];
  let sequence=0;
  const failures={};
  let document;
  class Element {
    constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.handlers=new Map();this.attributes={};this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.checked=false;this.open=false;this.id='';}
    setAttribute(key,value){this.attributes[key]=String(value);if(key==='id')this.id=String(value);}
    getAttribute(key){return this.attributes[key]??null;}
    removeAttribute(key){delete this.attributes[key];}
    append(...items){for(const item of items){item.parentElement=this;this.children.push(item);}}
    remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(item=>item!==this);this.parentElement=null;}
    addEventListener(type,callback){if(!this.handlers.has(type))this.handlers.set(type,[]);this.handlers.get(type).push(callback);}
    emit(type,extra={}){const event={type,target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...extra};for(const callback of this.handlers.get(type)||[])callback(event);return event;}
    focus(){document.activeElement=this;}
    isDisabled(){for(let item=this;item;item=item.parentElement)if(item.disabled)return true;return false;}
    click(){if(this.isDisabled())return;if(this.tagName==='A'){if(failures.click)throw new Error('PRIVATE');downloads.push({name:this.download,url:this.href,live:urls.has(this.href),blob:urls.get(this.href)});}this.emit('click');}
    showModal(){if(failures.dialog)throw new Error('PRIVATE');this.open=true;}
    close(){this.open=false;this.emit('close');}
  }
  const root=new Element('root');const stack=[root];const nodes=new Map();
  // 僅建此受控fixture需要的樹/屬性，不宣稱模擬原生解析修復規則。
  const voids=new Set(['meta','link','input','br','hr']);
  for(const match of html.matchAll(/<\/?([a-z][a-z0-9-]*)([^>]*)>/gi)) {
    const tag=match[1].toLowerCase();
    if(match[0][1]==='/'){if(stack.at(-1)?.tagName===tag.toUpperCase())stack.pop();continue;}
    const element=new Element(tag);
    for(const a of match[2].matchAll(/([^\s=]+)(?:="([^"]*)")?/g))element.setAttribute(a[1],a[2]??'');
    for(const key of ['hidden','disabled','checked','readonly'])if(Object.hasOwn(element.attributes,key))element[key]=true;
    if(element.id)nodes.set(element.id,element);stack.at(-1).append(element);
    if(!voids.has(tag))stack.push(element);
  }
  const all=element=>[element,...element.children.flatMap(all)];
  document={documentElement:{lang:locale},body:all(root).find(e=>e.tagName==='BODY'),activeElement:null,getElementById:id=>nodes.get(id),createElement:tag=>{const e=new Element(tag);created.push(e);return e;}};
  const win={
    addEventListener(type,fn){if(!events.has(type))events.set(type,[]);events.get(type).push(fn);},
    setTimeout(fn,delay){if(this!==win)throw new Error('Illegal invocation');if(failures.timer)throw new Error('PRIVATE');const id=++sequence;timers.set(id,{fn,delay});return id;},
    clearTimeout(id){if(this!==win)throw new Error('Illegal invocation');timers.delete(id);},
    Blob:class extends Blob {constructor(parts,options){if(failures.blob)throw new Error('PRIVATE');super(parts,options);}},
    URL:{createObjectURL(blob){if(this!==win.URL)throw new Error('Illegal invocation');if(failures.url)throw new Error('PRIVATE');const id=`blob:controlled-${++sequence}`;urls.set(id,blob);return id;},revokeObjectURL(id){if(this!==win.URL)throw new Error('Illegal invocation');urls.delete(id);}}
  };
  const app=mount(document,win);
  const node=id=>nodes.get(id);
  const emit=(type,extra={})=>{for(const fn of events.get(type)||[])fn(extra);};
  const snapshot=()=>JSON.stringify([...nodes].map(([id,n])=>[id,{value:n.value,text:n.textContent,hidden:n.hidden,disabled:n.disabled,checked:n.checked,attributes:n.attributes}]));
  return {node,document,win,urls,timers,downloads,created,failures,snapshot,emit,
    click(id){node(id).focus();node(id).click();},
    change(id,value,type='input'){node(id).value=value;node(id).emit(type);},
    submit(){return node('editor-form').emit('submit');},
    sample(){node('example').click();},
    tick(){for(const [id,timer]of [...timers]){timers.delete(id);timer.fn();}},
    cleanup(){app.destroy();}
  };
}
