# 股票損益計算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（build5 spec 作者），候選分支 `muse/spec-stock-profit-calculator-20261109`。作者文件核對，待非作者 readiness；本文不是獨立審查。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 已比對 checkout 內 101 份既有預案，無股票／投資／損益／交易類規格（以 stock、invest、profit、trade、dividend、broker 檢索 slug 皆無）。最相近者 compound-interest-calculator（複利成長）與同批 tax-included-converter（營業稅含稅換算）的實質差異見 SPEC scope。

## 參數查證（2026-11-09，官方來源）

- 手續費率 0.1425%：臺灣證券交易所法規分享知識庫「營業細則」第 94 條原文（2026-11-09 讀取）——證券商得自訂費率標準、折讓與每筆最低費用，經申報單一窗口向證交所備查後實施；所訂費率逾成交金額 0.1425% 者，應於受託前通知客戶並留存紀錄。費率標準之核定依據為證券交易法第 85 條。結論：0.1425% 為條文基準費率（實務牌告原價），非每位客戶的固定實收率，故釘為可改輸入預設。
- 最低費 NT$20：**概念備註原寫「Minimum fee NT$20 per trade pinned (verify)」，查證後修正其性質**——同條第 94 條只授權券商自訂「每筆最低費用」並申報備查，金額無法定統一數字。NT$20 為整股市場普遍慣例（例：元大證券牌告「每筆手續費若不足 20 元，最低以 20 元計收」，司法判決書附表引述該牌告）；零股各家常為 NT$1，部分券商有 1 元優惠。SPEC 已標明「券商慣例、非法定」，釘為可改輸入、預設 20。
- 證交稅 0.3%：財政部主管法規共用系統「證券交易稅條例」第 2 條第 1 款，公司發行股票按成交金額千分之 3，由賣方負擔（英文版同值 0.3% for shares）；財政部賦稅署「證券交易稅稅率表」（資料更新截止 2026-05-31）同列股票 3‰。釘為可改輸入預設（股票型 ETF 千分之 1 走自訂路徑，案例 `custom-tax-rate`）。
- 現股當沖 0.15%：同條例第 2 條之 2——同一證券商受託買賣、同一帳戶、同日、同種同量現股沖銷，賣出稅率千分之 1.5；期間自 2017-04-28 起至 2027-12-31（116 年 12 月 31 日），最近一次修正由總統令 2025-01-02 公布延長。資券當沖不適用（仍 3‰），SPEC scope 已註明開關只模型化現股當沖。到期日只作揭露文字、不進計算分支，核心結果不隨日期漂移。
- 尾數處理：各券商對手續費／稅額的小數處理未見統一法規明文，故本工具自行釘定「精確有理數運算，費用與稅各在單一步驟四捨五入（floor(x+1/2)）至整數元，最低費於折讓與進位之後適用」，並在 SPEC 與 FAQ 揭露以券商對帳單為準。此為設計決定，非宣稱法規。

## 案例雙重推導

13 筆核心案例先由作者依 SPEC 公式手算（逐步列出毛額、未進位費用、進位後費用、最低費比較、稅、淨額、成本分攤、損益、報酬率；兩平點以代回費用模型逐分驗證「該價達標、低 1 分不達標」），再以獨立 Python 實作（fractions.Fraction 精確有理數，兩平點由低分起逐分掃描取首個達標價，不假設單調性）重算，寫入 fixtures 後第三次以另一支驗證腳本載入 fixtures.json 重跑全部核心案例逐欄比對。

- 雙方法一致：round-lot-profit（手續費 142.5 → 143 為 half-up 判別點）、odd-lot-loss-min-fee（稅 16.5 → 17）、day-trade（稅 151.5 → 152）、partial-sell（賣費 370.5 → 371）、lot-units、min-fee-applies、zero-tax-rate（買費 28.5 → 29 對比銀行家捨入的 28）、custom-tax-rate、prorata-basis、sell-exceeds-buy、price-too-precise、zero-discount、empty-sell-price。
- 一處手算誤差經重算糾正並保留紀錄：prorata-basis 報酬率手算初估 19.24%，精確分數為 1927/10019 = 19.2335…%，正確值 19.23%，fixtures 採 19.23。
- 一處轉寫誤差經 fixtures 重跑驗證抓出並修正：custom-tax-rate 的 buyGross/buyFee 初寫 38000/54，正確為 40000/57（buyTotal 40057 與其餘欄位原本即正確）。修正後 13/13 核心案例全數與獨立實作逐欄相同。
- 3 筆 controller 案例沿用本批制式（dirty/cancel-late/replace-late），草稿與 lateResult 即 round-lot-profit 的輸入與結果，edit 以 sellQty 2000 觸發 SELL_EXCEEDS_BUY。

## 未驗與界線

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
- 費率參數為 2026-11-09 查證值；當沖減半稅率 2027-12-31 到期後是否延長，非本文件能保證，頁面揭露以官方公告為準。
