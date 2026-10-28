# 兩張圖片疊合校稿 — 既有規格保存

Task ID: `labs-53-image-overlay` · Spec ID: `spec-53-image-overlay`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 兩張圖片疊合校稿 產品規格
這是規格；實際狀態見[HANDOFF](HANDOFF.md)。

## 使用者與工作
設計改稿前後要看標誌是否位移、排版是否被改動，並排看容易漏細節。
使用者拿到：兩張同像素尺寸JPEG/PNG，以透明度疊合或差異高亮比較，提供逐像素差異統計與可下載的PNG比較圖。。核心工作在一個頁面完成，不引導去其他產品才能完成基本流程。

## 可觀察需求
- FR-01 來源與界線：各8MiB/總16MiB、8MP/4096邊、EXIF視覺方向；視覺尺寸必須相同，不暗自縮放對齊。白底flatten後RGBA 8bit比較，閾值0..255，差異判定max(absRGB)>threshold；alpha差異只按白底合成後比較。不宣稱感知相似度/鑑識/真偽，JPEG噪聲有提示。逐列分批/worker取消，generation舊畫布不復活。
- FR-02 核心結果：按[TECHNICAL](TECHNICAL.md)精確演算法產生真實結果，沒有亂數假資料、只示範不可用按鈕或隱藏缺項。數字與文字規則不能自行猜測。
- FR-03 初始空頁，明確載入標示的假例子才能出現示例。主要工作可自填與清除，出錯指向欄位並保留可修改來源，舊成功輸出立即失效。
- FR-04 使用者每次更改來源、設定、匯入/匯出模式，先同步清除已準備的結果與可下載/複製狀態。所有非同步讀取與生成帶generation，晚到結果丟棄並釋放資源。同步小量運算不顯示假取消。
- FR-05 下載是真正本地產物，固定安全ASCII檔名，不使用使用者文字組路徑。Blob URL由controller單一擁有，替換/clear/pagehide撤銷；點下載後至少容許瀏覽器接管再撤銷，最遲30秒。複製僅明確點按且成功Promise才顯示成功，拒絕有可選文字替代。
- FR-06 輸入只記憶體，無storage/history/query/network/log/telemetry/遠端資源。明確語言切換會失去本頁未匯出資料。禁止以本機處理宣稱完全安全抹除或所有裝置支援。
- FR-07 繁中與英文完整功能、錯誤、結果、FAQ對應；各自靜態index.html與en/index.html。低性能裝置安全退出，無雲端fallback。
- FR-08 鍵盤可完成核心流程，320px/200%縮放不遺失操作，所有欄位有label，狀態非僅顏色，下載/匯入確認頁內不叫OS dialog作測試。
- FR-09 文字只textContent/value；輸出HTML只固定模板escape，不執行輸入。控制字元/Unicode/大小/schema邊界見技術契約，整份拒絕不得偷偷丟壞列。
- FR-10 完成M1不等於release。M2必要browser驗收後由原對話公開GitHub，主代理hosting/雙語首頁整合，再待外部複驗。

## 精確例子
白底後[100,100,100] vs[110,100,100]，threshold10不算，9算；全同diffCount0；2x1僅1pixel不同=>50%。疊合50%各channel以Math.round((a+b)/2)。

## 非目標
無帳戶/多人同步/自動寄送/自動保存/雲端分析；不讀本機其他檔案、不接外部服務。特定格式與語意限制見TECHNICAL，不偷偷擴充。資料或來源實際消失前有相應確認（清除整個頁面可明確按清除，不假稱可復原）。


---

## 原文件 TECHNICAL.md

# 技術契約 — 兩張圖片疊合校稿
這是規格，Node24與瀏覽器原生ESM，零runtime/dev依賴，禁止npm install。正式站純靜態。

