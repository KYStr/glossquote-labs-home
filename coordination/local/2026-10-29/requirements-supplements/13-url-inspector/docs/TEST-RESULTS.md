# URL Inspector 本機驗收紀錄

日期：2026-10-12（Asia/Taipei）。THREAD-13-url-inspector；本機候選，非正式上線/外驗通過。原規格案例是預期；此文件才是實際結果。

## 環境、命令與證據

- Windows / Node24.14.0 / npm11.9.0；Chrome、Edge 均透過 browser extension CUA 新建專用 tab，未操控其他工具分頁。
- 安裝檔版本 metadata：Chrome154.0.8037.98、Edge154.0.4258.62；沒有另取正在執行程序的 UA/version，因此不把安裝版本當獨立 runtime 身份證明。
- npm test：23/23 PASS exit0；npm run check、build、build:production、check:production：PASS exit0。
- Preview assets manifest SHA256：a02bafc8e4fea8368aae06237c33b37922c22b3294cfd247d5979afab86f3e0c；production：3fecc39bd421b2729315149f585840f751f6394fd461585fcf6a2688ea1650f3。
- 私人測試證據保留於孵化器根 `.runs/url-inspector/`，不放入 source copy：final-test-01.log、browser-evidence-01.json、native-download-evidence-01.json、native-download-{chrome,edge}-01.txt、chrome-320-01.jpg、edge-320-01.jpg、chrome-desktop-01.jpg、t00-audit-regression-01.log及固定hash/fixtures。
- Chrome 320 override有效client/scrollWidth=305/305；Edge320 override有client/scrollWidth=244/244，無横向頁面溢出。Edge精確CSS320校準仍待補。桌面Chrome1200 override已目視。圖片只作視覺證據，不代替操作斷言；Edge圖片是較早fixture狀態，不作新增參數fixture的截圖證明。

## 案例逐層結果

N = Node；B = 真瀏覽器操作/DOM或實際系統輸出；L = 正式站。N-PASS不能替代B/L。

| 案例 | N | Chrome / Edge B | 實際觀察 |
|---|---|---|---|
| U01 | PASS | PASS / PASS | 無query，原樣生成 |
| U02 | PASS | PASS / PASS | 重複列与原串保留；Node另驗parsed正規化 |
| U03 | PASS | PASS / PASS | a+b、%2B、%20、%2520只解碼一次 |
| U04 | PASS | 不要求B | 裸key、等號、兩個空段共5列 |
| U05 | PASS | PASS / PASS | 第二列a b+c→a+b%2Bc，首列%2f不改 |
| U06 | PASS | 不要求B | edit回原值恢复raw、changedRows=0 |
| U07 | PASS | PASS / PASS | 只前三列被標移除；未生成結果為空，生成custom=d |
| U08 | PASS | 不要求B | 未選utm_id、token、xutm_source |
| U09 | PASS | PASS / PASS | 唯一列刪除去?但保留fragment |
| U10 | PASS | 不要求B | 空? / ?# identity |
| U11 | PASS | 不要求B | 留一空段結果仍有? |
| U12 | PASS | PASS / PASS | 前兩錯誤列disabled，可改第三列而raw不變 |
| U13 | PASS | NOT_RUN / PASS | 英文新增a=甲😀，得到精確UTF-8 percent字串 |
| U14 | PASS | PASS / PASS | 四種非HTTP格式拒絕；輸出空、copy/download disabled |
| U15 | PASS | PASS / PASS | 帳密、空authority/extra-slash recovery拒絕，error未回顯帳密 |
| U16 | PASS | 不要求B | 全字元/ASCII trim/surrogate固定錯誤 |
| U17 | PASS | PASS / PASS | 65536/65537來源、256/257列；超限草稿完整保留 |
| U18 | PASS | 不要求B | 未知id、重複id、錯型別、model篡改拒絕；input不mutation |
| U19 | 控制器PASS | PASS / PASS | source/field/removal清空舊結果，匯出停用 |
| U20 | 控制器PASS | PARTIAL / PARTIAL | 真copy後readText等於假fixture；清除全部工具資料。實際拒絕環境NOT_RUN；拒絕/race由Node獨立測 |
| U21 | Blob輔證PASS | PASS / PASS | 真原生檔均38bytes，UTF-8 raw「https://example.com/甲?q=😀#範例」+LF，無BOM |
| U22 | PASS | PASS / PASS | 惡意decoded值僅textarea字串，img數0、__proto__非物件索引；完整Network另見U23 |
| U23 | Source/控制器輔證 | NOT_RUN / NOT_RUN | 沒有完整Network/Storage觀測能力，不能以CSP/ResourceTiming代替；hidden回復也未完成觀測 |
| U24 | 靜態契約PASS | PARTIAL / PARTIAL | Tab由來源到inspect，Enter可inspect/add/generate；mobile reflow與大輸入可操作。完整keyboard遍歷/200%/AT/實體touch未驗，Edge320CSS需校準 |
| U25 | 導覽契約PASS | PASS（switch/back） / href輔證 | Chrome切語及返回內容空；兩語同語home固定href，不帶工作內容；正式home click L未驗 |
| U26 | PASS | L NOT_RUN | preview/production正確meta、404/MIME及manifest。local HTTP不冒充Cloudflare正式headers |
| U27 | PASS | PASS / PASS | LF/tab與CR/CRLF字元標記，改其他列保留raw；恢復初始DOM值亦恢復raw |
| U28 | PASS | PASS / PASS | 含removed的edited碼元65536可生成；65537拒絕且不截斷 |

