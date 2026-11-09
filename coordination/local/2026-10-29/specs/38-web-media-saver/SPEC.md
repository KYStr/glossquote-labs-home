# 網頁影音下載助手 — 既有規格保存

Task ID: `labs-38-web-media-saver` · Spec ID: `spec-38-web-media-saver`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求

使用者工作：把可取得的影音連結保存成檔案，或只留下聲音。一般流程是貼連結 → 選原檔／WAV → 開始 → 下載。也提供本機檔案入口。

**決策已確認：完全網頁、媒體處理留在使用者瀏覽器，接受縮小到可直接讀取來源。** 不採便攜助手、伺服器代理、擴充或自動執行下載檔。

[WEB-M1](docs/WEB-M1.md) 是本輪完整且優先的產品及驗收契約。原檔 32 MiB、音訊輸入 16 MiB／120 秒；WAV 輸出是真正 PCM 音訊。可用來源受 CORS／codec 影響，不承諾各大平台作品頁通用。原網址來源會看到請求，GlossQuote 不代理媒體。本機模式不傳檔案。

[架構比較](docs/EXPERIENCE-OPTIONS.md) 保留當時比較，現已選 C。[舊 M0 技術核心](TECHNICAL.md) 與其已發驗收 ZIP 保留，不變成這個產品的支援宣稱。


---

## 原文件 TECHNICAL.md

# 技術契約

> **2026-10-22 已定案：採用 C，完全網頁、全部本地，只處理瀏覽器可直接讀取的來源。現行實作與驗收以 [WEB-M1](docs/WEB-M1.md) 為準。舊便攜助手／等待選擇段落是歷史，不再執行。**

2026-10-22體驗修訂以[最新要求](docs/EXPERIENCE-REQUIREMENTS.md)為優先。M0核心API不變；下方M1便攜／本地架構屬候選，尚不能在三路線取捨確認前直接實作。任何路線都不能要求使用者手動解壓或清任務暫存。

## 階段與檔案

