> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：0437637e5338a40ddcb886cfdd300bb235697a68b10e45588a1f6cdb68bc4c45。

# bac-calculator｜獨立規格審查

**文件結論：建議退修（revision）。** 16/16 字面案例吻合現有模型；另有兩筆精確門檻反例、逐列錯誤歧義與法律／安全呈現問題，不能放行。

- 任務：labs-bac-calculator-spec-20261109；規格：spec-bac-calculator-20261109。
- 原 owner / claim：cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory / muse-r4-bac-calculator-claim-20261109T151415Z-c90e1。
- 固定候選：[8029a6d35ca8e3bd61beac4fd31e66be2e94b72d](https://github.com/KYStr/glossquote-labs-home/tree/8029a6d35ca8e3bd61beac4fd31e66be2e94b72d)；[PR #235](https://github.com/KYStr/glossquote-labs-home/pull/235)（open draft，head 相符）。
- reviewer：local-codex:01a1c87c-ef54-7bd0-a50d-0fc69b43bed3，未撰寫、未修訂本候選，亦不在 owner、author 或 contributors。
- 派工：[PR #284](https://github.com/KYStr/glossquote-labs-home/pull/284)，brief 固定 83d5b24a00eb80d07ffcdd8aa2886006bc8a61ed。登記讀值 r1530／blob e01da965f28e5248ca13158094ca356254a25c2b，contract 2026-10-29.1；主頁 baseline 26525d5f6380915ea95dde879dec769442db0d95。
- 記錄時刻（UTC）：2026-11-11T02:57:36.924Z。原登記狀態：task reviewing / spec draft。正式 registry 操作待主統籌串行 slot。

四檔由 GitHub connector 讀固定 commit；本地副本的 Git blob 逐檔相符，完整內容均已閱讀。

|檔案|bytes|Git blob SHA-1|SHA-256|
|---|---:|---|---|
|[BRIEF.md](https://github.com/KYStr/glossquote-labs-home/blob/8029a6d35ca8e3bd61beac4fd31e66be2e94b72d/docs/specs/bac-calculator/BRIEF.md)|1456|14658ffef4f8a44972ed0f11b93ec2764a5b2c1f|68dcbe90a4482c3b64d2f7d58aaf9ed0caa127504dfec8b7e573b2bcb5f2f86e|
|[SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/8029a6d35ca8e3bd61beac4fd31e66be2e94b72d/docs/specs/bac-calculator/SPEC.md)|23844|02a2f55ff6313c0d604062f80078fc2ea7742aac|b9420b5209c193b1cd2eda5920872f087c72698e2770ed7fdd0c3e0d9ad5d1b2|
|[fixtures.json](https://github.com/KYStr/glossquote-labs-home/blob/8029a6d35ca8e3bd61beac4fd31e66be2e94b72d/docs/specs/bac-calculator/fixtures.json)|7397|8b605893dc6e8b04136d405f5df6fdcb83efccaf|8f2308ef66a041d3c4017742bfb548e41eaf139a4be7ff7582c3edca945d1227|
|[AUTHOR-CHECK.md](https://github.com/KYStr/glossquote-labs-home/blob/8029a6d35ca8e3bd61beac4fd31e66be2e94b72d/docs/specs/bac-calculator/AUTHOR-CHECK.md)|5210|caf9fe78f0fb27c8ea48dbafb22ba847502476c4|c9d9b3ea34b812a6e4229c0b503d6e1cb647d9b916ea85543806740bc390af2b|

## 八節審查（文件分數）

|登記面向|完整|分數|獨立證據|
|---|---|---:|---|
|goal|false|77|桌面多列與手機快速輸入場景明確，但 §goal 的首要用途包含在餐後以簡化模型推算跨越酒駕門檻的時間（S02-BAC-01）。|
|scope|false|80|一個時間點、1–12 列、排除時序吸收與執法。固定 caffeine-half-life 依各杯時間指數衰減，並不重複。法規範圍和兩類責任的呈現不精確（S02-BAC-02）。|
|userFlow|false|75|預設、範例、空／dirty／busy／取消／錯誤及 reset 可推導；首屏警語有定義。結果主摘要和無警語匯出仍可作實務倒數（S02-BAC-01）。|
|inputsOutputs|false|72|13/13 字面值符合名義公式，但嚴格門檻 ceil 的合法反例與 drinks 行 shape 規則歧義未解（S02-BAC-03/04）。|
|implementation|true|95|Node 24 零依賴；離線有理數、有限資料、Worker、generation guard、CSP、文字 sink、沒有檔案輸入或遙測具可行性。|
|acceptance|false|81|正文列九面向及每項 ≥90，瀏覽器/SEO/隱私可驗。只要文案逐字符合便無法攔住門檻倒數與脫離警語的 JSON（S02-BAC-01/02）。|
|tests|false|84|13 核心＋3 狀態均通過，確切等於門檻、從顯示捨入跨門檻及 row shape 競合沒有 literal 鎖定。SPEC 宣稱嚴格低於的最小整數不變量被反例推翻。|
|handoff|true|97|固定文件、owner、同一開啟 PR、另取 production claim、法規變更重審與產品 NOT_RUN 清楚。|

## 字面驗算與檢查

以 Node v24.14.0 執行 verify.mjs（本地證據：verify.mjs）（用共用 review-lib.mjs（本地證據：../review-lib.mjs）；命令 `node.exe verify.mjs`，exit 0，Windows 隱藏子行程）。腳本只讀已核實的合成 fixture，依契約自行計算；expected 只用於比對。若另行封裝，執行時可在腳本後傳入已核實的 fixtures.json 路徑。
完整字面 input／獨立推導／作者宣告值見 fixtures-output.json（本地證據：fixtures-output.json）；程序狀態見 command.json（本地證據：command.json）。

|檢查|結果|證據|
|---|---|---|
|核心|PASS|13/13；從精確式、欄位規則與驗證序計算。|
|控制狀態|PASS|3/3；包括取消和取代後兩個 independently derived late results。|
|下載參考值|PASS|依現有 canonical JSON 契約，beer-male-peak 163 bytes／SHA-256 62eacf42bfe12575750d772189595177966bf21cf1fb1b5af37ad1f7d02e6a81；為本次參考，尚無產品下載。|
|安全／來源／精確邊界|FAIL|兩條法規濃度門檻數字有來源；其他條件、時間模型用途與新反例如下。|

## 阻擋缺陷

### S02-BAC-01

- 位置：BRIEF；SPEC §goal/§scope/§userFlow/§inputsOutputs/§acceptance/§tests
- 最小案例：餐桌場景，剛飲用或飲用橫跨一段時間；載入合成 beer-male-peak，檢查結果摘要和下載。
- 觀測：全部飲料被視為第一口即全吸收，從該時刻單向扣除，結果與 163-byte JSON 給出個人到門檻與歸零分鐘；下載沒有任何警語、時間假設或模型標記。NIAAA 指出停止後仍可能上升；受控研究及現行法醫標準使用有變異的分布和消除參數。§FAQ 卻將約 0.15 g/L/h 描述為人體固定速度。
- 預期：改為教育性的模型說明；不得從個人輸入提供何時可過門檻、歸零或恢復駕駛的倒數。若保留非行動性數值模型，應就結果與任何匯出同時揭露假設／未量測／不判斷可駕駛；說明消除速率與吸收可變。
- 重驗：重核兩語起始、結果、FAQ、輸出欄位、報告 schema/bytes 與驗收條件；使用最近飲用、長時間多列及 0 估算場景確認不出現「通過」或駕駛計時。

### S02-BAC-02

- 位置：SPEC §inputsOutputs/§tests FAQ；AUTHOR-CHECK 法規查證
- 最小案例：B 落在 0.3–0.5 g/L、≥0.5 g/L，或概念備註提及吐氣 0.4 mg/L。
- 觀測：三段名為 below-threshold／administrative／criminal，容易被讀成互斥責任。刑法 §185-3 第1項第2款另有其他事證判斷不能安全駕駛；行政測試標準與刑事可重疊。官方裁罰基準表第 67 頁確有 0.4 mg/L、0.08% 行政罰額分級；作者稱「不存在」過度。法條用兩個檢測途徑的 OR，兩個數值之比不是真人血液／吐氣換算；原始對照研究顯示比值可變。
- 預期：釘 §114(2)、§35、§185-3(1)(1) 與 (2) 的直接來源、查證日和適用範圍；可只展示兩組入門數值，說清楚 0.4 屬罰額分級、在本工具之外。避免給人刑事／行政判定或從血值推測實際吐氣。
- 重驗：對照來源逐句檢查兩語法規說明、FAQ、SEO、匯出及任何 band 標記。

### S02-BAC-03

- 位置：SPEC §inputsOutputs 剩餘分鐘；§tests 最小整數不變量
- 最小案例：僅作代數測試：male，52.6 kg，272 ml × 5%，elapsedMinutes=0；另 205 ml × 6.8%，同體重和時間。
- 觀測：第一筆未捨入 B=3/10 g/L，當下屬 administrative，ceil 欄卻為 0；第二筆 B=123/400，ceil 欄為 3，按模型回代仍為 3/10，均不滿足嚴格 B<3/10。
- 預期：依 S02-BAC-01 刪除個人過門檻倒數；若仍留純文件的代數示例，嚴格「低於」與「等於」應分開，兩筆模型的最小整數分別 1 和 4（僅公式反證，不能解讀為駕駛時間）。
- 重驗：更新字面欄位及所有受影響 fixture／報告；保留未捨入等於與顯示捨入到門檻的比對測例。

### S02-BAC-04

- 位置：SPEC §inputsOutputs 驗證第1、3步；§tests
- 最小案例：其餘為預設，drinks=[{volumeMl:350,abvPercent:'5'}]（容量為 number）；再與 sex='other' 同時輸入。
- 觀測：第1步同時規定列欄位錯型全域 SCHEMA（field,row=null）與「列內容有誤」不用 SCHEMA。逐列條文沒有型別、缺欄、額外欄或非物件的 code/field/row。首錯可能為全域 SCHEMA、逐列未知或 sex ENUM。
- 預期：明定先整體 shape 或先欄位序逐列檢查，及每種 malformed row 的精確回傳；補含首錯競合與 row=2 的字面 fixture，禁止讀取 accessor。
- 重驗：重算錯型、缺欄、多欄、空列、列上限及首錯測試，核兩語錯誤定位。

修正限定在原 docs/specs/bac-calculator/ 的契約、測例及作者紀錄，由主統籌交回原責任或依有效維護任務處理。候選更新後才重審；本 reviewer 未修改候選。

## 已讀來源

- [道路交通安全規則 §114](https://law.moj.gov.tw/LawClass/LawSingle.aspx?flno=114&pcode=K0040013)：第2款為 0.15 mg/L 或 0.03%。
- [道路交通管理處罰條例 §35](https://law.moj.gov.tw/LawClass/LawSingle.aspx?flno=35&pcode=K0040012)：第一項以駕駛與測試檢定為前提；有同時違反刑事法律之處理。
- [刑法 §185-3](https://law.moj.gov.tw/LawClass/LawSingle.aspx?flno=185-3&pcode=C0000001)：第一項第1款 0.25 mg/L 或 0.05%；第2款另設事證途徑。
- [交通裁罰官方附表](https://law.moj.gov.tw/LawClass/LawGetFile.ashx?FileId=0000415077&lan=C#page=67)：PDF 第67頁顯示行政罰額分級的 0.4 mg/L 或 0.08%。
- [NIAAA，酒精過量](https://www.niaaa.nih.gov/publications/brochures-and-fact-sheets/understanding-dangers-of-alcohol-overdose)：停止飲酒後 BAC 仍可能上升；估算不能用作安全信號。
- [血液／呼氣同步受控原始研究](https://pubmed.ncbi.nlm.nih.gov/12689747/)：人體比值有大幅變異，非固定 2000:1。
- [Tam 等原始研究](https://pubmed.ncbi.nlm.nih.gov/15935939/)：香港樣本所得重量／體積 Widmark 因子 0.68、0.59，亦受空腹等因素影響；0.55 不能宣稱通用。
- [NIST OSAC 現行收錄 ANSI/ASB BPR 122-24](https://www.nist.gov/osac/standards-library/ansiasb-best-practice-recommendation-122-24)：現行版本資訊；對照原始受控代謝研究：https://pubmed.ncbi.nlm.nih.gov/7813995/。
- [NIH PubChem ethanol CID 702](https://pubchem.ncbi.nlm.nih.gov/compound/702)：20°C 密度約 0.7893 g/cm³，支持以 0.789 作產品取值。
- [Caffeine Half-Life 固定規格](https://github.com/KYStr/glossquote-labs-home/blob/73e25fc7bcc49e56f8d07bd7280b8aab987539fb/docs/specs/caffeine-half-life/SPEC.md)：按杯記時間、毫克，使用半衰期並輸出剩餘量。

- [ANSI/ASB BPR 122（2024）正式 PDF](https://www.aafs.org/sites/default/files/media/documents/122_BPR_e1.pdf)：§5.3 使用分布容積的區間；§5.4.4–5.4.6 說明消除速率的區間及可能未吸收的酒精。該標準為法醫情境，供確認模型限制。

## 非阻擋改善

- 明定新增空白飲料列、12 列後停用新增、刪除末列政策與焦點；移除與無檔案輸入衝突的 File.arrayBuffer 殘句。

## 另列：生產驗收契約 — FAIL（S02-REGISTRY-01）

GitHub registry r1537／blob 73e05eb696e26d943c8eb1fed2e7f5e2bdc89c50：原 spec 製作 task 的文件評分應使用上表八節；spec.acceptanceCriteria 卻也登記同樣八項（goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff）。
固定規格宣告產品九項：functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility。這五份的 spec 都仍為 draft；本項無引用該 spec 的 production task。協作核心 blob 4782dd1f249995ceeec00b2d0a89b57d9b9bbb7d 會強制 production 原樣繼承 spec 條件。即使字面測例全對，現有登記也無法以該候選的九面向為生產驗收門檻。
`spec.acceptanceCriteria` 應固定同一候選文件所列的九個必要產品面向與證據；原 spec 製作 task 的八個文件面向及分數保持。 保留同一 spec ID、原作者與原 task；等主統籌確定合法維護／修訂途徑，由有權 actor 修正後重新讀回 registry、固定規格與 PR head，才可計入 ready。

## 未執行與交接

產品九面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility 皆 **NOT_RUN／null**。此處 PASS 僅指文件證據；未執行候選產品、Chrome／Edge、真下載／原生視窗、正式 SEO 或部署。

待主統籌指定串行 slot 後，實際 reviewer 重核 PR head、owner 和最新 registry，先本人 ACK、保存遠端固定審查證據，再提交同 candidate 的實際 verdict；任何候選缺陷不得 mark-spec-ready。
