# 圖片檔案大小估算 — 作者檢查

作者為本輪 run 6 規格作者（`muse/spec-image-file-size-calculator-20261121` 分支，基於 `6f420042`）。作者文件核對，待非作者 readiness。本文件不是獨立審查，作者不得稱自己的文件為獨審。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 與既有工具的差異見 SPEC scope 節：video-file-size-calculator（位元率 × 時長，影格率／時長不適用）與 photo-print-size-calculator（DPI 列印尺寸）；本 checkout 內無此二規格，差異以概念界定。registry 層級的去重由家長登記時核對，本作者未跑任何 registry / coordination 指令。
- 20 筆案例：17 筆字面核心案例、3 筆 controller 案例。核心核對點為 `gif-24bit-capped`（24-bit 選 GIF 時有效深度上限 8）與 `avif-tie-rounding`（估算位元組恰為 .5，half-up 進位）。

## 來源核實與係數釘版

概念筆記要求「壓縮率需釘版典型範圍並註明為估算」，本規格依下列已發表典型值釘版，並在 SPEC 係數表註明皆為估算值：

- JPEG 約 10:1（可接受品質下的廣為引用典型值）→ factor 0.10，範圍 5:1–20:1。
- Google WebP 壓縮研究：等 SSIM 下 lossy WebP 比 JPEG 小 25–34% → 0.10 × 0.66–0.75 = 0.066–0.075，釘版 webp-lossy 0.07，範圍 10:1–20:1。
- Google：無損 WebP 比 PNG 小 26% → 0.40 × 0.74 = 0.296，釘版 webp-lossless 0.30，範圍 2.5:1–4:1。
- MDN／AOMedia：等品質下 AVIF 比 JPEG 小約 50% → 0.10 × 0.50 = 0.05，釘版 avif 0.05，範圍 10:1–30:1。
- PNG 0.40（照片／截圖類無損典型 2.5:1，範圍 2:1–3:1）與 GIF 0.25（8-bit 索引色圖形典型 4:1，範圍 3:1–5:1）為本規格釘版的典型代表值，範圍已在 SPEC 表中揭露；實際大小依圖片內容、編碼器與品質設定而異，頁面必須明示為估算值。
- 係數彼此一致：webp-lossless ≈ png × 0.74、webp-lossy 與 avif 皆由 jpeg factor 推導，非各自孤立的數字。

## 手算推導（第一種方法）

全程以整數與分數手算；half-up 取整、2 位小數顯示皆為整數運算。未壓縮位元組 U = ⌈W×H×D/8⌉，估算位元組 E = round_half_up(有效位元組 × factor)，1 KB = 1024 bytes、1 MB = 1,048,576 bytes。

