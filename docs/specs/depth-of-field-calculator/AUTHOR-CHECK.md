# 景深計算 — 作者檢查

作者：run 6 規格作者（Muse subagent）。作者文件核對，待非作者 readiness。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對本 checkout 的 docs/specs 與 tools/：最相近的既有工具為 sunrise-sunset-calculator（太陽時刻）與 video-file-size-calculator（位元率 × 時長），差異見 SPEC scope 節。photo-print-size-calculator 在本 checkout 的 docs/specs 與 tools/ 均無對應規格或產品（grep 無命中），scope 節已明示此點；golden-hour 與 image-file-size 為 run 6 其他概念編號，尚未落成本 checkout 的規格。
- 14 筆字面案例：11 筆核心（8 成功、3 錯誤）、3 筆 controller。`full-frame-50mm-f8-3m` 核對點為「全片幅 50mm f/8 對焦 3 m 的標準景深」。

## 來源釘版

- 公式：Wikipedia, Hyperfocal distance — H = f²/(N·c) + f；近限 Dn = s(H−f)/(H + s − 2f)；遠限 Df = s(H−f)/(H − s)，s ≥ H 時為無限遠；DoF = Df − Dn。注意：另有一組以 Hs/(H + (s − f)) 表達近限的寫法，與本規格採用的 H 定義不一致，本規格未採用，已在 SPEC 寫明唯一公式。
- CoC 表：Wikipedia, Circle of confusion，「Circle of confusion diameter limit based on d/1500」表（CoC = 片幅對角線 / 1500），8 列字面值全數照錄：1 吋 0.011、Four Thirds 0.015、APS-C 0.018、APS-C Canon 0.018、APS-C Nikon/Pentax/Sony 0.019、APS-H 0.023、35 mm 0.029、645 0.047。數位中片幅 44×33 不在該表，故不列為表定值，僅以 custom 自訂處理。
- 概念筆記第 31 條與上述來源無衝突，無需修正。

## 手算推導（方法一）

以下全部長度先以 mm 計，再除以 1000 化為公尺、round half-up 至 3 位小數。景深總長由未捨入的遠限減近限再捨入。

1. `full-frame-50mm-f8-3m`（f=50, N=8, c=0.029, s=3000）：Nc=0.232；H=2500/0.232+50=10775.862+50=10825.862 mm → 10.826 m。H−f=10775.862；分子 s(H−f)=32,327,586。Dn=32,327,586/13,725.862=2355.232 mm → 2.355 m；Df=32,327,586/7825.862=4130.866 mm → 4.131 m；DoF=1775.634 mm → 1.776 m。
2. `aps-c-35mm-f2-2m`（f=35, N=2, c=0.019, s=2000）：Nc=0.038；H=1225/0.038+35=32236.842+35=32271.842 mm → 32.272 m。分子=64,473,684。Dn=64,473,684/34,201.842=1885.094 mm → 1.885 m；Df=64,473,684/30,271.842=2129.824 mm → 2.130 m；DoF=244.730 mm → 0.245 m。
3. `far-limit-infinity`（f=24, N=11, c=0.029, s=10000）：Nc=0.319；H=576/0.319+24=1805.643+24=1829.643 mm → 1.830 m；s>H 故遠限 ∞、景深 ∞。Dn=18,056,426/11,781.643=1532.590 mm → 1.533 m。
4. `focus-at-hyperfocal`（f=100, N=10, c=0.05, s=20100）：Nc=0.5；H=10000/0.5+100=20100 mm → 20.100 m；s=H 故遠限 ∞、景深 ∞。Dn=402,000,000/40,000=10050 mm → 10.050 m，恰為 H/2，驗證邊界恆等式。
5. `macro-close-focus`（f=100, N=2.8, c=0.029, s=350）：Nc=0.0812；H=10000/0.0812+100=123152.709+100=123252.709 mm → 123.253 m。分子=43,103,448。Dn=43,103,448/123,402.709=349.291 mm → 0.349 m；Df=43,103,448/122,902.709=350.712 mm → 0.351 m；DoF=1.421 mm → 0.001 m。
6. `custom-coc-85mm`（f=85, N=1.8, c=0.02, s=5000）：Nc=0.036；H=7225/0.036+85=200694.444+85=200779.444 mm → 200.779 m。分子=1,003,472,222。Dn=1,003,472,222/205,609.444=4880.477 mm → 4.880 m；Df=1,003,472,222/195,779.444=5125.524 mm → 5.126 m；DoF=245.047 mm → 0.245 m。
7. `telephoto-200mm-50m`（f=200, N=4, c=0.029, s=50000）：Nc=0.116；H=40000/0.116+200=344827.586+200=345027.586 mm → 345.028 m。分子=17,241,379,311。Dn=17,241,379,311/394,627.586=43690.254 mm → 43.690 m；Df=17,241,379,311/295,027.586=58439.889 mm → 58.440 m；DoF=14749.635 mm → 14.750 m。
8. `one-inch-24mm-2m`（f=24, N=2.8, c=0.011, s=2000）：Nc=0.0308；H=576/0.0308+24=18701.299+24=18725.299 mm → 18.725 m。分子=37,402,597。Dn=37,402,597/20,677.299=1808.873 mm → 1.809 m；Df=37,402,597/16,725.299=2236.289 mm → 2.236 m；DoF=427.416 mm → 0.427 m。

錯誤案例皆由規則直接判定，無需數值推導：`aperture-too-small`（0.4 < 0.5 → RANGE aperture）、`focus-inside-lens`（150 mm ≤ 200 mm → RANGE focusDistanceM）、`coc-too-many-decimals`（0.0295 為 4 位小數 > 3 位上限 → DECIMAL_FORMAT cocMm）。

## 獨立重算（方法二）

以 Python Decimal（round half-up 至 3 位小數）依同一公式獨立重算 8 個成功案例，輸出與手算逐項一致：

- full-frame-50mm-f8-3m：H=10.826 Dn=2.355 Df=4.131 DoF=1.776
- aps-c-35mm-f2-2m：H=32.272 Dn=1.885 Df=2.13 DoF=0.245
- far-limit-infinity：H=1.83 Dn=1.533 Df=None inf=True
- focus-at-hyperfocal：H=20.1 Dn=10.05 Df=None inf=True
- macro-close-focus：H=123.253 Dn=0.349 Df=0.351 DoF=0.001
- custom-coc-85mm：H=200.779 Dn=4.88 Df=5.126 DoF=0.245
- telephoto-200mm-50m：H=345.028 Dn=43.69 Df=58.44 DoF=14.75
- one-inch-24mm-2m：H=18.725 Dn=1.809 Df=2.236 DoF=0.427

（JSON 數字 2.13 即 2.130、4.88 即 4.880，數值相等。）重算腳本為一次性驗算工具，未提交進 repo。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
