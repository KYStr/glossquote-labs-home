# Cubic Bézier Easing Explorer — 完整製作規格

版本 1，2026-10-31。這是文件候選，不是已實作產品、品質分數、ready或上線聲明。所有數字與例子是可反駁的設計契約；產品實測一律 NOT_RUN，須另行製作與同候選獨立驗收。

## 1. goal — 目標與成功

對象是為網站介面挑選轉場節奏的維護者。四個控制點不容易直接讀成「開始快慢、末段回彈」，本工具把一組四值轉成時間—進度圖、九個時間樣本、與線性參照並排的單次示範以及可複製的CSS宣告。這是產品假設，沒有宣稱訪談、使用量或最佳化效果。

成功：未讀實作的非作者只依頁內文字，產生一條曲線，讀出指定時刻的進度，分辨負進度/超過100%，播放/暫停/停止，修正一個錯誤，取出同一有效快照的CSS。所有主要工作不用拖曳、聲音、帳戶或動畫即可完成。

非目標：推薦唯一最佳節奏、保證嵌入別站的視覺結果、模擬物理彈簧、編輯動畫keyframes、效能分析、任意CSS解析、影片/GIF輸出、為使用者儲存專案。輸出只是 timing-function 宣告，不包含duration、距離或其他樣式。

## 2. scope — 範圍與固定來源

### 2.1 來源

