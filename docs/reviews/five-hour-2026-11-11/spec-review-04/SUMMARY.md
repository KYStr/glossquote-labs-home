# FH-spec-review-04 獨立文件審查總表

五份固定預案均已完成獨立文件審查，建議逐件退修。104 個字面案例依原契約重算 87 個相符。台灣水費的 17 個差異由欄位容量衝突引起，僅放寬該欄位容量的診斷對照為 22/22。

| 預案與證據 | 固定 PR | 案例相符 | 文件缺陷 | 遠端預案 |
| --- | --- | ---: | --- | --- |
| [通膨計算機](inflation-calculator/REVIEW.md) | [#247](https://github.com/KYStr/glossquote-labs-home/pull/247) `ecbe6325b65b` | 27/27 | INFL-01、INFL-02、INFL-03、INFL-04 | draft |
| [台灣水費試算](taiwan-water-bill/REVIEW.md) | [#248](https://github.com/KYStr/glossquote-labs-home/pull/248) `b23afd542d52` | 5/22 | WATER-01、WATER-02、WATER-03 | draft |
| [車輛折舊計算](car-depreciation-calculator/REVIEW.md) | [#250](https://github.com/KYStr/glossquote-labs-home/pull/250) `efad9c067e60` | 17/17 | CAR-01 | draft |
| [照明流明計算](lighting-lumen-calculator/REVIEW.md) | [#251](https://github.com/KYStr/glossquote-labs-home/pull/251) `3119dccbc0c6` | 17/17 | LIGHT-01、LIGHT-02、LIGHT-03、LIGHT-04 | draft |
| [螢幕 PPI 計算](screen-ppi-calculator/REVIEW.md) | [#252](https://github.com/KYStr/glossquote-labs-home/pull/252) `c8c11e12d1ee` | 21/21 | PPI-01、PPI-02 | draft |

**REG-01** 五份的製作繼承契約都仍是規格製作任務的八個文件面向，與 SPEC 的九個產品面向不符。主統籌接續同 ID 維護與新 head 複驗。ready 推薦 0 件。

台北 2026/11/11 11:18:05 讀回 registry r1553、blob `41782f0214ca3ad31763fdc8a9062f6569db531a`。五個 PR head、候選、原 owner 和 claim 與 r1530 一致。七份規則檔的 Git blob 一致。固定候選均為文件包，本組九項產品驗收均為 NOT_RUN。正式審查操作待主統籌安排串行 slot。 [來源與檔案查核](handoff-check.json)

各逐份報告包含八節分數、固定版次、官方來源、重現輸入、驗算命令及 exit。

## 重現審查

在本目錄執行命令。驗算版本為 Node.js 24.14.0，只使用內建模組。各預案目錄內的 `source-fixtures.json` 為對回固定 Git blob 的字面案例，可離線驗算。

- `node verify-manifest.mjs` 離線核對檔案位元組、SHA-256、Git blob 與相對連結。
- `node verify-sources.mjs` 透過 GitHub 的公開固定 commit 讀回原始文件與登記冊雜湊。
- `node inflation-calculator/verify.mjs` 預期 exit 0。
- `node taiwan-water-bill/verify.mjs` 預期 exit 1，原規格 5/22 相符。
- `node car-depreciation-calculator/verify.mjs` 預期 exit 0。
- `node lighting-lumen-calculator/verify.mjs` 預期 exit 0。
- `node screen-ppi-calculator/verify.mjs` 預期 exit 0。
- `node taiwan-water-bill/verify.mjs --cycle-cap-nine` 重現只調整週期欄容量的診斷，預期 exit 0、22/22。

各預案的驗算命令加 `--json` 會將完整結果寫到標準輸出。原始字面案例與審查證據留在套件內。

[檔案清單與雜湊](manifest.json)
