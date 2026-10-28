# B20-48-M1 — 重複檔案找出來

2026-10-23（Asia/Taipei）。本輪只做 M1：T00 scaffold → T10 核心 → T20 雙語 UI → T30 邊界／固定候選。完成定義：有實際可操作的靜態介面和 Worker、byte-verified 分組、同組 keeper 改選、真實 JSON/TXT；Node24 test/check/build 通過，交固定 bytes/SHA-256。Browser gates 留待主代理，不能宣稱完整驗收或發布。

已完整閱讀本工具 14 份既存文件，根 AGENTS、SECURITY-BASELINE、PRODUCT-THESIS、完整家族設計契約。工具 DESIGN-SYSTEM 與家族原文 SHA-256 相同（935d4cca13c22b8a66688c8b83fdf412b448a0ff5c62d816728f510aeee05ada）。requested gpt-6.1-sol/max；實際 backend 未獨立確認，未自行切換。無子代理、chat 派送、套件安裝、server、browser/native 操作或帳戶憑證讀取。

## 工作表設計

Product App 模式。使用者整理備份、照片、附件，成功狀態是看見真正相同的群組、確認保留來源並下載報告。最重要的物件是來源與分組。風險是誤認同名檔、碰撞、過期報告；來源只讀，不提供刪檔。

常駐：選檔、來源順序／大小、限制、開始／取消、狀態。相鄰：來源移除、群組 keeper、報告下載。漸進：hash 詳細、報告預覽、FAQ。字體用系統 fallback；使用家族 paper/ink/acid 語義 tokens，扁平分隔，僅一個 primary。

```text
Wide:    品牌／工具／語言（離頁警語）
         標題／本機處理與不刪檔
         來源清單（彈性主區） | 限制／開始
         進度／取消
         真實群組／keeper／hash
         summary／下載／預覽
Compact: 同順序單欄，檔名折行、索引保留，動作可換行。
```

依 focus incident 規則，實際截圖、320px、200% zoom、鍵盤、下載、語言切換、Network/Storage、真實 module Worker 一律 NOT_RUN_USER_FOCUS_INCIDENT。只對程式與合成資料做背景離線驗證。

## 已實作的例行決策與結果

- `completedFiles` 是已完成 hash 的來源數，hashing 0..N；verifying 顯示 N/N 並明說正在比 bytes，不重設進度或提供部分報告。每檔 hash 完成恰一次，另有初始與階段訊息。
- 報告預覽是記憶體文字；Blob/object URL 只在明確下載時建立。同一 keeper 狀態每格式重用一個 URL（最多兩個），改 keeper 先 revoke 舊 URL，取消／來源更換／reset/pagehide 同樣清理；沒有自動到期 timer。
- 選檔會加入來源；任何修改清除整份分析與 keeper。超過 200 檔時清除這批選取並提示重新選；單檔／總量超限保留 metadata 供移除修正，不讀內容、不開 Worker。
- 只在 duplicate group 建原生 radio。改 keeper 更新現有 radio／status，保留該 DOM 控制；singleton 文字顯示保留。UI 來源名均以文字與可見 escape 呈現，下載 JSON serializer 保留原字串。
- 無依賴、持久 storage、來源寫入、時間戳、上傳、帳號或內容預覽；無使用者資料測試。用 `node:worker_threads` bridge 測 genuine Node worker，沒有冒充 browser Worker。

T00（2）、T10（26）、T20（29）、T30（38）tests/check/build 全 exit0。最終測試 38 pass、0 fail、0 skipped。實際 32MiB×4 檔、200 empty、碰撞、chunk 邊界、取消／來源修改 stale、URL 每個恰 revoke 一次、精確 JSON/TXT 均已驗。四份產物獨立回讀 bytes 通過。環境完整 Snapshots 相同，無持久變更。詳 HANDOFF 和 evidence/m1；固定候選由 freeze-candidate capture/verify 記錄。M1 CLI 工作到此，尚未獲 M2 放行。

## B20-RP-48 / M1B（2026-10-23）

本輪已完整讀取 `.runs/batch20-release-prep-2026-10-23/TASK.md` 的十項發布準備契約；其精確授權取代 M1 原先不做 release 工具鏈的階段限制。只新增離線 release scripts/tests/docs、兩個 package scripts，以及獨立 `release-artifacts/`。不改 public/dist、舊 evidence、唯讀規格／docs 或其他工具。requested gpt-6.1-sol/max，沒有自行切模型或自述 backend 已確認。

原 public 11 檔鎖定至 M1 bytes/SHA；原 serve HEADERS 來源同樣鎖定。origin 固定 `https://duplicates.glossquote.com`、slug duplicate-files。14 site 檔與 sibling manifest 只在來源／輸出完整合法時建立或重用；預覽完全不變。14 項針對性 release tests 已通過，涵蓋 semantic SEO 及同時竄改。原 M1 的 38 項不是 browser 證據；本輪最終完整 CLI gates 會另存 m1b，後續結果追加 HANDOFF。

已捕捉 93 份起始檔案的 bytes/SHA-256 和三份將追加／修改的原文供實際差異。新的證據會比較全部禁止修改範圍，並固定 sources/artifacts；不重寫 M1 manifest。未開 server、browser、native、chat、子代理；不安裝、不讀憑證、不 GitHub、不部署。主代理仍須另行處理隔離 browser gates、M2/M3 和單一整合 ZIP。

最終 M1B gate 實際通過：Node v24.14.0；npm test 52 pass/0 fail/0 skipped（原38＋release14）；check/build:release/check:release 各 exit0。完整 commands/logs 見 evidence/m1b/final-1-*。正式候選 14 site assets＋sibling manifest，public/dist/runtime／M1 evidence 不變。環境 guard 的完整 Snapshots 前後相同。程式固定後只追加交接，沒有重跑未變程式測試或把 Node 當 browser。固定來源／產物與 actual diff 由 m1b-evidence capture/verify 保存；所有 browser gates 仍 NOT_RUN_USER_FOCUS_INCIDENT，無待主代理新增權限決策。
