# 五份規格查重的重現方式

原始觀察時間為 2026-11-11 13:56:20（臺北）。以 `codex/initial-publication` 的登記 r1621 和當時開啟中的 PR 為準。 [查重報告](REPORT.md) · [結構化證據](evidence.json) · [PR 快照](open-pr-snapshot.json)

## 核對原始觀察

1. 把本目錄三份證據存到同一資料夾，在該資料夾執行下列 Node 命令，比對 SHA-256。

   ```sh
   node -e "const fs=require('node:fs'); const crypto=require('node:crypto'); for(const file of process.argv.slice(1)){console.log(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), file)}" REPORT.md evidence.json open-pr-snapshot.json
   ```

   | 檔案 | SHA-256 |
   | --- | --- |
   | `REPORT.md` | `d9bc9418e34dc9382766a5dbe4a1d35aa8acdff617eacffc89d2de624a5227aa` |
   | `evidence.json` | `6dd2c64665a93e0dccc53204bc8e6aee2f812054f4c6042bb37bf163fda9753f` |
   | `open-pr-snapshot.json` | `7bb0ffc26971622b5c084df66d5c16d3bacf179a531c4a1161f8412b6d6854b5` |

2. 以主分支提交 `486390871b882099e749f40061e381a2dab86776` 讀取登記與目錄。以遞迴樹的 `path`、`sha` 和 `size` 對照來源清冊的 `path`、`gitBlob` 和 `bytes`。結果為 9,684 個樹項目、5,237 筆清冊相符。 [固定登記 r1621](https://github.com/KYStr/glossquote-labs-home/blob/486390871b882099e749f40061e381a2dab86776/coordination/work-registry.json) · [固定目錄](https://github.com/KYStr/glossquote-labs-home/blob/486390871b882099e749f40061e381a2dab86776/catalog.json) · [固定來源索引](https://github.com/KYStr/glossquote-labs-home/blob/486390871b882099e749f40061e381a2dab86776/coordination/source-index.json) · [固定來源清冊](https://github.com/KYStr/glossquote-labs-home/blob/486390871b882099e749f40061e381a2dab86776/coordination/source-files.json) · [固定遞迴 Git 樹](https://api.github.com/repos/KYStr/glossquote-labs-home/git/trees/b2c6359014c4c914eb64b3f7bc2afd393850a6b3?recursive=1)
3. 以 PR 快照的 `pullRequests` 重現當時的開啟清單。逐筆以 `head` 釘定提交、以 `changedPaths` 檢查變更，合計 293 個 PR 與 6,665 筆路徑。GitHub 當前的 PR 清單可能已更新。
4. 從 `evidence.json` 的 `candidates[].doc` 讀五份固定規格，從 `comparedFiles` 按 `ref`、`path` 與 `blob` 核對近似產品的輸入及輸出。登記的 owner 和 claim 可在各 `candidates` 記錄與固定登記交叉比對。

## 發布前增量核對

2026-11-11 14:11:34（臺北）讀到 `0a5e02b91c512a9298dee6c71966c1f629ab65cc` 的 r1637。相較 r1621，主分支檔案差異限登記冊。五份規格仍為未消耗的 `draft`，相關製作承接為 0。 [固定登記 r1637](https://github.com/KYStr/glossquote-labs-home/blob/0a5e02b91c512a9298dee6c71966c1f629ab65cc/coordination/work-registry.json) · [主分支差異](https://github.com/KYStr/glossquote-labs-home/compare/486390871b882099e749f40061e381a2dab86776...0a5e02b91c512a9298dee6c71966c1f629ab65cc)

- PR #324 固定 head `3bc18c8ec3659ad87b3da37b5c7dac59570cb288` 的五份 `SPEC.md` 與 `candidates[].doc` 逐位元組相同，五筆雜湊及長度也符合映射 JSON。 [PR #324 的固定映射](https://github.com/KYStr/glossquote-labs-home/blob/3bc18c8ec3659ad87b3da37b5c7dac59570cb288/docs/reviews/five-hour-2026-11-11/eight-spec-mapping/mapping.json)
- PR #323 的料理單位換算仍以數值、原單位、目標單位和食材為輸入。PR #325 的產品變更限壁紙用量與坪數換算。PR #322 及更新 head 的 #321 追加規格審查證據。 [PR #323 固定核心](https://github.com/KYStr/glossquote-labs-home/blob/3fd8379427b1318ba65c1169f0256befc47ca93a/tools/cooking-measurement-converter/public/js/core/convert.mjs) · [PR #325 固定驗證](https://github.com/KYStr/glossquote-labs-home/blob/8fbd9ac4d98865480444ce11c4b772389a54ea3c/docs/reviews/five-hour-2026-11-11/product-wallpaper-ping/VERIFICATION.md) · [PR #322](https://github.com/KYStr/glossquote-labs-home/pull/322) · [PR #321](https://github.com/KYStr/glossquote-labs-home/pull/321)

查核涵蓋中央公開登記、目錄、來源與當時的開啟 PR。未公開分支、未登記工作及即時站點狀態仍屬未知。
