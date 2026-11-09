# 折扣計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（Muse），規格任務 `labs-discount-calculator-spec-20261109`（由主代理登記）。這是作者自己的文件核對，**不是獨立審查**；ready 須由非作者 reviewer 實核八節與字面案例後另行標記。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 去重：已比對基線 `992da13a` 的 `docs/specs/` 101 份預案，其中無 discount、unit-price 或 cart-check 規格；最相近者為 `sources/candidates/unit-price`（比較不同包裝的單位價格）與 `sources/candidates/cart-check`（核對購物車逐列總額）。兩者都不做單一商品的疊加折扣鏈（兩重百分比折扣連乘＋定額券＋折扣後計稅＋幾折換算），實質差異已寫入 SPEC 的 scope。

- Fixture 複核：7 筆字面核心案例的每個預期值都先以手算依 SPEC 規則推導，再以另一份依同一規則獨立寫成的試算逐值複核，兩次一致才寫入；寫入後再解析 fixtures.json 並以該獨立試算對核心案例的 input 重跑一次比對（第三次核對）。專門案例守住三個易錯點：half-up 恰 .5（502.5→503）、小數百分比鏈（12.5% 再 5%）、券超過折後價只抵到 0。3 筆 controller 案例比照範本結構（dirty/error、cancel-late、replace-late）。

- 概念未定、由作者決定的事項：六欄位的文法與上限（金額整數部 ≤7 位、百分比 ≤3 位＋2 位小數、數量 1–999）；預設值（price 1000、八折再九折、券 0、稅率 5、數量 1；稅率 5 只是台灣消費情境預設，SPEC 明言不宣稱任何法定稅率）；券超額只抵到 0 不報錯；共省金額、有效折扣 % 與幾折一律以稅前折後價計；下載明細 `discount-calculator-report.json` 的序列化規則比照範本。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
