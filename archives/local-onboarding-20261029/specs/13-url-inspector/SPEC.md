# 網址參數檢視與整理 — 既有規格保存

Task ID: `labs-13-url-inspector` · Spec ID: `spec-13-url-inspector`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 網址工具產品規格

這是規格，尚未實作。所有顯示、匯出與錯誤遵守 [安全](docs/PRIVACY-SECURITY.md)。

## 工作及非目標

一個工作區完成「貼入 → 檢視 → 選擇修改/移除 → 產生新網址 → 自行複製/下載」。不下載、開啟、ping、預取、解析 DNS 或展開任何輸入網址，不做來源安全或去識別化保證。不批次、不讀剪貼簿、不將內容寫入本頁 URL 或 storage。沒有 query 的網址同樣可檢視。

## 可觀察需求

- FR-01 輸入與拒絕：文字來源最多65,536個UTF-16 code units。只去除字串兩端 ASCII space(U+0020)，再拒絕內部 ASCII U+0000–0020、U+007F、反斜線及不成對 surrogate。必須是明示 http:// 或 https:// 的絕對網址（scheme大小寫可接受），URL parser 成功且 hostname 非空。原始 authority 明確定義為緊接 scheme:// 到第一個 /、?、# 之前；它必須非空，拒絕多餘slash修復路徑如 https:////@example.com。原始 authority 有 @ 或 parser 有 username/password 一律拒絕，避免接受登入憑證；不接受相對、protocol-relative、file/data/javascript/mailto。error不回顯輸入。
- FR-02 檢視：顯示原始已修剪來源與 parser 的 scheme/hostname/port/path/fragment 欄位，清楚區分「原始字串」和「瀏覽器解析值」。不把 parser 的 href 直接當輸出。國際化主機显示 parser ASCII hostname，旁邊提醒不是連結安全檢查。
- FR-03 Query列：在第一個 # 前尋找第一個 ?；query以 & 切段，第一個 = 分開key/value；保留重複key、顺序、原始大小寫/percent escapes、裸key、空片段及有無等號。空query是零列，非空query中的空片段也算一列，最多256列。界面顯示序號、原始片段、解碼名稱/值和移除選項；空片段明示，不偷偷丟棄。
- FR-04 解碼/編輯：只對query key/value按表單規則將 + 解為空白，然後嚴格decodeURIComponent。壞percent或非法UTF-8以「無法解碼，保留原始片段」表示，仍可選擇刪除，但不可編輯那列。不遞迴解碼。有效列可編輯解碼後名稱/值；只對真正變更的列重新編碼；把編輯值恢復原解碼值即恢復原始片段。值/名稱可空；編輯值禁止孤立surrogate，含換行/tab時編碼而非當HTML。全部edited Map及additions內key/value的UTF-16長度合計≤65,536（包括尚勾選移除的edited草稿），超過時保留草稿、拒絕生成，不截斷。新增列總計仍≤256。
- FR-05 選擇清理：提供「選取常見追蹤參數」按鈕，只標記解碼後ASCII不分大小寫等於 utm_source、utm_medium、utm_campaign、utm_term、utm_content、gclid、fbclid、msclkid 的列；不刪未知key、不自動全選、不推斷 token 等敏感欄位。清理在按「產生新網址」前不生效；說明簽名/驗證連結可能因任何修改失效，不承諾完全去除追蹤。
- FR-06 產生：原始prefix（?前或#前）、未修改raw query片段和fragment逐字保留；編輯/新增列用 URLSearchParams([[key,value]]).toString() 序列化，順序固定，不排序。若未做任何有效修改，輸出完全等於已修剪來源（包含空 ?）。所有原列刪除且無新增才移除 ?，保留 # 及其內容。非空保留列join('&')後保留 ?，即使只剩一個空片段。新網址再次執行FR-01及字數/列數限制，超限不截斷/不輸出部分結果。固定顯示改動列數，不宣稱改後仍有效。
- FR-07 狀態：初始空 → 檢視成功 → 草稿變更 → 產生成功。修改來源立即清空舊解析/草稿/輸出並停用複製下載，必須重新檢視；修改選項/參數立即使舊輸出失效。解析/生成失敗沒有上一輪有效結果可複製。同步有界處理，取消不適用；不加入假progress。
- FR-08 輸出/清除：明確按鈕才呼叫 clipboard.writeText；拒絕時保留可選取readonly結果並提示手動複製，不謊報成功。下載固定檔名 glossquote-url.txt，UTF-8無BOM、內容為exact輸出+一個LF；Blob URL最遲30秒回收，新結果/清除/離頁也回收。清除移除所有本工具輸入/結果、焦點回来源，不讀寫其他分頁，不聲稱OS安全抹除。
- FR-09 安全/本機：任何输入只textContent/form value呈現，不產生可點的使用者URL、HTML、資源url或動態import。腳本/追蹤/遠端字型為零；除了自家靜態資產，操作不產生網路。工作資料不入日志、storage、history、URL或語言切換連結；離頁會失去內容，語言連結旁揭露。
- FR-10 可及性/語言：兩語所有控制、錯誤、結果、說明及FAQ完整對應；320px與200%缩放功能可用，鍵盤順序清楚，每列移除/編輯有含序號的名稱，status區不每次敲字大聲宣讀。長URL用可換行或有名稱的局部捲動區域，不撐破頁面。
- FR-11 發布：依 [RELEASE](docs/RELEASE.md) 產生正式canonical/hreflang/x-default/robots/sitemap、404及headers。原始碼獨立公開，主代理驗正式部署/首頁後才可對外標「可用」。

