# CSS 2D Transform / Transform-Origin Explorer — SPEC r2
文件候選 r2；以下是未來實作的固定提案契約，不代表產品已製作、驗收或已取得正式承接。

## 1. goal — 目標
在同一固定矩形與同一組數值下，回答順序和原點如何改變四頂點位置，產生確定 CSS。面向初學前端與視覺校對者；成功不是畫面「差不多」，而是六種排列、原點換算、矩陣與頂點表能與獨立 expected 對齊且錯誤輸入不殘留可複製的舊輸出。

## 2. scope — 範圍
固定 HTML CSS layout box，border-box 200×100 CSS px，padding/border 0，外框用 outline 不改 box；原始頂點 P0=(0,0)、P1=(200,0)、P2=(200,100)、P3=(0,100)。座標 x向右、y向下，正角順時針。只有 T=translate(txpx,typx)、R=rotate(angledeg)、S=scale(sx,sy)，每項恰出現一次。
A/B 共用七數值，各可從 TRS/TSR/RTS/RST/STR/SRT 選一個。順序是 CSS 字串由左到右排列，不稱「時間上先後」；對欄向量的作用從最右項開始。預設A=TRS、B=RTS；數值tx10、ty20、angle90、sx2、sy3、origin0%/0%，立即展示順序差異。重設還原全部。
非目標完整沿 BRIEF；尤其沒有任意匯入、3D/動畫、viewport單位、產品程式或公開發布於本次。

## 3. userFlow — 流程
1. 開啟中/英文頁即見預設比較與說明；可關閉B但保留其順序選擇，重新開啟不改數字。
2. 七數值均用 type="text"、inputmode="decimal" 的單行文字欄位編輯；每欄有明確label/單位/上下界/允許小數位數說明，不使用原生number/spinner、stepUp/stepDown或自訂步進按鈕，A/B順序用原生select；不用拖拉才可操作。
3. 有效編輯即更新兩面板、頂點表和CSS。空白、未完成負號等編輯中無效值：顯示相應錯誤、清除結果/禁複製、保留原輸入，不能偷偷採上一個有效值或自動夾限。
4. 使用者按「複製 A/B CSS」才嘗試clipboard；成功/失敗以可存取訊息回報，拒絕時保留可選文字手動複製、不自動重試。
5. 預設範例與重設是明確按鈕。切語言保留全部輸入及錯誤狀態，重設不改語言；無 URL狀態或持久存檔。

