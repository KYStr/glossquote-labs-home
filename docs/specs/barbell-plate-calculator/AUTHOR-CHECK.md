# 槓鈴配重 — 作者檢查

作者：run 6 規格作者（subagent，家長統籌登記；本份為作者自查，非獨審）。作者文件核對，待非作者 readiness。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對本 checkout 的 103 份 `docs/specs/`：無同名或同功能預案；最相近者為 `bmi-tdee-calculator`（身體指標，非配重），差異見 scope。one-rep-max 不在 repo 內，概念差異（配重選擇 vs 最大重量估算）已寫進 scope。
- 14 筆字面核心案例、3 筆 controller 案例。產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。

## 來源核對

- 槓片組 25 / 20 / 15 / 10 / 5 / 2.5 / 1.25 kg 與男槓 20 kg、女槓 15 kg：與概念筆記一致，另以公開來源驗證——IWF Technical and Competition Rules（比賽槓片色碼組與槓重）及 Wikipedia "Weight plate"（常見奧林匹克槓片面額 1.25、2.5、5、10、15、20、25 kg）。概念筆記無須修正。
- 槓鈴夾以 0 kg 計、微型槓片（0.5 kg 及以下）不在本組內，皆為 SPEC 釘版之選擇，非來源衝突。

## 雙推導：手算 → 獨立重算

手算方法：每邊重量 = (目標 − 槓重) / 2，公斤手算貪心由大到小扣。第二種方法：`/tmp/barbell-verify.js`（未提交），按 SPEC 規則以 0.125 kg 整數單位重寫貪心與驗證，逐案與 fixtures.json 深度比對。結果：14/14 核心案例一致（`ALL CORE CASES MATCH`），controller 3 案為狀態流程描述，無數值可重算。

| 案例 | 手算推導 | Script 重算 |
| --- | --- | --- |
| `exact-100kg` | (100−20)/2=40 → 25，餘 15 → 15，餘 0；可達 100 | PASS |
| `exact-140kg` | (140−20)/2=60 → 25，餘 35 → 25，餘 10 → 10，餘 0；可達 140 | PASS |
| `exact-60kg-women-bar` | (60−15)/2=22.5 → 20，餘 2.5 → 2.5，餘 0；可達 60 | PASS |
| `exact-87p5kg` | (87.5−20)/2=33.75 → 25，餘 8.75 → 5，餘 3.75 → 2.5，餘 1.25 → 1.25，餘 0；可達 87.5 | PASS |
| `zero-bar-50kg` | 50/2=25 → 25，餘 0；可達 50 | PASS |
| `bar-only-20kg` | (20−20)/2=0 → 無片；可達 20 | PASS |
| `remainder-half-kg` | (101−20)/2=40.5 → 25+15=40，餘 0.5（<1.25 無法再扣）；可達 20+80=100；1.25 對剩 2 → 下一個 100+2.5=102.5 | PASS |
| `remainder-eighth-kg` | (100.25−20)/2=40.125 → 25+15=40，餘 0.125；可達 100；下一個 102.5 | PASS |
| `limited-pairs-exact` | 60/邊，25 對=1 → 25，餘 35 → 20，餘 15 → 15，餘 0；可達 140 | PASS |
| `limited-pairs-unreachable` | 60/邊 → 25，餘 35，其餘面額皆 0 對；可達 20+50=70；無剩餘對 → nextUp null | PASS |
| `target-below-bar` | 15 < 20 → TARGET_BELOW_BAR / targetKg | PASS |
| `not-multiple-target` | 100.1 / 0.25 = 400.4，非整數 → NOT_MULTIPLE / targetKg | PASS |
| `pairs-not-integer` | "1.5" 非整數 → INTEGER_FORMAT / pairs25 | PASS |
| `target-range` | 600 > 500 → RANGE / targetKg | PASS |

## 釘版提醒

- nextUpKg 的定義是「再多掛一片最小剩餘槓片」的建議，SPEC 明示不是已證明的全域最小可達上限；builder 不得改寫為全域最佳化。
- 全部重量以 0.125 kg 整數單位運算，無浮點；輸出公斤數皆為 0.125 的倍數，JSON number 精確表示。
