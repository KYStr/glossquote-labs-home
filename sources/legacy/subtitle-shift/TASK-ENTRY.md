# B19-36-M2 source checkpoint

Portable source snapshot. Workspace history and final publication receipts are kept separately.

2026-10-19：主代理已依固定 M1 的 scoped browser acceptance 明確 GO M2；不是外驗完成。正式來源候選及公開 GitHub 由本原功能對話負責，M3 部署與首頁由主代理負責。

本輪新增正式工具鏈、exact static-only config、15 檔正式產物與 assets 外 manifest。M1 public 13 檔原樣固定，production HTML 僅 head SEO／JSON-LD 與兩個精確核准 footer 標籤替換。`test/check/build/build:production/check:production` 通過；102 有斷言案例 + 1 fixture runner；5216 production HTTP 43 checks 通過；Wrangler 4.147.0 dry-run exit 0、1702 runtime 檔前後一致；8 個 CLI 反向案例如預期拒絕。最終 release/source-publication receipt 見 [HANDOFF](HANDOFF.md)。

公開來源目標：[KYStr/glossquote-labs-subtitle-shift](https://github.com/KYStr/glossquote-labs-subtitle-shift)，branch `codex/subtitle-shift-m2`。本狀態檔是 source-candidate checkpoint，精確 published commit 與 ZIP receipt 由 Git／外部交付記錄固定，不在檔案中自我引用。

主代理 M1 browser consolidation：30 PASS／17 scoped PARTIAL／6 manual NOT_RUN，另有 native large paste `NOT_RUN_ENVIRONMENT`。真 IME／AT／native zoom／native save與real-device／low-end與virtual keyboard／real crash 等排除原樣保留，詳 [primary summary](docs/M1-ACCEPTANCE-SUMMARY.md)。此對話不執行任何 browser/CUA/native UI，不部署，不更新首頁，不宣告外驗完成。
固定 M2 code/docs 候選（55 檔，排除三個可變狀態檔）SHA-256：`3c293e19b7f15c312811f83dff8b76433ad0fe4e3ecd853844d9de9375530c82`。
