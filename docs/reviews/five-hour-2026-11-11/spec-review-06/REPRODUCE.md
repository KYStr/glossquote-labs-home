# 重現獨立文件驗算

使用 Python 3.12 或更新版本。驗算腳本使用 Python 標準函式庫。保留整個證據目錄的資料夾結構。

從下列固定提交取得字面案例，依表中檔名存入同一資料夾。保留下載的原始 bytes。

| 存檔名稱 | 候選來源 | Git blob SHA-1 |
| --- | --- | --- |
| currency-converter.json | [固定 fixtures.json](https://raw.githubusercontent.com/KYStr/glossquote-labs-home/dcb21d0903006a708584edba8713e6117f8138a6/docs/specs/currency-converter/fixtures.json) | 832cfe335942fe94ff605b5e38abf1cdfae4d47e |
| dice-roller.json | [固定 fixtures.json](https://raw.githubusercontent.com/KYStr/glossquote-labs-home/5dccd3dcfbe72aa52c9a892391a44719e9de3f9a/docs/specs/dice-roller/fixtures.json) | 7a14f744c78239c95a87e519da8e4a466f5621cd |
| pool-volume-calculator.json | [固定 fixtures.json](https://raw.githubusercontent.com/KYStr/glossquote-labs-home/7e446e401c1e3e8c6a7b83808e0eeecbff6c807a/docs/specs/pool-volume-calculator/fixtures.json) | cee682b0b796bff7266faec273379d719adb5747 |
| baby-feeding-calculator.json | [固定 fixtures.json](https://raw.githubusercontent.com/KYStr/glossquote-labs-home/558e5afa80f14c686e40a306435b81672219fa68/docs/specs/baby-feeding-calculator/fixtures.json) | 7d4ec6450dc4fca1107cc544c03483ab66453e1f |
| pet-feeding-calculator.json | [固定 fixtures.json](https://raw.githubusercontent.com/KYStr/glossquote-labs-home/282fb18912c0435257c13b96b5562e410e3a2521/docs/specs/pet-feeding-calculator/fixtures.json) | 110f99a47f179f988482c124b1af3d7827732c8f |

在本證據目錄執行以下命令。將參數替換為上述案例資料夾的路徑。

```sh
python -B verify-evidence.py --fixtures-dir "/path/to/fixtures"
```

驗證會先核對 manifest 所列檔案的 SHA-256、Git blob 與案例來源，再離線重跑五份獨立驗算。
逐筆比較字面輸入、候選預期與推導結果。Python 版本另列。預期五支 verifier 皆 exit `0`，合計 112 筆。

個別驗算也可直接執行，並把第二個參數換為該候選的固定 `fixtures.json`。

```sh
python -B currency-converter/verify.py "/path/to/fixtures/currency-converter.json"
```

manifest 涵蓋其餘發布檔案。候選提交與產品驗收狀態見 [審查總表](SUMMARY.md)。
