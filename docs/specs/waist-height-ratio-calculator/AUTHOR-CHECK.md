# 腰高比計算機 — 作者檢查

作者為本輪 run 6 規格作者（`muse/spec-waist-height-ratio-calculator-20261121` 分支）。作者文件核對，待非作者 readiness。本文件不是獨立審查，作者不得稱自己的文件為獨審。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 與既有工具的差異見 SPEC scope 節：bmi-tdee-calculator（體重指標，不量腰圍）與 body-fat（體脂率估算，需多處量測）；本 checkout 內無 body-fat 規格。registry 層級的去重由家長登記時核對，本作者未跑任何 registry / coordination 指令。
- 16 筆案例：13 筆字面核心案例、3 筆 controller 案例。核心核對點為 `just-below-half`（顯示 0.50 但分級 healthy）與 `exactly-half`（精確值恰為 0.5，分級 increased）。

## 來源核實與概念修正

概念筆記寫「常用 <0.4 / 0.4–0.5 / 0.5–0.6 / ≥0.6 與『維持 <0.5』」，已對照第一手來源核實：

- NICE 肥胖指引 2022 年更新（2022 年 4 月草案、9 月正式採納；NICE 新聞稿 "Keep the size of your waist to less than half of your height"）：健康 0.4–0.49、增加 0.5–0.59、高 0.6 或以上；適用於 BMI 未滿 35 kg/m² 的成年人，男女與各族裔同一組界線；5 歲以上兒童同一組界線。
- Ashwell et al., BMC Medicine 2014, doi:10.1186/s12916-014-0207-1（Ashwell Shape Chart）：四區界線同為 0.4 / 0.5 / 0.6，<0.4 區標示 "Take Care"，0.4–0.5 "OK"，0.5–0.6 "Consider Action"，>0.6 "Take Action"。

**修正（概念筆記未明說之處）**：NICE 表格本身未替 <0.4 命名，健康帶自 0.4 起；<0.4 不是第四個健康帶。本規格依 Ashwell 稱 <0.4 為「低於健康範圍（below-healthy）」，並在 SPEC 分級表與適用範圍註記中寫明此區分。界線採精確比值含下限（0.40、0.50、0.60），NICE 所寫 0.4–0.49 / 0.5–0.59 為 2 位小數顯示帶，不等同精確界線。

## 手算推導（第一種方法）

全程以分數與整數比較手算；比值顯示值為 WHtR × 100 後 half-up 取整。分級整數比較：<0.4 ⟺ 5W < 2H；<0.5 ⟺ 2W < H；<0.6 ⟺ 5W < 3H（W、H 為百分之一公分整數）。

