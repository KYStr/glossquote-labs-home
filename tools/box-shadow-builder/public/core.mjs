const KEYS = ['x','y','blur','spread','hex','opacity','mode']; // 固定欄位順序也是錯誤選擇順序。
const LIMITS = {x:[3,-48,48],y:[3,-48,48],blur:[2,0,64],spread:[3,-24,24],opacity:[3,0,100]}; // 原始長度先於整數與數值界限。
const error = (code,path) => ({ok:false,error:{code,path}}); // 錯誤不帶輸入或半成品。
function shape(value,keys) { // 描述子檢查不讀取存取子，拒絕額外鍵。
  if (value===null || typeof value!=='object' || ![Object.prototype,null].includes(Object.getPrototypeOf(value))) return null; // 只收普通資料物件。
  const descriptors=Object.getOwnPropertyDescriptors(value); // Proxy 例外由公開邊界統一處理。
  if(Reflect.ownKeys(descriptors).length!==keys.length || keys.some(k=>!Object.hasOwn(descriptors,k)||!Object.hasOwn(descriptors[k],'value'))) return null; // 缺鍵或存取子都是結構錯誤。
  return descriptors; // 呼叫端只讀經核實的資料描述子。
} // 結束結構核對。
export function buildShadow(request) { // 純核心不接觸時間、DOM、網路或任何存放區。
  try { return build(request); } catch { return error('E_INTERNAL','request'); } // 反射異常安全轉固定錯誤。
} // 結束公開邊界。
function build(request) { // 依規格先形狀，再長度，再逐層驗證。
  const top=shape(request,['layers']); if(!top) return error('E_SCHEMA','request'); // 拒絕額外頂層欄位。
  const input=top.layers.value; if(!Array.isArray(input)||Object.getPrototypeOf(input)!==Array.prototype) return error('E_SCHEMA','layers'); // 不接受假陣列或自訂原型。
  const descriptors=Object.getOwnPropertyDescriptors(input), count=descriptors.length.value; // 不先讀元素以保留長度錯誤優先。
  if(count<1||count>4) return error('E_LAYER_COUNT','layers'); // 五層即使含getter也不執行它。
  if(Reflect.ownKeys(descriptors).length!==count+1 || Array.from({length:count},(_,i)=>i).some(i=>!Object.hasOwn(descriptors,i)||!Object.hasOwn(descriptors[i],'value'))) return error('E_SCHEMA','layers'); // 禁止稀疏、符號及額外屬性。
  const layers=[]; // 新建結果不引用輸入。
  for(let i=0;i<count;i++){ // 最多檢查四層，不遞迴任意物件。
    const path=`layers[${i}]`, d=shape(descriptors[i].value,KEYS); if(!d)return error('E_SCHEMA',path); // 同層形狀優先任何值。
    const layer={}; // 每層獨立標準化。
    for(const key of KEYS){ // 固定順序避免物件列舉影響首錯。
      const raw=d[key].value, field=`${path}.${key}`; if(typeof raw!=='string')return error('E_TYPE',field); // 不呼叫隱式轉型。
      const max=LIMITS[key]?.[0]??(key==='hex'?7:5); if(raw.length>max)return error('E_RAW_LENGTH',field); // 巨長字串先拒絕。
      if(LIMITS[key]){ // 整數欄位只允許ASCII canonical表示。
        if(!/^(?:0|-?[1-9][0-9]*)$/.test(raw))return error('E_INTEGER',field); // 不trim、clamp或接受負零。
        const value=Number(raw); if(value<LIMITS[key][1]||value>LIMITS[key][2])return error('E_RANGE',field); // 格式通過才轉有界數字。
        layer[key]=value; // 保存標準化數值。
      } else if(key==='hex'){ // 顏色只接受完整六位HEX。
        if(!/^#[0-9a-fA-F]{6}$/.test(raw))return error('E_HEX',field); layer.hex=raw.toUpperCase(); // 不接受CSS名稱或函式。
      } else { // 模式以封閉兩值表示。
        if(raw!=='outer'&&raw!=='inset')return error('E_MODE',field); layer.mode=raw; // 不改大小寫。
      } // 結束單欄驗值。
    } // 結束單層欄位檢查。
    layers.push(Object.freeze(layer)); // 凍結結果避免輸出後被修改。
  } // 結束逐層標準化。
  const shadowValue=layers.map(l=>{ // 只用已驗證資料產生封閉CSS。
    const rgb=[1,3,5].map(i=>parseInt(l.hex.slice(i,i+2),16)).join(', '); // HEX轉十進位RGB。
    const alpha=l.opacity===100?'1':l.opacity===0?'0':`0.${String(l.opacity).padStart(2,'0')}`; // 整數拼接避免浮點格式差異。
    return `${l.mode==='inset'?'inset ':''}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px rgba(${rgb}, ${alpha})`; // 保留零單位和完整層順序。
  }).join(', '); // 不去重透明或相同層。
  const css=`.shadow-card { /* 卡片陰影：固定類別，不含預覽輔助樣式 */\n  box-shadow: ${shadowValue}; /* 有序陰影：數值已驗證，內外繪製平面不同 */\n} /* 卡片陰影規則結束 */\n`; // 固定selector、註解及末尾LF。
  const cssBytes=new TextEncoder().encode(css).length; if(cssBytes>1024)return error('E_OUTPUT_LIMIT','output'); // 上限依UTF8不是字串長度。
  return Object.freeze({ok:true,layers:Object.freeze(layers),shadowValue,css,cssBytes}); // 成功只回完整不可變快照。
} // 結束核心實作。
