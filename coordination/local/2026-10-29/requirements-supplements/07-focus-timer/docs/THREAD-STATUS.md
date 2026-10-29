# 專注計時：維護接手狀態

日期：2026-10-10（Asia/Taipei）。任務：`THREAD-07-focus-timer`，首個 milestone「維護接手紀錄」。判定：**接手就緒／PASS**；本次只新增此文件，沒有改程式、重建、來源推送或正式部署。

對話名稱為「專注計時」，工具目錄為 `C:/Users/<LOCAL_USER>/Documents/Codex/GlossQuote-Labs/tool-projects/07-focus-timer`。建立對話的開工輸入記載工具已接受 `model=gpt-6.1-sol`、`thinking=max`；本次未改模型配置。沒有可獨立驗證後端模型路由的回傳資訊，**實際路由未確認**。未建立子代理、新對話或傳訊其他任務。

## 接手基準與發布現況

| 項目 | 核對結果與證據 |
|---|---|
| 本機實作 | T00–T07 與 2026-10-09 M12 顯示修正已完成，保留使用者允許的人工 NOT_RUN。[HANDOFF](../HANDOFF.md)、[驗證紀錄](VERIFICATION.md)與實際原始碼一致；`project.json` 為 `local-mvp-complete`。 |
| 公開來源 | [KYStr/glossquote-labs-focus-timer](https://github.com/KYStr/glossquote-labs-focus-timer)，PUBLIC；default branch 為 `codex/initial-publication`。本次匿名 GitHub API 查詢確認 HEAD 為 `7aafaeebc048c8a8c07b8b64aed0c2c7d8753f75`。 |
| 功能版本 | 已部署功能來自 `293ab2e47079366218c49b619629673700bd0860`；最新 `7aafaeebc048c8a8c07b8b64aed0c2c7d8753f75` 只追加驗收文件。 |
| 發布副本 | `.runs/github-publish/glossquote-labs-focus-timer` 的 HEAD 與遠端相同，`git status --short` 無輸出；28 份已發布檔案逐一 SHA256 比對本工具檔案，全部相同。 |
| 正式繁中站 | [focus.glossquote.com/index.html](https://focus.glossquote.com/index.html)。2026-10-10 10:19:05（UTC+8）本次 GET 為 200、MIME 為 `text/html`，內容 SHA256 符合最近正式驗收紀錄。 |
| 正式英文站 | [focus.glossquote.com/en/index.html](https://focus.glossquote.com/en/index.html)。同次 GET 為 200、MIME 為 `text/html`，內容 SHA256 符合最近正式驗收紀錄。 |
| Hosting | 2026-10-09 正式發布完成；最近部署紀錄的 Worker version 為 `6074c3aa-d5dd-4dbb-8c89-483f3b3b7a6b`。本次僅讀公開 HTTPS，未登入 Cloudflare 或重新查詢控制平面版本。 |
| 首頁整合 | 主對話已於 2026-10-09 驗證[繁中首頁](https://glossquote.com/index.html)與[英文首頁](https://glossquote.com/en/index.html)列出本工具、同語言導覽正確。本次沿用此證據，未重新操作首頁或修改 catalog。 |

最新發布證據是根目錄 [`.runs/audit-2026-10-09/REPORT.md`](../../../.runs/audit-2026-10-09/REPORT.md)、[`focus-live-verification.json`](../../../.runs/audit-2026-10-09/focus-live-verification.json)、[`deployment-result.json`](../../../.runs/audit-2026-10-09/deployment-result.json)與 [`focus-live-browser.json`](../../../.runs/audit-2026-10-09/focus-live-browser.json)。更早的 `.runs/focus-timer/final-source-publications.json` 記錄 `8c0791c…`，不是目前 HEAD；更早的 Worker version `63fef14e…` 亦已被上述版本取代。

## 已完成且需保留的行為

- 初始 `25:00`，單段計時，分鐘為 1–180 的 ASCII 整數；可開始、暫停、繼續、取消與再次開始。
- 以裝置 `Date.now()` 與 deadline 計算剩餘時間；scheduler 最多一個 timeout，runId／epoch 隔離失效回呼。取消優先，不補完成提示；時鐘倒退保守暫停，非法時鐘可取消復原。
- 無效可編輯分鐘顯示 `—:—`、錯誤與停用的開始按鈕；輸入合法 `180` 恢復 `180:00`。不因顯示修正改變核心或排程演算法。
- 繁中與英文獨立靜態頁、完整說明及 SEO、同語言首頁連結。重新載入與語言切換重設計時；背景與睡眠後依頁面恢復執行校正，不保證背景準時更新。
- 計時狀態只放記憶體，沒有帳號、通知、音效、震動、自動休息、跨分頁同步、遙測、遠端字型或新增依賴。不得把未實測的執行期隱私保證寫成 PASS。

## 沿用的驗收與本次核對

既有最終來源的 `npm.cmd test`／主對話 `node --test` 為 **59/59，退出 0**；`npm.cmd run check` 為 **9 public assets／13 Node source files，退出 0**；正式 Cloudflare build 為 **13 檔，退出 0**，包含正式輸出驗證。最近正式驗收 **32 項 GET／HEAD／redirect／404／MIME／security／SEO 檢查通過，11 個公開資產逐位元組匹配**。這些是 2026-10-09 的既有結果，本次沒有重跑或改寫日期。

既有真正 IAB 觀察包括兩語開始／暫停／繼續／取消、前景一分鐘到期、無效輸入／180 分鐘復原、reload／語言切換、同語言首頁、鍵盤、320 CSS px，以及 JS 模組 HTTP 503 載入失敗。前景到期不代替背景或睡眠案例；viewport 觀察不代替實際手機或 200% 縮放。

本次實際命令／工具與結果：

| 命令或操作 | 結果 |
|---|---|
| `Get-Content`、`rg --files`、`rg -n` 讀取契約、TASK-ENTRY、START-HERE、HANDOFF、TASKS、產品／技術相關段落、隱私、驗收及最新發布證據 | PASS，退出 0。第一次從工具目錄以錯誤的 `../../../docs/PRODUCT-THESIS.md` 讀根產品文件退出 1；改用 `../../docs/PRODUCT-THESIS.md` 後退出 0，未修改檔案。 |
| `git status --short -- tool-projects/07-focus-timer` | 退出 0；開工即顯示整個工具目錄為根 repo 的 untracked，不能把既有整包檔案當成本次新增。未操作根 index、分支或 commit。 |
| `git -C .runs/github-publish/glossquote-labs-focus-timer rev-parse HEAD`、`status --short`、`ls-files` | PASS，退出 0；HEAD 為 `7aafaeeb…`，副本乾淨、28 檔。命令自專案根目錄執行，均為唯讀。 |
| 工具目錄執行 `node --input-type=module -e $focusMaintenanceScript`：內建 fs／crypto 逐檔比對發布副本與本機 | PASS，退出 0；28/28 SHA256 相同。另記錄不含此文件的工具樹 56 檔與基準指紋，供最後確認寫入範圍。 |
| 同形式 Node 內建 `fetch`：匿名讀 GitHub repo／branch API；GET 正式兩語 HTML 與 `/js/app.mjs` | PASS，退出 0；PUBLIC、HEAD 相符；三項 HTTP 200 且 SHA256 均符合最近發布紀錄。未帶憑證。 |
| `web.open` 讀 GitHub 與正式兩語網址 | GitHub 顯示 Public；兩個正式網址在該讀取工具中回 Internal Error。已改用上述直接 HTTPS GET 成功確認，該工具錯誤不當作網站故障。 |
| 持久環境 guard `& "$env:USERPROFILE\.codex\check-persistent-environment.ps1"` | 前後均退出 0、PASS，兩份完整 Snapshots 相同，包含 TEMP／TMP 指紋。詳下表。 |
| 本次 Node 文件內容／範圍核對與 `git diff --check -- tool-projects/07-focus-timer` | PASS，均退出 0；必要欄位齊全、8 個本機文件連結存在、無行尾空白。此文件以外的 56 檔工具樹指紋維持 `1e30d763c3a293c1630a9168b37393e67115bd2f9a5f2bd6029729d7e69a4f68`，確認唯一新增檔案為本文件。untracked 文件由 Node 直接核對，Git diff 無法單獨涵蓋它。 |
| `npm.cmd test`、`npm.cmd run check`、`npm.cmd run build`、真正瀏覽器互動、Wrangler／deploy／push | 本次 NOT_RUN；只新增維護文件，沿用內容未變的可信驗收與發布證據。 |

本次三份公開內容指紋：

| 路徑 | SHA256 |
|---|---|
| `/index.html` | `14b050ab96a2306037dd8985443aa9a6df7be2c785e5a65ea3052f576e8368c8` |
| `/en/index.html` | `3c722c0a3fa1d13a9cacefd157496b7ab3e56c33071c9531cd65628bc53d72d4` |
| `/js/app.mjs` | `a716d23f6a3fcb36ec8561f93471f4af21dd45f2e6b11bbd30272baef0317b84` |

持久環境前後基準：

| 範圍 | PATH type／長度／ephemeral count | PATH SHA256 | 完整 Environment-key SHA256 |
|---|---|---|---|
| HKCU | ExpandString／834／0 | `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb` | `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a` |
| HKLM | String／1227／0 | `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8` | `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82` |

## 人工待驗與可接續待辦

| 項目 | 目前證據界線／接續方式 |
|---|---|
| F17 真實長時間背景 | NOT_RUN；在實際瀏覽器切背景超過一分鐘，記錄回前景時的狀態與單一完成效果。假時鐘／前景到期已通過。 |
| F18 裝置睡眠 | NOT_RUN；需真機睡眠與恢復，區分頁面保留後校正與丟棄重載後回 25:00。不調整 Windows 系統設定或時間。 |
| F19 BFCache | 確認命中的人工案例 NOT_RUN；reload 與語言切換已實測，不能取代 BFCache。需記錄 `pageshow.persisted` 與恢復狀態。 |
| F20 Network／permissions／storage、已載入後斷網 | 完整實機觀察 NOT_RUN；已有來源審查與安全標頭證據。只使用本工具假資料，檢查操作零新增請求、無權限提示或工作狀態持久化。 |
| F22 讀屏 | NOT_RUN；鍵盤控制與焦點已通過，仍需讀屏確認狀態播報及不逐秒打斷。 |
| F23 真 200%／reduced-motion／其他裝置 | NOT_RUN；320 CSS px IAB 觀察已通過。需實際縮放、系統偏好、其他瀏覽器與手機，分別記平台及結果。 |
| F24 瀏覽器禁用 JavaScript | NOT_RUN；HTTP 503 模組載入失敗已實測 PASS，兩者需分開記錄。 |
| 搜尋引擎實際收錄／效能量測 | 未確認；正式 metadata／robots／sitemap 已有產物與 HTTP 驗證。沒有 Search Console、Lighthouse 或 CWV 的測量結果，不據此宣稱收錄或分數。 |

上述人工 NOT_RUN 是使用者已允許保留的例外，不需要為本次接手重新取得同項授權。下一個有證據的維護工作是補齊這些實機紀錄；目前沒有已核實的使用阻塞缺陷，也沒有待實作的新功能 milestone。補驗需另依既有 owning task／新任務列明 allowed paths，不能在本次只有此文件的範圍內改程式或驗收文件。

## 文件差異、風險與整合邊界

- `START-HERE.md`、PRODUCT／TECHNICAL／ACCEPTANCE 中「尚未實作／沒有程式」為 2026-09-23 藍圖文字；HANDOFF 的舊 T07 表格仍寫 hosting 未部署。以 2026-10-09 最後發布紀錄及本次核對為準，這些差異是文件維護待辦，未發現由此造成的產品故障。
- `TASKS.md` 列 T00–T06；T07 的具體範圍在 [MILESTONE.md](../MILESTONE.md)，完成證據在 HANDOFF／VERIFICATION。本次不擴寫任務或更改進度表。
- 實際 `scripts/serve.mjs` 預設 4175，舊 TECHNICAL／ENGINEERING 為 4173；本對話依 [TASK-ENTRY](../TASK-ENTRY.md) 使用預覽 `127.0.0.1:4187`、fixture `127.0.0.1:5187`，必要時以子程序限定的 PORT 覆寫。先確認空閒，佔用時用空閒 loopback 埠並記錄；本次沒有啟動或停止任何伺服器。
- 同工作區其他工具可能仍有既有修改；本次唯一寫入路徑為 `docs/THREAD-STATUS.md`，保留原有 untracked 工具與發布歷史。未讀取憑證、未改 00-home、其他工具、根設定／規範、GlossGate 或 040141.xyz。
- 未來正式部署、DNS、首頁 catalog 或主機修改由原主對話統一整合；本次不產生新的 release candidate 或重新發布已驗收網站。現行免費 hosting 與來源公開授權不需要重問，新增權限／付費或超範圍工作才是新決策。

目前需要決策事項：**無**。本 milestone 的完成條件是可靠記錄已實作、公開來源、正式 hosting、證據界線與可接續待辦；不把人工未驗或後端模型路由未知改寫為通過。

## 2026-10-11：AUDIT-FOCUS-01 最新維護紀錄

本次限定 audit 取代首個 milestone 的單檔寫入範圍；實際範圍、原始外部資料判讀、命令與逐項證據見 [AUDIT-2026-10-11.md](AUDIT-2026-10-11.md)。五種英文非法分鐘 `181`／`1.5`／`1e2`／`0`／空值的實際輸入、blur 前後與禁用開始皆 PASS；真實一分鐘到期後按 Start again、running 中切換繁中回 25:00 皆 PASS。原外部矛盾列保留 NOT_RUN，不追認外部總 PASS 或預設驗證 bug；未修改產品程式。

TASK-ENTRY 的 SEO 文字已按核定 releasePolicy 校正：本工具目前要求 zh-Hant／en，尚未要求 x-default；維持其他 metadata gate，缺項列非阻塞一致化待辦。來源 PUBLIC／HEAD `7aafaeebc048c8a8c07b8b64aed0c2c7d8753f75` 與正式兩語 HTML／app.mjs hash 皆維持相同，沒有 push／build／deploy。本輪 focused Node 24 tests 18/18 退出 0，既有全量 59/59 等結果沿用；持久環境 guard 前後 PASS、完整 Snapshots 不變。

**新待辦 P1：雙語正式瀏覽器 DOM 都可見 Cloudflare Insights 外部 script，與無 analytics 承諾存在一致性問題。** 腳本執行、CSP 攔截、rum／payload／內容外洩、完整 Network／Storage 仍 NOT_RUN；空的限定 console 與匿名 HTML hash 不變都不能代替隱私通過。隱私／主機層修復停止於共享邊界，交主對話追查託管設定與真實請求，不改 Cloudflare／DNS、不讀憑證。其他 OS sleep／BFCache／讀屏／真縮放人工未驗保持不變。

此紀錄的行為／文件項目已完成；最終文件與範圍收尾結果見 audit 文件，整站隱私與跨裝置 gate 仍未結案。

## 2026-10-13 U07 本機提示音升級

`U07-OPT-IN-CHIME-20261013` 已完成本機及 PUBLIC 固定來源封裝，候選／命令／限制與交接見 [RELEASE-CANDIDATE.md](RELEASE-CANDIDATE.md)、[OUTCOME-VERIFICATION.md](OUTCOME-VERIFICATION.md)。來源 `ed7e37876e602db0587893ba3c391a116b8d0b9a`；31檔Git blob ZIP核對通過。正式兩語新增x-default，是最新核定一致化要求，舊2026-10-11「未要求」判讀保留為歷史。核心／排程不變，78/78 tests與必要check/build/release退出0；真Chrome一分鐘與兩語操作PASS。音訊聽感和原人工缺口仍NOT_RUN。

這次没有部署、改首頁或新增權限／依賴；新版待主驗／正式發布／新外验，不繼承旧版本通過。本機4187與專用server保留供review；功能owner完成交接、釋放寫入權。環境與範圍收尾證據在 `.runs/focus-outcome-2026-10-13/`；不再新增補驗工作。

### 同 milestone P2 修正版

原ed7e378因主驗發現pagehide／off-on狀態失同步被取代。已按core校正後的running狀態明確re-arm；pageshow不初始化，已到期不补播，未重新啟用的完成回unready而不假enabled。23音訊／82全測及必要check/build/release全exit0；PUBLIC目前 `e64205f5407539fc0451c8052017a6a63f7bd635`，31檔fixed ZIP／manifest見RELEASE-CANDIDATE。本次fake adapter＋真core/scheduler證據不是原生BFCache，原人工NOT_RUN與候選紀錄保留；環境Snapshot不變，仍未部署，owner重新釋放寫入權。
