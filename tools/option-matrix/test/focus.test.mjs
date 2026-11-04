// 這是受控 DOM 契約測試，不能替代真瀏覽器鍵盤／焦點驗證。
import test from 'node:test';
// 斷言檢查固定 SPEC 的同維度排序焦點及端點無副作用。
import assert from 'node:assert/strict';
// 直接讀取本候選實際 fields 函式，不重寫受測排序邏輯。
import {readFileSync} from 'node:fs';
// 隔離執行受測函式，無網路與完整瀏覽器模擬宣稱。
import vm from 'node:vm';
// 從實際原始碼擷取具名函式至下一個固定函式邊界。
const source=readFileSync(new URL('../app.mjs',import.meta.url),'utf8'),fieldsSource=source.slice(source.indexOf('function fields('),source.indexOf('// 原生 modal'));
// 只提供 fields 使用的最小介面，記錄 focus 與 click handler。
function harness(){const nodes=new Map();let focus=null,invalidations=0;const make=(tag,text,attrs={})=>{const n={tag,text,attrs:{...attrs},children:[],handlers:{},disabled:false,value:'',append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;},addEventListener(k,v){this.handlers[k]=v;},focus(){focus=this.attrs.id;}};if(attrs.id)nodes.set(attrs.id,n);return n;};make('div','',{id:'fields'});make('button','',{id:'add'});const context={draft:[{id:'d1',name:'first',optionsText:'A'},{id:'d2',name:'second',optionsText:'B'}],page:0,session:{invalidate(){invalidations++;}},el:make,$:id=>nodes.get(id),m:{dimension:'Dimension',name:'Name',options:'Options',up:'Up',down:'Down',remove:'Remove'},validate(){},confirm(){throw Error('Unexpected confirmation');}};vm.createContext(context);vm.runInContext(fieldsSource+';fields();',context);return {context,nodes,get focus(){return focus;},get invalidations(){return invalidations;}};}
// 移到上端點仍焦點同一維度的上移鈕，再點不改資料或 generation。
test('B02 up-to-boundary preserves button focus and inert state',()=>{const h=harness();h.nodes.get('d2-up').handlers.click();assert.equal(h.focus,'d2-up');assert.equal(h.nodes.get('d2-up').getAttribute('aria-disabled'),'true');assert.equal(h.nodes.get('d2-up').disabled,false);assert.deepEqual(h.context.draft.map(x=>x.id),['d2','d1']);assert.equal(h.context.draft[0].name,'second');assert.equal(h.invalidations,1);h.nodes.get('d2-up').handlers.click();assert.equal(h.invalidations,1);assert.deepEqual(h.context.draft.map(x=>x.id),['d2','d1']);});
// 下端點亦保持同鈕焦點，不能越界或循環。
test('B02 down-to-boundary preserves focus and prevents wrap',()=>{const h=harness();h.nodes.get('d1-down').handlers.click();assert.equal(h.focus,'d1-down');assert.equal(h.nodes.get('d1-down').getAttribute('aria-disabled'),'true');assert.deepEqual(h.context.draft.map(x=>x.id),['d2','d1']);h.nodes.get('d1-down').handlers.click();assert.equal(h.invalidations,1);assert.equal(h.context.draft[1].optionsText,'A');});
