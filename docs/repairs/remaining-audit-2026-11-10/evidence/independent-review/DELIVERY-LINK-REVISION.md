# R3 交付包退修：相對連結未完整保留

固定候選 PR #275 `56e11511d3c7f9053133bafb985ab175687da2a5`，實作與發布範圍不變。首份 ZIP `f7bd7eb88b2030d660d51b2110b7c9ad4f7d0e12d5bf0c1eb8f28efb1b9a985d` 通過內容、CRC、路徑、檔案清單與入口頁的七條相對連結。提交獨評前擴掃包內所有 Markdown，43 條相對連結只有 40 條可開啟。下列三個相對連結均出自未改寫的原百分比 SPEC：

- `../../SPECIFICATION-STOCK.md`
- `../weighted-percentile/SPEC.md`
- `../bakers-percentage-calculator/SPEC.md`

這三個目標存在於固定 [百分比規格來源](https://github.com/KYStr/glossquote-labs-home/tree/8dcea8e38aa4647e617db6c10a2d3d7ec7db247d/docs)，但未列於首份包的 [固定檔案清單](https://github.com/KYStr/glossquote-labs-home/blob/704063b99d1c9cf42a00c4ae31d3a8cc521dde56/docs/repairs/remaining-audit-2026-11-10/evidence/FILES.json)。不得沿用只查入口頁的通過結果。保留原 ZIP 證據，補交付包內的三個對應索引後，以新 SHA 重驗所有相對連結及交付內容。交付完整性 88 分，其他四項原分數不變；此紀錄為退修，沒有批准交付。
