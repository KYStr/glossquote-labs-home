// 控制器只接受純核心結果，不擁有 DOM 或任意 CSS 字串入口。
import {buildGradient} from './core.mjs';
// 結果快照序列化只比較有界、由表單建立的已知形狀。
const key=value=>JSON.stringify(value);
// 非同步回條與下載 URL 均綁定單調代號，過期操作不得改新畫面。
export class Controller{
// 原生 timer 以全域 receiver 呼叫，避免瀏覽器 Illegal invocation。
constructor({change=()=>{},clipboard=()=>globalThis.navigator?.clipboard?.writeText?.bind(globalThis.navigator.clipboard),URLApi=globalThis.URL,BlobType=globalThis.Blob,schedule=(fn,ms)=>globalThis.setTimeout(fn,ms),cancel=id=>globalThis.clearTimeout(id)}={}){Object.assign(this,{change,clipboard,URLApi,BlobType,schedule,cancel});this.generation=0;this.copyId=0;this.timer=null;this.url=null;this.urlTimer=null;this.composing=false;this.state={phase:'editing',result:null,message:'initial'};this.snapshot=null;}
// 所有來源修改先撤銷結果、回條與下載資源，但不改 UI 所持 raw 草稿。
invalidate(message='changed'){this.generation++;this.copyId++;if(this.timer!==null)this.cancel(this.timer);this.timer=null;this.revoke();this.snapshot=null;this.state={phase:'editing',result:null,message};this.change(this.state);}
// 撤銷目前唯一 URL；回收不是撤回已保存的檔案。
revoke(){if(this.urlTimer!==null)this.cancel(this.urlTimer);this.urlTimer=null;if(this.url!==null)this.URLApi.revokeObjectURL(this.url);this.url=null;}
// 組字開始和結束皆維持需明確重產生，不自動提交。
composition(active){this.composing=active;this.invalidate();}
// 每次產生都由完整 raw 快照重新核驗，失敗不保留舊結果。
generate(raw){this.invalidate();if(this.composing)return this.state;const result=buildGradient(raw);if(!result.ok){this.state={phase:'invalid',result:null,message:'invalid',error:result};}else{this.snapshot=key(raw);this.state={phase:'ready',result,message:'ready'};}this.change(this.state);return this.state;}
// 點取出前再次比對 raw，不能用靜默修改或改回字串復活已失效結果。
current(raw){if(this.composing||!this.state.result||this.snapshot!==key(raw)){this.invalidate();return false;}return true;}
// CSSOM 不支援或未預期問題清掉取出能力，保留 raw 供修復。
fail(code='UNEXPECTED'){this.invalidate();this.state={phase:'invalid',result:null,message:'invalid',error:{ok:false,code,field:'request'}};this.change(this.state);}
// 複製 API 必須在使用者事件內同步呼叫；只 Promise 成功才報成功。
copy(raw){if(!this.current(raw)||this.state.phase==='copying')return;const generation=this.generation,operation=++this.copyId,css=this.state.result.css;const valid=()=>this.generation===generation&&this.copyId===operation&&this.state.result?.css===css;const finish=message=>{if(!valid())return;if(this.timer!==null)this.cancel(this.timer);this.timer=null;this.state={...this.state,phase:'ready',message};this.change(this.state);};let write;try{write=this.clipboard();}catch{finish('copyFallback');return;}if(typeof write!=='function'){finish('copyFallback');return;}this.state={...this.state,phase:'copying',message:'copying'};this.change(this.state);let promise;try{promise=write(css);}catch{finish('copyFallback');return;}this.timer=this.schedule(()=>{if(!valid())return;finish('copyFallback');this.copyId++;},3000);Promise.resolve(promise).then(()=>finish('copied'),()=>finish('copyFallback'));}
// 同時只保有一個下載 URL，新的請求先清舊 URL，最遲三十秒清理。
download(raw,deliver){if(!this.current(raw))return false;const generation=this.generation;this.revoke();if(typeof this.URLApi?.createObjectURL!=='function'||typeof this.BlobType!=='function'){this.state={...this.state,message:'downloadFallback'};this.change(this.state);return false;}try{const url=this.URLApi.createObjectURL(new this.BlobType([this.state.result.css],{type:'text/css;charset=utf-8'}));this.url=url;deliver(url,'gradient.css');if(this.generation!==generation||this.url!==url)return false;if(this.url===url)this.urlTimer=this.schedule(()=>{if(this.url===url)this.revoke();},30000);this.state={...this.state,message:'downloaded'};this.change(this.state);return true;}catch{this.revoke();this.state={...this.state,message:'downloadFallback'};this.change(this.state);return false;}}
// 依此檔案的固定契約處理下列明列資料，不擴大輸入或檔案範圍。
}
