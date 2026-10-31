// 狀態管理用單調代號隔離所有晚到進度、完成及錯誤。
import {validateDraft} from './input.mjs';
// 核心列舉與輸出共用同一截止時間。
import {enumerate} from './product.mjs';
// 格式化只處理已固定的同一結果。
import {serialize} from './export.mjs';
// 固定錯誤代碼防止把任意例外細節放到畫面。
import {fail} from './errors.mjs';
// 可注入時鐘和讓步只為受控測試，正式頁使用預設實際計時。
export class Session { constructor({onChange=()=>{},now=()=>performance.now(),yieldTask}={}){this.onChange=onChange;this.now=now;this.yieldTask=yieldTask;this.generation=0;this.composing=false;this.state={phase:'idle',result:null,files:null,error:null,progress:0};}
 // 清掉舊結果和輸出，草稿由 UI 自己持有。
 invalidate(){this.generation++;this.state={phase:'idle',result:null,files:null,error:null,progress:0};this.onChange(this.state);}
 // 取消不是完成，保留草稿但不能下載半份結果。
 cancel(){this.invalidate();}
 // 組字開始立即撤銷，組字結束也不自動生成。
 composition(active){this.composing=active;this.invalidate();}
 // 新生成先撤銷任何舊任務，五秒包含序列化階段。
 async generate(draft){if(this.composing)return;this.invalidate();const token=this.generation,deadline=this.now()+5000;const guard=()=>{if(token!==this.generation)fail('CANCELLED');if(this.now()>=deadline)fail('TIMEOUT');};try{const snapshot=validateDraft(draft);this.state={...this.state,phase:'generating',total:snapshot.rowCount};this.onChange(this.state);const result=await enumerate(snapshot,{guard,yieldTask:this.yieldTask,progress:n=>{guard();this.state={...this.state,progress:n};this.onChange(this.state);}});const files=serialize(result,guard);guard();this.state={phase:'ready',result,files,error:null,progress:result.rows.length};this.onChange(this.state);}catch(e){if(token!==this.generation)return;this.state={phase:'error',result:null,files:null,error:{code:e.code||'EXPORT_FAILED',details:e.details||{}},progress:0};this.onChange(this.state);}}
}