## 說明內容

把query中的token當可能敏感資料；頁面不要求貼憑證，用假例子教學。只在記憶體處理的功能不是安全連結認證。一般瀏覽器格式化可能改hostname、default port、dot segments，所以必須同時展示原始和解析結果，不靜默以標準化輸出替換原串。


---

## 原文件 TECHNICAL.md

# 網址工具技術契約

這是規格，尚未實作；zero runtime dependencies、Node24+內建tests。檔案分層：public/index.html、en/index.html、styles/tokens.css/app.css、js/app.mjs、js/i18n.mjs、js/core/url.mjs；test/url.test.mjs、scaffold.test.mjs、release.test.mjs；scripts/serve.mjs/check.mjs/build.mjs；wrangler.jsonc及public/_headers。UI不可复制演算法。

## 純函式介面

- inspectUrl(source:string) -> {source,prefix,fragment,hasQuery,queryRaw,parsed:{protocol,hostname,port,pathname,hash},rows:Row[]}；失敗throw含固定code的ProductError，不包含raw資料。
- Row={id,index,raw,rawKey,rawValue,hasEquals,decodedKey,decodedValue,decodeError}；id如r0/r1由原順序產生，僅在本次解析有效；不可用key為物件索引。decodeError時decoded欄為null。新增row用獨立递增id，不可與舊row碰撞。
- trackingRowIds(model) -> string[]：僅固定八名稱、單次解碼、不分ASCII大小寫。
- composeUrl(model, edits:Map<id,{key,value}>, removed:Set<id>, additions:Array<{id,key,value}>) -> {url,changedRows}；不接受不存在id、重複新增id、不同型別；這是內部介面，仍測試未知id拒絕。removed優先於同id edits；刪除後編輯控制disabled。比較decoded原值相同即保留raw；additions追加，空key/value輸出 '='。changedRows = 實際刪除原列+有效修改原列+新增列數。
- parseQuery(raw) 與 serializeEditedPair(key,value) 可單獨export供test。所有介面無fetch、DOM、console、storage或Intl依賴。

## 解析及保真算法

1. 在原始source先做code-unit上限，再只trim兩端ASCII space，再做FR-01字元、authority與URL檢查。用明確scheme://位置擷取到首個/、?、#以前的raw authority，非空且無@才繼續；new URL的寬鬆slash修復不能繞過這一步。不以new URL猜scheme，不使用URLSearchParams解析整網址。
2. fragment為從第一個#開始到結尾的raw字串（包含#）；beforeHash為前段。beforeHash第一個?劃分prefix/query；prefix包含原始scheme/authority/path，連大寫scheme、default port及dot segment也保留。
3. query===''則rows=[]；否則split('&')每段列成Row，首次'='前後切分，空value與裸key可區別。先對raw key/value替換+，decodeURIComponent一次；例q=%2520得解碼%20，不是空白。任一欄decode失敗整列不可編輯，但raw保留。
4. 先驗全部edits/additions key/value碼元合計≤65536、無孤立surrogate，再以陣列順序巡訪rows：deleted跳過；未改raw原樣；modified以new URLSearchParams([[key,value]]).toString()。不得使用URL.searchParams.delete/set/sort整批重寫，避免重複key與原編碼失真。
5. 若無任何有效改動直接返回model.source。否則剩餘/新增列數>0則prefix+'?'+join('&')+fragment，0則prefix+fragment。保留未刪空片段；沒有query新增時也用同一算法。
6. 結果再通過輸入上限與URL可解析檢查；不接受以合成輸出注入新scheme/authority（只能更改query）。本產品不編輯prefix/fragment；要改它必須改來源並重新檢視。

