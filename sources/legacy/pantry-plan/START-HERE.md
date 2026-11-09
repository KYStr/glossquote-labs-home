# 食材差額採買單 — 公開來源起點

先讀 [README](README.md) 了解使用情境、開發命令與資料界線，再讀 [HANDOFF](HANDOFF.md) 核對已驗項與 NOT_RUN。這份公開來源的 runtime、scripts、tests、package.json 與 wrangler.jsonc 均與主代理審核的 M2A 固定來源逐 byte 相同；只整理供獨立 repository 閱讀的公開交接文件。

Node.js 24+、原生 ESM、built-in modules、零新增依賴。所有測試僅用假資料，fixtures 在 test 模組內或由同目錄 fake-dom.mjs 提供，不依賴其他 repository、私密資料或外部檔案。

完整驗證命令為 npm test、npm run check、npm run build、npm run build:release、npm run check:release。請從空的 release-artifacts 路徑開始首次建立；既有合法產物只驗證，未知或受損產物會停止。

原始碼公開後仍待主代理部署及首頁整合；外部驗收另行進行，不把公開 GitHub 視為可用的 live website。
