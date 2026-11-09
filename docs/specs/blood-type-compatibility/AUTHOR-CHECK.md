# 血型相容查詢 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格工作 `labs-blood-type-compatibility-spec-20261109`（由主代理登記；作者本人未執行任何 registry／coordination 指令）。本文件是作者對自己文件的檢查，**不是獨立審查（NOT an independent review）**；readiness 須由非作者 reviewer 對同一固定候選重算案例、核對八節後認定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重（dedupe）：已檢索本 repo `docs/specs/` 全部預案清單與 `blood` 關鍵字，無血型或輸血相關預案；概念 #39 亦註明最相近者為無。本案與 pregnancy-due-date-calculator 同屬健康資訊類，但該案為孕期日期推算，輸入輸出與判定規則完全不同，不重疊。

- 字面案例：13 筆（核心 10、controller 3）。核心成功案例的 expected 先由固定矩陣逐格手算，再以獨立路徑——不查矩陣、只用抗原／抗體規則即時推導——第二度重算，6 筆成功案例與 2 種矩陣總數全部一致；fixtures.json 已驗證可解析為 JSON。

## 紅血球矩陣 8×8 自我稽核（逐格）

稽核規則：捐贈者紅血球抗原集合（O＝∅、A＝{A}、B＝{B}、AB＝{A,B}，Rh 陽性另含 D）必須是受血者自身抗原集合的子集，且 Rh 陽性捐贈者只能給 Rh 陽性受血者。逐列（捐贈者列）推導，每列即 8 格：

| 捐贈者 | 抗原 | 由規則推導的受血者 | 與 SPEC 固定列 |
| --- | --- | --- | --- |
| O- | ∅，Rh− | 全部 8 型 | 一致 |
| O+ | ∅，Rh+ | 僅 Rh+：O+、A+、B+、AB+ | 一致 |
| A- | {A}，Rh− | ABO 含 A：A-、A+、AB-、AB+ | 一致 |
| A+ | {A}，Rh+ | ABO 含 A 且 Rh+：A+、AB+ | 一致 |
| B- | {B}，Rh− | ABO 含 B：B-、B+、AB-、AB+ | 一致 |
| B+ | {B}，Rh+ | ABO 含 B 且 Rh+：B+、AB+ | 一致 |
| AB- | {A,B}，Rh− | 僅 AB：AB-、AB+ | 一致 |
| AB+ | {A,B}，Rh+ | 僅 AB+ | 一致 |

列總和 8+4+4+2+4+2+2+1＝27；以受血者欄位反查（轉置）欄總和 O- 欄 1、O+ 欄 2、A- 欄 2、A+ 欄 4、B- 欄 2、B+ 欄 4、AB- 欄 4、AB+ 欄 8，亦為 27，兩方向一致。64 格全數核對完成。

## 血漿矩陣 4×4 自我稽核

稽核規則：受血者 ABO 抗原集合必須是捐贈者 ABO 抗原集合的子集（捐贈者血漿抗體只攻擊其自身缺少的抗原）；Rh 不參與。推導：AB 捐贈者 → {O, A, B, AB} 全部；A → {A, O}；B → {B, O}；O → {O}。與 SPEC 固定表一致，相容格 9/16。

## 概念 note 未固定、由作者裁量並寫入 SPEC 的事項

1. 輸入形狀依 mode 分開並採嚴格鍵集合：single 恰含 `mode`+`bloodType`，pair 恰含 `mode`+`donor`+`recipient`；多出或缺少一律 SCHEMA（依範本「未知、缺欄皆 SCHEMA」原則延伸到模式相依欄位）。
2. 血漿名單在輸出層展開為 8 型（同 ABO 的 Rh 陰陽性併列），使四份名單形狀一致；矩陣本體仍為 ABO 4×4，展開規則已寫死。
3. 重設預設草稿固定為 `{"mode":"single","bloodType":""}`，與範例、controller 案例一致。
4. 血型代碼上限為 raw 8 個 UTF-16 code units（INPUT_LIMIT）；代碼僅 ASCII、區分大小寫、不做任何 Unicode 正規化或減號替換。
5. 徽章以固定 id 與固定順序輸出（rbc-universal-donor、rbc-universal-recipient、plasma-universal-donor、plasma-universal-recipient），顯示文案另以雙語固定。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
