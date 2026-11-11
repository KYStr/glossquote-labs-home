# 露點計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（run 5 spec authoring）。本文是作者對自己文件的核對，**不是獨立審查**；ready 與否由非作者 reviewer 決定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對本 repo `docs/specs/` 全部既有規格目錄與 registry 規格 ID：無 dew-point／humidity 工具，無重複。體感溫度類概念（風寒／熱指數）輸入與模型不同，差異已寫入 scope。

## 來源核實與常數決定

- Magnus 常數 a = 17.27、b = 237.7 °C、es(0 °C) = 6.112 hPa：已對照公開來源核實（Magnus–Tetens 形式；Lawrence, M. G. (2005), BAMS 86(2): 225–233 為 RH–露點關係的標準文獻；多個氣象來源標示此常數組在 −45…60 °C 約 ±0.4 °C，是 0–60 °C 最常用的擬合組）。概念註記原即釘此組，與來源一致，直接採用。
- 考慮過的替代：Alduchov & Eskridge (1996) 常數 a = 17.625、b = 243.04 °C（−40…50 °C 精度更高，約 ±0.05 °C）。未採用的理由：概念註記已釘 17.27/237.7 且該組為公開來源中最普遍的擬合；換組會改變全部 fixture 值而精度差異（≤0.4 °C）不影響本工具的生活判斷用途。此決定記錄在此，供 reviewer 裁量。
- 絕對濕度常數 216.7：由水氣氣體常數 Rv = 461.5 J/(kg·K) 以理想氣體定律導出，10⁵/461.5 = 216.68…，釘版取 216.7。AH 與露點共用同一組釘版 es（17.27/237.7）；市面常見 AH 公式有混用 17.67/243.5 另一組 es 者，本規格為內部一致性不混用，已在 SPEC 明示。
- 舒適度分級表：門檻 10/13/16/18/21/24 °C 彙整自多個公開氣象舒適分級來源（各來源一致：<10 乾燥舒適、≥21 悶熱壓迫、≥24 極度悶熱），逐字釘版於 SPEC，下限含、上限不含；分級依**捨入後**露點查表是作者的釘版設計決定，由 `band-edge-rounded` 案例釘住（未捨入 12.950666 → 顯示 13.0 → 分級 mostly-comfortable，與畫面數字一致）。

## Fixture 推導（兩種方法）

方法一（手算推導）：依 SPEC 釘版公式逐案代入，記錄中間值 γ、es、e、未捨入 Td 與 AH，再依 r(x) = floor(x×10 + 0.5)/10 捨入一次。下表為 13 個成功案例的中間值（γ/es/e 取 4–6 位小數）。

| 案例 | γ | es (hPa) | e (hPa) | Td 未捨入 | AH 未捨入 | 輸出 Td / AH / 分級 |
| --- | --- | --- | --- | --- | --- | --- |
| typical-room (25, 60) | 1.132684 | 31.6192 | 18.9715 | 16.684250 | 13.788782 | 16.7 / 13.8 / slightly-humid |
| saturated-exact (20, 100) | 1.340318 | 23.3494 | 23.3494 | 20.000000 | 17.260173 | 20.0 / 17.3 / humid |
| comfortable-room (20, 60) | 0.829493 | 23.3494 | 14.0097 | 11.992962 | 10.356104 | 12.0 / 10.4 / comfortable |
| mostly-comfortable (22, 65) | 1.032213 | 26.3970 | 17.1580 | 15.110248 | 12.597484 | 15.1 / 12.6 / mostly-comfortable |
| humid-evening (26, 70) | 1.346093 | 33.5495 | 23.4847 | 20.093461 | 17.011953 | 20.1 / 17.0 / humid |
| summer-oppressive (30, 70) | 1.578700 | 42.3356 | 29.6350 | 23.914979 | 21.183884 | 23.9 / 21.2 / oppressive |
| hot-extremely-oppressive (33, 85) | 1.942801 | 50.1778 | 42.6512 | 30.129686 | 30.189476 | 30.1 / 30.2 / extremely-oppressive |
| dry-winter (5, 30) | −0.848184 | 8.7237 | 2.6171 | −11.127676 | 2.038927 | −11.1 / 2.0 / dry |
| freezing-fog (−10, 80) | −0.981598 | 2.8628 | 2.2902 | −12.783854 | 1.885977 | −12.8 / 1.9 / dry |
| desert-dry (40, 10) | 0.184991 | 73.5401 | 7.3540 | 2.573745 | 5.088978 | 2.6 / 5.1 / dry |
| band-edge-rounded (25, 47.18) | 0.892310 | 31.6192 | 14.9179 | 12.950666 | 10.842579 | 13.0 / 10.8 / mostly-comfortable |
| endpoint-hot-saturated (60, 100) | 3.480685 | 198.5298 | 198.5298 | 60.000000 | 129.135259 | 60.0 / 129.1 / extremely-oppressive |
| endpoint-cold (−50, 50) | −5.293573 | 0.0614 | 0.0307 | −55.766096 | 0.029818 | −55.8 / 0.0 / dry |

方法二（獨立重算）：以 40 位精度 Decimal 實作同一釘版公式（ln/exp 用 Decimal 高精度運算）逐案重算，全部中間值與方法一（double 浮點）在小數後 10 位內一致；再以另一支獨立驗證腳本（含完整驗證順序與錯誤碼邏輯）逐案比對 fixtures.json 的 19 個核心 expected，19/19 深度吻合。捨入邊界距離：除 RH = 100 恆等案（代數上精確，非邊界巧合）外，各輸出與最近 .x5 邊界距離 ≥ 0.10（以 0.1 單位計），無靠邊界僥倖。

- RH = 100 恆等已代數驗證：ln(1) = 0 ⇒ γ = aT/(b+T) ⇒ Td = bγ/(a − γ) = T。
- 錯誤案例（rh-zero、rh-over-100、temp-over-range、temp-format、rh-empty、temp-input-limit）依釘版驗證順序逐案手核：容量 → UNICODE → EMPTY → DECIMAL_FORMAT → RANGE、欄位順序 temperature 先行。
- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
