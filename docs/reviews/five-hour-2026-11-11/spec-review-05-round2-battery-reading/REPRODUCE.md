# 重現兩個固定候選的字面驗算

從本目錄執行。電池用 Node.js 24，閱讀用 Python 3.12 標準函式庫。將固定 GitHub raw 來源保存為下表參數路徑並核對 SHA-256，保留 UTF-8 bytes 與 Unicode 轉義。驗算器只讀兩個參數檔，執行期間可離線。

| 參數路徑 | 固定來源 | SHA-256 |
| --- | --- | --- |
| `fixtures/battery-original.json` | [固定 fixtures.json](https://raw.githubusercontent.com/KYStr/glossquote-labs-home/13ccc1ccb1d24ca1ec70b1912ad25c65521aa2e9/docs/specs/battery-runtime-calculator/fixtures.json) | `1f5ffad64a8f75839f67402b7d4b93059b2d44407b1273b6d81ab910ff7255fc` |
| `fixtures/battery-candidate.json` | [固定 fixtures.json](https://raw.githubusercontent.com/KYStr/glossquote-labs-home/4ffb54a6d0f763be3f923eec8b9a0baab88cb90c/docs/specs/battery-runtime-calculator/fixtures.json) | `21af4da6215a2c734cec86c3876cf50a1bd14982bee3796a34de5393c40595ea` |
| `fixtures/reading-original.json` | [固定 fixtures.json](https://raw.githubusercontent.com/KYStr/glossquote-labs-home/131cea60be513f3790bf3327930c6251fd622569/docs/specs/reading-time-estimator/fixtures.json) | `dad1d90236dd961d76d8d33e1e5123ac895a799edb15d4d371b612df66d00bf4` |
| `fixtures/reading-candidate.json` | [固定 fixtures.json](https://raw.githubusercontent.com/KYStr/glossquote-labs-home/746583dc063e64f3ffcdf6b37c1051f36c44ac5c/docs/specs/reading-time-estimator/fixtures.json) | `be8c74e69b90e1286ec769518787c62670e70bcaf3e95e145bc12293083a674e` |

```sh
node battery-runtime-calculator/verify.mjs fixtures/battery-original.json fixtures/battery-candidate.json
python -B -X utf8 reading-time-estimator/verify.py fixtures/reading-original.json fixtures/reading-candidate.json
```

stdout JSON 含每個字面輸入、獨立結果與固定 expected。兩個命令各 exit 0，電池 40 筆、閱讀 24 筆。閱讀原 fixture 採原 PR #254 的固定來源，與維護 PR 的直接父提交逐 bytes 相同。下載或狀態模型的產品實測維持 NOT_RUN。

[審查總表](REVIEW-INDEX.md) · [檔案 manifest](manifest.json)
