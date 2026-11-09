# 分帳計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，run 5 補庫概念 #4。本文件是作者本人對文件的核對，明確不是獨立審查；ready 與否由非作者 reviewer 決定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- §6 已預宣告九個產品面向與必要證據；本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。
- 差異比對（設計層級）：shared-electricity-split 為依用量加權分攤、無稅／小費順序；discount-calculator 與 percentage-calculator 為單一金額百分比運算、無等分與餘數分配；tax-included-converter 為含稅價反推、本案稅額永遠以稅前帳單金額計算。registry 層級的查重由統籌在登記時核實，本人未執行 registry 指令。
- 本案無外部法規、費率表或官方公式來源；稅率與小費比例由使用者輸入，捨入（四捨五入、只在稅額與小費各捨入一次）與餘數分配（排序在前者依序多付一分）為產品規則，已在 SPEC 釘版並於 FAQ 揭露，無概念說明與一手來源衝突待修正事項。

## Fixture 雙重推導（手算＋獨立重算）

每個成功案例先以手算依 SPEC 規則推出，再以獨立的 Python `fractions.Fraction` 精確有理數腳本重算（解析百分比為千分之一整數、roundHalfUp 以 ⌊(2n+d)/(2d)⌋ 實作、等分以 divmod 驗算），兩者 10/10 完全一致；腳本同時斷言 sum(sharesCents)＝totalCents 與 max−min≤1，全部通過。手算如下（單位：分）。

| 案例 | 手算 |
| --- | --- |
| `basic-pre-tax` | 稅 10000×10%＝1000；基數（稅前）10000，小費 10000×15%＝1500；總 12500＝3×4166＋2 → 前 2 人 4167、末人 4166。 |
| `post-tax-tip` | 基數 10000＋1000＝11000；小費 11000×15%＝1650；總 12650＝3×4216＋2 → [4217, 4217, 4216]。 |
| `tax-half-up-tie` | 稅 1005×10%＝100.5，恰半分進位 → 101；總 1106；1 人 [1106]。 |
| `tip-rounds-down` | 小費 1002×15%＝150.3 → 150；總 1152＝2×576 → [576, 576]。 |
| `fractional-tax-rate` | 稅 8640×8.875%＝766.8 → 767；總 9407＝4×2351＋3 → [2352, 2352, 2352, 2351]。 |
| `zero-bill` | 帳單 0 → 稅、小費、基數皆 0；總 0；5 人 [0, 0, 0, 0, 0]。 |
| `single-person` | 稅 5999×5%＝299.95 → 300；基數 6299；小費 6299×20%＝1259.8 → 1260；總 7559；[7559]。 |
| `even-split-no-extras` | 稅與小費 0；總 9000＝3×3000 → [3000, 3000, 3000]。 |
| `large-party-post-tax` | 稅 12345×8.25%＝1018.4625 → 1018；基數 13363；小費 13363×12.5%＝1670.375 → 1670；總 15033＝7×2147＋4 → 前 4 人 2148、後 3 人 2147。 |
| `tiny-bill-many-people` | 總 5；10 人 → q＝0、r＝5 → 前 5 人各 1、後 5 人各 0。 |

錯誤案例逐筆以手算核對釘版驗證順序：`people-zero`（"0" 文法通過、值 0＜1 → RANGE/people）；`people-over-max`（"101" 為 3 單元在容量內、值 101＞100 → RANGE/people）；`bill-format`（"12.345" 小數 3 位不合 ≤2 位文法 → DECIMAL_FORMAT/bill）；`percent-format`（"8.8755" 小數 4 位不合 ≤3 位文法 → DECIMAL_FORMAT/taxPercent）；`tip-base-enum`（"gross" 為 5 單元在容量內、非列舉值 → ENUM/tipBase）；`bill-empty`（"" 容量與 surrogate 先過、空值先於文法 → EMPTY/bill）；`bill-input-limit`（"1234567.89" 為 10 單元＞9 → INPUT_LIMIT/bill，先於文法）；`tip-percent-range`（"100.5" 文法通過、值 100.5＞100 → RANGE/tipPercent）。三個 controller 案例沿用 `basic-pre-tax` 的 input/result 逐字對應，狀態轉移與預設值已逐項核對。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN。未固定候選或未獨評前不計 ready。
