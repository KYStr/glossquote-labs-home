# Run 5 交接勘誤核對 A

範圍為 registry r1521 交接中的四組固定 spec/build。以下是勘誤與證據核對。原始候選與所有權保留，狀態和分數沿用原紀錄。

| 工具 | 固定規格 | 固定 build |
| --- | --- | --- |
| 薪資換算 | #224 `8b94c48c2b3673ab4525cd8c855eca5973e109d6` | #266 `f7e6ec583d28947445d15e5aa254569c7d4fc068` |
| 年齡計算 | #221 `249be6c1a19368b7de4bee8f75016307ef825552` | #267 `717ffe47574b2def25c9ab6f44e8dae6f0e1d080` |
| 料理單位換算 | #222 `213af9991a1a2d0a07f9acfe3e173d57184d9dec` | #268 `a4ba7abbf50fb3dffa0a93e2a2165cd47be502f8` |
| 工作日計算 | #225 `eb84069e2726fd311a7df0e733377153dd869a87` | #269 `0be2e551d603d5c0615c7043534d9def5982ddb7` |

## 原交接的五項旗標

### 薪資換算 #224 / #266｜確認，修正規格測試預期

`{"sourceBasis":"monthly","amount":"40000","bonusMonths":"24.55"}` 的 bonus 欄長 5，應依容量 4 和容量優先順序回 `{code:"INPUT_LIMIT",field:"bonusMonths",row:null}`。以 `0.55` 測兩位小數，可在長度 4 下觸發 `DECIMAL_FORMAT`。保留 `24` 合法及 `24.1` 回 `RANGE`。原作者檢核也引用了相同的錯誤預期，宜同步勘誤。固定 build 的核心和附加測試遵循容量優先。 [SPEC L61–63](https://github.com/KYStr/glossquote-labs-home/blob/8b94c48c2b3673ab4525cd8c855eca5973e109d6/docs/specs/salary-converter/SPEC.md#L61-L63) · [SPEC L136](https://github.com/KYStr/glossquote-labs-home/blob/8b94c48c2b3673ab4525cd8c855eca5973e109d6/docs/specs/salary-converter/SPEC.md#L136) · [AUTHOR-CHECK L12](https://github.com/KYStr/glossquote-labs-home/blob/8b94c48c2b3673ab4525cd8c855eca5973e109d6/docs/specs/salary-converter/AUTHOR-CHECK.md#L12) · [HANDOFF L63–72](https://github.com/KYStr/glossquote-labs-home/blob/f7e6ec583d28947445d15e5aa254569c7d4fc068/tools/salary-converter/HANDOFF.md#L63-L72) · [固定測試 L76–96](https://github.com/KYStr/glossquote-labs-home/blob/f7e6ec583d28947445d15e5aa254569c7d4fc068/tools/salary-converter/test/core.test.mjs#L76-L96)

### 年齡計算 #221 / #267｜確認，需釘定重複借位語義

`birthDate:"2023-01-31", referenceDate:"2023-03-01"` 按規格單次借位得到 `0y 1m -2d`，違反非負約束。依 build 再向 1 月借 31 天，得到 `0y 0m 29d`。規格宜明定「每借一次向前移一個月並扣一個月，直到日數非負；日數小於最後借入月的月長」，並同步兩語 FAQ 和錨點。此例的 29 日超過第一次借入的 28 天。固定 build 已採循環，現有的短月錨點尚未釘住連續日和完整案例族。 [SPEC L67–71](https://github.com/KYStr/glossquote-labs-home/blob/249be6c1a19368b7de4bee8f75016307ef825552/docs/specs/age-calculator/SPEC.md#L67-L71) · [SPEC L141](https://github.com/KYStr/glossquote-labs-home/blob/249be6c1a19368b7de4bee8f75016307ef825552/docs/specs/age-calculator/SPEC.md#L141) · [HANDOFF L127–150](https://github.com/KYStr/glossquote-labs-home/blob/717ffe47574b2def25c9ab6f44e8dae6f0e1d080/tools/age-calculator/HANDOFF.md#L127-L150) · [固定核心 L184–202](https://github.com/KYStr/glossquote-labs-home/blob/717ffe47574b2def25c9ab6f44e8dae6f0e1d080/tools/age-calculator/public/js/core/age.mjs#L184-L202) · [固定錨點 L239–258](https://github.com/KYStr/glossquote-labs-home/blob/717ffe47574b2def25c9ab6f44e8dae6f0e1d080/tools/age-calculator/test/core.test.mjs#L239-L258)

| 出生 2023-01-31，參考日期 | 單借位 | 重借位 | 總天數 |
| --- | --- | --- | ---: |
| 2023-02-28 | 0m 28d | 0m 28d | 28 |
| 2023-03-01 | 1m −2d | 0m 29d | 29 |
| 2023-03-02 | 1m −1d | 0m 30d | 30 |
| 2023-03-03 | 1m 0d | 1m 0d | 31 |
| 2023-03-30 | 1m 27d | 1m 27d | 58 |
| 2023-03-31 | 2m 0d | 2m 0d | 59 |

這個慣例會讓非閏年 2 月底後的兩天仍顯示 0 個月。獨立算式以 1999–2001 全部有效生日、逐日參考至 2005-12-31 做 2,202,412 組抽域檢查，未發現年月日字典序倒退或借位邊界失敗。兩次借位最多只會發生於借 2 月天數仍為負的情況，接著借入的 1 月有 31 天，足以補齊最多 2 天的缺額。上述為慣例的算式證據。

### 料理單位換算 #222 / #268｜確認，修正權威 fixture

`{"amount":"1","fromUnit":"liter","toUnit":"ml","ingredient":"none"}` 的來源單位有 5 單元，容量 4 先於列舉，得到 `{code:"INPUT_LIMIT",field:"fromUnit",row:null}`。兩份固定 fixture 的本地副本 SHA-256 相同，`err-unit-enum` 都仍寫 `ENUM`。固定 build 的測試跳過這筆原預期，改在測試程式內斷言 `INPUT_LIMIT`。建議原規格作者把 `err-unit-enum` 的來源改成 2 單元且非成員的 `oz`，另保留 `liter` 的容量優先斷言。固定新版規格後，由原製作者同步 fixture 與來源雜湊，並讓測試直接逐筆比較。 [SPEC L55–59](https://github.com/KYStr/glossquote-labs-home/blob/213af9991a1a2d0a07f9acfe3e173d57184d9dec/docs/specs/cooking-measurement-converter/SPEC.md#L55-L59) · [SPEC L150](https://github.com/KYStr/glossquote-labs-home/blob/213af9991a1a2d0a07f9acfe3e173d57184d9dec/docs/specs/cooking-measurement-converter/SPEC.md#L150) · [規格 fixture L1](https://github.com/KYStr/glossquote-labs-home/blob/213af9991a1a2d0a07f9acfe3e173d57184d9dec/docs/specs/cooking-measurement-converter/fixtures.json#L1) · [HANDOFF L63–75](https://github.com/KYStr/glossquote-labs-home/blob/a4ba7abbf50fb3dffa0a93e2a2165cd47be502f8/tools/cooking-measurement-converter/HANDOFF.md#L63-L75) · [固定測試 L14–33](https://github.com/KYStr/glossquote-labs-home/blob/a4ba7abbf50fb3dffa0a93e2a2165cd47be502f8/tools/cooking-measurement-converter/test/core.test.mjs#L14-L33)

### 工作日計算 #225 / #269｜確認，假日容量規則需裁決

以 `{mode:"count",startDate:"2026-01-05",endDate:"2026-01-09",holidays:Array(n).fill("2026-01-07").join("\n")}` 為最小結構。重複日期依規格合法，去重在列計數之後。以 LF 分隔的 `n` 筆有效日期最短長度是 `11n−1`。372 筆需 4091 單元，373 筆需 4102，400 筆需 4399，401 筆需 4410。第 401 列改成單字元 `x` 仍需 4401 單元，前 400 列必須有效才能掃到該列，因此在 4096 上限下 `ROW_LIMIT` 不可達。原 build 測試按現行規則回 `INPUT_LIMIT`，並用 372 列尾隨 5 個 LF 到達 4096。 [SPEC L27](https://github.com/KYStr/glossquote-labs-home/blob/eb84069e2726fd311a7df0e733377153dd869a87/docs/specs/workdays-calculator/SPEC.md#L27) · [SPEC L64–68](https://github.com/KYStr/glossquote-labs-home/blob/eb84069e2726fd311a7df0e733377153dd869a87/docs/specs/workdays-calculator/SPEC.md#L64-L68) · [SPEC L100](https://github.com/KYStr/glossquote-labs-home/blob/eb84069e2726fd311a7df0e733377153dd869a87/docs/specs/workdays-calculator/SPEC.md#L100) · [SPEC L144](https://github.com/KYStr/glossquote-labs-home/blob/eb84069e2726fd311a7df0e733377153dd869a87/docs/specs/workdays-calculator/SPEC.md#L144) · [固定核心 L151–175](https://github.com/KYStr/glossquote-labs-home/blob/0be2e551d603d5c0615c7043534d9def5982ddb7/tools/workdays-calculator/public/js/core/core.mjs#L151-L175) · [固定測試 L219–256](https://github.com/KYStr/glossquote-labs-home/blob/0be2e551d603d5c0615c7043534d9def5982ddb7/tools/workdays-calculator/test/core.test.mjs#L219-L256)

保留「400 筆合法、第 401 筆回 `ROW_LIMIT`」合約時，建議 raw cap 至少 4410。HANDOFF 建議的 4399 只涵蓋 400 筆。若 4096 是必須保留的容量，宜將文件和雙語說明改為有效日期最多 372 筆，並明定 373 筆有效日期先回 `INPUT_LIMIT`。採 372 為列數上限時，372 筆有效日期後加 LF 和單字元的非空列只需 4093，仍可用來驗證 `ROW_LIMIT` 先於該列內容檢查。 [HANDOFF L104–116](https://github.com/KYStr/glossquote-labs-home/blob/0be2e551d603d5c0615c7043534d9def5982ddb7/tools/workdays-calculator/HANDOFF.md#L104-L116)

### 工作日計算 #225 / #269｜確認，負零正規表示式文字勘誤

`{mode:"shift",startDate:"2026-01-05",days:"-0",holidays:""}` 符合規格所寫的 `-?(0|[1-9][0-9]*)`，同句括號和測試要求則回 `{code:"INTEGER_FORMAT",field:"days",row:null}`。固定 build 已採 `^(0|-?[1-9][0-9]*)$`。宜同步規格的正規表示式，保留錯誤碼及測試。 [SPEC L65](https://github.com/KYStr/glossquote-labs-home/blob/eb84069e2726fd311a7df0e733377153dd869a87/docs/specs/workdays-calculator/SPEC.md#L65) · [HANDOFF L117–122](https://github.com/KYStr/glossquote-labs-home/blob/0be2e551d603d5c0615c7043534d9def5982ddb7/tools/workdays-calculator/HANDOFF.md#L117-L122) · [固定測試 L185–191](https://github.com/KYStr/glossquote-labs-home/blob/0be2e551d603d5c0615c7043534d9def5982ddb7/tools/workdays-calculator/test/core.test.mjs#L185-L191)

## 本次新增的確認事項

- **薪資，測試不變量有第二處衝突。** `{"sourceBasis":"monthly","amount":"0.01","bonusMonths":"0"}` 合法，未捨入的 `annualBase` 是 0.12，整元輸出是 0。L136 的 `annualBase=A×12` 應限於未捨入中間值，或改成 `annualBase=roundHalfUp(A×12)`。這與原 `24.55` 旗標分開。 [SPEC L60](https://github.com/KYStr/glossquote-labs-home/blob/8b94c48c2b3673ab4525cd8c855eca5973e109d6/docs/specs/salary-converter/SPEC.md#L60) · [SPEC L65–69](https://github.com/KYStr/glossquote-labs-home/blob/8b94c48c2b3673ab4525cd8c855eca5973e109d6/docs/specs/salary-converter/SPEC.md#L65-L69) · [SPEC L136](https://github.com/KYStr/glossquote-labs-home/blob/8b94c48c2b3673ab4525cd8c855eca5973e109d6/docs/specs/salary-converter/SPEC.md#L136)
- **年齡，旗標漏列兩類觸發。** 非閏年 3/1 參考、30 日出生時，單借位也會留下 `1−30+28=−1`（如 2023-01-30 → 2023-03-01）。閏年 3/1 參考、31 日出生同樣有 `1−31+29=−1`（如 2024-01-31 → 2024-03-01）。兩例重借後都是 0m30d。連同非閏年的 31 日出生配 3/1、3/2，共四種日與月長組合。更新勘誤與錨點的覆蓋範圍。 [VERIFICATION L87–92](https://github.com/KYStr/glossquote-labs-home/blob/717ffe47574b2def25c9ab6f44e8dae6f0e1d080/tools/age-calculator/VERIFICATION.md#L87-L92) · [固定核心 L184–202](https://github.com/KYStr/glossquote-labs-home/blob/717ffe47574b2def25c9ab6f44e8dae6f0e1d080/tools/age-calculator/public/js/core/age.mjs#L184-L202)
- **工作日，反向組成測試敘述過廣。** 無假日下 `count(2026-01-11,2026-01-08)=-1`，因反向區間的 (1/8, 1/11] 只有星期五 1/9 是工作日。從星期日 1/11 反向移動一個工作日回到 1/9，原訖日 1/8 同為工作日。規格 L78 的正向條件成立，L144 的另測文字、build 測試註解與作者驗證聲稱只要訖日為工作日的說法宜補上方向條件。保留正向條件，可另測反向時兩端皆工作日。 [SPEC L75–78](https://github.com/KYStr/glossquote-labs-home/blob/eb84069e2726fd311a7df0e733377153dd869a87/docs/specs/workdays-calculator/SPEC.md#L75-L78) · [SPEC L144](https://github.com/KYStr/glossquote-labs-home/blob/eb84069e2726fd311a7df0e733377153dd869a87/docs/specs/workdays-calculator/SPEC.md#L144) · [固定測試 L40–66](https://github.com/KYStr/glossquote-labs-home/blob/0be2e551d603d5c0615c7043534d9def5982ddb7/tools/workdays-calculator/test/core.test.mjs#L40-L66) · [VERIFICATION L18–24](https://github.com/KYStr/glossquote-labs-home/blob/0be2e551d603d5c0615c7043534d9def5982ddb7/tools/workdays-calculator/VERIFICATION.md#L18-L24)
- **工作日，已揭露的 Worker 差異影響規格交驗。** SPEC 要求固定核心建成 module Worker，且 security、compatibility 明列 Worker 驗證。HANDOFF 已揭露 build 用主執行緒的 `setTimeout` 排程。固定 app L74–79 與 controller L43–46、L83–95 證實這項差異。世代號測試支持晚到結果隔離。進入正式審查前，應由原作者補齊規格要求的 Worker，或提交明確規格修訂並同步受影響驗收條目。 [SPEC L88–89](https://github.com/KYStr/glossquote-labs-home/blob/eb84069e2726fd311a7df0e733377153dd869a87/docs/specs/workdays-calculator/SPEC.md#L88-L89) · [SPEC L102–107](https://github.com/KYStr/glossquote-labs-home/blob/eb84069e2726fd311a7df0e733377153dd869a87/docs/specs/workdays-calculator/SPEC.md#L102-L107) · [HANDOFF L92–100](https://github.com/KYStr/glossquote-labs-home/blob/0be2e551d603d5c0615c7043534d9def5982ddb7/tools/workdays-calculator/HANDOFF.md#L92-L100) · [固定 app L74–79](https://github.com/KYStr/glossquote-labs-home/blob/0be2e551d603d5c0615c7043534d9def5982ddb7/tools/workdays-calculator/public/js/app.js#L74-L79) · [固定 controller L83–95](https://github.com/KYStr/glossquote-labs-home/blob/0be2e551d603d5c0615c7043534d9def5982ddb7/tools/workdays-calculator/public/js/controller.mjs#L83-L95)

## 可選整理

- 規格再修訂時可統一舊 `src/` 路徑示意與候選遵循的 `public/js/` 路徑。這屬文件對齊，和工作日的 Worker 行為差異分開。 [薪資 HANDOFF L52–59](https://github.com/KYStr/glossquote-labs-home/blob/f7e6ec583d28947445d15e5aa254569c7d4fc068/tools/salary-converter/HANDOFF.md#L52-L59) · [料理 HANDOFF L77–84](https://github.com/KYStr/glossquote-labs-home/blob/a4ba7abbf50fb3dffa0a93e2a2165cd47be502f8/tools/cooking-measurement-converter/HANDOFF.md#L77-L84) · [工作日 HANDOFF L80–91](https://github.com/KYStr/glossquote-labs-home/blob/0be2e551d603d5c0615c7043534d9def5982ddb7/tools/workdays-calculator/HANDOFF.md#L80-L91)

## 實際讀取與驗證

- 檢閱本地 `docs/SECURITY-BASELINE.md`、`prs/{221,222,224,225,266,267,268,269}.json`、各規格的 `SPEC.md`、`fixtures.json`、相關 `AUTHOR-CHECK.md`，以及各 build 的 `HANDOFF.md`、`VERIFICATION.md`、`test/fixtures.json`。使用 `rg --files`、`rg -n`、PowerShell `Get-Content`、`ConvertFrom-Json` 定位和解析。
- 以 `Get-FileHash -Algorithm SHA256` 比較每組本地 spec/build fixture，四組皆相同。薪資 `c272a04b7219d9dd1d928a6eb966f82074c52ac62ff09ef7709caeab3313c485`、年齡 `19451dc10db3bafbd4bfd9c3f6f562057a30b84970a14150dc091315107e8e06`、料理 `aa3b8c01832ab1b39bc1790d8f16bff64d0e98c9b432c9718783992e1b4b9d79`、工作日 `9330e407544c8f27d57167fafe9606fd426949fed95294d17d123c1ed3ecdc7e`。
- 以 `gh api -H 'Accept: application/vnd.github.raw+json' "repos/KYStr/glossquote-labs-home/contents/<path>?ref=<fixed-SHA>"` 唯讀取得四份固定 `SPEC.md`，逐行內容與本地一致，尾端換行在比較時正規化。以相同方式讀取四個固定 build 的核心與 `test/core.test.mjs`，以及工作日 app/controller。固定候選來源只讀。
- 以 `functions.exec` 內嵌 JavaScript 獨立重算 UTF-16 容量、負零正規表示式、薪資整元捨入與年齡借位。年齡使用 UTC Gregorian 天數作旁證。工作日反向反例以日曆區間手算對照固定核心。
- **NOT_RUN**。本輪產品腳本、build、套件測試、預覽伺服器、真實瀏覽器和裝置、Network/Storage、螢幕閱讀器、原生對話、正式 HTTPS/SEO、九面向評分、registry 提交、合併及部署皆未執行。候選 `VERIFICATION.md` 的執行結果屬作者紀錄。
