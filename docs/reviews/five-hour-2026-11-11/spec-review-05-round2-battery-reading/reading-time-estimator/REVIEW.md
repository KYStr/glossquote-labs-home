# 閱讀時間估算維護規格獨立複核

**維護建議 同一 head 正式交驗後通過 · 文件與驗算 PASS**

任務 `labs-five-hour-repair-reading-20261111`，複核人 `local-codex:01a1c87c-f8d5-7e92-8aed-25f805df2a6a`，候選 `746583dc063e64f3ffcdf6b37c1051f36c44ac5c`。已驗維護作者、原 owner、claim、直接父提交、四檔 Git blob 與匿名 HTTP bytes。 [維護 PR #316](https://github.com/KYStr/glossquote-labs-home/pull/316) · [固定 SPEC](https://github.com/KYStr/glossquote-labs-home/blob/746583dc063e64f3ffcdf6b37c1051f36c44ac5c/docs/specs/reading-time-estimator/SPEC.md) · [初審證據](https://github.com/KYStr/glossquote-labs-home/blob/3127d3ee9015c74aae709acf085516bc5cb7c277/docs/reviews/five-hour-2026-11-11/spec-review-05/reading-time-estimator/REVIEW.md)

## 三項維護面向

| 面向 | 分數 | 結果 | 證據 |
| --- | ---: | --- | --- |
| spec-corrections | 100 | PASS | READ-01 的兩語公式、日文漢字和純假名說明，READ-02 的 U+20000／U+10000 對照，以及 READ-03 的可調估算定位均可按固定文件核對。 |
| exact-fixtures | 100 | PASS | Python 3.12.5 的碼點單次掃描與 Fraction 獨算 24/24。四筆新增有精確分鐘與碼點證據，原 20 筆按 ID 全值相同，原案例相對順序保持。 |
| provenance-and-scope | 100 | PASS | PR #316 四檔。父提交 8f928961 的四檔逐 bytes 等同原 PR #254，維護 commit 修改三檔，BRIEF 不變。讀回作者、claim、原 owner 和固定路徑，reviewer 未參與兩段製作。 |

## 原缺陷複核

- **READ-01 PASS**。§tests 兩語 FAQ 各自以計數除以速度，分鐘相加後轉秒、half-up 一次。400 字靜讀 60 秒、朗讀 100 秒。`漢字かな` 為 2 字、0 詞，朗讀 1 秒。`かなカナ` 兩項 0。
- **READ-02 PASS**。AUTHOR-CHECK 實字及 fixture 的第一碼點都核為 U+20000。對照 U+10000 排除後只剩「好」一字，朗讀 0 秒。兩個補充平面字串 UTF-16 均 5 單位，分類依碼點。
- **READ-03 PASS**。SPEC 的預設欄、兩語 FAQ、AUTHOR-CHECK 保留 400/240/200/150，均以使用者可調的產品估算起點描述。舊普遍速率範圍與人口平均敘述已移除。

## 必要退修

無。

## 非必要改善

- **READ-R2-01**。原 §tests 的「實際鍵入或合成檔」可改寫為把合成文字貼入 textarea，避免讓後續實作以為要加入檔案欄。範圍已明列無檔案上傳。

## 文件八節可用性

| 章節 | 分數 | 結果 | 證據 |
| --- | ---: | --- | --- |
| goal | 98 | PASS | 沿用已核對的長稿桌面、短稿手機使用情境及漢字／詞數、靜讀／朗讀產物。原節 bytes 相同。 [§goal](https://github.com/KYStr/glossquote-labs-home/blob/746583dc063e64f3ffcdf6b37c1051f36c44ac5c/docs/specs/reading-time-estimator/SPEC.md#L7) |
| scope | 98 | PASS | MVP、性能和非目標保留。四區段內漢字含日文漢字，純假名及純韓文音節的 0 計數界線明確。兩個相鄰工具的固定連結已讀回。 [§scope](https://github.com/KYStr/glossquote-labs-home/blob/746583dc063e64f3ffcdf6b37c1051f36c44ac5c/docs/specs/reading-time-estimator/SPEC.md#L16) |
| userFlow | 98 | PASS | 草稿、範例、取消及重設仍可驗。兩語成功區把 0 計數解說連到實際碼段及 ASCII 規則。 [§userFlow](https://github.com/KYStr/glossquote-labs-home/blob/746583dc063e64f3ffcdf6b37c1051f36c44ac5c/docs/specs/reading-time-estimator/SPEC.md#L31) |
| inputsOutputs | 99 | PASS | UTF-16 容量與碼點計數、詞法與首錯、四個範圍與預設、相加後一次捨入俱在。改動限於預設定位說明。 [§inputsOutputs](https://github.com/KYStr/glossquote-labs-home/blob/746583dc063e64f3ffcdf6b37c1051f36c44ac5c/docs/specs/reading-time-estimator/SPEC.md#L51) |
| implementation | 97 | PASS | 原節 bytes 相同，沿用純核心、世代 Worker、無持久儲存、原生雙語靜態的可行性證據。 [§implementation](https://github.com/KYStr/glossquote-labs-home/blob/746583dc063e64f3ffcdf6b37c1051f36c44ac5c/docs/specs/reading-time-estimator/SPEC.md#L68) |
| acceptance | 97 | PASS | 原節 bytes 相同，依原審查保留九面向、可反駁測試及隔離真瀏覽器要求。 [§acceptance](https://github.com/KYStr/glossquote-labs-home/blob/746583dc063e64f3ffcdf6b37c1051f36c44ac5c/docs/specs/reading-time-estimator/SPEC.md#L77) |
| tests | 100 | PASS | 按固定來源獨立核對 21 個核心和 3 個狀態。FAQ 的 60 秒、U+20000/U+10000 及純假名皆有字面 fixture。 [§tests](https://github.com/KYStr/glossquote-labs-home/blob/746583dc063e64f3ffcdf6b37c1051f36c44ac5c/docs/specs/reading-time-estimator/SPEC.md#L93) |
| handoff | 96 | PASS | 原節 bytes 相同，固定來源、接續路徑、建置／證據要求及停止條件可沿用。 [§handoff](https://github.com/KYStr/glossquote-labs-home/blob/746583dc063e64f3ffcdf6b37c1051f36c44ac5c/docs/specs/reading-time-estimator/SPEC.md#L147) |

## 獨立驗算

逐碼點做區段與明列分隔集合判斷，再用 Python Fraction 直接求兩段分鐘之和。全部秒數僅在最後半入。以 UTF-16 編碼長度判斷容量，工作世代模型獨立重放三個控制器案例。 本次 24/24 相符，原 20 筆全值與相對順序保持。exit 0。 [完整字面結果](fixture-results.json) · [重現方式](../REPRODUCE.md)

## 讀回與未驗項

兩項維護 task 在本輪初讀 r1616 時為 working。正式 registry review、映射、readiness 與九個產品驗收面向均為 NOT_RUN。 [固定來源和登記讀回](../fixed-sources.json) · [父提交與差異讀回](../candidate-diff-readback.json)

- 核對 U+10000 屬 Linear B。 [Unicode Linear B 碼表](https://www.unicode.org/charts/PDF/U10000.pdf)
- 原 W 分隔集合和 Unicode 17 White_Space 一致。 [Unicode 17 PropList](https://www.unicode.org/Public/17.0.0/ucd/PropList.txt)
