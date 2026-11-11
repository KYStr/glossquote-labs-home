# 損益平衡與目標定價規格修訂

這份維護候選依據原規格的初審修正兩個計算契約。損益平衡保留 NO_MARGIN，並按售價與變動成本、固定成本是否為零，顯示四種繁中及英文結果。2.665% 的新案例區分 half-up 的 2.67% 與 half-even 的 2.66%。原 2.675% 案例兩者皆為 2.68%。

加價率與毛利率的求解改回傳達標的最低整分售價。成本 0.01、目標 25% 時，兩種模式都回 0.02，少一分時兩種實際率皆為 0%。求解輸出和下載區分輸入目標與按售價回算的實際率。零售價的毛利率為 null。既有數值變動只在 solve-markup-repeating，售價由 1333 分改為 1334 分、單件毛利由 333 改為 334 分、另一實際率的百分之一數值由 2498 改為 2504。

- [損益平衡候選](../../../specs/breakeven-calculator/SPEC.md) · [原 PR #240](https://github.com/KYStr/glossquote-labs-home/pull/240) · [固定原規格](https://github.com/KYStr/glossquote-labs-home/blob/77b72cb74db4cae3bba2c4c1bff7cae5dbc63639/docs/specs/breakeven-calculator/SPEC.md)
- [定價候選](../../../specs/markup-margin-calculator/SPEC.md) · [原 PR #243](https://github.com/KYStr/glossquote-labs-home/pull/243) · [固定原規格](https://github.com/KYStr/glossquote-labs-home/blob/1d5de750bf4371a81c1c8d8b57bf38fceea19d66/docs/specs/markup-margin-calculator/SPEC.md)
- [原版到候選的差異](original-to-candidate.diff)。JSON 展開排版以供逐案閱讀，原作者署名中的工作路徑省略。原檔 byte count、Git blob 和 SHA-256 均可在 [manifest](manifest.json) 核對。原作者及承接記錄保存在固定原版。

在候選 checkout 根目錄執行 `python -B -X utf8 docs/reviews/five-hour-2026-11-11/repair-pricing/verify.py`，可離線重現 59 個核心案例、6 個文件狀態模型、13 個成功求解的整分最小性及兩種求解的下載序列化。若另持有原始檔，加入 `--fixed <包含兩個 slug 目錄的原檔資料夾>` 也會驗證原版 byte count、兩種 hash 及既有 fixtures 的差異。三項維護驗收面向是 spec-corrections、exact-fixtures、provenance-and-scope，須由非作者複核。

產品測試、瀏覽器、實際下載、正式 SEO 與部署均為 NOT_RUN。兩個規格的 registry 產品驗收面向繼承問題交由主統籌處理。
