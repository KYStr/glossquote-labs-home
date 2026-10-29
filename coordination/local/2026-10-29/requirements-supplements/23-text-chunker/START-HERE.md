# 開始：文字分段與字數限制

狀態：CHUNK-M1-R1 copy lifecycle 修正候選已凍結，等待主代理重新驗收；尚未 production/source publication/deployment。真設備、原生負向 clipboard、真 BFCache/pending 等 NOT_RUN 項見 HANDOFF，不算 PASS。核心規格保留初始狀態文字作歷史依據。

閱讀順序：TASKS.md（目前 gate 和允許檔案）、PRODUCT.md（使用者行為與上限）、TECHNICAL.md（純函式/API）、ACCEPTANCE.md（精確 expected）、UX-SEO.md（兩語畫面與文案）、docs/（工程/私隱/發布契約）。

MVP 由使用者明確貼入長文、選每片最多 code points 與切割模式，再按分段。任何來源/設定變動立即清除舊輸出；輸出片段不得修改或加段號，串接必須等於原文。Emoji grapheme 可能被拆，這不代表平台字數支援。

已實作的本機命令（Node v24.14.0 / npm 11.9.0）：
- Node.js >=24
- npm run dev → 127.0.0.1:4203；預覽 /index.html 與 /en/index.html
- npm test
- npm run check
- npm run build

2026-10-13 R1：npm test 59/59 PASS、check/build exit 0；主 preview `127.0.0.1:4203` 保留供主驗。當前固定 manifests、實際 app callback trace、red/green logs、actual diff、受影響真瀏覽器流程在孵化器根 `.runs/text-chunker/m1-r1-20261013/`；原 M1 證據不覆寫。本輪用該目錄 freeze.mjs，不使用仍指向原 M1 的 scripts/snapshot.mjs。先讀 HANDOFF 最新狀態，再依 TASKS gate；主代理未放行前不建立 production/公開 repo。
