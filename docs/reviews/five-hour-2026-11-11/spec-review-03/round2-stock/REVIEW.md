# 股票損益規格獨立複審

建議接受文件維護候選 `95ead301f8735dede61bc1911bbc7ed6c4b79bb5`。登記快照 r1591 中，`labs-five-hour-repair-stock-20261111` 仍為 `working` 且尚無提交。正式審查需待維護者提交同一候選及主統籌排定登記時段。原規格仍為 `draft`，REG-01 待另案。 [維護 PR #305](https://github.com/KYStr/glossquote-labs-home/pull/305) · [原始 PR #244](https://github.com/KYStr/glossquote-labs-home/pull/244)

| 維護面向 | 評分 | 依據 |
| --- | ---: | --- |
| `spec-corrections` | 100 | ST-01 至 ST-04 已落入輸入、驗證、算式、介面與下載契約。 |
| `exact-fixtures` | 100 | 重算 29 個核心案例、4 個狀態案例的 12 個檢查點、8 個價位及 2 份匯出。16 個原案例皆符合遷移規則。 |
| `provenance-and-scope` | 100 | 原四檔與第一段提交逐位元組相同。第二段差異可精確重建候選四檔。兩位 owner、原候選與維護 claim 核對一致。 |

- **ST-01。** 1000 股和 1 張的當沖輸出相同。買 2 張、賣 1000 股時，匹配賣出量以 0.15% 試算，稅 NT$165.00，餘 1000 股。兩腿不合規先報買進量，賣出超量先報 `SELL_EXCEEDS_BUY`，確認缺欄或錯型別先報 `SCHEMA`。當沖改價清除資格確認和下載，重送回 `DAY_TRADE_CONFIRMATION_REQUIRED`。已重讀標準稅率、同帳戶同日適格交易、整批、零股排除及 2027-12-31 優惠期限。 [證券交易稅條例](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=G0340078) · [當日沖銷專區](https://www.twse.com.tw/zh/products/system/day-trading.html) · [證交所營業細則第 60 條](https://twse-regulation.twse.com.tw/TW/law/DAT0201.aspx?FLCODE=FL007304)
- **ST-02。** 成本 NT$100,143.00 時首個整分理論價是 NT$100.59。相鄰委託格點 NT$100.50 與 NT$101.00 的模型淨額分別是 NT$100,055.00 和 NT$100,553.00。兩語標籤、FAQ 與報告的 `breakevenPriceIsOrderQuote:false` 一致。0.1425% 與最低 NT$20 為可編輯的示例預設。 [證交所營業細則第 62 條](https://twse-regulation.twse.com.tw/TW/law/DOC01_print.aspx?FLCODE=FL007304&FLNO=62) · [第 94 條](https://twse-regulation.twse.com.tw/TW/law/DOC01.aspx?FLCODE=fl007304&FLNO=94)
- **ST-03。** 費與稅的進位各差至多 NT$0.50，最低費不放大誤差。參考程式用整數比較未捨入淨額，找成本 ± NT$1 的兩個交會分位，再依分升序核對進位後淨額。未捨入淨額的斜率至少 0.98，閉區間至多 `1 + ceil(200 / (0.98q)) ≤ 206` 個分位。49／50／51 元的模型淨額分別為 49／48／49 元，最早達標是 49.00 元，搜尋區間 4898 至 5103 分共 206 個。最高輸入價格和最低費上限的案例在 NT$1,212,118.99 達標，區間共 203 個。
- **ST-04。** 核對 10 個固定兩位金額字串，分攤成本 `1001422987135770.01` 在核心和匯出均保有末分。`103/300` 元雖捨入為 `0.34`，保本比較仍使用精確成本，首次達標價是 `1.35`。另外重算 −6.50 元損益捨入為 `-6.00`，以及 −0.005% 報酬率捨入為 0。

Node v24.14.0，`node verify.mjs <修訂 fixtures.json> <原始 fixtures.json>`，exit 0。16 個核心成功案例從第 1 分獨立枚舉共 157,995 個分位。另驗 11 個探針、288 組邊界，其中 172 組從第 1 分枚舉共 411,968 個分位。兩份報告分別為 363 與 468 bytes，UTF-8 字面、單一 LF、檔名與 SHA-256 一致。 [驗算程式](verify.mjs) · [機器輸出](fixture-output.json)

固定父提交 `17ac162a` → `66acd507` → `95ead301`。兩段各四檔，差異檔可套回原始 bytes 並精確重建候選。Windows 持久環境指紋前後相同。 [固定來源與登記證據](provenance.json) · [結構化提案](review-proposal.json)

八個文件章節均在。產品九項、瀏覽器、實際 Worker、實際下載、正式站、合併與部署均為 `NOT_RUN`。狀態與匯出驗算使用獨立參考模型及固定文件字面。
