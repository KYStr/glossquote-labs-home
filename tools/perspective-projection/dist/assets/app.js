import{fields,defaults,initial,reduce,display,canonical}from'./core.js';
const texts={
  "zh": {
    "title": "透視投影探索器",
    "subtitle": "同一個矩形，兩個不同原點。比較精確數值、完整示意圖與瀏覽器 CSS 預覽。",
    "configure": "01 / 設定旋轉與視點",
    "a": "X 軸旋轉 a（度）",
    "b": "Y 軸旋轉 b（度）",
    "ox": "父層透視原點 X（%）",
    "oy": "父層透視原點 Y（%）",
    "angleHelp": "−60 至 60；最多一位小數。",
    "originHelp": "0 至 100；最多一位小數。",
    "generate": "產生",
    "reset": "重設",
    "identity": "平面原樣",
    "tilt": "X 軸傾斜",
    "corner": "原點角落",
    "diagram": "02 / 完整投影示意圖",
    "native": "03 / 真實 CSS 預覽（外框裁切）",
    "table": "04 / 每個頂點的數值",
    "code": "05 / 可選取的 CSS",
    "help": "如何閱讀兩個原點",
    "help1": "O 是矩形固定旋轉原點 (100,60,0)。Q 是父層透視原點，可獨立移動；距離固定 500px。CSS rotateX(a) rotateY(b) 先作用 Y，再作用 X。",
    "help2": "矩形 200×120px；父層同尺寸。投影座標相對父層，不是螢幕像素；不乘 DPR。所有輸入均保證 w > 0.766，不模擬穿越眼平面。",
    "help3": "完整示意圖與 AABB 不裁切。原生預覽的 220×140px 外框只顯示模型範圍 [−10,−10]–[210,130]；外側頂點不代表整面不可見，也不是計算錯誤。",
    "help4": "原始 input.value 保留；單行輸入可能移除 CR/LF。支援 ASCII 邊緣空白、正號與前導零，最多 24 字元；產生的 CSS 會正規化。輸入留在記憶體、不上傳、不儲存；無剪貼簿 API。",
    "help5": "固定結構：外框 .preview-frame → 父層 .perspective-parent → 矩形 .projected-rectangle。沒有動畫、WebGL、任意 CSS 或一般 3D 渲染器。重新載入/快取返回恢復預設。",
    "placeholder": "輸入已改變；按「產生」建立同一份完整結果。",
    "valid": "已產生同一份投影結果。",
    "error": "請修正標示的欄位。",
    "inside": "框內",
    "outside": "框外",
    "outsideSummary": "框外頂點",
    "none": "無",
    "rounded": "表格為六位小數四捨五入顯示；計算與分類使用未捨入值。",
    "graphDescription": "虛線原矩形、實線投影、多邊形頂點 P0–P3；十字 O 旋轉原點、菱形 Q 透視原點。點線為原生顯示框。",
    "csslabel": "產生的 CSS（唯讀，可手動選取）",
    "locale": "English",
    "staticLink": "English page（開啟預設）",
    "home": "GlossQuote 首頁",
    "nojs": "需要 JavaScript 才能計算；這不是已產生結果。",
    "length": "原始字串不得超過 24 字元。",
    "empty": "請輸入數字。",
    "syntax": "請用 ASCII 整數或一位小數，不接受指數/單位。",
    "range": "數值超出此欄位允許範圍。",
    "schema": "內部輸入格式無效；沒有顯示部分結果。",
    "invariant": "內部模型不變量失敗；沒有顯示部分結果。"
  },
  "en": {
    "title": "Perspective Projection Explorer",
    "subtitle": "One rectangle. Two distinct origins. Compare precise numbers, a full schematic and a real browser CSS preview.",
    "configure": "01 / Set rotations and viewpoint",
    "a": "X rotation a (degrees)",
    "b": "Y rotation b (degrees)",
    "ox": "Parent perspective origin X (%)",
    "oy": "Parent perspective origin Y (%)",
    "angleHelp": "−60 to 60; at most one decimal place.",
    "originHelp": "0 to 100; at most one decimal place.",
    "generate": "Generate",
    "reset": "Reset",
    "identity": "Identity",
    "tilt": "X tilt",
    "corner": "Origin corner",
    "diagram": "02 / Full projection schematic",
    "native": "03 / Real CSS preview (frame clipped)",
    "table": "04 / Every corner in numbers",
    "code": "05 / Selectable CSS",
    "help": "Read the two origins",
    "help1": "O is the fixed rectangle rotation origin (100,60,0). Q is the independently movable parent perspective origin; distance is fixed at 500px. CSS rotateX(a) rotateY(b) applies Y first, then X.",
    "help2": "The rectangle and parent are 200×120px. Projected coordinates are parent-relative, not screen pixels; do not multiply by DPR. All accepted inputs guarantee w>0.766. Eye-plane crossings are not modeled.",
    "help3": "The full schematic and AABB are unclipped. The 220×140px native frame displays model window [−10,−10]–[210,130]. Outside corners do not imply the whole face is invisible or the calculation invalid.",
    "help4": "Original input.value is retained; single-line controls may strip CR/LF. ASCII edge spaces, plus signs and leading zeros are allowed within 24 raw characters; CSS is canonicalized. Inputs stay in memory: no upload, storage or clipboard API.",
    "help5": "Fixed structure: .preview-frame → .perspective-parent → .projected-rectangle. No animation, WebGL, arbitrary CSS or general 3D renderer. Reload/BFCache restores defaults.",
    "placeholder": "Inputs changed. Generate one coherent complete result.",
    "valid": "Generated one coherent projection snapshot.",
    "error": "Correct the marked fields.",
    "inside": "inside",
    "outside": "outside",
    "outsideSummary": "Corners outside frame",
    "none": "none",
    "rounded": "Numbers are rounded to six decimal places for display; calculations and classifications use unrounded values.",
    "graphDescription": "Dashed baseline rectangle, solid projected polygon and stable P0–P3 labels. Cross O is rotation origin; diamond Q is perspective origin. Dotted boundary is the native display frame.",
    "csslabel": "Generated CSS (read only, select manually)",
    "locale": "繁體中文",
    "staticLink": "中文頁面（開啟預設）",
    "home": "GlossQuote home",
    "nojs": "JavaScript is required to calculate; this is not a generated result.",
    "length": "Raw input must not exceed24 characters.",
    "empty": "Enter a number.",
    "syntax": "Use an ASCII integer or one decimal place; no exponent or units.",
    "range": "Value is outside this field’s allowed range.",
    "schema": "Invalid internal input schema; no partial result shown.",
    "invariant": "Internal model invariant failed; no partial result shown."
  }
}
;
// 雙語字串內嵌於固定模組，避免增加 runtime 請求或依賴。
let state=initial(document.documentElement.lang==='en'?'en':'zh');const $=id=>document.getElementById(id),inputs=Object.fromEntries(fields.map(k=>[k,$(k)]));
const ns='http://www.w3.org/2000/svg';function svg(tag,attrs={},text){const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e;}
function diagram(r,t){const d=$('diagram');d.replaceChildren();d.append(svg('title',{id:'svg-title'},t.diagram),svg('desc',{id:'svg-desc'},t.graphDescription));const xs=[-10,210,0,200,100,r.Q[0],...r.corners.map(p=>p.px)],ys=[-10,130,0,120,60,r.Q[1],...r.corners.map(p=>p.py)],x=Math.min(...xs)-20,y=Math.min(...ys)-20,w=Math.max(...xs)-x+20,h=Math.max(...ys)-y+20;d.setAttribute('viewBox',`${x} ${y} ${w} ${h}`);d.setAttribute('width',String(w));d.setAttribute('height',String(h));d.append(svg('rect',{x:-10,y:-10,width:220,height:140,class:'window'}),svg('rect',{x:0,y:0,width:200,height:120,class:'baseline'}),svg('polygon',{points:r.corners.map(p=>`${p.px},${p.py}`).join(' '),class:'projection'}));for(const p of r.corners){d.append(svg('circle',{cx:p.px,cy:p.py,r:2.5,class:'vertex'}),svg('text',{x:p.px+4,y:p.py-4,class:'label'},p.id));}const [qx,qy]=r.Q;d.append(svg('path',{d:`M94 60H106M100 54V66`,class:'origin'}),svg('path',{d:`M${qx} ${qy-6}l6 6 -6 6 -6 -6z`,class:'perspective-origin'}));if(qx===100&&qy===60)d.append(svg('text',{x:108,y:55,class:'label'},'O + Q'));else d.append(svg('text',{x:108,y:55,class:'label'},'O'),svg('text',{x:qx+8,y:qy-7,class:'label'},'Q'));}
function render(){const t=texts[state.lang];document.documentElement.lang=state.lang==='zh'?'zh-Hant':'en';document.title=t.title+' · GlossQuote';document.querySelector('meta[name="description"]').content=t.subtitle;for(const e of document.querySelectorAll('[data-t]'))e.textContent=t[e.dataset.t];$('locale').textContent=t.locale;$('home').textContent=t.home;$('home').href='https://glossquote.com/'+(state.lang==='en'?'en/':'')+'index.html';$('static-language').textContent=t.staticLink;$('static-language').href=state.lang==='en'?'/index.html':'/en/index.html';$('table-region').setAttribute('aria-label',t.table);
const headers=state.lang==='zh'?['ID','原始 x','原始 y','X','Y','Z','w','投影 x','投影 y','顯示框']:['ID','original x','original y','X','Y','Z','w','projected x','projected y','frame'];document.querySelectorAll('thead th').forEach((e,i)=>e.textContent=headers[i]);
for(const k of fields){inputs[k].value=state.raw[k];inputs[k].setAttribute('aria-invalid',String(Boolean(state.errors[k])));$(k+'-error').textContent=state.errors[k]?t[state.errors[k]]:'';}
const errors=Object.values(state.errors);$('errors').textContent=errors.length?t.error+' ('+errors.length+')'+(state.errors.schema?' '+t[state.errors.schema]:''):'';$('status').textContent=state.phase==='valid'?t.valid:state.phase==='error'?t.error:t.placeholder;
const r=state.result;$('generated').hidden=!r;$('placeholder').hidden=Boolean(r);$('rows').replaceChildren();$('diagram').replaceChildren();$('css').value='';
if(!r){document.querySelector('.projected-rectangle').style.transform='';document.querySelector('.perspective-parent').style.perspectiveOrigin='';return;}
$('css').value=r.css;diagram(r,t);for(const p of r.corners){const tr=document.createElement('tr');for(const v of [p.id,p.x,p.y,p.X,p.Y,p.Z,p.w,p.px,p.py,p.outside?t.outside:t.inside]){const td=document.createElement('td');td.textContent=typeof v==='number'?display(v):v;tr.append(td);}$('rows').append(tr);}
$('outside').textContent=t.outsideSummary+': '+(r.corners.filter(p=>p.outside).map(p=>p.id).join(', ')||t.none);$('bounds').textContent='AABB ['+r.aabb.map(display).join(', ')+'] · O=(100,60,0) · Q=('+r.Q.map(display).join(', ')+',0)';
// 僅對驗證後數字寫兩個固定 CSS 屬性；不使用 cssText、style字串或注入規則。
document.querySelector('.perspective-parent').style.perspectiveOrigin=canonical(r.values.ox)+'% '+canonical(r.values.oy)+'%';document.querySelector('.projected-rectangle').style.transform='rotateX('+canonical(r.values.a)+'deg) rotateY('+canonical(r.values.b)+'deg)';}
function safeRemoval(){if(state.result&&($('generated').contains(document.activeElement)||$('rows').contains(document.activeElement)))$('generate').focus();}
for(const k of fields)inputs[k].addEventListener('input',()=>{safeRemoval();state=reduce(state,{type:'edit',field:k,value:inputs[k].value});render();});
let composing=false;$('form').addEventListener('compositionstart',()=>composing=true);$('form').addEventListener('compositionend',()=>composing=false);$('form').addEventListener('submit',e=>{e.preventDefault();if(composing)return;state=reduce(state,{type:'generate'});render();if(state.phase==='error'){const first=fields.find(k=>state.errors[k]);(first?inputs[first]:$('generate')).focus();}});
$('reset').addEventListener('click',()=>{safeRemoval();state=reduce(state,{type:'reset'});render();});$('locale').addEventListener('click',()=>{state=reduce(state,{type:'lang',lang:state.lang==='zh'?'en':'zh'});render();});
for(const[id,raw]of [['identity',{a:'0',b:'0',ox:'50',oy:'50'}],['tilt',{a:'30',b:'0',ox:'50',oy:'50'}],['corner',{a:'20',b:'-30',ox:'0',oy:'0'}]])$(id).addEventListener('click',()=>{safeRemoval();state=reduce(state,{type:'example',raw});render();});
window.addEventListener('pageshow',e=>{if(e.persisted){state=reduce(state,{type:'reset'});render();}});render();
