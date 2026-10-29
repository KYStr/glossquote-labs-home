# NEW22-41-M1 任務紀錄

- 2026-10-22：讀完本工具六份規格、AGENTS 與 docs；根 SECURITY-BASELINE、PRODUCT-THESIS、DESIGN-SYSTEM 已核對。工具與根 DESIGN-SYSTEM bytes 相同。
- 範圍：只執行 T00–T05；M2 source publication、M3 hosting 未放行。
- requested 模型 gpt-6.1-sol/max；未獨立確認 backend。
- Node v24.14.0、Python 3.12.5；零安裝、零外部依賴。
- Windows guard 初始 PASS，完整快照 `evidence/m1/environment-before.json`；收尾必須比對。
- UI 限制：不操作瀏覽器、CUA、桌面、焦點、鍵盤/IME/clipboard/dialogs，不產 screenshots。所有 B gate 為 `NOT_RUN_USER_FOCUS_INCIDENT`。
- 設計依 UX-SEO 的桌面/行動 wireframe，Product App 模式；任務物件為有順序的原檔名/輸出名對照清單。常用命名欄位及排序操作直接可見，隱私與 ZIP 限制在第一屏/動作旁揭露。

## T00

實作封閉 public allowlist、noindex 兩語骨架、loopback 4221 靜態伺服器與 build。`npm test` 2/2、`npm run check`、`npm run build` 均 exit 0；`evidence/m1/t00-*.log`。build 僅六個審核靜態檔，test-owned server 已關閉。

## T01

純 planner 已實作；ASCII decimal parser、Unicode scalar 與 code-unit cap、嚴格 mode schema、名稱安全/碰撞、整批 fail closed。`npm test` 13/13 與 `npm run check` exit 0，`evidence/m1/t01-*.log`。

## T02

依 PKWARE APPNOTE v6.3.10（4.3.7、4.3.12、4.3.16、4.4.3.2 及 EFS）核對格式；File API、Node24 test、Python zipfile、ECMAScript normalize 官方參考已讀。STORE writer 的 headers/payload 分塊作為 Blob parts，固定日期，預檢每個 uint32 欄位；Python expected 常數獨立手寫。`npm test` 18/18、`npm run check`、`node scripts/verify-zip.mjs` 全部 exit 0；Python 3.12.5 三 entries payload/testzip/CRC PASS（`t02-*.log`）。

## T03

完成雙語完整工作頁、SEO/FAQ、命名欄位、順序與錯誤預覽、generation/reader/URL 控制器。下載只提供已成功產生的 Blob URL，沒有自動下載。邊界排序使用 aria-disabled（保留鍵盤焦點，處理器拒絕邊界動作）。所有原始名稱與輸入值只用 text/value APIs。待 CLI gate；真瀏覽器仍 NOT_RUN_USER_FOCUS_INCIDENT。

- 主代理中途要求：所有 child_process 明確 `windowsHide: true`、`shell: false`、有界 timeout。已先修 `check.mjs` 和 `verify-zip.mjs`，再繼續後續 CLI；未開瀏覽器或原生 UI。
- 第一次 T03 test：20/21，exit 1（`t03-test.log`）。錯誤文案測試用了任意「長度 >20」門檻，誤拒絕完整中文短句；改成檢查兩語固定 code 集合、型別與完整句子，不改正確產品文案。舊失敗紀錄保留。
- T03 重驗：`npm test` 21/21、check/build、Python zipfile 皆 exit 0（`t03-test-r2.log`、`t03-check.log`、`t03-build.log`、`t03-python.log`）。

## T04

加上原始串流碎片合併，payload Blob parts 數量按 256 KiB 上限而非不受限 source chunk 數成長；每 64 個細碎 read 或滿一塊 yield task，允許取消事件執行。新增精確 16 MiB 實際分塊讀取、七種失效競態、晚到結果/進度、原子新增/上限、reader lock、固定錯誤與 Blob/URL 失敗測試。保留清單列焦點；清除也可重設空清單時已改的規則。所有 Node controller fixture 只算 N 證據；瀏覽器 UI/焦點、Network/Storage、下載及 bfcache 實測均 NOT_RUN_USER_FOCUS_INCIDENT。待 CLI。

- T04：`npm test` 47/47、check/build、Python zipfile 全部 exit 0（`t04-*.log`）。

## T05

- 收尾審查：build helper 限定 public→dist 或 task-owned synthetic public→dist；拒絕未知空目錄。新增 `.read()` rejection 的固定錯誤與 cancel/release 測試；來源 manifest 以閉合清單生成，不含 evidence 或產生的測試 ZIP。
- T05 首次 test 46/47、exit 1：新增空目錄負例正確被拒絕，但 fixture 清理用非 recursive `rm` 造成 `ERR_FS_EISDIR`（`t05-test.log`）；改成只移除該空目錄的 `rmdir`。其餘 gate 因此未執行，不能記 PASS；失敗紀錄保留。
- 首次收尾 shell 只寫出 `environment-after-t05-first.json` 即結束：PowerShell script PASS 不設定 native `$LASTEXITCODE`，已改為解析 JSON Status 與完整物件比對；該 shell exit0 不代表 tests 已跑。
- T05 最終固定 code/test：`npm test` 47/47、check/build、verify-zip 皆 exit0，原始 log `t05-*-r2.log` 與 `t05-exits-r2.json`。八個 public/dist 檔案 bytes 相同，環境 before/after 完整物件比對 PASS，HKCU/HKLM PATH/Environment/TEMP/TMP 不變。
- 最終交接 HANDOFF、逐 ID acceptance-results、source manifest；無額外交付 ZIP。所有 B gate 未執行，未 GitHub/deploy，未留下自建 server。主代理實際讀來源並獨立驗收，M2 另行放行。
