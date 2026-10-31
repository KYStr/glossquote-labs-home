// 下載租期最多保留一個 URL；不預先建立任何 Blob。
export class DownloadLease { constructor({URLApi=globalThis.URL,BlobType=globalThis.Blob,schedule=(fn,ms)=>globalThis.setTimeout(fn,ms),cancel=id=>globalThis.clearTimeout(id),changed=()=>{}}={}){Object.assign(this,{URLApi,BlobType,schedule,cancel,changed});this.lease=null;}
 // 功能檢測失敗時由畫面提供唯讀 JSON 備援。
 supported(){return typeof this.URLApi?.createObjectURL==='function'&&typeof this.BlobType==='function';}
 // 編輯不呼叫本方法；清空與離頁才立即回收已交下載 URL。
 clear(){const l=this.lease;if(!l)return;this.lease=null;this.cancel(l.timer);this.URLApi.revokeObjectURL(l.url);this.changed();}
 // 每個回呼只可以處理自己持有的租期。
 start(text,kind,deliver){if(this.lease)return {code:'EXPORT_FAILED'};if(!this.supported())return {code:'UNSUPPORTED'};let url;try{url=this.URLApi.createObjectURL(new this.BlobType([text],{type:kind==='json'?'application/json;charset=utf-8':'text/csv;charset=utf-8'}));const l={url,timer:null};this.lease=l;this.changed();deliver(url,`option-matrix.${kind}`);l.timer=this.schedule(()=>{if(this.lease!==l)return;this.lease=null;this.URLApi.revokeObjectURL(url);this.changed();},10000);return {ok:true};}catch{if(url)this.URLApi.revokeObjectURL(url);this.lease=null;this.changed();return {code:'EXPORT_FAILED'};}}
}
