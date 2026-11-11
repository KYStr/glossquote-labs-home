# 重現固定規格的字面驗算

使用 Node.js 24。從本資料夾執行下列指令，先將表格中的固定來源存成對應的參數路徑。可在其他位置保存 fixture，將參數改成該檔的路徑。驗算程式只讀參數檔，執行期間可離線。

| PR | 保存位置 | 固定 fixture | SHA-256 |
| --- | --- | --- | --- |
| #253 | `fixtures/battery-runtime-calculator.json` | [fixtures.json](https://raw.githubusercontent.com/KYStr/glossquote-labs-home/13ccc1ccb1d24ca1ec70b1912ad25c65521aa2e9/docs/specs/battery-runtime-calculator/fixtures.json) | `1f5ffad64a8f75839f67402b7d4b93059b2d44407b1273b6d81ab910ff7255fc` |
| #254 | `fixtures/reading-time-estimator.json` | [fixtures.json](https://raw.githubusercontent.com/KYStr/glossquote-labs-home/131cea60be513f3790bf3327930c6251fd622569/docs/specs/reading-time-estimator/fixtures.json) | `dad1d90236dd961d76d8d33e1e5123ac895a799edb15d4d371b612df66d00bf4` |
| #255 | `fixtures/photo-print-size-calculator.json` | [fixtures.json](https://raw.githubusercontent.com/KYStr/glossquote-labs-home/58edaa0d845256b1eb4cb772d8f7d7d80811e4d8/docs/specs/photo-print-size-calculator/fixtures.json) | `7893229924415e87fed19f31819a9e8dfc1571621c16cc2f08640755bdc85106` |
| #256 | `fixtures/group-generator.json` | [fixtures.json](https://raw.githubusercontent.com/KYStr/glossquote-labs-home/93c1a8a8b12930270b611850a6b85007da4f5c4d/docs/specs/group-generator/fixtures.json) | `51fd1ac04063da885fde5ebf4a287599283cca837de03d3075ca92f60ce976fb` |
| #257 | `fixtures/interval-timer.json` | [fixtures.json](https://raw.githubusercontent.com/KYStr/glossquote-labs-home/e86816781bc220d184a8c31ad50168730e1b973b/docs/specs/interval-timer/fixtures.json) | `6133ac436565addcb961071161e276a7c72dfd07f40de6f159a6a2dfae751969` |

```sh
node battery-runtime-calculator/verify.mjs fixtures/battery-runtime-calculator.json
node reading-time-estimator/verify.mjs fixtures/reading-time-estimator.json
node photo-print-size-calculator/verify.mjs fixtures/photo-print-size-calculator.json
node group-generator/verify.mjs fixtures/group-generator.json
node interval-timer/verify.mjs fixtures/interval-timer.json
```

stdout 是逐筆比對 JSON。exit 0 表示本次輸出的字面結果全部相符。間歇計時器有六筆狀態案例依部分規格及作者說明重建，完整狀態契約檢查是 NOT_RUN。各報告的九項產品檢查也均為 NOT_RUN。

公開副本保留固定候選、原 owner、驗算器和合成案例。命令使用可攜路徑，執行耗時與本機環境指紋僅留在本地證據。manifest 記錄同一資料夾內其餘檔案的原始 UTF-8 位元組數、SHA-256 及 Git blob。

[審查總表](REVIEW-INDEX.md) · [manifest](manifest.json)
