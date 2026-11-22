> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：4e9b737a4885e4bdde8656b1807d8e7196e25a1939d05478666986fe2b2fb985。

# vo2max-calculator｜獨立規格審查

**文件結論：建議退修（revision）。** 24/24 核心案例吻合，2/3 狀態案例吻合。尚有公式來源和邊界、序號與取消、草稿持久化、雙語驗收及交接缺口。

- 任務：labs-vo2max-calculator-spec-20261109；規格：spec-vo2max-calculator-20261109。
- 原 owner / claim：cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory / muse-r4-vo2max-calculator-claim-20261109T151518Z-30027。
- 固定候選：[30d67be295be66714f292722cea0660631d97176](https://github.com/KYStr/glossquote-labs-home/tree/30d67be295be66714f292722cea0660631d97176)；[PR #236](https://github.com/KYStr/glossquote-labs-home/pull/236)（open draft，head 相符）。
- reviewer：local-codex:01a1c87c-ef54-7bd0-a50d-0fc69b43bed3，未撰寫、未修訂本候選，亦不在 owner、author 或 contributors。
- 派工：[PR #284](https://github.com/KYStr/glossquote-labs-home/pull/284)，brief 固定 83d5b24a00eb80d07ffcdd8aa2886006bc8a61ed。登記讀值 r1530／blob e01da965f28e5248ca13158094ca356254a25c2b，contract 2026-10-29.1；主頁 baseline 26525d5f6380915ea95dde879dec769442db0d95。
- 記錄時刻（UTC）：2026-11-11T03:03:14.121Z。原登記狀態：task reviewing / spec draft。正式 registry 操作待主統籌串行 slot。

四檔由 GitHub connector 讀固定 commit；本地副本的 Git blob 逐檔相符，完整內容均已閱讀。

|檔案|bytes|Git blob SHA-1|SHA-256|
|---|---:|---|---|
|[BRIEF.md](https://github.com/KYStr/glossquote-labs-home/blob/30d67be295be66714f292722cea0660631d97176/docs/specs/vo2max-calculator/BRIEF.md)|3382|58a746ef16a94179876759a41e327df1b6e32567|dd1ac015b4905cfdebbc7d2b22b051071e751750d0ba5d803036035b997e69fd|
|[SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/30d67be295be66714f292722cea0660631d97176/docs/specs/vo2max-calculator/SPEC.md)|37504|263d9db223e1af54a7cd2f73069e24792b639880|6d3dcb92014654173fc585abda134791600ad5a3658f1515dfbd2736768fc983|
|[fixtures.json](https://github.com/KYStr/glossquote-labs-home/blob/30d67be295be66714f292722cea0660631d97176/docs/specs/vo2max-calculator/fixtures.json)|9997|e3830cfe8da0d512dc74f49a5781290c9ee71fca|b86e26cbad1a6c58f6f8096f7cfc5792c4cbff80fdbb05e3c45e8c29618187ae|
|[AUTHOR-CHECK.md](https://github.com/KYStr/glossquote-labs-home/blob/30d67be295be66714f292722cea0660631d97176/docs/specs/vo2max-calculator/AUTHOR-CHECK.md)|7608|2fc7aaeb54bc157442a88c2c40800e884bb27746|01f433b61ee044054cc5c0bc22c03d83d140451784da84097c0fbcae2667d361|

## 八節審查（文件分數）

|登記面向|完整|分數|獨立證據|
|---|---|---:|---|
|goal|true|93|BRIEF 指定田徑場已有測驗成績的跑者、教練與學生，明確區分實驗室測量與數值估算。§1 成功可觀測；須訂正未經證實的 ±10%。|
|scope|false|82|兩種單筆實地測驗、不做 Rockport 或跑步配速／賽事預測、心率區間、熱量。固定比對三類相近規格。S02-VO2-02 未界定可信人群與輸入適用性。|
|userFlow|false|82|§2 已釘初始、模式保留、錯誤、dirty、reset、範例和下載限制。缺真正的取消/中止，替換流程與字面測例衝突（S02-VO2-03/04）。|
|inputsOutputs|false|79|§3/4 欄位、正規表示式、成對檢查、結果結構與排序明確；24/24 核心案例吻合。但第一個成功距離與宣稱的邊界不同，常模和精度來源未成立（S02-VO2-01/02）。|
|implementation|false|77|純核心／controller／DOM 與 Node 24 零依賴方向可行；缺明確安全 Worker 產物、CSP/傳輸限制、退出資源處置，且 localStorage 違反共用基線（S02-VO2-04）。|
|acceptance|false|79|§6 已列九面向、逐項 ≥90 與 NOT_RUN。boundary 用錯 506 m，隱私接受持久化，兼容/可及性/SEO 缺必要實驗或以未配置 canonical 為預期（S02-VO2-01/04/05）。|
|tests|false|78|核心 24/24；controller 2/3（exit 1）。序號反例需修正；§7 文件稱具名群組但實際為頂層陣列，未提供所稱的下載字面 bytes（S02-VO2-03）。|
|handoff|false|86|§8 有產物、命令、build、NOT_RUN 和獨評責任；缺該 spec PR/readiness→固定 production task、本人 ACK/claim/readback 及隔離停止條件（S02-VO2-05）。|

## 字面驗算與檢查

以 Node v24.14.0 執行 verify.mjs（本地證據：verify.mjs）（用共用 review-lib.mjs（本地證據：../review-lib.mjs）；命令 `node.exe verify.mjs`，exit 1，Windows 隱藏子行程）。腳本只讀已核實的合成 fixture，依契約自行計算；expected 只用於比對。若另行封裝，執行時可在腳本後傳入已核實的 fixtures.json 路徑。
完整字面 input／獨立推導／作者宣告值見 fixtures-output.json（本地證據：fixtures-output.json）；程序狀態見 command.json（本地證據：command.json）。

|檢查|結果|證據|
|---|---|---|
|核心|PASS|24/24；用固定公式與獨立欄位、成對和查表邏輯。|
|狀態|FAIL|2/3；state-replace-late 的 afterNewerRun 與 afterOlderReply 得 seq=4，作者固定為 seq=3。兩份 payload 的值與失效動作相符。|
|報告參考值|PASS|cooper-basic 78 bytes／SHA-256 c50665bf4816c5189a6e57846a90b338c355ab520592df139f234ee08b0c7e7e。原文件未提供此字面值，尚無產品下載。|
|來源與條文反例|FAIL|506 m、不受支持的精度與無法溯源的完整常模、不可同時滿足的資料/SEO 契約。|

## 阻擋缺陷

### S02-VO2-01

- 位置：SPEC §4 step 4、§5 FAQ 2、§6 boundaries
- 最小案例：固定 Cooper 模式，距離 505、506、507.1、507.2 m，年齡/性別不填。
- 觀測：§4、§6 將 506 m 寫成 0.1 成功。但公式 r(506)=0.02459199→0.0；507.1 也捨入 0.0；507.2 才得到 0.1。FAQ 只說原始值在 504.9 m 以下非正，漏了先捨入的規則。
- 預期：若保持現有算法，數值下界 504.9 + 0.05×44.73 = 507.1365，文法 0.1 m 的相鄰案例為 507.1 錯誤、507.2 成功。若依適用人群改更實際界線，正文、FAQ、字面測例與驗收應一致。
- 重驗：以同一公式重算兩側相鄰字面值、錯誤碼與 FAQ；所有受影響數值/狀態 payload/報告重新核對。

### S02-VO2-02

- 位置：BRIEF；SPEC §1、§3–4、§5 FAQ；AUTHOR-CHECK §1
- 最小案例：2400 m 原始公式比對；考慮 10,000 m/12 min、1.5 mi 4:00 與 60:00，及 13 歲或 99 歲分類。
- 觀測：原始 Cooper 1968 回歸用英里：0.3138 + 0.0278×VO₂；按英里精確換算後截距 505.0121472、斜率 44.7397632，與候選相近但非逐字原式，也不同於其所謂代數等價 km 式。ACSM 手冊支持 483/t+3.5 的估算形式。115 位男性樣本、r=.897 不支持兩方法普遍 ±10%；原版 Cooper 年齡/性別 12 列常模未獨立核實，作者只讀網路轉載且把 Heyward 拼為 Heywood。候選接受 50 km/h 與 2.414 km/h，仍印個人跑步 VO₂max／等級。
- 預期：保留常數時標明後續近似式與原始資料，引用可核實頁次與版本，移除未證實的 ±10%。以可核實來源限定測驗與人群的適用性；無可核對原始常模或覆蓋人群時先不給等級。明示結果超出模型適用範圍時的行為，不把驗證容量當臨床合理性。
- 重驗：由 reviewer 重查來源、兩語文案和所有分級門檻，重算受影響的正常、帶界與越界例。

### S02-VO2-03

- 位置：SPEC §2 state model、§7 cases；fixtures.json
- 最小案例：初始化 seq=1；送出 2400 m seq=2；編輯為 10001 m，送出後收到舊 2400 m 的回覆。
- 觀測：§2 每次編輯/送出分別遞增，故新錯誤與晚到後均 seq=4；fixture 宣告 seq=3。§7 同一 case 卻要求較新 Worker 回傳 success，10001 m 應在本地 range 檢查失敗，沒有新 Worker 結果。
- 預期：明定 edit→run 和任何原子 replace 的序號契約。對同一 case 精確一致地選擇本地錯誤或較新合法成功；補實際取消的獨立案例。讓 §7 的 fixture 結構與頂層陣列一致並釘下載 expected bytes。
- 重驗：重跑三個狀態 case、晚回覆和取消；全部檢查 old/current input、state、sequence、status、report。

### S02-VO2-04

- 位置：SPEC §2、§5 Page and controller／Pages、§6 privacy/security/compatibility
- 最小案例：輸入年齡／性別／測驗成績，啟動後按取消或離頁；用共用裝置重開；按宣告使用 file: 與離線 HTTP。
- 觀測：規格要求 localStorage 保存全部五欄，和共用純本地工具不得儲存內容相衝。沒有取消動作或 Worker 終止/URL 撤銷；序號只能防晚回覆。只有 classic app 與 ESM core 路徑；未定義實際 Worker 入口、打包及離線快取。若走 Blob，現 CSP 無 worker-src，其回退到 script-src，沒有明示 blob 授權；default-src self 也沒有封鎖同源 connect。
- 預期：草稿只在頁面記憶體，重設/離頁/語言切換清除，下載由使用者觸發且固定用途。定義同源靜態 Worker 或固定 Blob 建置策略、最小 CSP／零傳輸、可操作取消和資源釋放。沒有可核實的 file: 路線就以靜態 HTTPS/隔離 loopback、載入後離線使用為契約。
- 重驗：靜態契約及兩語 live network/storage、Worker unavailable、cancel/reset/pagehide/late reply、offline 成功等仍要由實作候選依隔離規則驗證。

### S02-VO2-05

- 位置：SPEC §2 Routes、§5–8
- 最小案例：預覽兩語頁、正式網域未配置；新實作人按 §6–8 的交接與檢查。
- 觀測：預覽要求 canonical/OG 指向尚未配置的正式站；缺互惠 hreflang/x-default、同語首頁回鏈與正式驗證。瀏覽器要求以泛用 Chrome/Firefox/Safari 取代共用 Chrome+Edge，無 320px、真 200%、觸控及 Network/Storage 完整驗法；沒有個人 ACK、claim readback、隔離不干擾停止條件。
- 預期：依共用手冊分 preview noindex 和正式可查證的雙語 HTTPS SEO；釘瀏覽器、可及性與隱私必要證據，使用不干擾桌面的合法隔離方式。補固定來源、八節獨評、另 production task 和唯一 claim、缺 gate NOT_RUN。
- 重驗：逐項把 §6 的九項與可反駁證據對應，核對兩語路由、previews/release、固定 PR 和分工。

修正限定在原 docs/specs/vo2max-calculator/ 的契約、測例及作者紀錄，由主統籌交回原責任或依有效維護任務處理。候選更新後才重審；本 reviewer 未修改候選。

## 已讀來源

- [Cooper 1968 JAMA](https://doi.org/10.1001/JAMA.1968.03140030033008)：原始樣本及相關係數。DOI 全文入口此輪不可開；原文 PDF 鏡像第3頁可見英里迴歸。
- [Cooper 原始論文 PDF 鏡像](https://bootcampmilitaryfitnessinstitute.files.wordpress.com/2013/07/a-means-of-assessing-maximal-oxygen-intake-cooper-1968.pdf)：直接讀 Results 與圖，核實距離單位與係數。
- [ACSM 原出版物公開轉錄](https://studylib.net/doc/27037144/acsms-health-related-physical-fitness-assessment-manual)：Chapter 7 1.5-mile run 的原手冊文字明列 483/t+3.5；不能從中推出所有測驗的 ±10%。
- [Cooper test 人群驗證原始研究](https://pmc.ncbi.nlm.nih.gov/articles/PMC4314605/)：不同人群有偏差，相關性高也不等於單筆誤差界線。
- [Heyward 出版方作者資料](https://us.humankinetics.com/products/advanced-fitness-assessment-and-exercise-prescription-9th-edition-with-hkpropel-online-video)：確認作者姓氏及正確書名；未把新版當 1998 第3版表證據。
- [WHATWG HTML Worker](https://html.spec.whatwg.org/multipage/workers.html#dom-worker)：同源 worker URL 與模組模式規則。
- [W3C CSP3 fetch directive fallback](https://www.w3.org/TR/CSP3/#directive-fallback-list)：worker-src、child-src、script-src、default-src 回退順序。
- [共用實作清單](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/docs/IMPLEMENTATION-CHECKLIST.md)：預覽與正式 SEO 分離、產品零儲存/遙測、Chrome+Edge、縮放/鍵盤 gate。
- [相鄰固定規格：Heart Rate Zones](https://github.com/KYStr/glossquote-labs-home/blob/2a21f1a0ebde740d0874f62ccd50435517532cc9/docs/specs/heart-rate-zones/SPEC.md)：訓練 bpm 區間；另已讀 running-pace-calculator、race-time-predictor 及 bmi-tdee-calculator 的固定 goal/scope。

## 非阻擋改善

- 在手機用戶流程說明如何讀已完成的測驗成績、區分 1.5 miles 與 1.5 km。對非法隱藏欄位、下載留在裝置及分級資料來源有簡短可見說明。

## 另列：生產驗收契約 — FAIL（S02-REGISTRY-01）

GitHub registry r1537／blob 73e05eb696e26d943c8eb1fed2e7f5e2bdc89c50：原 spec 製作 task 的文件評分應使用上表八節；spec.acceptanceCriteria 卻也登記同樣八項（goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff）。
固定規格宣告產品九項：functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility。這五份的 spec 都仍為 draft；本項無引用該 spec 的 production task。協作核心 blob 4782dd1f249995ceeec00b2d0a89b57d9b9bbb7d 會強制 production 原樣繼承 spec 條件。即使字面測例全對，現有登記也無法以該候選的九面向為生產驗收門檻。
`spec.acceptanceCriteria` 應固定同一候選文件所列的九個必要產品面向與證據；原 spec 製作 task 的八個文件面向及分數保持。 保留同一 spec ID、原作者與原 task；等主統籌確定合法維護／修訂途徑，由有權 actor 修正後重新讀回 registry、固定規格與 PR head，才可計入 ready。

## 未執行與交接

產品九面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility 皆 **NOT_RUN／null**。此處 PASS 僅指文件證據；未執行候選產品、Chrome／Edge、真下載／原生視窗、正式 SEO 或部署。

待主統籌指定串行 slot 後，實際 reviewer 重核 PR head、owner 和最新 registry，先本人 ACK、保存遠端固定審查證據，再提交同 candidate 的實際 verdict；任何候選缺陷不得 mark-spec-ready。
