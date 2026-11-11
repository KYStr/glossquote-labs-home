# R5-FIX-B 維修實作及檢查

2026-11-10。主代理維修任務 `labs-run5-legacy-repair-20261110`，claim `run5-legacy-claim-44deb43d-ead5-48d1-b826-4561260a6eb1`。這份紀錄涵蓋分派的工作副本；原始候選保存在 `source/`。原作者的 `VERIFICATION.md` 結果標為歷史，新結果見各工具的 `REPAIR-VERIFICATION.md`。

| 工具 | 變更範圍 | npm test | check | build 兩次 | check:generated:preview |
| --- | --- | ---: | ---: | ---: | ---: |
| [salary](../../../tools/salary-converter/REPAIR-VERIFICATION.md) | 規格與作者勘誤、年度基薪小數錨點 | 43/43 | 0 | 0/0 | 0 |
| [age](../../../tools/age-calculator/REPAIR-VERIFICATION.md) | 規格、雙語 FAQ／說明、四組二次借位 fixtures、對應測試與預覽產物 | 54/54 | 0 | 0/0 | 0 |
| [cooking](../../../tools/cooking-measurement-converter/REPAIR-VERIFICATION.md) | 規格與作者勘誤、兩組單位錯誤 fixtures、逐筆比對、測試子行程 | 59/59 | 0 | 0/0 | 0 |
| [bill split](../../../tools/bill-split-calculator/REPAIR-VERIFICATION.md) | 規格、簡報、作者補記、雙語餐費標題及用途、兩套靜態檢查與預覽產物 | 49/49 | 0 | 0/0 | 0 |
| [race time](../../../tools/race-time-predictor/REPAIR-VERIFICATION.md) | 規格、簡報、作者檢查及交接的實質重疊說明 | 44/44 | 0 | 0/0 | 0 |

Windows Node v24.14.0、npm 11.9.0。五工具 `npm test` 最終 exit 均為 0，合計 249/249，無失敗或跳過。各自兩次建置的 9 個檔案加 manifest 路徑和 SHA-256 完全一致。五組規格與測試 fixtures 完全一致。Age 初次測試以及 bill split 初次 generated check 發現舊文案的固定斷言，更新為本輪兩語規格後重跑通過。為明確保護 Windows 焦點，五工具的 syntax-check 子行程、年齡 TZ 測試，以及料理 build／loopback serve 測試子行程均加入 `windowsHide: true`，並重跑受影響檢查。料理測試會驗證 production build 拒絕和本機 loopback HTTP。

## 變更檔案

下列產品檔案相對於 `work/tools/<slug>/`。五工具都更新 `HANDOFF.md`、`VERIFICATION.md` 與 `scripts/check.mjs`，並新增 `REPAIR-VERIFICATION.md`。

- salary 另更新 `test/core.test.mjs`。規格目錄更新 `SPEC.md`、`AUTHOR-CHECK.md`。用原有 24.55 容量先行斷言，新增分數月薪的整元年薪斷言。
- age 另更新 `test/{core.test.mjs,site.test.mjs,fixtures.json}`、兩語 `public/{index.html,en/index.html}`、`public/js/core/age.mjs` 的註解及對應 generated 檔案／manifest。規格目錄更新 `SPEC.md`、`AUTHOR-CHECK.md`、`fixtures.json`。保留原有 14 筆核心預期，新增非閏年 30 日出生配 3/1、31 日出生配 3/1／3/2，以及閏年 31 日出生配 3/1。
- cooking 另更新 `test/{core.test.mjs,build.test.mjs,fixtures.json}`。規格目錄更新 `SPEC.md`、`AUTHOR-CHECK.md`、`fixtures.json`。改用 `oz` 鎖定 ENUM，另有獨立的 `liter` 容量先行測例，測試逐一直接比對兩者。
- bill 另更新 `public/{index.html,en/index.html}`、`scripts/check-generated.mjs` 及對應兩語預覽和 manifest。規格目錄更新 `SPEC.md`、`BRIEF.md`、`AUTHOR-CHECK.md`。名稱與首屏文案明示餐費估算，並以文字說明有墊款時適用的既有 Bill Splitter。
- race 規格目錄更新 `SPEC.md`、`BRIEF.md`、`AUTHOR-CHECK.md`。以既有 Running Pace 固定規格更正任意已知距離和每列配速的比較，保留直接預測與自訂目標的獨立用途。
- 四組來源文件各只更新 `HANDOFF.md`、`VERIFICATION.md`。真實 spec head 為 feels-like `0b6ec5c6dcbdd6fc457de9c827c1b3ac8652716e`、dew-point `8b89efbe27da257c130bea8f70d5e4abc8865232`、clothing `ed41923a0c653a92b2602d0ed02deba873a42ec5`、period `3fc93c6c679974e7b0830ad45a01f2af968839a6`。各自固定來源和原誤植列在 [交接初篩](review-b.md)。

## Windows 持久環境

建置前後皆執行 `check-persistent-environment.ps1`，兩次 PASS 且下列欄位相同。

| Scope | PATH type | Length | Ephemeral | PATH SHA-256 | Environment key SHA-256 |
| --- | --- | ---: | ---: | --- | --- |
| HKCU | ExpandString | 834 | 0 | `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb` | `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a` |
| HKLM | String | 1255 | 0 | `328294fe5e4b7651fc02e57312458ddcf7e7dbc0e149f5e835b07901871e8ee1` | `574ce42c7e2944222825c635962871249fa21b339683bad7a7877521b7ffbae8` |

NOT_RUN 為真實瀏覽器與實體裝置、輔助技術、隔離瀏覽器 Network/Storage／離線觀察、原生對話、正式 HTTPS／SEO、部署和獨立驗收。此輪沒有執行 GitHub 寫入或登記操作。