- `healthy-mid`（76/170）：76 ÷ 170 = 0.4470588…，×100 = 44.7058… → 45 → `"0.45"`。5×76 = 380 ≥ 2×170 = 340，且 2×76 = 152 < 170 → healthy。健康區間 0.4×170 = 68.0、0.5×170 = 85.0；WHtR < 0.5，差值 null。
- `just-below-half`（84.9/170）：84.9 ÷ 170 = 0.4994117…，×100 = 49.9411… → 50 → `"0.50"`。2×84.9 = 169.8 < 170 → 精確值 < 0.5 → healthy（顯示值不決定分級）。區間 68.0–85.0；差值 null。
- `exactly-half`（85/170）：85 ÷ 170 = 0.5 → `"0.50"`。2×85 = 170 不 < 170，且 5×85 = 425 < 3×170 = 510 → increased。差值 85 − 85 = `"0.0"`。
- `increased`（95/170）：95 ÷ 170 = 0.5588235…，×100 = 55.8823… → 56 → `"0.56"`。5×95 = 475 < 510 → increased。差值 95 − 85 = `"10.0"`。
- `high`（105/170）：105 ÷ 170 = 0.6176470…，×100 = 61.7647… → 62 → `"0.62"`。5×105 = 525 ≥ 510 → high。差值 105 − 85 = `"20.0"`。
- `exactly-six-tenths`（102/170）：102 ÷ 170 = 0.6 → `"0.60"`。5×102 = 510 不 < 510 → high。差值 102 − 85 = `"17.0"`。
- `below-healthy`（60/170）：60 ÷ 170 = 0.3529411…，×100 = 35.2941… → 35 → `"0.35"`。5×60 = 300 < 340 → below-healthy。差值 null。
- `exactly-four-tenths`（68/170）：68 ÷ 170 = 0.4 → `"0.40"`。5×68 = 340 不 < 340，且 2×68 = 136 < 170 → healthy 下限含入。差值 null。
- `decimal-inputs`（82.5/168.4）：168.4 × 0.49 = 82.516 > 82.5，故比值 < 0.49；82.5 ÷ 168.4 = 0.4898812…，×100 = 48.9881… → 49 → `"0.49"`。5×82.5 = 412.5 ≥ 2×168.4 = 336.8，且 2×82.5 = 165 < 168.4 → healthy。健康區間 0.4×168.4 = 67.36 → 1 位小數 half-up `"67.4"`；0.5×168.4 = 84.2 → `"84.2"`。差值 null。
- `whtr-above-one`（130/120）：130 ÷ 120 = 1.08333…，×100 = 108.333… → 108 → `"1.08"`。5×130 = 650 ≥ 3×120 = 360 → high。區間 0.4×120 = 48.0、0.5×120 = 60.0；差值 130 − 60 = `"70.0"`。
- `zero-height`：heightCm `"0"` 低於範圍下限 50 → RANGE，field heightCm。
- `non-numeric-waist`：waistCm `"abc"` 不是十進小數 → DECIMAL_FORMAT，field waistCm。
- `waist-too-small`：waistCm `"10"` 低於範圍下限 20 → RANGE，field waistCm。

## 第二種方法獨立重算（script）

以 Python 腳本（`/tmp/whtr_check.py`，任務期間的臨時驗算檔）對 10 筆數值案例獨立重算，腳本內含兩種彼此獨立的實作並互相斷言一致：(a) `Decimal` 50 位精度直接除法 + `ROUND_HALF_UP` 量化；(b) 純整數運算（百分之一公分整數、餘數比較的 half-up、整數分級比較）。兩種實作對 10 筆案例的比值、分級、健康區間、差值全部一致，且與上述手算逐字相符：

```
waist=76 height=170 -> whtr=0.45 cat=healthy healthyRange=68.0-85.0 lose=None
waist=84.9 height=170 -> whtr=0.50 cat=healthy healthyRange=68.0-85.0 lose=None
waist=85 height=170 -> whtr=0.50 cat=increased healthyRange=68.0-85.0 lose=0.0
waist=95 height=170 -> whtr=0.56 cat=increased healthyRange=68.0-85.0 lose=10.0
waist=105 height=170 -> whtr=0.62 cat=high healthyRange=68.0-85.0 lose=20.0
waist=102 height=170 -> whtr=0.60 cat=high healthyRange=68.0-85.0 lose=17.0
waist=60 height=170 -> whtr=0.35 cat=below-healthy healthyRange=68.0-85.0 lose=None
waist=68 height=170 -> whtr=0.40 cat=healthy healthyRange=68.0-85.0 lose=None
waist=82.5 height=168.4 -> whtr=0.49 cat=healthy healthyRange=67.4-84.2 lose=None
waist=130 height=120 -> whtr=1.08 cat=high healthyRange=48.0-60.0 lose=70.0
ALL METHODS AGREE
```

fixtures.json 內容為手寫字面值，未由產品程式或上述驗算腳本生成；腳本僅用於核對。

## 未驗項

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
- 驗算腳本為 /tmp 臨時檔，未納入提交範圍；手算推導全文在本文件內，可供 reviewer 不倚賴該檔重算。