原生下載的自動download event兩次timeout；沒有把它算成功。依操作時序辨識到Windows兩個新檔，再驗bytes與建立時間：Chrome 02:56:49Z、Edge02:57:01Z；SHA256皆cf0d1c1a0c9f3b003ad1dfc8be238070250e3de3bc357591385add71e72cab59。Suggested name固定glossquote-url.txt，Edge已存在同名時瀏覽器自加(1)。檔案保留，沒有刪他人下載。

## 必要補驗與限制

沒有未處理的已知必要FAIL。下列NOT_RUN不可宣稱通過：完整Network requests/payloads（含cdn-cgi/rum注入）及Storage；hidden/回復；真實permission denied/晚到clipboard；校準200%和Edge320CSS；完整鍵盤/讀屏/實體touch；Cloudflare正式URL/headers/404、首頁兩語與外部複驗。Chrome原生ctrl+plus沒有可證縮放改變，故200%寫NOT_RUN。主對話可在獨立驗收/正式驗收補足，保留結果來源。

T00外部scope修復另4個負向回歸PASS：hardlink拒絕且outside sentinel不變、stale dist拒絕、有效HTML tokenizer/resources/robots檢查、ancestor junction check/server拒絕。主對話已在固定snapshot獨立驗此批4/4與build，以及T01 14個測試及2個獨立case通過；這不是其他B/L門檻放行。

開發server為本對話PID67404/port4193，UI資產即時讀public；它啟動早於最後工具鏈修正。最終serve行為由新import的隔離HTTP測試驗證。需要啟動最新版請使用新OS空閒埠，不重啟/終止其他工作。

## 語言提醒修復補驗

AUDIT-13-LANGUAGE-DISCLOSURE已修：hint移至兩語header語言link下方，保持唯一ID與aria關聯。兩個真瀏覽器reload後，DOM geometry皆link y68 / hint y112 / distance0 / header內 / hintCount1；requested320視窗scroll/client分別305/305及244/244，無横向溢出。Tab能離開語言link，Chrome來源焦點可見雙層ring。證據language-disclosure-01.json與language-disclosure-chrome-320-01.jpg；這不補200%或Edge精確CSS320校準。

修後ui-contract.test 1/1、check、build、build:production、check:production皆exit0 / PASS，其他未變23-test結果沿用。最新preview manifest SHA256 9f41deb95a1444d975d75ab1f641d3e5bdbf53148a7678a094a7870e8748a17e；production be2871abc81b6c7bc2aaa2c5373c45d0a7b27b0aace439faee85152b540b2130。上方a02b/3fec...是修前歷史，非本次發布產物。

## AUDIT-13-SOURCE-ZIP 與補驗更正

舊ZIP352394...未對Git bytes逐檔驗證，主代理發現封裝CRLF轉換（.gitignore 49bytes vs remote44）。本輪獨立remote tree核對確認舊43檔全部bytes不符；舊ZIP可交付PASS撤回，保留檔案失敗歷史。來源commit/SOURCE-MANIFEST無錯。新包`.runs/url-inspector/url-inspector-source-c5f21708-lf-02.zip` SHA0df8cb23e000d153c73ed238b02c179f7a126a7ae8d83ea4d5a41bb84141c308，單次-c core.autocrlf=false輸出；解壓42/42manifest及43/43remoteblob/size匹配。實際ZIP的npm check/build:production/check:production皆exit0，12 assets、manifest be2871abc81b6c7bc2aaa2c5373c45d0a7b27b0aace439faee85152b540b2130。證據zip-audit-results-02.json与stage/logs，不改主代理stage，不重跑未變核心。

額外Chrome鍵盤補驗：逐項Tab/Enter/Space及typing完成source→inspect→edit/remove/raw disclosure→add/delete draft→tracking→generate；output符合expected。剪貼簿工具讀取兩次都未等於expected，UI已報已複製，未建立原因，明列VERIFY_FAIL/PARTIAL（不是已確定產品缺陷，不能宣稱全鍵盤PASS）；依主代理指示優先ZIP修復而停止，download/反向Tab到clear未完成。用直接鍵盤clear留下空專用tab；私證keyboard-supplement-partial-01.json。其他已驗fixture不能替代此補驗；請主代理独立核對clipboard工具/共享剪貼簿或實際產品原因。

## 主代理正式站與首頁補驗來源

2026-10-12主對話報告及其外驗包00-STATUS/browser-observations已讀。本功能對話沒有重新操作正式站，以下數字由主代理親測：工具11公開assets/30HTTP bytes/headers/MIME/SEO/404/UA PASS；Chrome兩語追蹤移除、raw/重複順序保留、source舊結果失效、兩語canonical對JSON-LD url/inLanguage與同語首頁往返PASS；DOM無額外analytics script只作DOM範圍。工具version b0af355e-a06b-4ce7-b72d-5d4f28ca15d0、實作c5f21708、manifest be287...。

首頁PUBLIC source3cc725927fd9b60983f771b824223d6f5fa1d325、Cloudflare22519ef6-ed78-4fab-bf76-d8a8c3f13425；主代理12/12 tests/check/build/dryrun、5公開assets/21HTTP與雙語11工具入口/同語往返PASS。沒有重驗其他10款原有工具的全部功能。

主代理另外讀到本對話clipboard補驗VERIFY_FAIL後，正式Chrome用同50字expected/fake baseline分别click及Enter複製，再於success後同batch讀值，兩輪exactmatch、非baseline、length50。該有界重驗PASS；完整原键盤鏈及根因仍未確認，舊失敗觀察不刪/不改。完整Network/Storage/hidden-return、校準320/200%、permission拒絕/完整競態/AT/實體touch及外部確認仍保留NOT_RUN/PARTIAL。正式本輪native下載未重做，沿用同Git runtime既有真下載證據。

整體發布狀態已上線，待外部複驗；不標產品complete。不新增產品修正、不重跑未變suite。