## 4. inputsOutputs — 資料契約
七欄皆為 ASCII 十進位字串，可有前導+/-、小數點前須至少一位整數、小數點後須至少一位；trim兩端ASCII空白後驗整串。不接指數、Infinity、NaN、逗號、單位、十六進位、Unicode負號、calc或任意CSS。前導零可接受；結果表及CSS輸出正規化，輸入欄raw不得因此改寫；-0輸出0。
七欄各自的raw字串為唯一輸入狀態來源，既有文字input可表示的字串按原樣保存；不能以valueAsNumber、Number(raw)或瀏覽器number清洗作驗證。驗證時僅在副本去兩端ASCII空白（U+0009/U+000A/U+000C/U+000D/U+0020），再整串匹配 `[+-]?[0-9]+(?:\.[0-9]+)?`，先檢小數位數，再解析有限數值及檢上下界。無效raw仍保留；blur、切語言或重繪皆不正規化原欄，不把未完成負號變空。預設/重設才明確寫回指定預設raw。inputmode僅鍵盤提示，不保證有正負號鍵，亦不改grammar；硬體鍵盤與貼上仍接受規定字符。此單行契約不承諾保留HTML文字欄本身會移除的CR/LF。
tx/ty ∈[-500,500] px、最多1位小數；angle ∈[-360,360] deg、最多1位小數；sx/sy ∈[-3,3]、最多2位小數；originX/originY ∈[-100,200] %、最多1位小數。超精度即錯誤（含1.00對一位欄），不先round再驗。負scale與0合法；origin在盒外合法。不得因CSS本身支援更廣而放寬本工具。
輸出：
- 各面板原點 O=(200*originX/100,100*originY/100)，不把stage顯示位移混入世界座標。
- P0..P3 transformed座標與AABB [minX,minY,maxX,maxY]；頂點ID固定，不依變換後上下左右重命名。
- 有效矩陣 [a,b,c,d,e,f]，含origin夾乘；det=sx*sy，det<0標鏡射，det=0標退化。無求逆。
- CSS只輸出下述函式列表，不輸出含origin的matrix以免再套origin造成雙算；矩陣表明標「已含原點offset，不可直接與原origin重複使用」。
- 所有計算保持未round數值；表格顯示6位小數、四捨五入最近值，正好半值遠離0，去尾零、-0→0。接近零且絕對值<0.0000005顯示0；不可把顯示round值拿回後續計算。獨立數值驗證絕對誤差<=0.000001 CSS px。
- CSS輸出只用輸入正規化十進位，不用科學記號、locale小數或round後矩陣。固定兩空格縮排/LF、最後LF：
.selector {
  box-sizing: border-box;
  width: 200px;
  height: 100px;
  padding: 0;
  border: 0;
  transform-box: border-box;
  transform-origin: <originX>% <originY>%;
  transform: <A或B順序的三函式，每項間一空格>;
}
函式格式固定 translate(<tx>px, <ty>px)、rotate(<angle>deg)、scale(<sx>, <sy>)，不省identity函式，不減角成等價角。selector固定.demo-a/.demo-b；禁止使用者自訂selector。示例的「.selector」只代表這兩個固定值。

## 5. implementation — 實作設計提案
分層：純輸入驗證/正規化、2D數學、CSS文字serializer、雙語UI/預覽，無eval/innerHTML注入、無外部資料請求或第三方埋點。此輪只提設計，不交產品代碼。
用欄向量 p=[x,y,1]，六數矩陣代表 [[a,c,e],[b,d,f],[0,0,1]]。T=[[1,0,tx],[0,1,ty],[0,0,1]]；R=[[cosθ,-sinθ,0],[sinθ,cosθ,0],[0,0,1]]；S=diag(sx,sy,1)。
依CSS列表左到右相乘 Mlist=F1*F2*F3，Meffective=T(O)*Mlist*T(-O)。若Mlist六數為[a,b,c,d,e0,f0]，有效e=e0+ox-a*ox-c*oy，f=f0+oy-b*ox-d*oy。各頂點 x'=a*x+c*y+e，y'=b*x+d*y+f。角轉弧度θ=angle*π/180。90度整倍可使用精確0/±1，非整倍用float trig；不更改輸入角字串。
預覽是純幾何示意SVG：基準矩形虛線、各面板不同線型/色、P0..3標籤、固定origin十字。不是任意SVG transform匯入，也不把SVG reference-box語義當HTML CSS。畫面viewBox取基準頂點、O、兩組結果的聯集再四邊加20px，不需修改輸入或四頂點；minimum span 40px。只有呈現縮放，不改CSS輸出數值。320px寬時面板堆疊，結果表可水平捲動且有標籤，不遮住表單。
若det=0，不繪製變換後實心矩形；可另以虛線/點顯示「數學退化示意」，清楚提示真CSS變換元素不可見，不能拿示意當CSS渲染證明。鏡射維持原頂點編號。
規範依據：W3C CSS Transforms Level1，https://www.w3.org/TR/css-transforms-1/ ，2026-10-31本輪實讀 §3/§5/§6/§10。其順序/原點夾乘及非可逆不顯示規則是基線；上列數值界/七欄/格式是本提案選擇，不宣稱W3C要求。

