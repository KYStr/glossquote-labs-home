> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：6251fccf659a3705758bfded376040d012c96f0c94ed1880168f92030e7ea81d。

# ideal-weight-calculator｜獨立規格審查

**文件結論：建議退修（revision）。** 19/19 字面案例吻合候選。候選將 WHO 表的 24.9 顯示值當精確界線，混用原始與後續四式係數，並把超出模型適用性的結果放在同一健康參考流程，不能放行。

- 任務：labs-ideal-weight-calculator-spec-20261109；規格：spec-ideal-weight-calculator-20261109。
- 原 owner / claim：cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory / muse-r4-ideal-weight-calcu-claim-20261109T152003Z-bb4d9。
- 固定候選：[6728a065fb23e257e518d8e3c40f003022061d62](https://github.com/KYStr/glossquote-labs-home/tree/6728a065fb23e257e518d8e3c40f003022061d62)；[PR #239](https://github.com/KYStr/glossquote-labs-home/pull/239)（open draft，head 相符）。
- reviewer：local-codex:01a1c87c-ef54-7bd0-a50d-0fc69b43bed3，未撰寫、未修訂本候選，亦不在 owner、author 或 contributors。
- 派工：[PR #284](https://github.com/KYStr/glossquote-labs-home/pull/284)，brief 固定 83d5b24a00eb80d07ffcdd8aa2886006bc8a61ed。登記讀值 r1530／blob e01da965f28e5248ca13158094ca356254a25c2b，contract 2026-10-29.1；主頁 baseline 26525d5f6380915ea95dde879dec769442db0d95。
- 記錄時刻（UTC）：2026-11-11T03:10:26.997Z。原登記狀態：task reviewing / spec draft。正式 registry 操作待主統籌串行 slot。

四檔由 GitHub connector 讀固定 commit；本地副本的 Git blob 逐檔相符，完整內容均已閱讀。

|檔案|bytes|Git blob SHA-1|SHA-256|
|---|---:|---|---|
|[BRIEF.md](https://github.com/KYStr/glossquote-labs-home/blob/6728a065fb23e257e518d8e3c40f003022061d62/docs/specs/ideal-weight-calculator/BRIEF.md)|2088|8fbb47709f436bbe56947993fc3a887cf78bd620|bd508b88c080cead3ea774c649c4e878639b324f14046fe9e747dd921474c524|
|[SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/6728a065fb23e257e518d8e3c40f003022061d62/docs/specs/ideal-weight-calculator/SPEC.md)|24644|896ba5589dd902ceefabd403c52e04c46fb96476|f6abd71d5e3b90b40fa21540aa9db4bc5ae586b98b3c6f34d4ee3ea0958d473b|
|[fixtures.json](https://github.com/KYStr/glossquote-labs-home/blob/6728a065fb23e257e518d8e3c40f003022061d62/docs/specs/ideal-weight-calculator/fixtures.json)|6413|ce1d7499c48b65291c8f9899a5049c0eec24830c|daaef39bbe70217758eac5e35c876b997b6528b6d134a6a69a7d18d3ea889f17|
|[AUTHOR-CHECK.md](https://github.com/KYStr/glossquote-labs-home/blob/6728a065fb23e257e518d8e3c40f003022061d62/docs/specs/ideal-weight-calculator/AUTHOR-CHECK.md)|7510|8aa76c137de9b69ece7bb6773097c15e46771e4b|d6d2b1da5089c7fb7763b67d47192374a2ed6e72343dd83fd8223aa48b03e6fa|

## 八節審查（文件分數）

|登記面向|完整|分數|獨立證據|
|---|---|---:|---|
|goal|false|87|可理解的身高→比較四式及 BMI 參考；手機和桌面情境具體。主標「理想體重」與就醫／飲食場景讓無臨床驗證的數值被當成個人目標的風險，應以比較用途與限制呈現。|
|scope|false|85|單一身高/性別、排除目前體重和 BMR/TDEE；BMI/TDEE 已有完全相同任務的部分（身高→WHO 範圍），差異應落在四公式歷史比較，不能把 24.9/25 當兩套 WHO 標準以主張差異。|
|userFlow|false|87|合成例、草稿、真取消、錯誤、重設、離開與下載清楚。小於 5 ft 的結果只在 FAQ 才標外推；無警語的 JSON 可被誤讀（S02-IW-03）。|
|inputsOutputs|false|76|16/16 符合候選契約，含精確 cm/in、磅/kg、欄序與捨入。WHO 上限語義、Robinson 確切原始常數及 Miller 版本的證據仍不符（S02-IW-01/02）。|
|implementation|true|97|Node 24/ESM 零依賴、純核心/controller/DOM；精確有理數、固定 Worker、generation、pagehide、CSP 與零工作請求可行。|
|acceptance|false|85|正文九面向、同 head/≥90、兩語/隔離/真 zoom/下載/正式 SEO；目前要求驗收按錯誤來源及具誤導性的標籤，無法以此通過 truthfulness。|
|tests|true|94|16 核心＋3 狀態吻合，另有兩來源反例、外推和 Unicode 防線。現有測例釘錯來源宣稱，修改模型後要更新資料，不修改 expected 迎合程式。|
|handoff|true|97|固定四檔、另行 production claim/ACK/CAS、owner、九面向與 NOT_RUN。正式 URL 尚未核定且未部署。|

## 字面驗算與檢查

以 Node v24.14.0 執行 verify.mjs（本地證據：verify.mjs）（用共用 review-lib.mjs（本地證據：../review-lib.mjs）；命令 `node.exe verify.mjs`，exit 0，Windows 隱藏子行程）。腳本只讀已核實的合成 fixture，依契約自行計算；expected 只用於比對。若另行封裝，執行時可在腳本後傳入已核實的 fixtures.json 路徑。
完整字面 input／獨立推導／作者宣告值見 fixtures-output.json（本地證據：fixtures-output.json）；程序狀態見 command.json（本地證據：command.json）。

|檢查|結果|證據|
|---|---|---|
|核心|PASS|16/16；精確有理數、欄位優先序、未捨入英吋、四式與 1 位小數。|
|控制狀態|PASS|3/3；兩個注入的舊結果也由來源獨立重算。|
|報告參考值|PASS|male-170-standard 179 bytes／SHA-256 e1465bcffa119b16f7b59e9101dd713464dbdc4145e275c4f60e44627f29b05b。現規格 JSON 沒有使用限制。|
|來源與邊界語義|FAIL|WHO 數值邊界、原版 Robinson 與來源描述、未標註的 Miller 歧異及低身高外推用途。|

## 阻擋缺陷

### S02-IW-01

- 位置：BRIEF；SPEC §scope／§userFlow／§inputsOutputs／§tests FAQ 與 meta
- 最小案例：身高 170 cm，範例輸出；用 72.1 kg 只作離線數學對照（不是新增產品輸入）。
- 觀測：候選用 BMI 24.9 作精確上端，71.961 kg → 顯示 72.0。WHO 公開表以一位小數寫 18.5–24.9，另定過重由 BMI 25 起；72.1 kg 的 BMI=7210/289≈24.948（仍小於25、顯示一位小數也是24.9），卻在候選所稱 WHO 全帶之外。對該身高的精確 25 排他界值是 72.25 kg。國健署的 <24 則是另一個實際標準。
- 預期：若保留固定 24.9，以「BMI 18.5 與 24.9 的換算參考點」如實標示，而非完整 WHO 精確界線；若產品要提供完整 WHO 帶，應以 25 排他上界、精確邊界及顯示捨入規則明示。不同版本不得同稱完整 WHO 分類；BMI 22 維持參考點。
- 重驗：重核 WHO/HPA 源與兩語標籤、FAQ、SEO、報告；若改公式重算所有上界、成功 payload 及下載。

### S02-IW-02

- 位置：SPEC §inputsOutputs 四式/出處表；AUTHOR-CHECK；BRIEF 原始常數宣稱
- 最小案例：170 cm 男性，E=880/127 in；另外 152.4 cm 基準與兩性係數。
- 觀測：Robinson 1983 原論文摘要直接給男 51.65 + 1.85E、女 48.67 + 1.65E。候選的 52 + 1.9E／49 + 1.7E 是後續表所載近似，170 cm 男 65.2 vs 原式 64.5 kg。Miller 的同一 1983 來源有 2016 比較研究表的 56.2/1.41、53.1/1.36 與另一出版版本的 55.7/1.39、53.0/1.33；本輪只核到原文書目，不能說原文已核實。Hamwi/Devine 的常見數值有比較研究引用，未取得 Hamwi 1964 全章與 Devine 全文；不能聲稱逐項看過原版或其體型附註。
- 預期：四式每個係數標示可核查的版本及原始／後續轉述差別。Robinson 用原值或明確標為 2016 表之近似；Miller 選定版本需交代差異與可見來源；不要把未讀原文當已核實。
- 重驗：逐式逐性別重算 5 ft、低於 5 ft（若仍顯示）及 160/170 cm；原式與近似版至少一筆可區分；更新 report bytes 與出處說明。

### S02-IW-03

- 位置：SPEC §goal／§userFlow／§inputsOutputs／§tests 5 ft FAQ
- 最小案例：合成 130 cm 女性；另下載 170 cm 合成例並離開網頁查看報告。
- 觀測：130 cm 為允許端點，Devine 25.2 kg 相當 BMI 約14.91。正數不是臨床合理性；四條以 >5 ft 表述的歷史線性公式被外推，卻仍在『理想體重』表內同樣展示，外推只在 FAQ；匯出有身高、性別及數值，無估算、外推、成人條件和不作劑量／減重目標的限制。
- 預期：用清楚的歷史模型比較語言，在結果與可單獨閱讀的下載標記成人限定、不可用來決定藥量或作個人體重目標；不把外推當原文有效式，應在結果鄰接明示不適用或獨立標記純數學外推。產品沒有權限替人判讀健康或給藥。
- 重驗：核對兩語輸入／結果／FAQ／下載；比較 130、147、152.4 cm 的標記，報告 schema/bytes 與正文一致。

修正限定在原 docs/specs/ideal-weight-calculator/ 的契約、測例及作者紀錄，由主統籌交回原責任或依有效維護任務處理。候選更新後才重審；本 reviewer 未修改候選。

## 已讀來源

- [WHO NLiS 定義](https://www.who.int/data/nutrition/nlis/info/malnutrition-in-women)：成人表以 18.5–24.9 顯示正常，過重界值 ≥25；BMI 不代表個人健康結論。
- [WHO 歐洲成人 BMI 表](https://www.who.int/europe/news-room/fact-sheets/item/nutrition---maintaining-a-healthy-lifestyle)：同時列 18.5–25 建議及一位小數分類表。
- [國健署成人健康體重對照](https://www.hpa.gov.tw/542/9736/n)：正式區間 18.5≤BMI<24。
- [臺大醫院衛教公式](https://health.ntuh.gov.tw/health/hrc_v3/gm003.aspx)：本地使用 BMI 22 作標準體重參考點，非 WHO 或國健署分類界線。
- [Robinson 原論文摘要](https://pubmed.ncbi.nlm.nih.gov/6869387/)：原始係數、來源資料、>5 ft，及特定藥物給藥不宜任用簡化估值。
- [Hopefl、Miller 等原文章書目](https://doi.org/10.1093/ajhp/40.10.1622a)：出版方書目確認篇名、作者與頁；全文未能取用，不能作候選 56.2 的直接證據。
- [Peterson 等 2016 原始比較研究](https://pmc.ncbi.nlm.nih.gov/articles/PMC4841935/#T3)：Table 3 實際採用本候選四式版本；屬後續比較研究所引用常數，尤其 Robinson 不等同原摘要。
- [2021 出版版本差異](https://pmc.ncbi.nlm.nih.gov/articles/PMC8646317/#T1)：僅作歧異證據：其 Table 1 所載 Miller 與 2016 不同，不能證明何者為原文。
- [NIST Handbook 44（2026）](https://nvlpubs.nist.gov/nistpubs/hb/2026/NIST.HB.44-2026.pdf)：1 in = 25.4 mm，1 lb = 0.45359237 kg。
- [BMI/TDEE 固定規格](https://github.com/KYStr/glossquote-labs-home/blob/f4f9192b115d68257b674011e6d38fb140d872db/docs/specs/bmi-tdee-calculator/SPEC.md)：既有工具已計算同身高的 WHO 範圍，另做 BMI 與 TDEE；本案可區隔的價值是並列歷史模型。
- [IETF RFC 8259 §8.2](https://datatracker.ietf.org/doc/html/rfc8259#section-8.2)：JSON escaped lone surrogate 在不同實作互通性有限；本案指定的 Node/JS 可用 ASCII escape 重現並驗拒絕。

## 非阻擋改善

- 修正 SPEC §scope 的 bmi-tdee-calculator 相對連結（現路徑會從自身子目錄開始）；用固定 GitHub blob 引用已讀的相鄰規格。
- 補 UNICODE 及首錯 literal：如 ASCII JSON 字面 `\uD800` 由 Node JSON.parse 形成未成對代理字元；目前腳本證實應回 UNICODE，Cf、C0 亦同。

## 另列：生產驗收契約 — FAIL（S02-REGISTRY-01）

GitHub registry r1537／blob 73e05eb696e26d943c8eb1fed2e7f5e2bdc89c50：原 spec 製作 task 的文件評分應使用上表八節；spec.acceptanceCriteria 卻也登記同樣八項（goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff）。
固定規格宣告產品九項：functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility。這五份的 spec 都仍為 draft；本項無引用該 spec 的 production task。協作核心 blob 4782dd1f249995ceeec00b2d0a89b57d9b9bbb7d 會強制 production 原樣繼承 spec 條件。即使字面測例全對，現有登記也無法以該候選的九面向為生產驗收門檻。
`spec.acceptanceCriteria` 應固定同一候選文件所列的九個必要產品面向與證據；原 spec 製作 task 的八個文件面向及分數保持。 保留同一 spec ID、原作者與原 task；等主統籌確定合法維護／修訂途徑，由有權 actor 修正後重新讀回 registry、固定規格與 PR head，才可計入 ready。

## 未執行與交接

產品九面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility 皆 **NOT_RUN／null**。此處 PASS 僅指文件證據；未執行候選產品、Chrome／Edge、真下載／原生視窗、正式 SEO 或部署。

待主統籌指定串行 slot 後，實際 reviewer 重核 PR head、owner 和最新 registry，先本人 ACK、保存遠端固定審查證據，再提交同 candidate 的實際 verdict；任何候選缺陷不得 mark-spec-ready。
