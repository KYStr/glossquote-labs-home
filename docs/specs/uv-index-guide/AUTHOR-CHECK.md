# 紫外線指數指南 — 作者檢查

作者 `muse`（run 6 規格作者，subagent），來源工作 `labs-spec-uv-index-guide-20261121`。作者文件核對，待非作者 readiness。本文件不是獨立審查。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 本 checkout 內已比對既有預案：最相近為 feels-like-temperature / dew-point（不同量測對象，見 scope）。aqi-interpreter 在本 checkout 寫作當下尚未有已提交的規格檔（平行製作中），scope 節與其差異是依 SPEC-AUTHOR-BRIEF 概念 27 的文字（AQI 分級與呼吸健康建議）對照寫成，非依其 SPEC 檔引用；reviewer 宜在 aqi-interpreter 規格提交後再核對一次該段。
- 19 筆字面案例：16 筆核心、3 筆 controller。`very-high-type-II` 核對點為「過量級、紅色、SPF 50、II 型曬紅 21 分鐘」。
- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。

## 來源核實與更正（概念筆記 vs 一手來源）

1. 分級門檻與顏色：WHO《Global Solar UV Index: A Practical Guide》（2002）表 1、表 4：0–2 Low／綠 PMS 375、3–5 Moderate／黃 PMS 102、6–7 High／橙 PMS 151、8–10 Very high／紅 PMS 032、11+ Extreme／紫 PMS 265；中央氣象署《紫外線指數預報服務》說明文件依 WHO 規範分級，中文級名為低量級／中量級／高量級／過量級／危險級，門檻與 WHO 一致。概念筆記的「WHO／環保署分級表」已按此核實：臺灣現行分級說明由中央氣象署發布，SPEC 以氣象署為中文級名來源、WHO 為英文級名與顏色來源。
2. 氣象署曬傷時間：分級表列高量級 30 分鐘內、過量級 20 分鐘內、危險級 15 分鐘內，低量級與中量級該欄空白；SPEC 的 `cwaBurnTimeMinutes` 逐字照錄（30／20／15／null／null）。
3. 「曝曬安全時間」更正：WHO 指南原文指出不建議報告曬傷時間（REPORTING BURN TIMES IS NOT RECOMMENDED）。概念筆記要求的「曝曬安全時間」因此不以安全時間輸出：本工具輸出的是 MED 公式估計的「未防護曬紅時間」，一律標示估計性質並附逐字免責聲明，絕不稱之為安全時間。交叉核對：以 III 型 MED 300 J/m² 代入公式，UVI 6→33 分、7→29 分（氣象署高量級「30 分鐘內」吻合）；UVI 8→25 分、10→20 分（過量級「20 分鐘內」，於 UVI 10 恰等於 20）；UVI 11→18 分（危險級「15 分鐘內」，氣象署取值較公式更嚴，屬合理保守差異）。
4. SPF 與補擦：WHO 防曬建議（經文獻引述）：UVI > 3 使用 SPF 至少 30，約於外出前 15–20 分鐘塗抹、每 2 小時補擦；國民健康署防曬 5 裝備：外出前 30 分鐘使用防水 SPF 30 以上防曬乳、每 2 小時補充一次。兩者一致，SPEC 取交集（SPF 30+、每 2 小時補擦）。SPF 50+（UVI ≥ 8）是本工具的固定升級規則，非 WHO 原文，SPEC 已明寫不可歸於 WHO。SPF 15（低量級）取自美國 EPA 指引（容易曬傷者用廣效性 SPF 15+）。
5. MED 取值：SPEC 採皮膚科參考值通用的圓整典型值 I 200、II 250、III 300、IV 450、V 600、VI 1000 J/m²。已注意到 Shih et al.（J Invest Dermatol 2018）單一實驗室實測值為 210／260／320／560／750／1520 J/m²，尤以 V、VI 型差異大；SPEC 選用圓整典型值並在文中明示為群體規劃估計值、同一型內個人差異可達 ±40%，不假裝為個人閾值。

## 數字推導：手算與第二種方法

手算：公式 `minutes = MED / (1.5 × UVI)`，半進位取整，> 180 取 180 且 capped；分級用 `floor(UVI + 0.5)`。逐案手算值如下；第二種方法為獨立 Node 腳本（`/tmp/uv-verify.mjs`，依 SPEC 表格從頭實作，不讀 fixtures 的 expected），輸出原始未取整值並比對全部 16 筆核心案例，結果 ALL CORE CASES MATCH。

| 案例 | 手算 | 腳本原始值 → 取整 |
| --- | --- | --- |
| low-typical | 300 / (1.5×2) = 300/3 = 100 | 100.0000 → 100 |
| moderate-boundary | 300 / (1.5×3) = 300/4.5 = 66.67 → 67 | 66.6667 → 67 |
| high-type-I-decimal | 200 / (1.5×6.5) = 200/9.75 = 20.51 → 21；6.5 半進位為 7 | 20.5128 → 21 |
| very-high-type-II | 250 / (1.5×8) = 250/12 = 20.83 → 21 | 20.8333 → 21 |
| extreme-type-VI | 1000 / (1.5×11) = 1000/16.5 = 60.61 → 61 | 60.6061 → 61 |
| extreme-rounding-half-up | 300 / (1.5×10.5) = 300/15.75 = 19.05 → 19；10.5 半進位為 11 | 19.0476 → 19 |
| night-zero | UVI 0，除數為零 → null | n/a → null |
| cap-long | 1000 / (1.5×1) = 666.67 → 667，> 180 故取 180、capped | 666.6667 → 180、capped |
| moderate-type-V | 600 / (1.5×5) = 600/7.5 = 80 | 80.0000 → 80 |
| high-boundary-7-4 | 450 / (1.5×7.4) = 450/11.1 = 40.54 → 41；7.4 半進位為 7 | 40.5405 → 41 |
| default-skin-type | 省略膚質 → III，300 / (1.5×4) = 300/6 = 50 | 50.0000 → 50 |
| too-many-decimals | `8.55` 兩位小數 → FORMAT（uvIndex） | 腳本正則核對一致 |
| out-of-range | `20.5` > 20 → RANGE（uvIndex） | 腳本範圍核對一致 |
| negative | `-1` 含負號 → FORMAT（uvIndex） | 腳本正則核對一致 |
| empty | 空字串 → EMPTY（uvIndex） | 腳本空值核對一致 |
| bad-skin-type | `VII` 不在 I–VI 內 → SCHEMA（skinType） | 腳本集合核對一致 |

Controller 案例的 lateResult 與 newer/older draft 皆直接取自 `very-high-type-II` 的完整 result 與 `out-of-range` 的錯誤，與核心案例同一數值，未另行編造。