## 6. acceptance — 完整驗收面向
文件完整度與未來產品驗收分開；本文件沒有任何分數。正式固定後由不同作者對同候選每必要面向逐項觀察，未測=null，目標每項>=90，不平均、不移除：
- math：六排列、origin換算、負/零scale、45度與角邊界，EXPECTED全部符合。
- validation：每欄語法/界/精度/空白/編輯中不合法反例；不可有stale可複製結果。
- css-output：exact字串/順序/單位/負零/identity保留與一段可用HTML的實際CSS核驗。
- visualization：四ID、座標表、AABB/原點、同數字比較、鏡射及退化語義、顯示縮放不改數學。
- interaction-a11y：全鍵盤、焦點明顯、labels/單位及界限描述以aria-describedby關聯，錯誤時aria-invalid=true且關聯該錯誤，不冒用spinbutton角色、朗讀更新不每按鍵刷屏、複製拒絕可恢復、兩語保持狀態；對比至少WCAG AA正常文字要求，不能只靠顏色。
- responsive-compatibility：桌面Chromium/Firefox當前可用版本固定記錄、320/768/1440 CSS px；100%/200% zoom可操作，觸控可正常文字欄/select但不列真手機硬門。
- privacy-reliability：無輸入出站/無持久化/無任意CSS注入；反覆切序/重設/錯誤恢復/clipboard拒絕無崩潰。
- maintainability-performance：純層可測、無外部依賴需求、文件中英與limits同源；單次固定4頂點有界、無逐步搜尋或動畫loop；量測UI更新延遲並記硬體版本，不偽造性能值。

## 7. tests — 測試計畫
附錄A的固定JSON為不依未來實作生成的手工固定期望；附錄B列推導，非作者須重新算，不只跑同一函式。
T01六排列A/B角90非等比scale/nonzero translation；T02中心原點；T03盒外原點；T04水平鏡射；T05零scale退化；T06正/負360；T0745度；T08上下界大數；T09所有非法欄位與錯誤恢復；T10精確CSS及無額外權限；T11文字欄鍵盤/複製/語言/raw保留/320px；T12正常HTML獨立實測。
數學單元用未round矩陣逐點；比較expected誤差<=1e-6；CSS字串完全一致。未來瀏覽器獨立測量不能只讀computedStyle再當數學oracle：使用零尺寸角標或獨立已知點，核實包含origin後四位置/原點；getBoundingClientRect只有AABB，不能替四頂點。視覺/鍵盤/兩語要實際觀察，unit PASS不補分。
輸入反例：空、-、.5、1.、1e2、NaN、Infinity、0x10、12px、1,5、全形１、Unicode−1、超精度、界外。數值接受±0及規定正負邊界。結構錯誤順序缺/重複/未知字母一律無結果。
新增F1回歸計畫（產品未實作）：依次輸入/貼上tx `+0010.0`、`-`、` 10.0 `、`1.00`；核input.value與raw相同，切語言及blur後原字串不變。前者CSS為10px，第三者CSS亦10px；第二/第四者顯示相應錯誤、清空結果且禁複製，不採舊輸出。修回有效值應恢復結果；重設才回預設raw。七欄皆核labels/描述/錯誤關聯與純text非spinbutton語義；確認DOM沒有number/step與自訂步進控制。
固定數值輸出不可隨語言變成逗號小數。兩面板同order結果應相同；只有translate時origin任意不影響結果；全identity原點任意不影響矩形。

## 8. handoff — 交接與開工門
本文件交不同作者核八節/算術/邊界，真缺陷回作者另存revision；不由作者自評90。
正式開工前：本地未知草案去重完成且保留owner；確認此方向必要且合法；合法actor讀當版協議本人ACK；BRIEF/SPEC/expected固定GitHub commit與獨立完整度收據，registry latest CAS/讀回，正式task允許executor且有效claim。全部未完成前不得稱ready或寫產品。
產品製作預設local-codex P3；文件準備不是預先claim。文件公開/部署/費用/新workflow仍另核範圍。庫存計數本包貢獻0，所有產品驗證NOT_RUN。

