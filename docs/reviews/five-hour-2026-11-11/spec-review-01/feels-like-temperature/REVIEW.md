# 體感溫度計算：獨立文件審查

**退修；不建議 ready。** 19/19 字面案例可重算，公式係數一致；但「官方定義域」敘述不符官方資料，且規格容許從無效的極端溫濕組合產生帶官方模型標籤的 339.0°C。第 86 行另有可反駁的迴歸符號宣稱。

- [規格 PR #229](https://github.com/KYStr/glossquote-labs-home/pull/229) open draft、head `0b6ec5c6dcbdd6fc457de9c827c1b3ac8652716e`；任務 `labs-feels-like-temperature-spec-20261109`、規格 `spec-feels-like-temperature-20261109`。2026-11-11T03:04:06Z 留證。BRIEF/SPEC/fixtures/AUTHOR-CHECK 四檔的 [本地與遠端 blob 核對](source-identity.json) 一致；本人非原 owner/contributor，未參與製作。
- 既有露點規格輸出露點與絕對濕度、無風速或兩模型切換；日出／月相用時間和地點解天象，工作不同。單位換算只換氣溫刻度，不計體感。
- [Build PR #271](https://github.com/KYStr/glossquote-labs-home/pull/271) 開啟，head `32e6e44be95d2dadc059150f8396f865f16333bc`，其聲稱的規格 SHA `0b6ec5c684ba0370dec57f7a17712f3b57a09a56` 與 #229 實讀 head 不同。當前登記無對應 production task；主統籌須對帳，保留來源與原責任，不重派、不假定兩版本 bytes 相等。

| 八節 | 完整 | 分數 | 規格證據 |
|---|---|---:|---|
| goal | true | 93 | SPEC 9–14：桌面與戶外前手機，已有氣象輸入；做天氣判讀，明說非醫療或安全建議。 |
| scope | false | 79 | 18–31：兩模型、非 WBGT 與露點差異清楚；品牌式「官方定義域」及上界未釘，TEMP-01。 |
| userFlow | true | 92 | 35–52：單位標籤、範例、具名模型、dirty/cancel/reset、首錯移焦；需加結果旁的不可估語意。 |
| inputsOutputs | false | 73 | 58–90：語法、首錯、公式與捨入明定；極端溫濕仍輸出不可靠值，迴歸符號宣稱亦錯。 |
| implementation | true | 94 | 94–100、150–151：固定公式可本地運算，零依賴、世代隔離 Worker、CSP、無持久資料。 |
| acceptance | true | 94 | 104–116、148–164：九項方法、真瀏覽器及正式 SEO 分開；必要的資料域回歸需隨修訂更新。 |
| tests | false | 82 | 19/19 釘版案例通過；缺官方資料域外與近角落負 delta 的反例。 |
| handoff | true | 95 | 168–174：固定交接、測試／瀏覽器／正式發布證據與獨立 claim。 |

**TEMP-01（BRIEF 5–7；SPEC 20–24、59–72、158–160）：工具門檻和官方適用性不同。** 合法欄位 `{"temperature":"60","windSpeed":"10","humidity":"100"}` 得 `heat-index`、**339.0°C**、差值 **+279.0°C**；這是把多項式外推到原資料域以外的數字。[NWS 官方係數與使用說明](https://www.weather.gov/ctp/heat) 明說迴歸不能用於超出 Steadman 資料的極端溫濕，也交代遮陰與輕量活動的情境。另輸入 43°C、30% RH、10 km/h，本工具走 actual、delta 0；NWS 的簡式預檢約 110.425°F，會選擇迴歸，而不是用固定 RH≥40 門檻。這個比較只證明選擇條件不同，不將任何域外計算當預報。修正應釘定有一手來源支持的溫濕組合範圍、超界原因與輸出形狀；首例只顯示量得氣溫並標「未估算體感」，不可顯示公式外推或可供安全判斷的差值。把產品的較窄門檻明寫成工具限制，並在結果旁交代模型假設。公開描述、FAQ 與字面測例一起修。

風寒使用的公制係數及 10 m 風速可由 [ECCC 技術文件](https://www.canada.ca/en/environment-climate-change/services/climate-change/canadian-centre-climate-services/display-download/technical-documentation-climate-normals.html) 核對；[NWS 風寒定義](https://www.weather.gov/safety/cold-wind-chill-chart) 是 ≤50°F、>3 mph。本規格一位小數風速 `>4.8` 的下一值是 4.9，與該英制界線的格點等效；4.8 是近似，不是精確等號。[加拿大現行預報門檻](https://www.canada.ca/en/services/environment/weather/severeweather/wind-chill-index.html) 為 ≤0°C、≥5 km/h，應避免 FAQ 稱兩機構現行門檻相同。

**TEMP-02（SPEC 86）：除了精確角落，鄰近值也可能低於氣溫。** `{"temperature":"27","windSpeed":"10","humidity":"40.1"}` 合法進入熱指數，未捨入約 26.8682°C，輸出 **26.9°C**、**−0.1°C**。與「其餘定義域內高於氣溫」相斥。保留不夾擠的模型結果，刪除普遍正差值宣稱，釘一筆相鄰案例。另可移除合成檔案的樣板檢查文句。

[verify.mjs](verify.mjs) 用有理數係數直接求 Rothfusz 多項式，獨立換單位和調整，高低濕分支按公式驗；風寒以等價指數求值，控制器從事件順序推導。Node v24.14.0、`node verify.mjs fixtures.json`、exit 0；16 core + 3 controller。最低角落簡式預檢約 80.42°F、濕度 85% 不調整／86% 在 28°C 加約 0.092°F，與規格分支一致。[全部字面/獨立預期和額外反例](verify-output.jsonl) · [命令及 SHA-256](execution.json)。

產品九面向皆 **NOT_RUN**：functionality（三模型及報告）、boundaries（溫濕有效域與首錯）、privacy（真 Network/Storage/URL/log）、security（惰性、CSP、Worker/Blob 回收）、usability（雙語桌面/手機、取消/恢復）、accessibility（實際鍵盤/320px/200%/對比）、localization-seo（候選 noindex、同語回鏈、正式另驗）、toolchain-provenance（固定來源/exit/重建 hash）、compatibility（隔離 Chrome/Edge 及下載）。沒有啟動產品。

另列 ready 阻斷 **REG-RUBRIC-229**（不改原規格任務的八項分數）：在遠端 registry revision 1537、blob `73e05eb696e26d943c8eb1fed2e7f5e2bdc89c50`，`spec-feels-like-temperature-20261109`.acceptanceCriteria 實填 `goal, scope, userFlow, inputsOutputs, implementation, acceptance, tests, handoff`，和原文件任務八節一致；固定 SPEC 的 `acceptance` 則預宣告 `functionality, boundaries, privacy, security, usability, accessibility, localization-seo, toolchain-provenance, compatibility`。現行 coordination-core（Git blob `4782dd1f249995ceeec00b2d0a89b57d9b9bbb7d`，103、287 行）要求 production 完全繼承已登記 spec 的 criteria，填入正確九項時會被 RUBRIC_MISMATCH，沿用現狀又會用文件八節取代產品驗收。請先依正式權責修正 spec 登記，再以固定版本核對九項和既有 Build；目前不可計入可開工 ready。

未取得串行 slot；未 ACK、寫正式 review 或改 ready。
