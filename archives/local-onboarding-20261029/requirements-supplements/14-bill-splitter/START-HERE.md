# 分帳與墊款結算開工順序

目前：**U14 v2 READY_FOR_INTEGRATION：文件／新版來源及固定ZIP已交付，待primary正式整合及新版外驗**（2026-10-13）。PUBLIC main `c82e8a182b36cf9568e28d9179a923e0fdaf7a4b`；兩種模式都由各人已付自動加總並列出誰付給誰，進階可按份數。29個固定程式／tests／scripts／設定hash與primary已驗版相符，沿用31/31；來源ZIP41檔及14個解壓正式資產核對PASS。owner已釋放，不重新實作或重跑未變gate。

本輪未部署新版。[繁中正式站](https://split.glossquote.com/index.html)／[English](https://split.glossquote.com/en/index.html) 仍對應舊 `88f2036a619a98398cd2f72ccd7adebe49dda18a`；舊版外部通過不適用U14。固定來源、ZIP、實際命令與人工NOT_RUN見 [交接](HANDOFF.md)及 [發布候選](docs/RELEASE-CANDIDATE.md)。primary下一步負責正式部署、雙語首頁及新版外驗包；新版確認前不標產品完成。

下列保留原開工／返工閱讀順序；它不是要求重新實作或重新發布已驗版本。

1. 讀[任務入口](TASK-ENTRY.md)、[契約](AGENTS.md)、[交接](HANDOFF.md)、[當前任務](TASKS.md)與[隱私](docs/PRIVACY-SECURITY.md)。
2. 做對應階段時才讀[產品](PRODUCT.md)、[技術](TECHNICAL.md)、[驗收](ACCEPTANCE.md)、[工程](docs/ENGINEERING.md)相關段落；首次UI/文案讀[UX/SEO](UX-SEO.md)、[品牌](docs/BRAND.md)與[完整設計](docs/DESIGN-SYSTEM.md)。已讀未變內容沿用。
3. 原功能對話實際實作，一次一個里程碑，通過後接續下個就緒任務，不只回計畫、不在每個T項重問許可。不得再委派/開新對話。
4. 本機通過後依[發布契約](docs/RELEASE.md)公開本工具source，交出[發布候選](docs/RELEASE-CANDIDATE.md)；主對話獨立驗收後序列部署與首頁整合。收到外部報告仍回本原對話修正。

一般命令由T00建立：npm run dev、npm test、npm run check、npm run build；Node24+。預覽port 4194。使用完整工具路徑或process-local PATH，不改Windows持久設定。
