# 網址參數檢視與整理開工順序

目前只有已審查的規格，尚無可用產品。不要把blueprint或Node檢查當成真瀏覽器/正式站驗收。

1. 讀[任務入口](TASK-ENTRY.md)、[契約](AGENTS.md)、[交接](HANDOFF.md)、[當前任務](TASKS.md)與[隱私](docs/PRIVACY-SECURITY.md)。
2. 做對應階段時才讀[產品](PRODUCT.md)、[技術](TECHNICAL.md)、[驗收](ACCEPTANCE.md)、[工程](docs/ENGINEERING.md)相關段落；首次UI/文案讀[UX/SEO](UX-SEO.md)、[品牌](docs/BRAND.md)與[完整設計](docs/DESIGN-SYSTEM.md)。已讀未變內容沿用。
3. 原功能對話實際實作，一次一個里程碑，通過後接續下個就緒任務，不只回計畫、不在每個T項重問許可。不得再委派/開新對話。
4. 本機通過後依[發布契約](docs/RELEASE.md)公開本工具source，交出[發布候選](docs/RELEASE-CANDIDATE.md)；主對話獨立驗收後序列部署與首頁整合。收到外部報告仍回本原對話修正。

一般命令由T00建立：npm run dev、npm test、npm run check、npm run build；Node24+。預覽port 4193。使用完整工具路徑或process-local PATH，不改Windows持久設定。