## 模組與介面
public/index.html、en/index.html、404.html、_headers、styles/app.css、js/app.mjs、js/controller.mjs、js/locales/zh-Hant.mjs與en.mjs；純核心於js/core/：image-header.mjs、pixels.mjs、geometry.mjs、session.mjs。test/*.test.mjs；scripts/check.mjs、build.mjs、serve.mjs；package.json/private/type module/engines>=24。
inspectImage(bytes)->{kind,width,height,orientation}; comparePixels(a,b,{threshold})->{changed,total,percent}; blendPixels(a,b,opacity)->Uint8ClampedArray; session reducer純函式。
核心不引用DOM、File、storage、network或console。controller擁有FileReader/bitmap/BlobURL與generation，不在核心塞副作用。

## 確定算法及資料契約
讀header後才能解碼。只接受非動畫PNG/JPEG(SOF0/SOF2)，拒無效段/尺寸/截斷/壞EXIF；每張8MiB、visual邊4096、8MP，兩張總16MiB。可研究並複製39-image-redactor已審核的原生header parser到本工具、加來源註記與測試；不能runtime依賴兄弟工具。EXIF1–8走瀏覽器from-image方向且核對visual尺寸，不再手動重轉。兩邊visual尺寸不一致即拒，讓人先用縮圖工具自行改；不默默扭曲比例。
逐張decode，白底flatten取得RGBA 8bit，bitmap立即close。白底合成按實際Canvas輸出像素，核心另有指定Math.round(color*alpha/255+255*(1-alpha/255))合成規則用於合成資料測試；真browser像素差異另驗。compare以max(absRGB)>threshold計數，ignore alpha因都已flatten；percent=changed/total*100，介面最多2位但下載保留整數counts與threshold。疊合opacity 0..100整數表示右圖占比，每通道Math.round(left*(100-p)/100+right*p/100)。差異高亮圖：相同pixel以左原像素灰階淡化（固定灰值Math.round((r+g+b)/3*0.25+255*.75)）；不同pixel設[213,38,42,255]。提供文字counts避免只靠顏色。
輸出PNG與JSON統計，PNG不嵌原檔metadata；左右圖/模式/threshold/opacity任何變更同步使舊Blob/download失效。像素work用worker或每最多100k pixels讓出event loop；cancel可中止當前generation。只保留2來源File與2pixel buffers、單結果Canvas，替換/clear/pagehide釋放；不是圖片真偽鑑定。

## 共同狀態與失效
idle→editing→running（僅async）→ready/error；來源/設定input同步revision++、停用下載/複製、清輸出；cancel終止worker/reader，晚到generation不可restore。pagehide清資源。未知exception轉固定雙語錯誤碼，不回顯raw stack或輸入。保留明確的unsupported安全退出。
可引用既有兄弟工具作唯讀研究，但本工具必須複製自己需要且經審查的模組並帶測試，不runtime import兄弟工具。

## 工具鏈
scripts/check.mjs實驗ESM語法、public靜態allowlist、雙語結構、安全禁止項；純regex只初步掃描不作安全證明。build拒symlink/junction/unknownfile，只複製public封閉清單到dist，舊未知輸出不任意刪除。serve只loopback 127.0.0.1:4233，GET/HEAD，精確MIME/path/Host與404/405，不能提供workspace。M1不啟動serve。
來源UTF8，文本匯出UTF8無BOM、JSON兩空格LF尾LF。結構化資料匯入依工具自訂exact schema與上限，危險prototype不能進object assignment。下載無公式CSV（如需報告用TXT/JSON，避免發明CSV防護承諾）。


---

## 原文件 UX-SEO.md

# 工作區與雙語SEO
這是規格，Product App模式，遵守[設計系統](docs/DESIGN-SYSTEM.md)。
左右圖選擇與尺寸始終可見，中間大比較畫布；疊合/差異按鈕旁放opacity或threshold，下面文字counts和下載。手機縱向選圖，畫布fit寬且保留100%檢視可局部捲動。

```text
桌面：工具名 / 語言 / 返回首頁
      [來源與相鄰設定] [主要工作畫布或結果]
      [欄位錯誤/限制] [明確產出動作]
手機：工具名 → 來源/設定 → 主動作 → 結果 → 匯出
```
初始「加入資料開始 / Add data to begin」；進行「處理中，可取消 / Processing, you can cancel」（只async）；空結果「沒有符合的項目 / No matching items」；invalid「請修正標示欄位，舊結果已清除 / Fix the marked fields; the previous result has been cleared」；不支援顯示必要能力與停止。單一primary action隨階段變化，禁多層等高卡片/巨型hero。真人資料不預填。
鍵盤順序依實際工作；44px觸控、兩層focus、正常字4.5:1、控制邊3:1。320px周邊重排，表格/畫布可具名局部捲動；200%/reduced motion。所有日期/數字含必要單位、結果長字容錯。labels/錯誤/id兩語對照，勿靠placeholder。

## 真實文案
繁中title：兩張圖片疊合校稿｜本機處理工具 - GlossQuote
繁中H1：兩張圖片疊合校稿
繁中description：設計改稿前後要看標誌是否位移、排版是否被改動，並排看容易漏細節。 使用 兩張圖片疊合校稿，在瀏覽器本地整理資料並取得可下載成果。
English title: Image overlay proofing | GlossQuote
English H1: Image overlay proofing
English description: Image overlay proofing in your browser. Review the result and export it locally without uploading your input.
工具說明必須以PRODUCT的完整使用情境與結果翻譯，不只翻按鈕。至少以下FAQ兩語可見：
### 能比不同尺寸嗎？
首版要求視覺尺寸相同，避免縮放造成誤差。

### Can I compare different dimensions?
Use images with the same oriented dimensions.

### JPEG會很多小差異嗎？
壓縮可能產生雜訊，可以提高閾值，但結果不是視覺品質判分。

### Can JPEG create noisy differences?
Yes. Compression can change pixels; the threshold is a filter, not a quality score.

### 照片會上傳嗎？
圖片在目前頁面處理，不送往伺服器。

### Are images uploaded?
No. Processing stays in the current page.

## Preview與正式
M1 robots noindex,nofollow，無production canonical/sitemap，不能偽造live。首頁固定https://glossquote.com/index.html / https://glossquote.com/en/index.html；切換/en/index.html及/index.html不附任何輸入。domain候選image-proof.glossquote.com，不是已部署網址。
M2/M3主代理放行後production每頁自指canonical；hreflang zh-Hant/en/x-default（fallback繁中）互返，robots/sitemap精確兩網址，title/description/H1各語，SoftwareApplication JSON-LD只寫可見真實能力無rating。CSP default-src self; connect-src none; frame-ancestors none、nosniff、no-referrer等依release契約，實際HTTP再驗。沒有analytics/font/CDN。未知路徑真404不是首頁200。


---

## 原文件 ACCEPTANCE.md

# 驗收契約
這是規格，未執行項不能預填PASS。需求對照[PRODUCT](PRODUCT.md)。
|案例|需求|輸入/步驟|精確預期|層級|
|---|---|---|---|---|
|A01 閾值嚴格|FR-01/02/04/09|[100,100,100] vs[110,100,100]|threshold10 changed0；threshold9 changed1|Node純核心/假controller；非真browser|
|A02 比例|FR-01/02/04/09|2pixel僅1不同|changed1,total2,percent50|Node純核心/假controller；非真browser|
|A03 透明白底|FR-01/02/04/09|透明黑alpha0 vs白alpha255|flatten後same|Node純核心/假controller；非真browser|
|A04 疊合|FR-01/02/04/09|[0,0,0] vs[255,255,255],p50|[128,128,128]|Node純核心/假controller；非真browser|
|A05 兩端|FR-01/02/04/09|p0/p100|逐byte等left/right|Node純核心/假controller；非真browser|
|A06 尺寸不同|FR-01/02/04/09|10x20 vs20x10|DIMENSION_MISMATCH不出圖|Node純核心/假controller；非真browser|
|A07 方向|FR-01/02/04/09|EXIF6 20x10 raw|visual10x20；不得轉兩次|Node純核心/假controller；非真browser|
|A08 上限|FR-01/02/04/09|4096x4096|PIXEL_LIMIT即使邊未超|Node純核心/假controller；非真browser|
|A09 壞檔|FR-01/02/04/09|SVG假裝.png|UNSUPPORTED_FORMAT，decoder0call|Node純核心/假controller；非真browser|
|A10 過期輸出|FR-01/02/04/09|開始decode後換來源|晚到bitmap close，結果不復活|Node純核心/假controller；非真browser|
|A11 取消|FR-01/02/04/09|處理中取消|下載disabled，既有資料可重新處理|Node純核心/假controller；非真browser|
|A12 檔名注入|FR-01/02/04/09|<img src=x onerror=1>.png|只文字，不建DOM/發請求|Node純核心/假controller；非真browser|

## 必要M1 gate
Node24+；npm test含上述精確期望且expected不可由被測實作生成。npm run check真查結構與安全；npm run build真產物；source前後hash一致，實際證據寫evidence/m1。反例須確認錯輸入拒絕且成功結果失效。所有測試假資料，不讀個人文件；不得裝套件或啟動瀏覽器。

## 必要browser/release gate（目前NOT_RUN_USER_FOCUS_INCIDENT）
- B01 兩語真實輸入→主要操作→預覽→本地下載，下載byte內容符合核心且使用者可拿走使用。
- B02 成功後改來源/設定與錯值，舊輸出立即失效；快速重選/clear/cancel不復活。
- B03 惡意文字只文字，Network完整初載/操作/隱藏/離頁、同源/cdn-cgi/rum均核對；Storage前後無使用者資料。
- B04 鍵盤完整流程、焦點不受遮擋、讀屏label/status、320px、200%、mobile真機、權限拒絕、下載/列印原生行為獨立記錄。
- B05 中文英文切換與首頁互連、正式canonical/hreflang/x-default/robots/sitemap/安全HTTP與真404。
只用主代理確認真正隔離機制，禁止CUA/hidden-IAB/桌面/native/key/IME/clipboard測試。Node假DOM/Canvas/Audio與靜態檔不能冒充B01–05。手動NOT_RUN授權不等必要release gate全免除。


---

## 原文件 TASKS.md

# B20-53 M1任務
這是完整本地候選的有界里程碑，尚未實作。原功能chat gpt-6.1-sol/max；不自行再委派。T00..T04必要前置通過即可在同輪接續，主代理結尾整合驗收。

Allowed paths（每項只在此工具）：package.json、.gitignore、public/**、scripts/**、test/**、HANDOFF.md、TASK-ENTRY.md、evidence/m1/**；dist/**僅build生成。禁止修改這六份規格/AGENTS/docs、兄弟工具、root、共享首頁/看板/舊證據；主代理不與owner並改。若規格錯誤，回報具體衝突與建議，不自行放寬。

T00 建scaffold：讀全部規格與AGENTS。建立上列package/scripts/test、最小disabled初始化雙語HTML。node --version，建立後npm test/check/build。不得引用不存在命令。check/build有反例可拒違規檔。通過後T01。
T01 核心：依TECHNICAL各純函式與ACCEPTANCE精確案例實作。只改core/test/HANDOFF證據。npm test及check。邊界先驗且不要只做happy path。通過後T02。
T02 完整UI：雙語app/controller/locales/html/css，接實際core與使用者輸入、來源編輯/預覽/清除/匯出。實作PRODUCT全部基本流程，不只顯示範例結果。Node契約與mock僅按scope記錄；browser NOT_RUN。npm test/check/build。通過後T03。
T03 輸出與競態：實作下載、匯入確認（若產品需要）、generation/cancel/cleanup、壞輸入恢復、兩語errors及FAQ，增加必要回歸。npm test/check/build。原生另待驗。通過後T04。
T04 固定候選：最終完整npm test、npm run check、npm run build對同一來源，記files bytes/SHA/actual command exit/pass/fail/NOT_RUN於evidence/m1和HANDOFF；在final回報實際修改、結果、風險和下一步，交主代理。不要只交計畫，不自己做M2。

停止條件：缺依賴/安裝/付費/憑證/未知persistent環境drift/要碰其他owner或桌面/browser，或同問題兩輪沒有進展，停止相依部分並回報；保留可獨立進行工作。長測試前後現有environment guard；所有子程序shell:false windowsHide、絕不改User/Machine PATH。

M1完成不等發布。M2主代理必要browser驗收後讓此原chat獨立public GitHub（KYStr/glossquote-labs-image-overlay），不得globalauth/config寫入且前後Gitguard；M3主代理免費部署與首頁/看板；M4外驗後原chat返工。不得自動跳階段、輪詢或冒稱全產品通過。