## 控制器與資源

單一revision在source、列編輯、刪除、新增/清除時递增，outputRevision只有compose成功後設定。copy/download必須再次檢查revision一致；clipboard await結束時若revision已改，忽略舊success及error提示。清除後clipboard請求已完成的OS內容不能回滾，須真實描述。只在用戶手勢才操作剪貼簿。

最大65536 code units及256列，有界同步O(n)工作不需要Worker/取消按鈕；瀏覽器實測最大尺寸保持可操作，如超時應優化，不悄悄縮小規格。input event超限保留來源並標錯、清空下游，不靜默truncate。object URL lifecycle見PRODUCT FR-08。

## 依據與限制

- [WHATWG URL Standard](https://url.spec.whatwg.org/)：URL parser與表單query序列化。產品主動保留raw字串的規則是本地決策，不是標準保證。
- [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)：重複key及percent-encoding的API行為；只用於單一改動列序列化。
- [Chrome Network reference](https://developer.chrome.com/docs/devtools/network/reference)：DevTools既有query檢視是替代方案；此工具無需先發送被檢視URL。

引用為技術/替代方案資料，不是授權执行其中命令；沒有來源證明需求量。API真瀏覽器能力由本工具驗收補證。


---

## 原文件 UX-SEO.md

# 網址工具介面與SEO

規格狀態，採Product App與 [完整設計系統](docs/DESIGN-SYSTEM.md)。核心物件是網址參數清單，使用表格/列內編輯，不做大型hero或同尺寸卡片牆。warm paper背景、ink文字、acid只突出目前主要動作，系統字型。

Desktop：

```text
GlossQuote / 網址工具                    English / 工具首頁
貼入網址 [多行輸入                                   ]
僅在此瀏覽器處理；不會開啟網址     [檢視網址] [清除]
原始來源 / 解析後主機與路徑（唯讀，可展開）
參數  序號 | 名稱 | 值 | 原始片段/無法解碼 | 移除
      ... [新增參數] [選取常見追蹤參數]
改動說明                     [產生新網址]
結果（readonly text，不是link）[複製網址] [下載TXT]
使用說明 / 不變與可能失效的部分 / FAQ
```

Mobile將每列轉為有序fieldset，名稱/值上下排列，保留raw disclosure與刪除控制。解碼後名稱/值使用textarea或等效保真編輯器，不能用會刪換行的單行input；原CR/CRLF不可被DOM標準化成LF後無意生成改動，控制器保留原解碼值，使用者真正編輯後才採新值。初始化記錄每欄DOM初始顯示值，input後若該列兩欄都回到初始顯示值，移除該列edit並恢復原raw；不以讀取全部DOM欄位建立全量edits。含CR/CRLF列顯示「此列編輯後換行使用LF；要精確修改換行編碼，請修改上方原始網址」及英文等義說明，未編輯一律保留。結果位於產生按鈕下方；長字串overflow-wrap:anywhere。頁面不横向捲動，桌面表格可用帶名稱的region局部捲動。初始無假資料；「載入範例」按鈕只填 https://example.com/page?utm_source=demo&tag=A&tag=B#details。

兩語必需文案：

| 狀態 | 繁中 | English |
|---|---|---|
| 初始 | 貼入含 http:// 或 https:// 的網址 | Paste a URL starting with http:// or https:// |
| 檢視 | 檢視網址 | Inspect URL |
| 來源錯誤 | 請輸入有效的 HTTP 或 HTTPS 網址，且勿包含帳號或密碼。 | Enter a valid HTTP or HTTPS URL without a username or password. |
| 解碼錯誤 | 無法解碼，保留原始片段 | Cannot decode; keeping the original segment |
| 編輯草稿 | 內容已變更，請重新產生網址。 | Changes pending. Generate the URL again. |
| 有風險的改動提示 | 修改參數可能使簽名或驗證連結失效。 | Changing parameters may invalidate signed or verification links. |
| 成功 | 已產生網址，未開啟或驗證連結。 | URL generated. The link has not been opened or verified. |
| 複製拒絕 | 無法自動複製，請選取結果後手動複製。 | Could not copy automatically. Select and copy the result manually. |
| 切換語言 | 切換語言會清除目前內容。 | Switching language clears the current content. |

其餘錯誤（大小、列數、unsupported API、生成超限）也須兩語固定code字典，不能顯示raw exception。支持no-JS時清楚提示啟用JavaScript且不留下可送出資料的form。

## 靜態SEO內容（兩語各獨立寫入HTML）

- 中文 title：網址參數檢視與整理｜本機 URL 工具 — GlossQuote
- 中文 H1：網址參數檢視與整理
- 中文 description：在瀏覽器檢視網址與重複參數，選擇修改或移除追蹤參數，再複製新網址。未修改部分保留原始編碼，不會開啟輸入連結。
- English title：URL Inspector & Query Editor — GlossQuote
- English H1：Inspect and edit URL parameters
- English description：Inspect repeated query parameters, edit selected values, and remove selected tracking parameters locally. Unchanged segments keep their encoding; links are never opened.
- 各頁100–250字（英文約100–180words）的工作說明、使用步驟、格式限制，以真實功能為準，不堆疊關鍵字。
- FAQ 1：會打開或縮短網址嗎？/ Does it open or shorten links? → 不會，只有字串處理 / No, it only processes text.
- FAQ 2：為什麼 + 會顯示成空白？/ Why does + appear as a space? → query表單解碼規則；%2B才是加號 / Form query decoding uses + for spaces; %2B represents a plus sign.
- FAQ 3：刪除所有追蹤參數就安全了嗎？/ Does removing tracking parameters make a link safe? → 不保證；沒有安全掃描且可能破壞簽名 / No; there is no safety scan, and edits may break signed links.
- FAQ 4：會改變重複參數或其他編碼嗎？/ Are duplicate parameters or other encodings changed? → 原順序與未改片段保留，只重新編碼編輯列 / Order and untouched segments are preserved; only edited rows are re-encoded.

正式兩語候選/index.html與/en/index.html採self-canonical、zh-Hant/en互返、x-default指中文；WebApplication結構化資料只描述可見工具，不加假評分。回首頁為同語言 https://glossquote.com/index.html 或 /en/index.html。正式發布以前不宣稱網域可用，其他SEO/HTTP規則見 [發布契約](docs/RELEASE.md)。


---

## 原文件 ACCEPTANCE.md

# 網址工具驗收

以下皆是預期結果，尚未執行。N=Node純函式/工具鏈；B=真實Chrome與Edge；L=正式HTTP/頁面。必要純邏輯與發布gate不能用人工NOT_RUN代替；設備/讀屏人工例外必須列明，不以部分通過算整體通過。

| ID/需求 | 層級 | 輸入或步驟 | 必要預期 |
|---|---|---|---|
| U01 FR01/02 | N/B | https://example.com/a | host=example.com、0列；產生結果逐字相同 |
| U02 FR03/06 | N/B | https://EXAMPLE.com:443/a/../b?x=1&x=2#ok | 重複兩列；未改輸出逐字保留；parser hostname=example.com/path=/b，與raw分開 |
| U03 FR03/04 | N/B | https://example.com/?q=a+b&plus=%2B&space=%20&nested=%2520 | 解碼 a b、+、一空白、%20；未改URL完全保留 |
| U04 FR03/06 | N | https://example.com/?flag&x=&=v&&#f | 5列含兩空片段；未改保留全部 |
| U05 FR04/06 | N/B | ?x=%2f&x=%2F，只改第二列為a b+c（完整base使用example.com/） | 首列仍x=%2f，第二列x=a+b%2Bc |
| U06 FR04 | N | 編輯x=%2f解碼/為a再改回/ | 原raw x=%2f恢復，changedRows=0 |
| U07 FR05 | N/B | ?utm_source=a&%75tm_medium=b&UTM_CAMPAIGN=c&custom=d | 按選追蹤後僅前三列選取；尚未產生不輸出，產生後?custom=d |
| U08 FR05 | N | ?utm_id=x&token=TEST_ONLY&xutm_source=a | 三者都不自動選取；不宣称自動移除秘密 |
| U09 FR06 | N/B | https://example.com/p?a=1#fragment，刪唯一列 | https://example.com/p#fragment |
| U10 FR06 | N | https://example.com/p?、https://example.com/p?# | 未改逐字保留空?和# |
| U11 FR03/06 | N | https://example.com/?x=1&，刪x列 | 剩空片段，結果https://example.com/? |
| U12 FR04 | N/B | ?q=%GG&x=%E0%A4&ok=1 | 前兩列無法解碼、不可編輯、可刪；未改保留raw，不阻止ok列編輯 |
| U13 FR04/06 | N | 沒query的https://example.com/#f，新增key=a、value=甲😀 | https://example.com/?a=%E7%94%B2%F0%9F%98%80#f |
| U14 FR01 | N/B | javascript:alert(1)、//example.com、example.com、data:text/plain,x | 固定錯誤且所有複製/下載無效 |
| U15 FR01 | N/B | https://user:pass@example.com、https://@example.com、https:////@example.com、https:///example.com | 全部拒絕，不在錯誤/console重顯帳密；new URL修復不能繞過raw authority非空規則 |
| U16 FR01 | N | 控制字元、反斜線、孤立surrogate、來源兩端ASCII spaces | 前三種拒絕；後者只修剪兩端spaces；原始source上限仍先檢查 |
| U17 FR01/03 | N/B | 65536/65537 code-unit網址、256/257 query segments | 各边界接受/拒絕；不截斷，新增/生成後也受限 |
| U18 FR06 | N | edits/removed含未知row id或重複新增id | 拒絕，沒有部分結果 |
| U19 FR07 | B | 產生A → 改來源/一個欄位/勾選移除 | 舊輸出立即清空/停用；重新產生才可copy/download |
| U20 FR08 | B | 真實copy；拒絕剪貼簿或不支援；清除 | 只有成功才顯示成功；fallback可選文字；清除所有本工具資料 |
| U21 FR08 | B | 下載含中文/emoji網址 | 本機實際TXT bytes為UTF-8輸出+LF、無BOM、固定檔名；不只檢查Blob mock |
| U22 FR09 | N/B | query解碼後為<img src=x onerror=...>、__proto__ | 只當字串，無執行/隱藏載入/物件prototype污染 |
| U23 FR09 | B | 真Network/Storage，輸入→產生→copy/download→隱藏/重回→清除 | 沒有工作內容上傳、beacon、storage；ResourceTiming只是輔證，無法捕獲完整Network須NOT_RUN |
| U24 FR10 | B | 两語、鍵盤全流程、320px/200%、最大輸入、decodeerror | 控制可達、文字不裁切、非色彩唯一提示、兩語功能同等 |
| U25 FR10 | B | zh↔en/Home navigation | href同語系，工具內容不入link/hash/query；切換清除有揭露 |
| U26 FR11 | N/L | production及preview build、404、MIME/headers/robots/sitemap | 符合RELEASE，未授權source不混入dist；正式自行實測HTTP |
| U27 FR04/06 | N/B | ?q=a%0Ab%09c及?q=a%0Db%0D%0Ac；先檢視未編輯，再編輯其他列 | 未編輯列的raw輸出逐字保留；換行/tab顯示不丟字、不被單行input去除；只編輯本列時才按新值重新編碼 |
| U28 FR04/06 | N/B | edited/additions鍵值合計65536/65537碼元 | 65537在序列化前拒絕且不截斷；65536仍需符合最終URL長度，編碼後超限也拒絕 |

另外以≥100組有界假輸入檢查未變更identity；同一組重複key的單列編輯不改其他rows。這是有意義的不變量，不只把實作輸出複製到expected。不得用隨機生成無預期斷言取代具體案例。


---

## 原文件 TASKS.md

# 網址參數檢視與整理任務佇列

目前全部未開始。每項先聲明範圍/非目標/驗收，通過後才進下一項；同一turn可持續完成就緒項。所有任務共通允許本工具HANDOFF.md、project.json狀態、docs/RELEASE-CANDIDATE.md與dist生成物；證據/發布副本以TASK-ENTRY為界。失敗在原owning task修正，不能更動別人的工具。

## T00 靜態骨架與開發工具

- 前置：讀入口/契約，檢查現狀與Node24，持久環境guard。
- allowed：package.json、必要package-lock.json（零deps可不建）、.gitignore、public/index.html、public/en/index.html、public/styles/**、public/js/app.mjs、scripts/serve.mjs/check.mjs/build.mjs、test/scaffold.test.mjs。
- 實作：原生ESM兩語停用預覽骨架、public-only loopback server、真check/build/test；noindex/no remote assets。安全server拒絕穿越/hidden/symlink、只GET/HEAD、404正確，build先驗內容再只更新本工具dist，不能清root。
- 驗收：npm test覆蓋server allow/deny、404/MIME/HEAD/405及copy隔離，npm run check，npm run build；記錄命令/exit。非目標：此步不是核心產品與正式SEO。

## T01 純邏輯與精確案例

- 前置：T00 PASS。
- allowed：public/js/core/url.mjs、test/url.test.mjs，必要test假fixture與PRODUCT/TECHNICAL/ACCEPTANCE中的明確勘誤（不改需求）；scripts/check.mjs只加入新模組實際檢查。
- 實作：TECHNICAL API及固定error codes，對照U01–U18、U22與identity不變量，無DOM/network，輸入不mutation。
- 驗收：npm test、npm run check；每個error/邊界/不變量有獨立expected，不用被測函式計算expected。失敗先修T01，不進UI假成功。

## T02 雙語互動工作區

- 前置：T01 PASS。
- allowed：public/**、test/ui-contract.test.mjs（如必要）、本工具UX-SEO及相關core/test缺陷。
- 實作：按UX設計兩語完整UI、真實成功/錯誤/空狀態、所有草稿變更使舊結果失效、keyboard/focus、copy拒絕fallback、native TXT下載及ObjectURL清理、清除。使用textContent/value，不用innerHTML；不加入無需求的功能。
- 驗收：npm test/check/build；真Chrome及Edge執行主要/錯誤/舊結果/清除/複製/實際下載；320px/200%實測。Node UI靜態檢查不可代替瀏覽器；不能跑的項目標NOT_RUN給主對話補，不虛報。

## T03 邊界與隱私驗收

- 前置：T02功能可測。
- allowed：本工具public/**、test/**、scripts/**與docs/TEST-RESULTS.md；只修ACCEPTANCE範圍相關缺陷。
- 實作：對照全部案例、最大輸入、惡意字串、真Network/Storage/頁面hidden與回復、輸出race。若工具缺少完整Network觀測，記錄精確缺口，不以CSP/ResourceTiming冒充。
- 驗收：受影響自動gate，真瀏覽器案例逐條PASS/FAIL/NOT_RUN附版本/輸入/觀察/證據。必要gate缺口交主對話補完，不靜默跳過；明確允許人工待驗者可列在候選包，但未達完整驗收不叫MVP全過。

## T04 正式發布工具鏈與SEO

- 前置：T03無未處理必要FAIL；待補人工觀察保持可見。
- allowed：scripts/build.mjs/check.mjs、test/release.test.mjs、public/**的staticSEO/404/headers、wrangler.jsonc、package.json scripts、docs/RELEASE.md。
- 實作：按RELEASE固定origin的production/preview build、self canonical/zh-Hant/en/x-default、sitemap/robots、靜態安全headers、雙語首頁互連、strict404、可重現資產清單。首次做Workers配置讀適用官方/skill，保持免費靜態託管，不server運算。
- 驗收：npm test/check、npm run build、npm run build:production、npm run check:production；preview仍noindex，prod URL/meta/header/content精確匹配，絕不出包personal/docs/tests/node_modules；本步不執行正式deploy。

## T05 公開GitHub與候選交接

- 前置：必要自動gate及可執行瀏覽器gate通過，人工缺口明列且不假稱全通過。發布完整可用候選，不公開空骨架當成完成品。
- allowed：本工具README/HANDOFF/project.json/docs/**、必要發布manifest產生腳本，專用發布副本及證據；不修改根repo或其他工具。
- 實作：reviewed source copy、明確allowlist/secret檢查、只包含本工具source及必要文件；使用既有gh授權建立/更新指定PUBLIC repo，不force。核對remote commit/publicity與fixed source ZIP hash；必要node_modules/dist私人證據都不公開。
- 驗收：讀remote visibility/HEAD，發布copy與對應source檔hash一致；記docs/RELEASE-CANDIDATE含命令/版本/所有未驗/正式候選網址。記READY_FOR_INTEGRATION（有必要blocker則BLOCKED），主對話read actual files再部署；不得自己修改首頁/讀token。

## T06 原對話修正與發布配合

- 前置：主對話/使用者提供具體驗收回報。
- allowed：回到缺陷的T00–T05 owning paths，只處理原需求修正；相關文件、測試與source publication一併更新。
- 驗收：重現原失敗→修正→受影響regression→GitHub固定新commit→主對話部署/正式複驗→外部確認。未獲使用者/驗收者確認前不是產品「完成」，也不把主對話等待誤寫成缺使用者發布授權。

