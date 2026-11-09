> **2026-10-13 最新候選：U02-ERROR-LOCATION-20261013，待主代理獨立驗收／部署與新版外部複驗。** 新增兩語錯誤caret定位，實作與focused／Chrome驗收已通過；詳見文末U02與 [案例](U02-ERROR-LOCATION.md)。

> **2026-10-11 舊版本發布狀態：PUBLIC_SOURCE_VERIFIED / LIVE_HTTP_VERIFIED / PASS_SCOPED_BROWSER。** 正式網站已上線；此版本的來源commit、部署和主驗紀錄保留為歷史，不能宣稱U02已部署或外驗通過。人工 NOT_RUN 保留。

# JSON 檢查與格式化：Release candidate

任務 THREAD-02-json-workbench；2026-10-10；供主對話獨立驗收。候選來源倉庫：[KYStr/glossquote-labs-json-workbench](https://github.com/KYStr/glossquote-labs-json-workbench)。來源公開的verified HEAD另於本次發布後追加；目前文件不把網站宣稱已部署。

產品：原生 HTML/CSS/ESM、零runtime/development套件，繁中與英文介面。嚴格、受限JSON parser保留每個數字／字串raw token與順序；重複鍵依decoded精確判等；內容僅當頁記憶體；真正Worker、取消／clear／5秒timeout、clipboard fallback與UTF8下載。

候選正式頁面（NOT_DEPLOYED）：

- `https://json.glossquote.com/index.html`（zh-Hant）
- `https://json.glossquote.com/en/index.html`（en）

本機驗收：Node 24+，`npm.cmd test`、`npm.cmd run check`、`npm.cmd run build`；預覽 `npm.cmd run dev` → `127.0.0.1:4182`，有衝突以 `-- --port=0`。修改core／worker後 `npm.cmd run build:worker`。完整案例／人工例外見 [VALIDATION](VALIDATION.md)。

正式產物：`npm.cmd run build:release` 明確指定且限制origin，生成dist，具備兩語canonical、reciprocal hreflang／x-default、2頁sitemap、robots、404，以及CSP／nosniff／Referrer／Permissions／MIME `_headers`。public始終noindex，預設build產生preview noindex且沒有sitemap；release不會改public。wrangler配置使用assets-only、html_handling=none以保留index.html網址、404-page、禁workers.dev／preview URLs；無account ID或秘密。

本次不讀任何憑證、不部署、不修改00-home、其他工具、DNS／帳戶／正式Worker。正式release是原主對話整合範圍：

1. 獨立檢查公開來源commit與SHA256清單、允許的人工NOT_RUN；再跑必要release build。
2. 以主對話已審核的部署runtime檢查wrangler schema／dry-run並部署免費的json.glossquote.com；此工具對話未安裝Wrangler（依零development依賴及不讀憑證邊界），dry-run與live結果NOT_RUN。
3. 驗證兩語live HTTPS／狀態／MIME／security headers／canonical／hreflang／robots／sitemap／404與實際Worker運算後，才把00-home/catalog切published。
4. 主對話 rebuild、validate、publish獨立首頁source、deploy homepage並驗證兩語live catalog；各項source／hosting證據分開記錄。

這是整合驗收等待，沒有要求使用者重複授權。人工例外：Firefox、實體手機／touch、native zoom200%、screen reader／独立AA稽核與真OS clipboard成功寫入NOT_RUN；CSS320px／200%與keyboard已測。没有搜尋收錄、效能或安全認證保證。

範圍與變更：public（兩語頁面、worker/core/session/export/locales與styles/favicon／404／headers）、scripts（安全serve/check/build、worker bundle、SEO／asset verifier、publication review）、test（offline fake data）、必要docs／README／package／project／.gitignore／wrangler。根repo未commit/branch/index操作；所有publishing只用獨立reviewed副本。

Status: LOCAL_MVP_COMPLETE_WITH_MANUAL_NOT_RUN；T08/T09發布與guard結束後由HANDOFF給出READY_FOR_INTEGRATION或具體BLOCKED。

## 2026-10-10 最終整合交接

**READY_FOR_INTEGRATION**。必要gate全部PASS，無需要新增授權的阻塞。source **PUBLIC**，main及remote HEAD核實為 [`6e77ac90db5ad07ca0b83ccfac9d1e0ce08be745`](https://github.com/KYStr/glossquote-labs-json-workbench/commit/6e77ac90db5ad07ca0b83ccfac9d1e0ce08be745)。GitHub tree 43檔＝42來源＋manifest；42份staged bytes與SHA256清單逐份一致。manifest SHA256 `8e0c3a8289fb2b1dd6925d6305eb551bba96129e59f351b5195125c0b8bbdc42`。公開倉庫未包含本機證據、任務協作規範、根repo、dist或憑證。

最終命令：npm.cmd test（33/33）、check（16 static／27 syntax）、preview build（17 files）、release build（18 files）與staged whitespace check全部exit0。真browser兩語Worker／offline／export／states、取消與實際5秒watchdog、完整keyboard、320px／CSS200%／No-JS／reducedmotion證據見VALIDATION及本機HANDOFF。未變程式的既通過結果直接沿用。

終了Windows guard與開始及T08後的PATH hash、type／length、完整Environment-key指紋一致，HKCU/HKLM ephemeral=0、TEMP/TMP未變。Task-owned preview與test browser已停止；其他流程／進程保留。模型配置gpt-6.1-sol／max由建立工具接受，後端路由未確認。

Hosting **NOT_DEPLOYED**。上方整合步骤仍由主對話執行；source-only release没有改00-home／DNS／Cloudflare。候選網址未宣稱live或被搜尋收錄。Wrangler schema/dry-run与live headers验证仍明确NOT_RUN，勿把本機headers规则比對當作Cloudflare已套用的證據。

此末段是公開來源快照之後的workspace交接metadata，並未加入上述commit；部署須以該verified commit程式與本機candidate一起審查。公開source snapshot的manifest保持原值，不因追加交接metadata重寫。

配置準備參照：[Cloudflare 靜態標頭](https://developers.cloudflare.com/workers/static-assets/headers/)、[HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)、[custom 404](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)；依已授權零development套件範圍，未安裝新的Wrangler或執行部署。


<a id="release-20261011"></a>

## 2026-10-11 正式發布更新

- 狀態：**PUBLIC_SOURCE_VERIFIED / LIVE_HTTP_VERIFIED / PASS_SCOPED_BROWSER**。下列證據取自已保存的主代理發布紀錄；本次文件更新未重跑 Git、部署、HTTP 或瀏覽器測試。家族首頁整合結果由主對話發布報告另行記錄。
- 正式網址：[繁體中文](https://json.glossquote.com/index.html)、[English](https://json.glossquote.com/en/index.html)。
- 公開來源：[KYStr/glossquote-labs-json-workbench](https://github.com/KYStr/glossquote-labs-json-workbench)，**PUBLIC**；verified source commit／remote HEAD 均為 [44ce2844ffcab4ed5c90ef066dcfc5dfdf233520](https://github.com/KYStr/glossquote-labs-json-workbench/commit/44ce2844ffcab4ed5c90ef066dcfc5dfdf233520)（2026-10-11T06:17:26.077Z）；[來源發布 JSON](../../../.runs/release-2026-10-11/json-source-publication.json)。
- Cloudflare：正式 host json.glossquote.com，部署 exit code **0**；version **0ed10b51-ad10-4b28-b5f3-8c4b91488b3e**（2026-10-11T06:17:33.939302Z）；[部署 JSON](../../../.runs/release-2026-10-11/json-deployment.json)。
- HTTP：**PASS_HTTP**（2026-10-11T06:18:32.431Z）。17 個發布資產的 GET／HEAD 均為 200，GET 精確位元組／SHA256 與發布 dist 對應；HTTPS、CSP/MIME、canonical/alternates、robots/sitemap 檢查通過。兩個不存在路徑為真 404；兩語 browser User-Agent 頁面均為 200 且 SHA256 對應。共 38 筆 HTTP 紀錄；[正式 HTTP JSON](../../../.runs/release-2026-10-11/json-live.json)。
- 瀏覽器：**PASS_SCOPED_BROWSER**（2026-10-11T06:13:56.547Z）。英文保留 9007199254740993、-0、1e+9 的原始數字 token；decoded 重複鍵 a／\u0061 拒絕格式化並清空輸出；繁中 {"a":1} 格式化成功。 [本輪瀏覽器 JSON](../../../.runs/release-2026-10-11/json-browser.json)。
- 部署後補驗：**PASS_SCOPED_BROWSER**（2026-10-11T06:36:22.773Z），0ed10b51-ad10-4b28-b5f3-8c4b91488b3e 版本英文頁再次保留 9007199254740993、-0、1e+9；[部署後瀏覽器 JSON](../../../.runs/release-2026-10-11/json-postdeploy-browser.json)。先前雙語紀錄保留原時間。
- 剩餘人工 **NOT_RUN**：完整 Network/Storage、真 OS clipboard 成功寫入、跨裝置矩陣；原有 Firefox、實體手機／觸控、原生 browser zoom 200%、screen reader／獨立 AA 稽核例外仍保留。 本輪 scoped browser 與靜態 HTTP 驗收不構成完整封包／Storage 稽核。
- 原有本機 MVP gate、產品限制與歷史命令結果維持上方歷史紀錄；本輪新證據取代其舊正式 hosting／live HTTP 待驗狀態，沒有把人工未跑項目改標 PASS。所有時間為 UTC。

## U02-ERROR-LOCATION-20261013 候選交接

**LOCAL_GATES_PASS / READY_FOR_PRIMARY_REVIEW**。只有實作與本機gate已通過；新版部署、雙語首頁版本整合、主代理獨立验收與新版外部複驗仍待執行。舊live version不能充作本候選驗收。

新增：[當前錯誤插入點定位規格／重現](U02-ERROR-LOCATION.md)。只在當前error含有效UTF-16 offset時提供兩語「前往錯誤位置」，按下才focus／setSelectionRange，不修改／修復／重檢原文；來源／模式／clear／cancel／rerun／late Worker失效舊位置。native textarea的長行可見區捲動採實際行高與本機字寬估計，沒有新增依賴／資料持久化／處理請求。

真Chrome154.0.8037.98兩語22案例＋320px目前寬行2案例PASS；selectionStart/End、activeElement、scroll與來源不變具有DOM佐證；長1,500行與20,000字元、keyboard修正成功與遲到reply均實測。零操作HTTP／console與空storage／cookies／IDB，首次完整載入後offline／精確數字token／下載回歸PASS。

命令：node --test test/error-location.test.mjs 3/3；npm.cmd test 36/36；check 17 static／29syntax；preview build 18 files；release build 19 files；全部exit0。環境guard pre/post-tests精確一致。詳細本機證據在專用.runs/json-outcome-2026-10-13，由主對話收取，未納入公開source。

發布來源更新自已核實的PUBLIC／main基底 `b5f03cf59fdd0e99013ab3f3f4a79b9fe5941859`，使用既有reviewed副本保留歷史；新候選固定commit／sourceZIP／manifest在發布後本機HANDOFF追加。公開commit中此段不自我嵌入其commit hash，以固定artifact與發布後receipt核對。

人工NOT_RUN：Firefox、實體手機／touch、native200%zoom、screenreader／獨立AA、真OS clipboard成功、新版主驗／正式部署／外部複驗。沒有需要新user權限、依賴或scope的決策。型號設定沿用使用者指定Sol/max，backend routing未獨立確認。