## r2 修訂依據（僅F1，非新增產品功能）
WHATWG HTML Number state有value sanitization，valid floating-point grammar不容許前導+；故r1 number控件與raw契約不相容，改用text及顯式驗證。來源於2026-10-31 08:33 UTC實讀：https://html.spec.whatwg.org/multipage/input.html#number-state-(type=number) 、https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-floating-point-number 。數值界、精度、公式、CSS輸出及八面向不變。

## 附錄A：固定獨立期望（14組）
```json
{
  "kind": "hand-derived-private-spec-expectations-not-product-test",
  "tolerance": 1e-06,
  "vertexOrder": [
    "P0",
    "P1",
    "P2",
    "P3"
  ],
  "rectangle": [
    200,
    100
  ],
  "cases": [
    {
      "id": "order-TRS",
      "order": "TRS",
      "inputs": {
        "tx": 10,
        "ty": 20,
        "angle": 90,
        "sx": 2,
        "sy": 3,
        "originX": 0,
        "originY": 0
      },
      "effectiveMatrix": [
        0,
        2,
        -3,
        0,
        10,
        20
      ],
      "vertices": [
        [
          10,
          20
        ],
        [
          10,
          420
        ],
        [
          -290,
          420
        ],
        [
          -290,
          20
        ]
      ]
    },
    {
      "id": "order-TSR",
      "order": "TSR",
      "inputs": {
        "tx": 10,
        "ty": 20,
        "angle": 90,
        "sx": 2,
        "sy": 3,
        "originX": 0,
        "originY": 0
      },
      "effectiveMatrix": [
        0,
        3,
        -2,
        0,
        10,
        20
      ],
      "vertices": [
        [
          10,
          20
        ],
        [
          10,
          620
        ],
        [
          -190,
          620
        ],
        [
          -190,
          20
        ]
      ]
    },
    {
      "id": "order-RTS",
      "order": "RTS",
      "inputs": {
        "tx": 10,
        "ty": 20,
        "angle": 90,
        "sx": 2,
        "sy": 3,
        "originX": 0,
        "originY": 0
      },
      "effectiveMatrix": [
        0,
        2,
        -3,
        0,
        -20,
        10
      ],
      "vertices": [
        [
          -20,
          10
        ],
        [
          -20,
          410
        ],
        [
          -320,
          410
        ],
        [
          -320,
          10
        ]
      ]
    },
    {
      "id": "order-RST",
      "order": "RST",
      "inputs": {
        "tx": 10,
        "ty": 20,
        "angle": 90,
        "sx": 2,
        "sy": 3,
        "originX": 0,
        "originY": 0
      },
      "effectiveMatrix": [
        0,
        2,
        -3,
        0,
        -60,
        20
      ],
      "vertices": [
        [
          -60,
          20
        ],
        [
          -60,
          420
        ],
        [
          -360,
          420
        ],
        [
          -360,
          20
        ]
      ]
    },
    {
      "id": "order-STR",
      "order": "STR",
      "inputs": {
        "tx": 10,
        "ty": 20,
        "angle": 90,
        "sx": 2,
        "sy": 3,
        "originX": 0,
        "originY": 0
      },
      "effectiveMatrix": [
        0,
        3,
        -2,
        0,
        20,
        60
      ],
      "vertices": [
        [
          20,
          60
        ],
        [
          20,
          660
        ],
        [
          -180,
          660
        ],
        [
          -180,
          60
        ]
      ]
    },
    {
      "id": "order-SRT",
      "order": "SRT",
      "inputs": {
        "tx": 10,
        "ty": 20,
        "angle": 90,
        "sx": 2,
        "sy": 3,
        "originX": 0,
        "originY": 0
      },
      "effectiveMatrix": [
        0,
        3,
        -2,
        0,
        -40,
        30
      ],
      "vertices": [
        [
          -40,
          30
        ],
        [
          -40,
          630
        ],
        [
          -240,
          630
        ],
        [
          -240,
          30
        ]
      ]
    },
    {
      "id": "center-origin",
      "order": "TRS",
      "inputs": {
        "tx": 10,
        "ty": 20,
        "angle": 90,
        "sx": 2,
        "sy": 3,
        "originX": 50,
        "originY": 50
      },
      "effectiveMatrix": [
        0,
        2,
        -3,
        0,
        260,
        -130
      ],
      "vertices": [
        [
          260,
          -130
        ],
        [
          260,
          270
        ],
        [
          -40,
          270
        ],
        [
          -40,
          -130
        ]
      ]
    },
    {
      "id": "mirror-x-center",
      "order": "TRS",
      "inputs": {
        "tx": 0,
        "ty": 0,
        "angle": 0,
        "sx": -1,
        "sy": 1,
        "originX": 50,
        "originY": 50
      },
      "effectiveMatrix": [
        -1,
        0,
        0,
        1,
        200,
        0
      ],
      "vertices": [
        [
          200,
          0
        ],
        [
          0,
          0
        ],
        [
          0,
          100
        ],
        [
          200,
          100
        ]
      ]
    },
    {
      "id": "zero-x-center",
      "order": "TRS",
      "inputs": {
        "tx": 0,
        "ty": 0,
        "angle": 0,
        "sx": 0,
        "sy": 2,
        "originX": 50,
        "originY": 50
      },
      "effectiveMatrix": [
        0,
        0,
        0,
        2,
        100,
        -50
      ],
      "vertices": [
        [
          100,
          -50
        ],
        [
          100,
          -50
        ],
        [
          100,
          150
        ],
        [
          100,
          150
        ]
      ]
    },
    {
      "id": "outside-origin-90",
      "order": "TRS",
      "inputs": {
        "tx": 0,
        "ty": 0,
        "angle": 90,
        "sx": 1,
        "sy": 1,
        "originX": -50,
        "originY": 200
      },
      "effectiveMatrix": [
        0,
        1,
        -1,
        0,
        100,
        300
      ],
      "vertices": [
        [
          100,
          300
        ],
        [
          100,
          500
        ],
        [
          0,
          500
        ],
        [
          0,
          300
        ]
      ]
    },
    {
      "id": "angle45-origin0",
      "order": "TRS",
      "inputs": {
        "tx": 0,
        "ty": 0,
        "angle": 45,
        "sx": 1,
        "sy": 1,
        "originX": 0,
        "originY": 0
      },
      "effectiveMatrix": [
        0.7071067811865476,
        0.7071067811865476,
        -0.7071067811865476,
        0.7071067811865476,
        0,
        0
      ],
      "vertices": [
        [
          0,
          0
        ],
        [
          141.4213562373095,
          141.4213562373095
        ],
        [
          70.71067811865476,
          212.13203435596427
        ],
        [
          -70.71067811865476,
          70.71067811865476
        ]
      ]
    },
    {
      "id": "identity-angle-360",
      "order": "SRT",
      "inputs": {
        "tx": 0,
        "ty": 0,
        "angle": -360,
        "sx": 1,
        "sy": 1,
        "originX": -100,
        "originY": 200
      },
      "effectiveMatrix": [
        1,
        0,
        0,
        1,
        0,
        0
      ],
      "vertices": [
        [
          0,
          0
        ],
        [
          200,
          0
        ],
        [
          200,
          100
        ],
        [
          0,
          100
        ]
      ]
    },
    {
      "id": "identity-angle360",
      "order": "SRT",
      "inputs": {
        "tx": 0,
        "ty": 0,
        "angle": 360,
        "sx": 1,
        "sy": 1,
        "originX": -100,
        "originY": 200
      },
      "effectiveMatrix": [
        1,
        0,
        0,
        1,
        0,
        0
      ],
      "vertices": [
        [
          0,
          0
        ],
        [
          200,
          0
        ],
        [
          200,
          100
        ],
        [
          0,
          100
        ]
      ]
    },
    {
      "id": "bounds",
      "order": "TRS",
      "inputs": {
        "tx": 500,
        "ty": -500,
        "angle": -180,
        "sx": -3,
        "sy": 3,
        "originX": 200,
        "originY": -100
      },
      "effectiveMatrix": [
        3,
        0,
        0,
        -3,
        -300,
        -900
      ],
      "vertices": [
        [
          -300,
          -900
        ],
        [
          300,
          -900
        ],
        [
          300,
          -1200
        ],
        [
          -300,
          -1200
        ]
      ]
    }
  ],
  "exactCssExample": ".demo-a {\n  box-sizing: border-box;\n  width: 200px;\n  height: 100px;\n  padding: 0;\n  border: 0;\n  transform-box: border-box;\n  transform-origin: 0% 0%;\n  transform: translate(10px, 20px) rotate(90deg) scale(2, 3);\n}\n"
}
```

