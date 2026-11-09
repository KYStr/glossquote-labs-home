import {generateLayout} from './core.mjs'; // 核心驗值與控制狀態分層，不重寫序列化。
export class Controller { // 控制器的依賴可定向替換，產品仍接真瀏覽器。
  constructor({change=()=>{},clipboard=()=>globalThis.navigator?.clipboard?.writeText?.bind(globalThis.navigator.clipboard),URLApi=globalThis.URL,BlobType=globalThis.Blob,schedule=(fn,ms)=>globalThis.setTimeout(fn,ms),cancel=id=>globalThis.clearTimeout(id),now=()=>Date.now()}={}) { // 原生函式保留receiver。
    Object.assign(this,{change,clipboard,URLApi,BlobType,schedule,cancel,now}); this.generation=0;this.copyId=0;this.leaseId=0;this.copyTimer=null;this.lease=null;this.composing=false;this.modal=false;this.available=true;this.snapshot=null;this.state={result:null,message:'initial',copying:false}; // 下載租約與結果世代分離。
  } // 結束初始化。
  emit(){this.change(this.state);} // 不向外暴露原始輸入。
  expire(){if(this.lease&&this.now()>=this.lease.deadline)this.purge(this.lease.id);} // 每個取出入口先核固定期限。
  purge(id=this.lease?.id){if(!this.lease||this.lease.id!==id)return;const lease=this.lease;this.lease=null;if(lease.timer!==null)this.cancel(lease.timer);if(lease.url!==null)this.URLApi.revokeObjectURL(lease.url);this.emit();} // 舊timer不能碰新URL。
  invalidate(message='changed'){this.generation++;this.copyId++;if(this.copyTimer!==null)this.cancel(this.copyTimer);this.copyTimer=null;this.snapshot=null;this.state={result:null,message,copying:false};this.emit();} // 編輯或清除不撤銷已提出下載的租約。
  composition(active){this.composing=active;this.invalidate();} // 組字期間與結束後都需明確產生。
  generate(raw){this.expire();if(this.modal||!this.available)return this.state;this.invalidate();if(this.composing)return this.state;const result=generateLayout(raw);if(!result.ok)this.state={result:null,message:'invalid',error:result.error,copying:false};else{this.snapshot=JSON.stringify(raw);this.state={result:result.value,message:'ready',copying:false};}this.emit();return this.state;} // 結果原子替換，不留半成功。
  current(raw){this.expire();if(this.modal||!this.available||this.composing)return false;if(!this.state.result||this.snapshot!==JSON.stringify(raw)){this.invalidate();return false;}return true;} // handler也檢查，不只disabled外觀。
  fail(){this.invalidate();this.state={result:null,message:'previewFailed',copying:false};this.emit();} // CSSOM失敗撤下全部取出能力。
  setModal(open){this.modal=open;if(open){this.copyId++;if(this.copyTimer!==null)this.cancel(this.copyTimer);this.copyTimer=null;this.state={...this.state,copying:false,message:this.state.result?'ready':this.state.message};}this.emit();} // 開對話框取消複製token但保留既有結果；取消對話框不復活promise。
  hidden(){this.available=false;this.composing=false;this.modal=false;this.invalidate('background');this.purge();} // 背景是明示可提前清下載租約的例外。
  visible(){this.available=true;this.emit();} // 可見恢復不自動復活結果。
  reset(){this.composing=false;this.modal=false;this.invalidate('initial');} // 一般清除保留已提出下載的有限租約。
  dispose(){this.reset();this.purge();} // 離頁清掉所有應用暫態。
  copy(raw){ // 正常使用者手勢中同步發出writeText，不讀clipboard。
    if(!this.current(raw)||this.state.copying)return;const generation=this.generation,id=++this.copyId,css=this.state.result.css,deadline=this.now()+5000; // 只捕捉有效不可變快照。
    const valid=()=>generation===this.generation&&id===this.copyId&&this.state.result?.css===css; // 過期操作不能污染後來結果。
    const finish=message=>{if(!valid())return;if(this.copyTimer!==null)this.cancel(this.copyTimer);this.copyTimer=null;this.state={...this.state,copying:false,message:this.now()>=deadline?'copyFallback':message};this.copyId++;this.emit();}; // 採入時核原固定期限且消耗token，晚timer或promise不能再改UI。
    let write;try{write=this.clipboard();}catch{finish('copyFallback');return;}if(typeof write!=='function'){finish('copyFallback');return;} // 缺能力安全保留可選文字。
    this.state={...this.state,copying:true,message:'copying'};this.emit();let pending;try{pending=write(css);}catch{finish('copyFallback');return;} // 原生手勢內立即呼叫。
    this.copyTimer=this.schedule(()=>{if(!valid())return;finish('copyFallback');this.copyId++;},Math.max(0,deadline-this.now()));Promise.resolve(pending).then(()=>finish('copied'),()=>finish('copyFallback')); // 五秒只是應用等待界，不宣稱撤回OS。
  } // 結束複製。
  download(raw,deliver){ // 只允許一個有界租約，不排隊或續命。
    if(!this.current(raw)||this.lease)return false;const lease={id:++this.leaseId,url:null,timer:null,deadline:this.now()+30000};this.lease=lease;this.emit(); // 先鎖再建立Blob。
    try { // 失敗只清本次租約，不丟掉可選結果。
      const blob=new this.BlobType([this.state.result.css],{type:'text/css;charset=utf-8'});lease.url=this.URLApi.createObjectURL(blob);deliver(lease.url,'grid.css'); // 固定bytes、MIME與檔名。
      if(this.lease!==lease)return false;lease.timer=this.schedule(()=>this.purge(lease.id),Math.max(0,lease.deadline-this.now()));this.state={...this.state,message:'downloaded'};this.emit();return true; // 到期綁lease token而非結果世代。
    } catch {this.purge(lease.id);this.state={...this.state,message:'downloadFallback'};this.emit();return false;} // 釋放已建URL後可明確重試。
  } // 結束下載。
} // 結束控制器。
