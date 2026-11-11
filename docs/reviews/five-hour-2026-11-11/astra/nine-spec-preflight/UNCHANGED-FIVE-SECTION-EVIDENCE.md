# 五份未變規格的既有八節實質證據

以下五段逐字摘自本 reviewer 首輪報告；當時固定來源為 448bd9fc9865fe65f6014b66f4a2e2d54b76f539，PR304 對應文件已證明 bytes 相同，因此行號與內容證據沿用。這不是新一輪產品執行。首輪原報告 SHA-256：`7980e993e5a9ba647c2f8dc982b4e3d5da8f8eeaa66ec57c6fa40ff4c813343e`。原始算術執行結果之五份相關列另見 [既有結果摘錄](unchanged-five-fixture-evidence.json)，只複用歷史證據，未重跑。

### 年齡

- goal/scope（7–27）：足歲拆解、總天數、星期與下個生日；排除法律資格、出生時刻、農曆等。直接讀 school-entry-year，其產物是學年度與年級，不是年齡拆解；legacy date-calculator 的新版已有星期顯示，因此不能把「星期」單獨當新增差異，實質差異仍是年/月/日借位與生日語義。
- userFlow（28–46）：今天只由 app 層填入，核心不讀時鐘；生日當日與使用今天均有明確狀態效果，草稿/重設/切語明確。
- inputsOutputs（47–74）：1900–2100輸入範圍、nextBirthday可2101、反覆借月直至日非負、2/29採3/1、Gregorian/JDN與固定曜日表。18案例用 Python datetime/calendar 独立驗證，四個兩次借位案例均相符。
- implementation（75–84）：純日期核心與 app 時鐘責任分開、Node24零依賴、固定Worker與全部失效/清理。
- acceptance/tests（85–149）：九產品面向、時區/閏世紀/未來生日、18+3字面案例與必要CLI/瀏覽器 gate。輸出整數，不需跨時區浮點近似。
- handoff（150–158）：固定來源、八節非作者review、另 production claim、產品和正式發布分開。
- 非阻止文案：scope 稱 legacy 無星期已過時；建議只保留真正新增的年齡/生日差異，不影響本案主要區隔。

### 工作日

- goal/scope（7–28）：桌面排程與手機倒推日期，手動假日、不內建官方行事曆，固定週六日週末。直接讀 legacy date-calculator 明文不含工作日/假日，區隔成立。
- userFlow（29–52）：雙模式投影、五欄草稿、模式切換/dirty/reset/cancel、錯誤/報告失效。
- inputsOutputs（53–81）：count 有向半開區間、shift 對稱逐日、重複假日/週末假日/超區間分開揭露、400列與8192單元/行號。第78行的逆運算條件已修正：反向需要起訖皆工作日；實際反例亦列。23案例相符。
- implementation（82–92）：整數JDN、不讀時區、步進有界、工作世代/Blob釋放與固定資產。
- acceptance/tests（93–167）：九產品面向、count反號/可加總、有條件組成與反例、±3660、LF/CRLF/401列首錯、23+3案例、CLI/隔離瀏覽器 gate。
- handoff（168–176）：同repo/owner/readback、固定candidate、產品與release分開。
- 非阻止文案：goal/BRIEF簡稱互為反運算，宜補「符合端點條件時」；§4/測試契約已清楚。

### 薪資

- goal/scope（7–28）：四基準薪資與年終月數換算，排除加班/扣繳/最低工資判定；固定30日×8小時慣例有雙語揭露。既有 overtime-pay 是按出勤型態加給，meeting-cost 是多人會議成本，輸入輸出與工作不同。
- userFlow（29–50）：六列結果、範例、重設、變更失效/重跑、取消/錯誤/下載狀態。
- inputsOutputs（51–82）：來源基準先驗、各自上限、amount必須>0、年終0–24且一位小數；六輸出各從未捨入月薪一次half-up。最大annualTotal=10,799,998,920低於安全整數；15案例相符。
- implementation（83–92）：BigInt有理數、各欄固定解析尺度、核心與DOM/工作世代分開。
- acceptance/tests（93–154）：九產品面向、四基準端點與越界/0金額/24.1、15+3字面案例、固定canonical JSON與CLI/GUI gate。
- handoff（155–163）：規格ready和實作/發布責任分開，不以本工具推定合法薪資。
- 補查 [勞動部月薪制問答](https://www.mol.gov.tw/1607/28162/28166/28180/99861/28188/29026/post) 支持FAQ所述特定月薪制情境常採30×8基礎；不擴大到所有勞動契約。

### 分帳

- goal/scope（7–28）：付款前一張未稅餐費的稅/小費和等分，沒有已付金額或誰轉給誰。直接讀 legacy Bill Splitter FR-03–05：由每人已付總和結算轉移，且沒有稅/小費計算；產品工作可區別。
- userFlow（29–48）：稅前/稅後小費基數、結果及尾分歸屬、修改/取消/錯誤/下載失效。
- inputsOutputs（49–69）：稅額先half-up到分，再按指定基數算tip，總額整分分配，前序拿餘分；18案例用Fraction重算，sum(shares)=total均成立。
- implementation（70–79）：金額不經浮點、core/controller/DOM、資源清理/安全DOM/無網路儲存。
- acceptance/tests（80–144）：九產品面向、半分與基數差異、18+3固定案例、逐bytes報告和完整後續檢查。
- handoff（145起）：固定來源、原owner/另claim、非作者八節、九產品面向與正式release分開。

### 露點

- goal/scope（7–25）：室內冷表面結露/生活濕度判斷、無感測器；過冷水露點與霜點區別明確。不承諾全域誤差；6.112與BOM6.105差異已如實記錄。
- userFlow（26–45）：氣溫/RH、三輸出、舒適文字不僅顏色、dirty/error/cancel/下載失效/切語生命週期。
- inputsOutputs（46–76）：T −50…60、RH>0…100、UTF16容量/首錯；固定Magnus與216.7公式、最後一位小數捨入、用已捨入露點查7級。19案例用55位Decimal ln/exp獨算相符。
- implementation（77–85）：常數單點、零依賴、固定Worker/世代與資源清理，不讀locale/time。
- acceptance/tests（86–151）：九產品面向、ln定義域、分級跨界、RH100恆等、19+3字面案例，完整CLI/瀏覽器/Network/Storage/SEO gate。
- handoff（152–160）：固定版本、非作者八節、另claim/產品/部署區別。
- 非阻止改善：門檻表雖明示為經驗模型，對「多公開來源一致」未附具體門檻來源；宜補實際來源或明述為本工具釘版的經驗分級，不聲稱通用標準。BOM本身指出舒適感依個人與適應氣候而變。
