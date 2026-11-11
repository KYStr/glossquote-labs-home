# 烤盤尺寸換算修正版獨立文件審查

**FH-R2-BAKING。** 固定候選 `8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927`。三項維護檢查達 90 分門檻，八節文件完整。固定審查證據 PR 公開讀回後，建議此文件維護範圍通過。產品九面向、產品 UI 與原生下載均為 `NOT_RUN`。[修正版 PR #303](https://github.com/KYStr/glossquote-labs-home/pull/303) · [原版 PR #264](https://github.com/KYStr/glossquote-labs-home/pull/264)

## 候選與維護範圍

- 維護任務 `labs-five-hour-repair-baking-20261111`，claim `fh-20261111-baking-8e7a-claim`。初讀遠端 r1591，2026-11-11 12:44（台北）再讀 r1593、blob `5541c20e8ab5aecfddd0c6cebfa6fc1dc10266f2`。兩次維護 claim 和原規格 owner 一致。審查者與兩版的 owner、作者及 contributor 不同。PR #303 與 #264 的 open draft head 分別符合本次固定來源。維護 task 在讀回時為 `working`，尚未登記正式 submission。[固定維護簡報](https://github.com/KYStr/glossquote-labs-home/blob/418aee70f60a04cbe19e339597c91a056bcad0c4/docs/reviews/five-hour-2026-11-11/dispatch/repair-baking/TASK.md) · [共用登記冊](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/coordination/work-registry.json)
- 由公開 HTTPS 讀取原版及修正版各四檔，八個檔案的 Git blob 均與固定來源一致。逐段讀取 BRIEF、SPEC、AUTHOR-CHECK 的實際 diff，fixtures 以 case ID 逐欄比對。PR #303 的變更路徑只有這四份文件。[修正版四檔](https://github.com/KYStr/glossquote-labs-home/tree/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter) · [原版四檔](https://github.com/KYStr/glossquote-labs-home/tree/88a5d223d06de8e6a732327a92fed78f94296e74/docs/specs/baking-pan-converter)

## BPC-01　盤壁高度與麵糊厚度

BRIEF 與 SPEC 現在把「較淺／較深」限定為目標盤內部盤壁高度。兩語提醒指出直壁盤厚度取決於實際倒入量與底面積，熟度依食譜及實際厚度判斷，並提示留膨脹空間。nominal 欄位缺少盤壁高度時使用 unknown。[固定 BRIEF](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/BRIEF.md#L5-L11) · [雙語提示與 FAQ](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L183-L190)

| 直壁長方盤，原量 300 ml | 底面積 cm² | 同量厚度 cm | 換算後份量 | 目標換算後厚度 |
| --- | --- | --- | --- | --- |
| 20×20×8 → 10×10×4 cm | 400 → 100 | 0.75 → 3.00 | 37.5 ml | 0.375 cm |
| 10×10×4 → 20×20×8 cm | 100 → 400 | 3.00 → 0.75 | 2400.0 ml | 6.00 cm |

獨立推導用底面積乘盤高計容量、實際 ml 除以底面積計厚度。第一列同量麵糊佔目標盤高 75%，依容量比縮放後回到原填充比例 9.375%。倍率 `400 ÷ 3200 = 0.125` 是通常兩位精度的 tie，結果為 `0.13`。第二列反向重算同樣吻合。

## BPC-02　正小量的八位格式

三欄分別從未捨入值計算，通常為倍率兩位、百分比及份量一位。僅當該欄正值會捨為零時，從原值 half-up 至八位、去掉尾零，維持前導 `0.` 與字串型別。兩語畫面規格對該值加近似標示。canonical 報告保存同一數字字串、單位及 null 語義。[固定計算及報告契約](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L94-L113)

| 新增字面案例 | 倍率 | 百分比 | 換算量 |
| --- | --- | --- | --- |
| 兩直壁長方端點，1/2160，1000 ml | `0.00046296` | `0.0462963` | `0.5 ml` |
| 同一端點，份量留白 | `0.00046296` | `0.0462963` | `null` |
| 8 吋圓模同盤，0.01 g | `1.00` | `100.0` | `0.01 g` |
| 60×60×15 長方 → 5 cm 內徑、1 cm 高圓盤，0.01 ml | `0.00036361` | `0.03636103` | `0.00000364 ml` |
| 反向端點，0.01 ml | `2750.20` | `275019.7` | `27.5 ml` |
| nominal Bundt → 8 吋圓模，0.01 g | `0.58` | `57.9` | `0.00579114 g`，盤壁高度 unknown |

獨立界線由正尺寸區間及幾何的單調性取得。圓盤容量為 `25π/4–13500π` ml，長方盤為 `25–54000` ml，11 個表列皆介於兩個全域極值間。最小倍率為 `(25π/4) ÷ 54000 = π/8640`，最小正換算量為 `π/864000 ≈ 0.000003636102608`，遠高於八位 half-up 非零門檻 `0.000000005`。按保守 binary64 容量界 `19 < V < 54001` 重估，最小正量仍大於 `0.0000035`。七個補充探針涵蓋各欄通常精度閾值及八位精確 tie，`1/512` 顯示為 `0.00195313`。

## 維護三項評分

| 維護面向 | 分數 | 證據 |
| --- | ---: | --- |
| `spec-corrections` | 100 | 兩語釘版提示分清內部盤壁與實際麵糊厚度。300 ml 反例雙向重算。八位 fallback 的全域下界、正常位數、各欄獨立判斷、近似標示、七組切換及精確 tie 均有證據。 |
| `exact-fixtures` | 100 | 公開固定檔中 23 core＋3 controller 逐例重算，18 個 literal canonical JSON bytes／LF／SHA-256 相同。原 18 案原欄位與原 10 份報告保持相同。11 列和 121 組配對重算、10 探針、額外 reset 晚到事件通過。 |
| `provenance-and-scope` | 100 | #303 open draft head 等於修正版；四個允許路徑以原版對照，兩版八個公開 blob 均符合。維護 claim 及原 owner 讀回；reviewer 與兩版作者不同。正式登記、產品九面向與 REG-01 明列分開。 |

## 八節文件完整度

| 文件面向 | 完整 | 分數 | 證據 |
| --- | --- | ---: | --- |
| `goal` | true | 100 | 家庭烘焙的桌面、廚房與賣場情境具體。容量比與盤壁高度各有可觀察結果。 [固定段落](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L7-L14) |
| `scope` | true | 100 | 單一麵糊總量、兩種自訂幾何、11 列與匯出範圍清楚，並交代與烘焙百分比及料理單位換算的差異。杯、公升與烘烤時間屬排除範圍。 [固定段落](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L16-L32) |
| `userFlow` | true | 100 | 內尺寸與盤壁高度標示清楚。空、範例、dirty、busy、取消、錯誤、重設、成功下載及 nominal 未知都有定義。 [固定段落](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L34-L55) |
| `inputsOutputs` | true | 100 | 14 個字串鍵、首錯、上限、空 quantity、獨立八位 fallback、固定單位、深度關係與 canonical bytes 可重現。 [固定段落](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L57-L107) |
| `implementation` | true | 95 | 保留 Node 24 零依賴、純核心／controller／DOM、binary64 順序、固定 Worker、終止及 URL 清理。沿用一條無檔案欄工具用不到的 File.arrayBuffer 通用文字。 [固定段落](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L109-L117) |
| `acceptance` | true | 100 | 九個產品面向依原 ID 保留，功能和邊界納入兩語提示、反例與正小量。固定候選逐面向門檻和實測要求仍在。 [固定段落](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L119-L133) |
| `tests` | true | 100 | 獨立重算 23 個核心、3 個狀態、18 個完整報告；121 組表格盤配對、10 個額外輸入探針和 7 個精度切換探針一致。 [固定段落](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L135-L178) |
| `handoff` | true | 100 | 四檔、來源和 PR head 可固定。保留原承接者、正式 claim、獨立候選、產品驗收與發布責任。 [固定段落](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L194-L202) |

## 執行與重現

- Node v24.14.0 離線執行 `node ./verify-round2.mjs fixed-sources/original fixed-sources/repaired`，exit 0。11 個表列與 121 組有向表格盤配對均重算。23 個核心及 3 個狀態案例逐值比對。18 份成功報告的排序 compact UTF-8 JSON、單一末尾 LF、長度及 SHA-256 皆吻合。原 18 例的原欄位及原 10 份報告 bytes 均保留。[驗算程式](verify-round2.mjs) · [完整驗算輸出](fixture-evidence.json)
- 10 個額外輸入探針涵蓋端點、首錯、Unicode、未啟用欄位、核心缺少 `quantity` 鍵的 SCHEMA 及留白的 null。狀態模型核對 success → edit → error、cancel 後晚回、替換後晚回、busy reset 及 stale result 拒收。有效世代的 success 才能取得報告。這些檢查只執行文件模型。
- 三份 Markdown 的 `git --no-pager diff --no-index --no-ext-diff --no-textconv` exit 1，表示已取得差異。Windows 環境 guard 前後均 exit 0，完整 Environment key 與 PATH 指紋相符。實際來源 hash、證據數量與九面向 NOT_RUN 見 [結構化審查](review.json)。

重跑時把上述兩個固定 commit 各自的四檔保存在不同資料夾，保留原始 bytes。程式驗證兩組 Git blob 後離線計算。

```text
node ./verify-round2.mjs <original-source-dir> <repaired-source-dir>
```

## 仍待的程序與風險

- BPC-03／REG-01 另案。r1593 的原預案仍是 draft，document 指向原 commit，`spec.acceptanceCriteria` 仍為八個文件章節。後續製作需要登記固定 SPEC 的九產品面向以供繼承。這輪三項維護評分依固定維護簡報。
- 正式維護 review 仍需原承接者交驗 `8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927`，並走已授權的串行登記。產品 UI、隔離瀏覽器、Network/Storage、原生下載與部署均 `NOT_RUN`。SPEC 沿用一條本工具無檔案欄時用不到的 `File.arrayBuffer` 通用句。