M0 Node24+ ESM內建模組，無套件安裝、無網路。原對話建立：`src/core/url.mjs`、`src/core/plan.mjs`、`src/core/controller.mjs`、`src/core/errors.mjs`、`test/*.test.mjs`、`test/fake-adapter.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、package.json。check以node --check檢查所有ESM、package scripts/依賴封閉範圍及公開API；build把閉合core allowlist封存dist-core與manifest，不能加UI或假production。不讀/改其他工具。

## URL契約（M0）

`classifyUrl(raw: string)` 回傳 `{ok:true, platform, canonicalUrl, contentId, kind:'item'|'short-link'}` 或 `{ok:false,code}`。平台枚舉youtube/vimeo/bilibili/tiktok/instagram/facebook/x/soundcloud。code固定：INVALID_INPUT、URL_TOO_LONG、URL_INVALID、SCHEME_UNSUPPORTED、CREDENTIALS_NOT_ALLOWED、PORT_NOT_ALLOWED、URL_UNSUPPORTED。

先確認string與原始length<=2048；trim首尾一般空白後，剩餘不得含Unicode Cc/Cf、空白、反斜線，URL解析不能代替這一步。只HTTPS，預設443允許canonical成無port；拒絕username/password、未知domain、fragment以外的未知語義。fragment不屬首版區段選取，捨棄。不利用decode後的文字創造新host。

固定支援識別路由（只語法，不取資料）：

| 平台 | hostname／路徑 | canonical與query |
|---|---|---|
| youtube | youtube.com/www.youtube.com/m.youtube.com `/watch?v=ID`、`/shorts/ID`、`/embed/ID`；youtu.be `/ID` | ID=[A-Za-z0-9_-]{11}；統一https://www.youtube.com/watch?v=ID。v只能1個；watch要求v，其他route禁止v。容許捨棄si,feature,t,start,utm_source,utm_medium,utm_campaign；list/index明確拒絕整個URL，不默默下載錯選內容。其他query拒絕。 |
| vimeo | vimeo.com/www.vimeo.com `/數字`；player.vimeo.com `/video/數字` | 數字1–12碼；統一https://vimeo.com/ID。只允許utm_source/utm_medium/utm_campaign，h等未知語義拒絕。 |
| bilibili | bilibili.com/www.bilibili.com `/video/BV加10英數`可尾斜線 | ID大小寫原樣保留；統一https://www.bilibili.com/video/ID；p僅省略或單一1，>1暫不支援；spm_id_from/vd_source/share_source可捨棄。 |
| tiktok | www.tiktok.com/tiktok.com `/@名稱/video/數字`；vm.tiktok.com或vt.tiktok.com `/短碼/` | 名稱[A-Za-z0-9_.]{1,32}，數字1–25碼；短碼[A-Za-z0-9]{1,32}。作品canonical www.tiktok.com保留路徑；短連kind=short-link/contentId=短碼，不追redirect。query僅_is_copy_url/is_from_webapp/sender_device/utm_source/utm_medium/utm_campaign可捨棄。 |
| instagram | instagram.com/www.instagram.com `/p/碼/`或`/reel/碼/` | 碼[A-Za-z0-9_-]{1,32}，canonical www.instagram.com，保留p/reel並單一尾斜線；igsh及utm_source/utm_medium/utm_campaign可捨棄。 |
| facebook | facebook.com/www.facebook.com `/reel/數字/`或`/watch/?v=數字` | 數字1–25碼；watch精確一個v，reel禁止v；canonical www.facebook.com，reel保留路徑尾斜線，watch保留v。只額外容許mibextid及三個utm欄位。fb.watch首版不識別。 |
| x | x.com/www.x.com/twitter.com/www.twitter.com `/名稱/status/數字` | 名稱[A-Za-z0-9_]{1,15}，數字1–25碼；canonical https://x.com/名稱/status/ID；s/t及三個utm欄位可捨棄。 |
| soundcloud | soundcloud.com/www.soundcloud.com `/作者/曲目` | 兩段[A-Za-z0-9_-]{1,100}；拒sets,discover,search,stream等非作品保留路由；canonical https://soundcloud.com/作者/曲目；si/utm_source/utm_medium/utm_campaign可捨棄。 |

tracking欄位可重複後捨棄；作品欄位重複即使相同也拒絕。除明列可尾斜線外，可接受一個尾斜線再正規化，禁止多餘路徑、空段、percent encoded path、dot segment（解析前拒絕/./與/../，含%2e變體）、URL whitespace正規化造成隱式合法。URL host大小寫可正規化；host尾點拒絕。M0不識別任意媒體直鏈，不能用副檔名斷言安全可下載。

## 輸出計畫（M0）

`makePlan(options)`：只有資料物件exact `{kind:'video'|'audio',format:'source'|'mp3'}`；拒unknown keys、accessor、array、非plain原型（Object.prototype或null接受）。預設由呼叫者明確傳入，函式不猜。合法video/source與audio/mp3。輸出 `{kind,format,maxHeight:720|null,maxBytes:1073741824,maxDurationSeconds:3600}`；audio的maxHeight=null。拒絕其他組合，錯誤固定OPTIONS_INVALID，不含輸入。不得拼命令。

## 任務控制器（M0）

`createController({adapter,onState,cancelTimeoutMs=1000})`；所有timers/transport只注入fake測試。API `start({url,options})`、`cancel()`、`clear()`、`getState()`。若需自訂scheduler來做確定性逾時測試，可增加已記錄注入介面；不可改產品行為。輸出快照不得暴露可修改內部物件。

adapter契約：`inspect({jobId,url,signal})→Promise<metadata>`；`download({jobId,metadata,plan,signal,onProgress})→Promise<artifact>`；`verify({jobId,artifact,plan,signal})→Promise<{ok:true,artifactId}>`；`stop({jobId})→Promise<void>`，只在stop resolve後能稱該代已終止。M0 metadata/artifact只是假資料，不能把結果當真平台；adapter接口受信任但輸出仍驗code/有限數字與資料shape，onState錯誤不得造成未清理或重入破壞。state只保存status/jobId/progress/result/error必要資料，不回原URL。result僅artifactId，不回任意路徑。

start驗URL與plan後分配遞增generation，忙碌回BUSY且不得多叫adapter；inspect/download/verify逐步。錯誤清result、status=failed固定code；非固定error映射OPERATION_FAILED，明確STOP失敗CANCEL_UNCONFIRMED。驗證false/malformed不可complete。任務中取消，abort signal、遞增失效代次但保留待停止jobId，等stopack；舊success/error/progress永遠不能改當前狀態。pending stop逾cancelTimeoutMs（預設1000ms）轉blocked；stop後來成功可回cancelled（或clear的idle），不得自動重啟；stop reject保留blocked，重複cancel可要求同jobId再次stop，不新啟任務。已cancelled/idle重複cancel不叫adapter。完成後clear移除結果但不刪真輸出。避免unhandled rejection與永不釋放timer。

progress只接受非負safe integer downloadedBytes、totalBytes=null或>=downloadedBytes正safe integer；total=0/小於downloaded/NaN拒絕或忽略，禁止負數／>100%。完成之後progress失效；artifact verify才設定100%或成功，不以progress當完成。

## M1設計約束（尚未核准執行）

公開站保留靜態頁；真正工作UI由便攜助手的loopback同源提供，不做遠端網站跨origin控制本機API。Host精確127.0.0.1和實際port、Origin/Fetch Metadata/方法/content-type/CSRF保護、session無持久cookie、無跨originCORS；不能認為loopback就可無驗證。產品session能力值由程式持記憶體，不進log或chat。

引擎候選yt-dlp，音訊抽取/合併候選FFmpeg/ffprobe，YouTube可能需要EJS/JS runtime；全部待固定來源、版本、hash與分發授權確認。禁讀使用者config/plugins/browsercookies/proxyenv、禁自動下載remote components/自更新。不得把工程Agent在本機有工具視為一般使用者已安裝。

native process只固定exe及argv、stdin/stdout封閉schema與大小上限、timeout及精確子樹清理；沒有shell或使用者自訂args。FFmpeg只處理本session已下載的本地檔案、限制協定，不讓它任意取URL。每一次extractor/CDN/redirect的對外請求須檢查實際連線目的，阻擋localhost/private/link-local/metadata/IP字面值與DNS重綁；只在輸入host白名單不等於全下載管線防護。具體可落實邊界是M1必要spike，無法做到就停，不靠文件聲稱安全。

一次下載/轉碼，明確磁碟與時長預算；輸出安全basename、避免Windows裝置名、ADS、traversal、symlink/reparse與覆寫。暫存只專屬session；完成後原子move或copy核對後公布。不加遙測，錯誤code與平台枚舉可記，原網址/標題/個資/媒體/帳密不進診斷。平台實測需獨立證據，fake結果不可代替。


---

## 原文件 UX-SEO.md

# 網頁體驗與雙語 SEO

現行範圍以 [WEB-M1](docs/WEB-M1.md) 為準；surface mode 為 Product app，使用 [家族設計系統](docs/DESIGN-SYSTEM.md)。任務畫布居中，來源和原檔／WAV 選擇先呈現，限制／隱私簡短放在操作旁，完整說明於下方。

繁中 `/index.html`、英文 `/en/index.html`。第一頁可直接操作，不另下載助手；本機檔案是明確替代入口。取得階段呈現真實 bytes，無可靠總量不顯示假百分比。結果顯示格式／bytes／WAV 時長，下載按鈕不宣稱已存到磁碟。取消解碼中等待真實停止，來源改變立即清舊結果。

文案說明：支援直接媒體連結且來源允許網站讀取；作品頁、登入、直播、playlist、DRM 不支援；WAV 未壓縮所以可能較大。不可使用「全平台」「免授權自動下載」或未經測試的相容承諾。

候選 noindex，正式才啟用 exact origin canonical、zh-Hant／en／x-default、sitemap／robots。兩語返回對應語言首頁。SEO 結構化資料與可用功能一致，不放評分、假安裝／下載計數。原生選檔／保存、真機和未測瀏覽器照實保留待驗。


---

## 原文件 ACCEPTANCE.md

# 驗收

> **2026-10-22 已定案：採用 C，完全網頁、全部本地，只處理瀏覽器可直接讀取的來源。現行實作與驗收以 [WEB-M1](docs/WEB-M1.md) 為準。舊便攜助手／等待選擇段落是歷史，不再執行。**

M0只離線假資料。M1起須新立隔離與授權來源真實下載紀錄，不能直接沿用11/12已受阻結果。以下輸入都是語法用合成識別碼，不請求真平台。

| ID | 輸入／動作 | M0精確預期 |
|---|---|---|
| AC01 | https://youtu.be/abcdefghijk?si=demo&t=10 | youtube,item,abcdefghijk；canonical https://www.youtube.com/watch?v=abcdefghijk |
| AC02 | https://www.youtube.com/watch?v=abcdefghijk&v=abcdefghijk | URL_UNSUPPORTED；重複identity拒絕 |
| AC03 | https://youtube.com.evil.test/watch?v=abcdefghijk | URL_UNSUPPORTED，零adapter呼叫 |
| AC04 | http://youtube.com/watch?v=abcdefghijk；https://u:p@youtube.com/watch?v=abcdefghijk | SCHEME_UNSUPPORTED；CREDENTIALS_NOT_ALLOWED |
| AC05 | 字串長2049；object；內部LF／U+200B；反斜線；非443port | URL_TOO_LONG；INVALID_INPUT；URL_INVALID；URL_INVALID；PORT_NOT_ALLOWED |
| AC06 | https://player.vimeo.com/video/12345?utm_source=demo | https://vimeo.com/12345；item |
| AC07 | https://www.bilibili.com/video/BV1234567890?p=1；p=2 | 第一個canonical去p；第二個URL_UNSUPPORTED，不默默改分P |
| AC08 | https://vm.tiktok.com/AbC123/ | tiktok,short-link,AbC123；不展開redirect |
| AC09 | https://instagram.com/reel/AbC_123/?igsh=x | instagram,item,AbC_123；canonical https://www.instagram.com/reel/AbC_123/ |
| AC10 | https://facebook.com/watch/?v=12345；https://twitter.com/demo/status/12345?s=20 | facebook保留watch的v；x canonical https://x.com/demo/status/12345 |
| AC11 | https://soundcloud.com/demo/track；https://soundcloud.com/demo/sets/a | 第一個item；第二個URL_UNSUPPORTED |
| AC12 | https://youtube.com/watch?v=abcdefghijk&list=123；未知query secret=abc | URL_UNSUPPORTED，不回原輸入／secret |
| AC13 | video/source；audio/mp3；video/mp3；audio/source；額外key／getter | 前兩個固定limits計畫，audio maxHeight=null；其餘OPTIONS_INVALID，getter不執行 |
| AC14 | inspect→download→verify成功 | 狀態依序，只有verify成功才complete；artifactId來自verify，非download |
| AC15 | active時再次start | BUSY；fake adapter只一份工作 |
| AC16 | cancel後尚無stop ack；過期download resolve | 保持cancelling、晚回丟棄、無result；stop成功才cancelled |
| AC17 | stop不回、逾時、晚到stop成功 | blocked/CANCEL_UNCONFIRMED、不能start；同job ack晚到後cancelled可重試 |
| AC18 | stop reject、重複cancel retry | blocked；再呼叫stop同jobId，ack後才解除；不得新建下載 |
| AC19 | clear忙碌／complete後clear／cancelled重複cancel | 忙碌先確認stop後idle；complete清結果回idle不刪輸出；多次cancel冪等 |
| AC20 | 舊job progress/error在重試後抵達 | 新代狀態完全不受影響 |
| AC21 | total=null、NaN、0或小於downloaded | 未知不顯示百分比，無效拒絕/忽略，不出NaN／Infinity／超100% |
| AC22 | malformed verify回傳、下載throw含URL | 不complete；固定錯誤code；state/log不包含URL／stderr |
| AC23 | frozen input、取回state後外部修改、onState throw | 不改呼叫者輸入，不破壞內部狀態；callback錯誤不漏取消清理 |
| AC24 | 程式各pure核心import／tests／check／build | 無外網、runtime dependency、系統設定或UI；dist-core閉合清單+hash |

主代理另用獨立手寫expected與fake adapter複驗URL混淆、路徑正規化、query意義、取消晚回／恢復。不要只把實作函式結果當expected。不為數量寫鏡像測試。

M1必須新增：固定binary/license/manifest完整性；實際ffprobe正負樣本；大檔串流上限、總磁碟、child exit、取消完整程序樹、無副作用清理；loopback其他origin/host/方法/CSRF失敗；每個redirect與DNS重綁的內網阻擋；被修改URL／參數不可執行命令；原生UI不干擾使用者。未滿足就不進下載真平台測試。

M2產品gate：Chrome＋Edge在已核准隔離環境，雙語主要流程/錯誤/鍵盤/320px/200%、下載檔真bytes與容器/音軌、輸入與輸出Network／Storage；指定授權作品對每平台逐一採樣、失敗原因與版本／日期，不能承諾整個平台永遠可用。官網預覽SEO/noindex。M3必要檢查通過原對話push公開GitHub並固定source+binary；主代理驗source/release後免費部署靜態官網、驗HTTPS/SEO/headers、更新雙語首頁。新native二進位分發若有簽章/商店成本，未獲授權不得支出。外部確認才算功能完成。


---

## 原文件 TASKS.md

# 任務與里程碑

| 階段 | 狀態與可觀察產物 |
|---|---|
| M0 | 已凍結的離線平台 URL／plan／controller 核心，owner 139 與主代理 55 獨立案例通過；不代表真平台可下載。 |
| UX1 | 使用者否決手動 ZIP 操作，完成三路線比較後已明確選 C 純網頁。 |
| WEB-M1 | 當前：依 [完整契約](docs/WEB-M1.md) 完成真正雙語網頁、可讀來源與本機檔案、原檔／WAV、取消／清理、離線測試及建置；原功能對話實作，主代理驗收。 |
| Release | 固定候選必要 gate 通過後，原對話 public GitHub；主代理 free Cloudflare 部署、雙語首頁及正式檢查。不得用本地產物代替已部署。 |
| External | 單一 ZIP 與總表交使用者外驗，保留人工 NOT_RUN；外部修正回原對話，不提前標完整完成。 |

一次推進當前 milestone。不開新的 native／服務端方案，不改其他工具。

