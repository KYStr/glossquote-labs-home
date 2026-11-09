# Subtitle Time Shift — M2 source handoff

Portable source snapshot. Workspace history and final publication receipts are kept separately.

## M2 正式來源候選 — 2026-10-19

主代理已明確 GO M2。M1 固定 public 經主代理原 HTTP／隔離 Chromium 驗收：53 列整合為 30 PASS、17 明確範圍 PARTIAL、6 人工 NOT_RUN，並保留 native large editor/paste 的 NOT_RUN_ENVIRONMENT。這是帶既有排除的階段接受，沒有宣稱外驗完成。詳 [primary acceptance summary](docs/M1-ACCEPTANCE-SUMMARY.md)。

本輪新增 production-lib／production build/check／5216 preview+HTTP／release-check、14 個 production tests、exact wrangler.jsonc、M1 public pin、15 檔 dist-production 及 assets 外 [release-manifest.json](release-manifest.json)。原 public 13 檔與所有 app/core/module Worker/CSS bytes 未變；正式 HTML 僅 head SEO／visible FAQ JSON-LD，以及核准的兩個 footer 環境標籤替換。body 前後 hashes 與兩次精確替換均記於 manifest。

目前本地驗證：npm test 103/103 runner，其中 102 個有斷言案例、1 個 fixture 載入；check/build/build:production/check:production exit 0；production HTTP 43 checks；既有官方 Wrangler 4.147.0 dry-run exit 0，1702 runtime 檔前後一致，隔離 process home/config/temp，沒有 Cloudflare credentials、安裝或部署。8 個反向 CLI 案例對來源污染、陳舊產物、links、SEO、headers、config、manifest 及額外 body 變更如預期 exit 1，原陳舊檔保留。最終 release/source/guard receipt 另行固定。

- M1 public inventory SHA-256：`0326098381c7f70510374488259b1dd50a3a9a0e95a1b31390e02ab0bcc06404`。
- Production 15 檔 inventory SHA-256：`a8e04a22341f0048a88ccb0f59f4c8a9b0af488a573da4b883cf8fa773f84e8b`。
- 指定來源 repository：[KYStr/glossquote-labs-subtitle-shift](https://github.com/KYStr/glossquote-labs-subtitle-shift)，branch `codex/subtitle-shift-m2`。
- 此 source-candidate checkpoint 不嵌入自己的 Git commit／ZIP hash；精確 commit 由 Git history／archive comment 與外部 publication receipt 固定。

主代理負責 M2 獨立驗收後的 M3 部署、live checks 及雙語首頁。本輪不部署、不改首頁、不執行任何 browser/CUA/native UI。原生 IME、AT、native browser zoom、native save與真機下載、低階手機／虛擬鍵盤、真 crash、native large paste 均保留排除；production live HTTP/Network/Storage/browser 仍待主代理。操作與重現方式見 [M2 release notes](docs/M2-RELEASE.md)。
固定 M2 code/docs 候選（55 檔，排除三個可變狀態檔）SHA-256：`3c293e19b7f15c312811f83dff8b76433ad0fe4e3ecd853844d9de9375530c82`。
