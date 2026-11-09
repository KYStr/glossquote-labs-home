// Node-only test double. It never opens or controls a browser, desktop or OS focus.
class NodeDouble {
  constructor(tag, document) { this.tagName=tag.toLowerCase(); this.document=document; this.children=[]; this.attributes=new Map(); this.listeners=new Map(); this.value=''; this.disabled=false; this.hidden=false; this._text=''; this.id=''; }
  set textContent(value) { this._text=String(value); this.children=[]; }
  get textContent() { return this._text + this.children.map(child=>child.textContent).join(''); }
  setAttribute(key,value) {
    this.attributes.set(key,String(value));
    if (key==='id') this.id=String(value);
    if (key==='lang') this.lang=String(value);
    if (key==='value') this.value=String(value);
    if (key==='disabled') this.disabled=true;
    if (key==='hidden') this.hidden=true;
    if (key==='readonly') this.readOnly=true;
  }
  removeAttribute(key) { this.attributes.delete(key); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children=nodes; this._text=''; }
  querySelectorAll(selector) { const tags=selector.split(',').map(value=>value.trim()); const result=[]; const visit=node=>{ for (const child of node.children) { if(tags.includes(child.tagName))result.push(child); visit(child); } }; visit(this); return result; }
  addEventListener(type,handler) { if(!this.listeners.has(type)) this.listeners.set(type,[]); this.listeners.get(type).push(handler); }
  fire(type,properties={}) { const event={target:this,currentTarget:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...properties}; for(const handler of this.listeners.get(type)||[])handler(event); return event; }
  click() { if(!this.disabled)this.fire('click'); }
  focus() { this.document.activeElement=this; this.document.focusCount++; }
}
export function fakePage(html,language) {
  const document={activeElement:null,focusCount:0,createElement(tag){return new NodeDouble(tag,this);}};
  const root=new NodeDouble('root',document); const stack=[root]; const voids=new Set(['meta','link','input','br','hr','img']);
  for(const token of html.matchAll(/<\/?([a-zA-Z][\w-]*)\b([^>]*)>/g)) {
    const tag=token[1].toLowerCase();
    if(token[0].startsWith('</')) { if(stack.at(-1).tagName===tag)stack.pop(); continue; }
    const node=document.createElement(tag);
    for(const attribute of token[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))node.setAttribute(attribute[1],attribute[2]??'');
    stack.at(-1).append(node); if(!voids.has(tag))stack.push(node);
  }
  document.documentElement=root.querySelectorAll('html')[0]; document.documentElement.lang=language;
  document.querySelectorAll=selector=>root.querySelectorAll(selector);
  document.getElementById=id=>{ let found=null; const visit=node=>{if(node.id===id)found=node;for(const child of node.children)visit(child);};visit(root);return found; };
  const handlers=new Map(); const window={destination:null,location:{assign(target){window.destination=target;}},addEventListener(type,handler){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(handler);},fire(type,event={}){for(const handler of handlers.get(type)||[])handler(event);}};
  return {document,window};
}