## 附錄B：手工推導與核對方法
# 獨立算例的手工推導與核對方法
「獨立」指期望值先以公式手列，不從未來產品或瀏覽器輸出倒灌；不是非作者已驗收。附錄A的固定JSON 的14組矩陣/四頂點為固定數字，另用逐點逆序操作做作者算術交叉核。非作者仍須重新推導。

## 六排列
共用 tx10 ty20 θ90 sx2 sy3、O0。R(x,y)=(-y,x)，S(x,y)=(2x,3y)。
- TRS：先S再R再T => (10-3y,20+2x)。
- TSR：先R再S再T => (10-2y,20+3x)。
- RTS：先S再T再R => (-20-3y,10+2x)。
- RST：先T再S再R => (-60-3y,20+2x)。
- STR：先R再T再S => (20-2y,60+3x)。
- SRT：先T再R再S => (-40-2y,30+3x)。
代入P0(0,0)/P1(200,0)/P2(200,100)/P3(0,100)，不得依結果位置更名。

## 原點、鏡射、退化
TRS O=(100,50)：對(x-100,y-50)套(10-3y,20+2x)再加O => (260-3y,-130+2x)。
中心x鏡射 => (200-x,y)，det=-1；中心零x/雙y => (100,2y-50)，det=0，四點數學結果不等於瀏覽器實際可見元素。
盒外 O=(-100,200) 的90旋轉 => (100-y,300+x)，origin百分比(-50%,200%)分別乘200/100。
±360應回identity，CSS字串仍保留輸入±360deg，不改寫為0deg。