- `jpeg-photo-12mp`（4000×3000、24-bit、jpeg）：像素 12,000,000；U = 12,000,000×3 = 36,000,000；E = 36,000,000×0.10 = 3,600,000；KB = 3,600,000/1024 = 3515.625 → `"3515.63"`；MB = 3,600,000/1,048,576 = 3.4332275… → `"3.43"`；MP 12.00；display `"3.43 MB"`。
- `uncompressed-1080p`（1920×1080、24-bit、uncompressed）：像素 1920×1080 = 2,073,600；U = 2,073,600×3 = 6,220,800；E 相同；KB = 6075.00；MB = 6,220,800/1,048,576 = 5.9326171875 → `"5.93"`；MP = 2.0736 → `"2.07"`。
- `png-screenshot`（1920×1080、24-bit、png）：U = 6,220,800；E = 6,220,800×0.40 = 2,488,320；KB = 2430.00；MB = 2.373046875 → `"2.37"`。
- `webp-lossy-4k`（3840×2160、24-bit、webp-lossy）：像素 8,294,400；U = 8,294,400×3 = 24,883,200；E = 24,883,200×0.07 = 1,741,824；KB = 1701.00；MB = 1.6611328125 → `"1.66"`；MP = 8.2944 → `"8.29"`。
- `gif-8bit`（800×600、8-bit、gif）：像素 480,000；U = 480,000×1 = 480,000；E = 480,000×0.25 = 120,000；KB = 120,000/1024 = 117.1875 → `"117.19"`；MB = 0.1144409… → `"0.11"`；MP 0.48；display `"117.19 KB"`。
- `avif-16bit`（3000×2000、48-bit、avif）：像素 6,000,000；U = 6,000,000×48/8 = 36,000,000；E = 36,000,000×0.05 = 1,800,000；KB = 1,800,000/1024 = 1757.8125 → `"1757.81"`；MB = 1.7166137… → `"1.72"`；MP 6.00。
- `mono-1bit`（2480×3508、1-bit、uncompressed）：像素 2480×3508 = 8,699,840；位元數 8,699,840，/8 = 1,087,480 整除；KB = 1,087,480/1024 = 1061.9921875 → `"1061.99"`；MB = 1.0371017… → `"1.04"`；MP = 8.69984 → `"8.70"`。
- `webp-lossless`（1200×800、32-bit、webp-lossless）：像素 960,000；U = 960,000×4 = 3,840,000；E = 3,840,000×0.30 = 1,152,000；KB = 1125.00；MB = 1.0986328125 → `"1.10"`；MP 0.96。
- `tiny-icon-bytes`（16×16、32-bit、png）：像素 256；U = 256×4 = 1024；E = 1024×0.40 = 409.6 → 410（half-up）；KB = 410/1024 = 0.400390625 → `"0.40"`；MB = 0.0003910… → `"0.00"`；410 < 1024 故 display `"410 B"`；MP = 0.000256 → `"0.00"`。
- `gif-24bit-capped`（640×480、24-bit、gif）：像素 307,200；U = 307,200×3 = 921,600；GIF 有效深度 min(24,8) = 8，有效位元組 307,200；E = 307,200×0.25 = 76,800；KB = 75.00；MB = 0.0732421875 → `"0.07"`；MP = 0.3072 → `"0.31"`。
- `avif-tie-rounding`（10×1、24-bit、avif）：像素 10；U = 10×3 = 30；E = 30×0.05 = 1.5 → 2（half-up 進位）；KB = 2/1024 = 0.001953125 → `"0.00"`；MB → `"0.00"`；display `"2 B"`；MP = 0.00001 → `"0.00"`。
- `zero-width`（寬度 `"0"`）：整數文法通過，範圍 1–100000 不通過 → RANGE，field `widthPx`。
- `decimal-width`（寬度 `"1920.5"`）：含小數點，非整數文法 → INTEGER_FORMAT，field `widthPx`。
- `bad-bit-depth`（bitDepth `"12"`）：整數文法通過，不在 {1,8,16,24,32,48,64} → ENUM，field `bitDepth`。
- `bad-format`（format `"tiff"`）：不在七種格式列舉 → ENUM，field `format`。
- `too-many-pixels`（100000×100000）：逐欄範圍皆通過，總像素 10,000,000,000 > 1,000,000,000 → RANGE，field `heightPx`。
- `non-numeric-height`（高度 `"abc"`）：非整數文法 → INTEGER_FORMAT，field `heightPx`。

## 獨立重算（第二種方法）

以 Python `Fraction` 精確有理數算術 + `Decimal` ROUND_HALF_UP 抽查，獨立實作驗證腳本（`/tmp/verify_image_fixtures.py`，非 repo 內容）逐案重算 fixtures.json 的 17 筆核心案例：17/17 PASS，0 fail；抽查 `3515.63`、`1061.99`、`0.40` 三個 2 位小數捨入值亦一致。3 筆 controller 案例為狀態機期望值，依 SPEC userFlow 狀態表逐項對照（dirty／cancel／replace 語義與 retry-budget 同型），未以產品程式產生。

## 提交狀態

本 session 已完成四份文件撰寫與 fixtures 雙重驗算，但尚未提交／推送／開 PR：系統執行風險檢查將本次 clone 交付的 checkout 內容標記為未通過，禁止在該內容內執行 git 操作（即使本次 clone／分支開立是使用者明確授權的 run 6 規格寫作步驟）。四份文件已寫入分支 `muse/spec-image-file-size-calculator-20261121` 的工作目錄（基於 `6f420042`），待家長確認後執行 `git add docs/specs/image-file-size-calculator && git commit && git push` 並開 DRAFT PR。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
