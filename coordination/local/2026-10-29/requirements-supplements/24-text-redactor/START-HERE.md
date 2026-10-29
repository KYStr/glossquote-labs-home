# 開始：自訂文字遮蔽

狀態：M1 雙語本機 MVP 已實作並凍結，待主代理獨立驗收；M2/M3 與外部驗收尚未執行。

最新狀態（2026-10-13）：主代理 M1 已正式通過並放行 M2；M2 PUBLIC 來源及固定 Git blob ZIP 已驗證，commit 6cd97c6491cd032ec613acd4dcd61f0cc5735d7c。49 tests、check/build 與 build:production/check:production 全通過；詳細實際證據看 HANDOFF 最新 M2 節。Hosting、雙語首頁、外部審查未部署／驗收，保留所有 native NOT_RUN。

此工具對來源做 literal, case-sensitive, whitespace-sensitive replacement。它只知道使用者列出的 target，不會自動找到其餘個資；分享前須檢查完整 output。

閱讀順序：HANDOFF.md → TASKS.md → PRODUCT.md → TECHNICAL.md → ACCEPTANCE.md → UX-SEO.md → docs/。先確認允許路徑和 Node 24+。無需安裝依賴，即可執行：

- npm run dev：127.0.0.1:4204
- npm test
- npm run check
- npm run build
- npm run build:production：獨立 dist-production/，不覆寫 noindex preview
- npm run check:production
- npm run preview:production：loopback 127.0.0.1:5204，是真本地 HTTP model，不等於 Cloudflare edge

本機頁面 http://127.0.0.1:4204/index.html 與 http://127.0.0.1:4204/en/index.html。預覽只監聽 loopback，port 被占用時保留既有服務並印出 OS 指派的實際 port。

2026-10-13：Node v24.14.0、npm 11.9.0；npm test 44/44、npm run check、npm run build 通過。必要真 Edge 繁中／英文流程、320px、鍵盤、即時失效、清除、刷新、換行／emoji／未列出 email 已驗。原生 clipboard 讀回通過；B05 原生下載落盤 bytes、B09 實際 200% zoom、B10 完整 Network/Storage 與真設備／IME／screen reader 保留 NOT_RUN。

固定 evidence 位於 ../../.runs/text-redactor/m1-2026-10-13-01a133ac/；完整輸入／输出與能力限制見 browser-cases.json。初版 PRODUCT/TECHNICAL/ACCEPTANCE 的 SPEC_ONLY 是保留的初始規格，實際執行結果以 TASK-ENTRY/HANDOFF 為準。主代理放行 M1 前不進正式 SEO/source release。GitHub、Cloudflare、首頁與 external review 均未發布或驗收。