## 非整角與邊界
45deg/O0/s1/t0：k=√2/2，x'=k(x-y)、y'=k(x+y)。P2=(100k,300k)，不能四捨五入k後再算。
bounds：tx500/ty-500/θ-180/sx-3/sy3/O=(400,-100)。R*S=diag(3,-3)，e=500+400-1200=-300，f=-500-100-300=-900；P2=(300,-1200)。
literal matrix和逐點逆序兩路56個頂點均在1e-6內一致。四頂點/AABB規則可由非作者直接推演；本輪沒有產品或GUI可以測，絕不可寫測試數換品質分數。

## 輸入/輸出反例責任
正規化「+0010.0」=>CSS10px；「-0.0」=>0px；但tx「1.00」超1位精度拒絕。scale「-0.00」接受並輸出0，屬退化；tx「1e2」拒絕，不能Number()就接受。所有資料型別與範圍按本文，七欄使用text+inputmode=decimal，raw字串是唯一來源；正規化只用於結果/CSS，不回寫raw。`+0010.0`、`-`、` 10.0 `、`1.00`在切語言/blur後原樣保留，後二非法情形中的`-`與`1.00`須清空結果/禁複製。規格已移除spinner與步進按鈕；不可藉瀏覽器自動number解析繞過。
EXPECTED exactCssExample是預設A完整CSS（含最後LF）；B僅函式順序RTS與selector.demo-b不同。其餘identity函式仍必列出。

規範來源（實讀2026-10-31）：https://www.w3.org/TR/css-transforms-1/ ，§3原點夾乘/列表順序、§5/6百分比reference-box、§10不可逆不顯示。數值例、UI與範圍是本提案獨立選定。
