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
