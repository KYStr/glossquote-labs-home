# 儲蓄尾款與達標月份｜文件核對

本提案為既有複利工具升級。原規格作者為 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`。本輪修訂與驗算由維護者 `local-codex:01a1c8a3-8c54-7810-a0e1-bc3a2ffbfe01` 執行，待非作者獨立審查。 [原作者檢查](https://github.com/KYStr/glossquote-labs-home/blob/9828c5d10ff75720333491cfc21f190b7cd7ed16/docs/specs/savings-goal-calculator/AUTHOR-CHECK.md) · [維護裁決](https://github.com/KYStr/glossquote-labs-home/blob/418aee70f60a04cbe19e339597c91a056bcad0c4/docs/reviews/five-hour-2026-11-11/dispatch/repair-savings/TASK.md)

## SG-01 既有工具範圍

固定 #44 規格與 #80 候選已有每月需存與首次達標月兩種反算。既有模型每月將利息捨入到整分，並以 600 個月為達標搜尋上限。本提案補充精確計息下的尾款、實際計畫期末餘額與 1,200 個月界內最早達標月。兩個模型的差異可以改變可達性。初始 1 分、目標 2 分、月存 0、年率 12% 時，逐月捨入把每月的 0.01 分利息捨為零，餘額維持 1 分。精確模型第 69 月約為 1.98689 分，第 70 月約為 2.00676 分，因此第 70 月達標。原 owner、原 PR 及既有產品整合責任保留。 [#44 固定規格](https://github.com/KYStr/glossquote-labs-home/blob/5a9acc11b5b23200c3d4cda32adaafbbd389532e/docs/specs/compound-interest-calculator/SPEC.md) · [#80 固定介面](https://github.com/KYStr/glossquote-labs-home/blob/e42ebf56853ad8e46964ea8fc1ebf9623c6c2bb1/tools/compound-interest-calculator/public/en/index.html#L33-L34)

## SG-02 目標、尾款與餘額

獨立驗算沿用初審的 Python 標準庫 `Fraction` 逐月遞推，使用整數分與 `q = 1 + bp/120000`。達標月前先計息，再加每月存款。若正尾款為 T 分，則 `beforeTail + T−1 < FV ≤ beforeTail + T`。零尾款對應 `beforeTail ≥ FV`。期末餘額為 `halfUp(beforeTail + T)`。初始額和存款總額均為整數分，因此顯示利息等於精確累計利息的 halfUp 值，非負且與顯示餘額相加關係一致。

| 原案例 | 原期末 / 利息 | 修訂期末 / 利息 | 推導 |
| --- | --- | --- | --- |
| `months-with-interest` | 20000.00 / 2547.12 | 20000.01 / 2547.13 | 第 41 月餘額約 19748.3835。第 42 月尾款前約 19847.1254，尾款進位為 152.88，實際計畫餘額約 20000.0054。 |
| `months-growth-only-crossing` | 11000.00 / 1000.00 | 11046.22 / 1046.22 | 第 9 月約 10936.8527，乘 1.01 得第 10 月約 11046.2213。尾款為 0.00，利息仍計入期末。 |

原七個模式 B 字面結果均補上正規化的 `targetAmount`，包含 already-funded 及兩種 unreachable。其他原案例的輸入、預期與用途維持原樣。新增 `months-one-cent-tail`，初始 50 分、目標 51 分、年率 12%、月存 1 分。首月尾款前精確為 50.5 分，尾款 1 分，實際餘額 51.5 分顯示 0.52。少存一分時精確餘額低於目標，即使其顯示值四捨五入為 0.51。

## SG-03 上限和首次達標

先限索引 0–1200，再精確比較 B(1200)。若仍低於目標，直接回 beyond-horizon。對正利率且界內達標的情形，用整數二分找最小 k。區間維持 `B(lo−1) < FV ≤ B(hi)`，每次至少縮半，1,200 個整數候選最多需 11 次中點比較。零利率以整數進位除法求解，在相同的 B(1200) 檢查之後執行。

- 零利率每月存 1、初始 0，目標 1200 在第 1200 月剛好達標。目標 1201 在第 1200 月尚差 1，回 beyond-horizon。
- 正利率超期反例採初始 0.01、目標 999999999.99、年率 0.01%、月存 0。精確第 1200 月餘額約 1.01005 分，界內無解。閉式驗算只查第 1200 月就回傳。
- 受限閉式驗算以同一組字面輸入核對獨立逐月遞推的首次達標月、超期時的精確餘額，以及索引守衛。−1 與 1201 均在乘冪前拒絕。

## 文件驗證範圍

23 個核心案例及 3 個合成 controller 案例共 26/26 通過本輪文件驗算。含息尾款案例另按固定鍵序、UTF-8 及末尾 LF 核對字面 JSON 報告。瀏覽器、原生下載、正式 HTTPS/SEO、Network/Storage、部署與九項產品面向均為 NOT_RUN，分數 null。維護三面向、原預案八節及產品九面向各有各的審查。REG-01 由另案處理。 [規格](SPEC.md) · [簡報](BRIEF.md) · [字面案例](fixtures.json)