- [固定BRIEF](https://github.com/KYStr/glossquote-labs-home/blob/2537bd5349c2773253aa4c47f2ab7332ac676538/docs/specs/cubic-bezier-easing/BRIEF.md)。本SPEC細化該brief，未刪九品質面向。
- [主頁基線](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)：發布與來源權利邊界沿用；本次不部署。
- 開工時registry373已確認兩端盤點、79個舊任務之外新增本文件任務；既有61工具、Option Matrix、Gradient、Shadow、Grid原責任保留。ready與展示catalog不同，不把本稿當存量。
- [固定CSS Easing工作草案2023-02-13 §2.2](https://www.w3.org/TR/2023/CRD-css-easing-1-20230213/#cubic-bezier-easing-functions)：端點固定(0,0)/(1,1)，兩x控制值在[0,1]，x為輸入進度、y為輸出進度。此引用只用於語義；本規格的y界、字串限制、誤差、時間長度、播放及驗收均是自身範圍選擇，不冒稱W3C要求。不支援域外時間延伸或steps。

### 2.2 不重複

| 既有方向（固定來源見BRIEF） | 保留原用途 | 本件不同的輸入/輸出/操作 |
|---|---|---|
| 61工具中的專注計時 | 分鐘倒數及到期提示 | 本件無提醒；固定2秒只是曲線示範，主要輸出是時間映射及CSS |
| 單位換算 | 物理量換算 | 本件無單位清單；控制點是無因次座標 |
| 配色/文字對比 | 色彩/對比檢查 | 本件不產生顏色、不宣稱對比認證 |
| Option Matrix | 選項組合表 | 不列舉組合、不作評分決策 |
| Linear Gradient | 顏色停止點/背景CSS | 不編輯背景；圖的x是時間而非顏色位置 |
| Box Shadow | 多層陰影與卡片 | 不產生陰影或圖層 |
| CSS Grid | 空間行列/跨格配置 | 不編排版面；沒有格子佔用或碰撞 |

### 2.3 功能清單

F01 四個文字輸入與固定初值；F02 明確產生/驗證及首錯；F03 一張有坐標/圖例的SVG曲線與九列樣本表；F04 線性/本曲線兩軌手勢播放一次及暫停/繼續/停止；F05 九個時刻手動觀察（減少動態時仍可用）；F06 唯一CSS宣告及複製/手動選取備援；F07 清除、生命週期取消與不保存輸入；F08 完整繁中/英文、鍵盤及頁內幫助。

第一版明確不做下載、Blob URL、檔案API、圖片/SVG匯入、自由拖控制點、預設收藏、隨機、比較多條自訂曲線、分享query/hash輸入、後端/儲存/追蹤、遠端字型、音訊、Canvas/WebGL或新增依賴。純靜態本地計算；網路只用載入既有靜態資產及使用者明確語言/主頁導航。

## 3. userFlow — 使用流程與生命週期

### 3.1 正常旅程

初始四欄依序為0.25、0.1、0.25、1（ease），先不產生結果。首屏說明「x是時間、y是進度；可超出0–1；輸出不含時長」。每欄永久可見名稱與範圍，不以placeholder代label。按產生或在表單Enter只執行一次驗證。成功保持焦點在產生按鈕，以polite狀態告知結果已更新；圖、表、CSS、播放皆使用同一凍結快照。

錯誤列於欄下並以aria-describedby關聯，首錯移焦該欄，狀態顯示首錯及修正方法，不以顏色單獨說明。修正任一欄立即撤舊結果；按產生後才恢復。資料沒有靜默裁切、換預設或自動交換x1/x2。合法x1>x2不是錯誤。

有效結果包含控制點摘要、輸入時間/輸出進度說明、九列表、圖、兩條示範軌道與CSS。每軌標明名稱及0%/100%位置，負/超出區域也標記，兩軌用不同形狀和文字而非只靠色彩。用者可點九時刻radio（0、12.5、25、37.5、50、62.5、75、87.5、100%）立即靜態定位兩軌；鍵盤方向鍵在radio組正常移動，移動後只改觀察時刻，不改控制點或CSS。此操作會停止正在播放/暫停的動畫並清零播放累積時間，但保留選定靜態位置。狀態為「靜態觀察：時間…，進度…」。

播放從時間0開始固定2000ms，只單次、不循環；開始前把radio回到0%。播放中禁用播放，啟用暫停與停止；暫停後保留累積時間/兩位置並啟用繼續與停止；繼續只補剩餘時間；完成精確到1/1、狀態完成，啟用重新播放，暫停/繼續禁用。停止回到0/0、累積0，保留有效快照、表、圖與CSS。radio在播放期間仍可操作，依前述停止轉靜態。焦點不因每幀跳動；每幀數字不進aria-live，只有狀態轉換/明確時刻選取播報。

減少動態使用系統prefers-reduced-motion及頁內checkbox兩來源：effectiveReduced = systemReduced OR localReduced。系統要求不可被本地取消；頁面明示此時原因。effectiveReduced為true時禁止播放/繼續、停止現有動畫並回0；靜態radio、表與CSS全可用。系統由true變false不自動播放，本地checkbox仍保留該頁狀態。沒有讀取或寫入持久設定。

### 3.2 狀態和取消優先序

控制器至少區分 draft / invalid / valid-idle / playing / paused / finished；複製另外有 idle/pending/success/fallback，不作為動畫狀態。resultEpoch、playEpoch、copyEpoch使用單調整數；每個非同步回呼須先核epoch及有效快照，不能只檢查按鈕disabled。

| 事件 | 控制點 | 結果/播放/複製 | 焦點/可見回應 |
|---|---|---|---|
| 任一input或compositionstart | 保留使用者raw | 立即清結果/表圖CSS，取消RAF、複製UI權限及timer | 不搶輸入焦點；「輸入已變更，請重新產生」 |
| composition期間Enter | 不變 | 不產生；compositionend後仍需明確產生 | 不把半組字轉數字 |
| 重按產生 | 重新讀四欄一次 | 清舊epoch，成功建立唯一快照，停止動畫回0 | 一次狀態訊息，不能多個RAF |
| 清除 | 四欄變空字串 | 清結果/錯誤/動畫/複製，還原本地減動checkbox為false（系統值保留） | 焦點x1；「已清除」；不另確認 |
| hidden或pagehide | 保留當前raw（不承諾記憶體安全抹除） | 清結果/表圖CSS、取消所有RAF/timer與回呼權限；播放不續跑 | 回來顯示「已暫停並清除結果，請重新產生」 |
| pageshow/BFCache恢復 | 同頁殘留raw可保留 | 一律無有效結果，不自動重算/播放/複製 | 焦點不強制搶走 |
| reload或語言導航 | 回該語初值 | 空結果；不跨頁保存 | 語言連結旁明示離開不保留輸入 |
| resize/200%縮放 | 不變 | 不改數學快照；更新安全幾何，禁止用resize觸發播放 | 不隱藏必要控制 |
| 系統減動升為true | 不變 | 保留結果，播放回0/停止；複製不受影響 | 原因明示 |

事件handler入口先核document.hidden與dispose狀態；同事件中取消/失效先於啟動工作，取消後任何舊回呼不得復活。隱藏頁面不得接受產生/播放/複製。dispose清監聽器/RAF/timer；最多一個RAF、一個複製timer，不保留未引用任務。原生visibility/pagehide/BFCache與替身測試分開，不用合成事件冒充真瀏覽器生命週期。

### 3.3 複製及其不可撤回邊界

CSS永遠在可鍵盤選取的readonly textarea中。複製只在有效可見結果、明確click時呼叫一次navigator.clipboard.writeText(snapshot.css)。不讀clipboard，不使用execCommand。功能不存在、拒絕或逾時時只提示「請選取下方CSS後手動複製」，不假稱成功。允許使用者自行鍵盤選取；不能程式化讀回OS剪貼簿作成功證明。

pending期間複製按鈕disabled，其他編輯/清除仍可用；期限固定3000ms，以單調時鐘開始計，timeout與promise callback都檢查elapsed：到期或超過就是fallback，先到期不能被較晚成功覆寫。pending結束後同有效快照可再明確點一次；每次新epoch。成功訊息留至下次結果/複製狀態改變，不另建消失timer。任何編輯、產生、清除、hidden、pagehide、dispose均使copyEpoch失效、清timer，晚到promise不得改任何UI。

重要：瀏覽器已接收的writeText可能之後改OS剪貼簿，JS無法取消。頁面說明「已啟動的系統複製可能完成；修改/離開僅取消本頁成功提示，不會清空系統剪貼簿」。不保證撤回系統資料。舊結果仍在OS剪貼簿不是本工具可安全抹除的資料，也不能自動覆寫剪貼簿來假裝撤銷。

## 4. inputsOutputs — 精確輸入輸出與數學契約

### 4.1 raw與錯誤

純parse只接受prototype為Object.prototype或null的非Array物件；恰有四個own enumerable string data properties x1,y1,x2,y2，不接受Symbol/額外/缺欄/accessor。先用descriptor核結構，不讀getter；結構錯誤回FORM_SCHEMA、不進欄位。DOM只構造自己的四字串，不接外來JSON/URL。

欄位依x1、y1、x2、y2固定順序：先型別string，原始UTF-16長度1..16，再格式，再範圍；不trim、不替換全形或Unicode負號。格式為 ASCII `^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,3})?$`，實作還必須要求match[0]與raw全字串相等（避免JavaScript的$在末尾換行前也匹配）；因此+1、.5、1.、01、1e0、NaN、Infinity、空白/換行/逗號/全形皆非法。將合法字串以十進位字元及補零轉signed integer thousandths（不要先parseFloat）；原長度16限制避免不必要大數，範圍用整數比較。

x1/x2 ∈ [0,1000]；y1/y2 ∈ [-1000,2000]。負零、-0.000全部正規化0；`-0.001`對x是範圍錯；y可合法。四欄均通過才產生immutable snapshot。欄錯碼TYPE/LENGTH/FORMAT/RANGE，雙語訊息包括欄名和可行修法；資料順序不影響首錯。輸出只一個首錯，但已展示的舊欄錯在input時清除，不留舊紅框誤導。

### 4.2 曲線與精度

令控制點千分整數為X1/Y1/X2/Y2。對參數 t=n/d，0≤n≤d，任一軸控制值A/B的多項式分子：

`N(A,B,n,d) = 3*(d-n)^2*n*A + 3*(d-n)*n^2*B + 1000*n^3`

軸值=N/(1000*d^3)。所有N/比較使用BigInt；無溢位數字轉型。這是本工具自選確定性演算法，不是引用標準的指定算法。

公開時間輸入只採整數millionths Q ∈ [0,1000000]；九個樣本Q=0,125000,...,1000000。動畫把elapsed clamped到[0,2000]後取floor(elapsed/2000*1000000)，完成必用1000000。此量化是工具示範解析度，不宣稱瀏覽器原生CSS也量化。

對Q=0/1000000直接回0/1（精確）。其他用[0,1]上固定40輪二分：第i輪的中點以dyadic n/d表示，d=2^i；比 `N(X1,X2,n,d)*1000000` 與 `Q*1000*d^3`，相等立即使用該精確t；小則移lo，大則移hi。40輪後取剩餘區間中點，分母最多2^41。用同t算y，保留有號BigInt分子/正分母；僅渲染座標時才轉Number。禁止Newton-only、以x殘差提早停止、直接以Q代t或把y夾在0..1。

x1/x2均在[0,1]時曲線x單調且在內部除孤立平坦點外嚴格增；x1=1,x2=0合法，t=0.5的導數為0，精確比較避免浮點x相等造成錯誤提前終止。t區間誤差≤2^-41；本y域相鄰控制點差絕對值≤3，故|dy/dt|≤9，y誤差≤9*2^-41<5e-12。Number轉換座標容許誤差1e-9，測試必以獨立高精度/有理expected核對，不用產品solver產生expected。固定40輪上界；每次產生只算九逆解及257圖點；動畫每幀最多一逆解，無while直到收斂。

### 4.3 圖、表與位置

SVG固定viewBox 0 0 640 400，繪圖邊界x40..600、y20..350；x域[0,1]、y域[-1,2]。用t=k/256的257個精確參數點生成有序polyline，兩控制點及連線可選顯示但不得代主曲線；不是用九時間樣本畫粗曲線。x螢幕=40+560*x；y螢幕=20+330*(2-y)/3。固定y域顯示負/超過1，0與1參考線具文字；不裁掉合法曲線。點數固定，不接受任意SVG標記。圖有role img/title/desc，旁邊表格是完整數值替代。小視窗可等比縮圖，不要求從小圖單獨讀數。

表格九列，欄為時間%、曲線進度%、線性參考%。時間固定最多一位小數，進度顯示三位小數。採對精確有理y乘100000後作「最接近整數、恰半遠離零」四捨五入，再固定三位小數加%；負零顯示0.000%。不能用locale改十進位符號或分組。顯示必須使用上述固定40輪/精確相等停止算法得到的有理y再取整，因此同輸入永遠同字串；不自行依浮點toFixed改末位。靠近理論rounding邊界時，這是指定近似算法的確定顯示，不宣稱無窮精度理論取整；原始計算仍須滿足1e-9誤差，已固定literal例不可漂移。摘要列正規化四值及兩條軌道的當前時間/進度，不另宣稱極值或單調性。

示範軌道共用域[-1,2]，可用寬度W扣掉左右marker半徑，marker中心位置=(progress+1)/3*可用寬度+左邊界；本曲線progress=y，線性=p。上下軌在同時刻更新，圖/表永不讀正在編輯的raw。0%/100%垂直參考標記位於各軌1/3與2/3；不能為避免出界而截斷負進度。若幾何寬度非正或非有限，停止播放並顯示可理解的尺寸限制，保留數值/CSS；resize恢復只允許再手勢播放。

### 4.4 CSS確定輸出

格式化千分整數：整數不含小數點；其餘最多三位且去尾零；負零為0。唯一輸出是下列一行ASCII，逗號後一空格，末尾semicolon及LF，沒有BOM/CR/注解/selector。clipboard與textarea值逐byte相同，不依語言改變。

`animation-timing-function: cubic-bezier(X1, Y1, X2, Y2);\n`

初值literal（實際結尾換行）：

```css
animation-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);
```

這不是完整animation；頁內說明需另設定duration等，沒有保證套用到任意元素就自動播放。無檔案、MIME或檔名契約，因第一版無下載。CSS只由受限整數serializer組成，不接受任意CSS字串。

### 4.5 確定例與拒絕例

| raw四值x1/y1/x2/y2 | 預期 |
|---|---|
| 0 / 0 / 1 / 1 | 線性；九列曲線=時間；CSS正規化0, 0, 1, 1 |
| 1 / 1 / 0 / 0 | 反序x合法，仍y=x；Q500000恰為0.5，近旁不可誤當0.5 |
| 0 / 1 / 0 / 1 | x=t³、y=1-(1-t)³；Q125000→t0.5→y0.875，表87.500% |
| 1 / 0 / 1 / 0 | x=1-(1-t)³、y=t³；Q875000→t0.5→y0.125 |
| 0 / -1 / 1 / -1 | Q500000→t0.5→y-0.625，表-62.500%，不得夾成0 |
| 0 / 2 / 1 / 2 | Q500000→y1.625，表162.500%，不得夾成100 |
| -0.000 / 0.100 / 1.000 / 2.000 | 正規化0, 0.1, 1, 2；合法 |
| -0.001 / 0 / 1 / 1 | x1 RANGE，不能對應舊結果 |
| 0 / -1.001 / 1 / 1 | y1 RANGE |
| 0 / 0 / 1.001 / 1 | x2 RANGE |
| 0 / 0 / 1 / 2.001 | y2 RANGE |
| 0.0000 / 0 / 1 / 1 | x1 FORMAT，雖數值有限仍拒絕 |
| 任一空白/全形/指數/加號 | 該欄FORMAT或空字串LENGTH，不自動修正 |

## 5. implementation — 實作與交付方案

### 5.1 三層與安全

未來產品放獨立有界工具目錄，製作前另登記task/spec與允許executor。本次不建立產品程式。建議檔分層：core（parse/serialize/rational curve/samples/plot）無DOM/clock/storage/network；controller注入單調clock/RAF/cancelRAF/clipboard/timer與visibility，只管理epoch與狀態；app作正常DOM/SVG/事件適配；i18n含完整雙語字串；兩靜態HTML/CSS及Node內建test/check/build/preview腳本。任何自寫程式逐行具體中文註解，第三方原文不為此改hash。

不eval/new Function/innerHTML/document.write，不把raw放URL、style或SVG；文字textContent/textarea.value，SVG只能固定namespace及白名單數值attribute，座標finite核對且無NaN/Infinity。安全CSS可用固定stylesheet規則和受限數值CSS custom property；CSP不得為方便加入unsafe-eval。若使用inline style屬性與CSP衝突，改用本地外部樣式表中預先定義或明確受限的CSSOM更新，並真瀏覽器驗證，不靜默放寬policy。

原生preview server只綁127.0.0.1，固定root/Host allowlist，解碼後拒絕路徑穿越、NUL、未知path和錯方法；不目錄列舉、不proxy、不啟shell。GET/HEAD只供明列資產，正確Content-Type/nosniff；HTML CSP至少default-src 'none'、script-src 'self'、style-src 'self'、img-src 'self'、connect-src 'none'、object-src 'none'、base-uri 'none'、form-action 'none'、frame-ancestors 'none'。本SVG內建不發請求。若平台不支援所選CSP/preview方法，明示缺口並修正，不把靜態字串檢查當真policy成功。

### 5.2 雙語/可及性

兩頁 /index.html 與 /en/index.html，lang zh-Hant/en，各有唯一h1、title、description、preview noindex，互連與相同語言主頁連結。未部署不得虛構canonical/live URL或搜尋排名，正式SEO另依README發布流程，不阻止文件完整度。英文不能僅換標題；每欄label/範圍/首錯/狀態/幫助/圖標替代/複製警語/縮放限制/導航遺失提示都須對應。數值及CSS同輸入保持相同bytes。

鍵盤順序：語言/主頁→四欄→產生/清除→減動→時刻radio→播放/暫停/繼續/停止→CSS/複製。disable不可造成焦點消失到body：正在操作控制因狀態改為disabled時，先將焦點移至同組下一個可用控制（播放→暫停，暫停→繼續，繼續→暫停，停止→播放；effectiveReduced停止時→時刻radio）。因輸入/背景造成撤結果，不從其他已聚焦元素搶焦點；若activeElement就在將移除結果內，移到產生按鈕。readonly textarea可Tab/選取，不disabled。radio不用自造鍵盤協定，原生fieldset/legend。

桌面至少1366×768、1600×900、真200%zoom及320 CSS px窄視窗；這是桌面resize/reflow不是手機真機門檻。圖可局部縮放/容器滾動，表格必要時有清楚局部水平捲動；整頁主要控制及文字不裁切、不需找隱藏按鈕。正文/錯誤/狀態對比至少4.5:1，大字3:1，必要非文字控制/焦點3:1；量測真渲染色，disabled仍可辨且原因可讀。沒有實際讀屏設備只列未測限制，不以自造永久設備門檻替代可測鍵盤/語意/對比；若發現真讀屏阻擋須記錄並修，不能隱藏。

### 5.3 建置與限制

Node24內建零新增npm依賴。未來交付命令固定 npm test / npm run check / npm run build / npm run preview（preview不自動另開外部網路）；文件列實際Node版本、綁定host/port、停止方法。test涵蓋core/controller；check驗雙語key/schema、禁止sink/網路、HTML連結與來源完整性；build複製受控來源，不壓縮混淆，輸出manifest每檔bytes/SHA256，排除測試/私人輸入/本地路徑/憑證。乾淨重建輸出逐byte相等，時間戳不得混入runtime。

BigInt、SVG、RAF必備；缺少時頁內清楚說明無法使用並禁用產生，不丟空白頁或不正確替代。clipboard可缺失（手動備援可完成），matchMedia缺失時本地減動checkbox仍可用且說明系統偏好無法讀取。禁止把性能或低資源跨機承諾寫成無證明的保證；產生時間/長時資源另見驗收。

維護文件讓非作者在隔離副本增加一條雙語FAQ，跑check/build並以正常頁面讀到，再精確還原；不得把擴充測試副本當候選。來源權利如實標明；現repo無所選license，公開可讀不等授權重用。

## 6. acceptance — 九面向品質驗收

此表是未來產品的完整合約；文件ready只證八節足夠，不能換成產品分數。九面向各須至少90、同一固定candidate/manifest、非作者證據，必要項未測為null；不能平均、用測試數或作者自稱換分。每面向下列全部要求為基礎90的必要項；已證實缺陷須記fail/嚴重度/步驟/預期/實際，尚有必要未測則維分null；任何必要fail最高89、核心不可用或資料外傳等重大缺陷不放行。91–100只在所有必要項完成後，另列可重現改善及獨立證據，不預填。

| id | 完整必要範圍 | 方法、通過預期與應留證據 |
|---|---|---|
| functionality | F01–08全可用，九時間表/圖/兩軌/CSS同快照；負/超額進度不夾值，播放停續正確，手動備援可取CSS | 執行T01–T05、B01–B04/B07；兩語真鍵鼠正常旅程、截圖及copy取得字串。數學用固定有理例/獨立oracle，CSS逐byte。缺任一功能不可只交core綠測 |
| boundaries | 原始schema/字串/範圍/首錯及退化反序x；重複操作、IME、晚到copy/RAF/hidden/pageshow不復活 | T02/T03/T06–T09與B03/B05/B06；輸入/預期/實際、假clock受控證據加真native lifecycle。拒絕後無舊可取結果，原生未做不得以替身填pass |
| privacy | 無輸入外傳/持久化/URL編碼；只write clipboard且警語誠實，無讀取；hidden清本頁結果不承諾OS抹除 | B08完整Network/Storage觀察從載入到輸入、錯誤、產生、copy、hidden、reload/語言/BFCache；只合成canary值，不用真私件。留過濾前請求清單/儲存前後與來源出口核，沒有console/log輸入 |
| security | 封閉parse/serializer與安全SVG/DOM sink、CSP真生效、local server隔離；不接受CSS/HTML注入 | T02/T10＋B08；逐資料流/固定commit行號，惡意字串不能進可執行sink；真header/console/頁面正常性；錯path/Host/MIME/方法測試，不靠regex掃描代真效果 |
| usability | 非作者不讀實作，僅依頁內文字能完成第1節成功目標；知道時間≠t/進度可超出、取CSS要另配duration；失效/首錯/停止/減動可理解 | B01/B03/B04，記每個任務與困惑、錯誤/恢復；正常操作不注入state或直接調handler。未招募真人不虛構滿意度，也不另加招募硬門檻 |
| accessibility | 雙語全鍵盤、焦點轉換、radio/錯誤/狀態語意、無每幀播報；非單色辨識、減動全部核心能力、200%及320px/對比 | B02/B04/B07；實際焦點軌跡、尺寸截圖、量測對比、accessibility tree；讀屏若可用實測並列名稱版本，未測明列且不宣稱全面無障礙；已知真阻擋必修 |
| localization-seo | 所有互動/錯誤/限制雙語、數字與CSS一致、lang/h1/head/同語連結及preview noindex真實 | T10+B07；兩語同raw逐byteCSS/表數值，逐字串清單、正常語言導航。正式站/SEO未部署保持NOT_RUN，不杜撰網址/索引 |
| toolchain-provenance | Node24零新增依賴、core/controller/DOM可定位、中文註解、可重建、來源權利/限制透明、非作者FAQ擴充可復原 | T10；乾淨test/check/build log及退出碼/manifest、兩次產物bytes；隔離擴充與正常頁證據及原候選精確復原。文件與交付一致，不藏generated或私件 |
| compatibility | 至少一個實際桌面Chromium正常旅程、SVG/BigInt/RAF真有效，copy失敗備援、減動/zoom/resize/背景/BFCache適用處正確；上界效能 | B01–B08，記OS/瀏覽器完整版本、viewport/DPR、輸入方式及origin。同機有效產生100次每次≤500ms且不凍結，連續20次播放/停止後無殘留RAF/timer（devtools/控制層診斷分層留證）；手機/其他引擎未測非硬門檻。BFCache未入cache要如實記未命中，不能聲稱已測pageshow persisted；另以該瀏覽器可行旅程取得或列必測缺口 |

判定必須先固定候選及環境，錯誤後不暗改閾值。效能500ms僅本小工具同指定桌面環境上限，不是假稱所有硬體。沒有可用原生瀏覽器時可以完成文檔/純測，但必要產品項仍null；不得設計永遠無法觀察的「內部狀態必須真實」門檻取代可操作測法。

## 7. tests — 可重現測試矩陣

### 7.1 離線（未來產品執行，本文件只定義）

| id | 步驟/資料 | 獨立預期 |
|---|---|---|
| T01 | 第4.5節所有合法literal、Q九點，雙語 | 有理精確例與CSS逐byte相符；九列且順序固定 |
| T02 | schema null/array/missing/extra/Symbol/getter；四欄逐一undefined/number/空/17字元/空白/+1/01/.5/1./1e0/全形/HTML/CSS | 結構先FORM_SCHEMA、不觸getter；其餘TYPE→LENGTH→FORMAT→RANGE；四欄首錯順序固定，無結果 |
| T03 | 各x -0.001/0/0.001/0.999/1/1.001；各y -1.001/-1/-0.999/1.999/2/2.001；-0/-0.000；3/4位小數 | 只閉區間/三位合法；負零serializer為0；不交換控制點 |
| T04 | x1=x2=0及1、x1=1/x2=0；Q0/1/499999/500000/500001/999999/1000000，y取-1/0/1/2配對 | endpoints exact；各值對獨立80輪有理區間或解析公式誤差≤1e-9；不以浮點x殘差早停。y=x的反序例近中心必與Q相等而非卡0.5 |
| T05 | plot257點、所有y端組合；CSS正規化，表負/超額/零rounding | 每點由獨立有理公式，坐標finite且固定域；九表不用t替時間；輸出末LF無CR/BOM；已列literal固定 |
| T06 | 注入可控clock/RAF：play0→500→pause→等待1000→continue→1500剩餘→end；快速play/play、stop、radio時刻 | pause等待不計入；總active2000，完成1/1；最多一RAF；stop0/0；radio停止並保持所選位置；過期frame不能復活 |
| T07 | 每個狀態逐一edit/clear/hidden/pagehide/dispose；pageshow persisted真/假控制器序列；減動系統切換/checkbox | 每條按第3.2表；hidden不啟新工作，恢復不自動算/播放；effectiveReduced OR不被本地反向覆寫 |
| T08 | clipboard缺失/resolve/reject；2999/3000/3001ms與timer/resolve不同排程；pending重點/編輯/重新產生後晚到舊promise | 到3000即fallback；舊epoch不能顯示成功或覆蓋新狀態；不讀/清空OSclipboard；timer數≤1、完成清理 |
| T09 | compositionstart→input→Enter→compositionend；先錯誤後清除；結果內焦點在清除/失效 | IME不誤產生；raw/錯誤/結果依表；焦點只在必要移除/disable時按映射移，不搶別處焦點 |
| T10 | 靜態安全/雙語/連結檢查；server GET/HEAD/POST、../編碼穿越/錯Host/未知檔；兩次乾淨build；非作者FAQ擴充 | 無禁止sink/依賴/網路出口；404/405/Host拒絕正確且無洩檔，headers真核；產物一致，FAQ變化可見後可精確復原 |

獨立oracle不得import產品solver。解析例優先；一般點可用獨立有理區間80輪，記輸入與上下界，再核產品結果落界附近≤1e-9；不可只把產品結果存成snapshot。測試負例不得讓getter或惡意字串執行；記拒絕而非允許測試框架事故。

### 7.2 正常桌面瀏覽器

全部用真頁面正常鍵鼠；不得呼叫handler/改私態冒正常旅程。觀測可讀devtools，native CSS對照允許另建隔離參考頁，不把它混入產品。

| id | 正常步驟 | 預期/證據 |
|---|---|---|
| B01 | 新頁初值→產生→讀50%樣本→play/pause/continue/stop→複製到本地純文字欄；英文再做 | 圖/表/軌道同快照；CSS逐byte含LF；輸入/結果/狀態錄屏或分步截圖，記版本/時間 |
| B02 | 全程只Tab/ShiftTab/Enter/Space/方向鍵，含錯誤/停止/減動/readonly選取 | 焦點可見且按第5.2映射不掉body；無鍵盤陷阱；9 radio可選、表讀序正確，無每幀live刷屏 |
| B03 | 負/超額兩例→九時刻→錯誤x1=-.001（FORMAT）再改-0.001（RANGE）再改0；IME輸入 | 負/超額可見不裁；失效無舊CSS；首錯明確，修好需再產生；不接受半組字 |
| B04 | 本地減動開/關；OS或瀏覽器正式偏好設減動（記方式）時嘗試播放、radio；播放中變偏好 | system true永不播，靜態仍完整；偏好解除不自播。正常縮放/resize不造成重啟 |
| B05 | 真切到別頁/視窗導致document hidden、回來；頁內語言導航/reload；正常Back/Forward取得可證persisted的BFCache旅程 | 結果失效、不繼續動畫/複製提示；reload/語言為初值；BFCache若實際未命中如實記，補可行條件或NOT_RUN，不用合成pageshow代替 |
| B06 | 實際clipboard可用時copy成功；透過瀏覽器權限設定拒絕（記方法）再copy，手動選取貼到本地欄；pending時編輯/clear | 成功/失敗提示誠實、備援可完成；晚OS寫入不可取消界線清楚。無法穩定製造native慢promise時用T08證明控制器競態，但不把它說真系統慢寫已測 |
| B07 | 兩語1366×768/1600×900、320CSSpx及200%zoom；點主頁/語言連結；核圖例和小字對比 | 核心文字/控制可見，圖可等比縮且有表替代；沒有整頁隱藏按鈕；雙語完整，連結目的正確；圖片/焦點/對比數值 |
| B08 | DevTools開Network/Storage，自初始到全部主要事件；canary四值；查看headers/CSP及console；正常產生100次及20播放stop | 只有必要本地靜態/顯式導航，無輸入外傳/應用儲存；沒有CSP錯誤導致假正常；固定環境記耗時與最大值，資源無累積 |

另做獨立原生CSS語義對照（API參照 [Animation.currentTime](https://developer.mozilla.org/en-US/docs/Web/API/Animation/currentTime) 及 [Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate)，只用其可設暫停時刻能力，不引用為已測證據）：隔離參考頁建立兩keyframes數值位移0→100px，easing使用產品輸出的四值，duration2000ms，pause並設currentTime為250/1000/1750ms，讀真正computed transform的位移；參考例選(0,1,0,1)、(1,0,1,0)、負/超額及反序x。瀏覽器插值容差固定0.02px（對100px，即0.0002進度），比較文件解析期望/獨立oracle而非產品solver；記瀏覽器版本與CSS/實際值。此是隔離的原生語義驗證，不取代B01真產品播放，也不要求外部網站或新服務。若瀏覽器不支持此參考API，列能力限制，用另一可執行原生CSS採樣方法經reviewer明確記錄等價誤差，不能當自動PASS。

## 8. handoff — 交接與獨立完整度

本次交付同一分支的BRIEF.md（保持原文）、SPEC.md、AUTHOR-CHECK.md；以固定commit和open draft PR交非作者，review文件在同一授權目錄下另保存。作者查核只核文檔可實作、例子算術、矩陣對應；不報產品test/GUI/品質分。

非作者先讀最新規則/registry與本人ACK，核同candidate全部八節 goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff，對照固定brief及九面向、例子和可執行測法。缺任一節即給具體修正點與影響，不為湊20份勾true；通過後本人用core mark-spec-ready，不能由作者代簽。文件ready只新增一份未消耗預案，非工具accepted/部署。任務八節完整度與產品九面向數值驗收不同，文件階段不填產品90。

後續製作者另取合法production task/claim（預設local-codex；cloud須明列），從固定SPEC實作；source公開、實部署、catalog更新等依既有README流程另授權，本文不自授。修訂保留stable spec ID；未指派前原作者可revise-spec再獨審，已被production引用者遵core凍結規則另立可追溯修訂，不暗縮九面向。

安全保存點：每節文字可保存，切回P1時記已完成節/未解選擇/候選與claim，不把缺章稿ready，不釋放他人owner。交驗必記檔案bytes/SHA、固定commit/PR head、未測限制、作者與reviewer來源（必要actor只在協作登記，不公開私人對話）。沒有憑證、真實使用者輸入、無關私人資料或部署指令。
