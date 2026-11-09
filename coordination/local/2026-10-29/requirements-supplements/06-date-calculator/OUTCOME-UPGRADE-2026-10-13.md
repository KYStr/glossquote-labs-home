# U06-WEEKDAY-SUMMARY-20261013

## 同批既定 SEO 要求校正

主代理已核對現行 scripts/release.mjs 的 links 只有 canonical/zh-Hant/en；不是本批退化。依 CONTINUOUS-DELIVERY-GOAL.md 的共通規格，本次一併補齊正式兩語唯一 `hreflang="x-default"`，都指向 `https://date.glossquote.com/index.html`。預覽仍 noindex，不洩漏正式 origin。允許最小修改 scripts/release.mjs、必要對應 check/release tests 及 UX-SEO，測試實際兩模式產物；不得放寬 CSP。此明確擴充下文原本不需修改 release scripts 的範圍。

2026-10-13主代理核定。使用者授權本批改善；收到實際開工訊息後由原對話01a12399-05b0-7f32-a84d-f79126c199df執行，請求gpt-6.1-sol/max，不再委派。沿Product App、既有設計及安全契約。以下草案中產品決策/案例採用為要求；函數命名可等價且需交接。測試案例是預期，不是新版已通過。


## U06-WEEKDAY-SUMMARY-20261013：核對結果落在哪一天

### 使用者工作與交付

使用者算活動相隔天數或往後/前移日期後，要核對排程是星期幾、輸入與答案是否就是自己想的日期。加一段完整日期摘要與星期，不增加「今天」、工作日、假日、月份/年份偏移、通知、複製/匯出或其他曆法。

成功可觀察：日期差同時看開始及結束的完整公曆日期/星期與原天數/方向；加減保留原ASCII ISO主答案，旁邊有星期，摘要可核對基準日期、偏移量與結果。任一空白、無效或越界即清掉所有旧星期/摘要，与现有数值同生同灭。

### 現況與具體接點

| 現有檔案／函式 | 實際支援與本次接點 |
|---|---|
| `public/js/core/dates.mjs`：`parseDate`、`toOrdinal`、`fromOrdinal`、`formatDate` | 0001-01-01为ordinal0，9999-12-31为3652058；严格ASCII ISO、年份与闰年、精确parts data descriptors。新增weekday helper只读已验证ordinal，原解析/格式API payload不改变。 |
| `public/js/core/calculator.mjs`：`dateDifference`、`addDays` | 原difference回delta/inclusive/direction，add回iso/offsetDays；保持这些shape和有符号规则，不为星期重写算法。 |
| `public/js/app.mjs`：`calculate`、`parseCurrentFields`、`clearResults`、`renderNote`、`updateLiveStatus`、`resetWork` | 每次计算先清旧结果，解析错误/EMPTY先行；只有全有效才render。这里关联新摘要/weekday，并把clear/reset/mode/pagehide/pageshow清理包括新节点。现有live status只在change或状态变更播报，可保留避免每次键入重复朗读。 |
| 双语HTML：`diff-results`、`offset-results`、`date-result`、`result-note` | 加摘要节点及offset星期，不改变date-result的ASCII ISO。新DOM id在两语完全相同，并纳入collectDom/fail-closed UI gate。 |
| `public/js/i18n.mjs`：`getMessages`，deepFreeze字典 | 加双语星期/月名/摘要模板与纯日期显示helper；固定本地字典，不用Intl日期时间点解析、不加载外部locale。 |
| `test/app-interactions.test.mjs`、`test/ui-contract.test.mjs`、`test/i18n.test.mjs` | 已有明确fake DOM的Enter/status节奏、生命周期清除、同DOM id與deep freeze/placeholder gate，扩展这些事实测试；不是原生date与AT的替代。 |

HANDOFF有date.glossquote.com與PUBLIC来源必要release gate及人工NOT_RUN，2026-10-11只限定維護；本稿未重查远端或将历史privacy人工项标PASS。

### 星期算法已核對的起點

新增例如 `weekdayFromOrdinal(n)`：必须安全整数0..3652058，否则`DATE_RANGE`；成功value是 **星期一=0..星期日=6**，计算 `n % 7`，不加1。保持Result惯例，无时钟、DOM或时区。

本次已以当前 `parseDate` 返回的actual ordinal，另用独立公曆 JDN 整数公式核對偏移（一个轻量只读探针，exit0，不是产品测试通过）：

| ISO | actual ordinal | ordinal%7 | 独立JDN%7（Monday=0） | 星期 |
|---|---:|---:|---:|---|
| 0001-01-01 | 0 | 0 | 0 | 星期一 / Monday |
| 2024-02-28 | 738943 | 2 | 2 | 星期三 / Wednesday |
| 2024-02-29 | 738944 | 3 | 3 | 星期四 / Thursday |
| 2024-03-01 | 738945 | 4 | 4 | 星期五 / Friday |
| 2024-03-10 | 738954 | 6 | 6 | 星期日 / Sunday |
| 2024-03-11 | 738955 | 0 | 0 | 星期一 / Monday |
| 9999-12-31 | 3652058 | 4 | 4 | 星期五 / Friday |

独立公式使用`a=floor((14-m)/12), y'=y+4800-a, m'=m+12a-3`，`JDN=d+floor((153m'+2)/5)+365y'+floor(y'/4)-floor(y'/100)+floor(y'/400)-32045`。没有调用JavaScript Date/Date.parse或机器本地午夜；实现测试须把以上固定期望写死，不能用同一`ordinal%7`再生成expected。

### 精确 UI、数据与状态

1. 对比结果原「日期差（结束−开始）」及inclusive数值保留，在同结果区加完整日期摘要，例如繁中：`開始：2024 年 2 月 28 日（星期三）；結束：2024 年 3 月 1 日（星期五）。` 英文：`Start: Wednesday, 28 February 2024; end: Friday, 1 March 2024.` 原direction note同时保留；不是取代它。
2. offset主`date-result`保持`YYYY-MM-DD`，相邻显示`星期四 / Thursday`。另显示例如繁中：`2024 年 2 月 28 日（星期三）加 1 天，結果為 2024 年 2 月 29 日（星期四）。` 英文：`Thursday, 29 February 2024 is 1 day after Wednesday, 28 February 2024.` 负数用「减」/before，0用「与基准相同」/same as，不把负号带入“after -1”的含糊句。
3. 所有年份在ISO及完整摘要都保留四位（0001），月/日完整摘要可不补0。英文用固定12个月名；繁中用数字月。星期数组顺序固定Monday..Sunday，与helper一致。既有核心计数仍ASCII、无千分位及正号，星期格式化不改数值规则。
4. 可在现有`i18n.mjs`增加纯`formatDateSummary(raw,lang)`，内部复用`parseDate`/weekday helper及固定字典，回Result成功 `{iso,weekdayIndex,weekday,label}`；只用内部已验证parts组合字串，不反向解析localized label。未知lang沿getMessages既有繁中fallback，无用户自由format string。
5. UI只在完整有效计算后产出摘要，offset结果ISO也必须经过现有日期验证后取星期。空白/非法/RESULT_RANGE立即清所有数值、weekday、summary，不能保留只计算成功的半截“结果”。修正后同步恢复，不以今天代替。
6. 新节点如`diff-date-summary`、`offset-date-summary`、`date-weekday`在两语一致，纳入`collectDom`与测试fixture；用textContent，空时hidden且无旧文字。setModeVisibility切换相应结果，resetWork/pagehide把所有输入与新资料清空。
7. 新summary显示不用多个aria-live打断输入。保留现有单一polite atomic status；在现有change/Enter/状态变更时可附一次同当前结果的星期摘要，必须测原Enter/IME/repeat节奏仍成立。大于2行时在320px/长英文标签自然换行，不用页面横捲。
8. 原限界保留：日期原长≤32UTF-16，ASCII空白trim，0001..9999延伸公曆；天数原长≤16、可选正负+1..7ASCII位、范围±3652058；同日0/inclusive1、负difference不abs、交换完整原文字，mode switch清所有日期、天数回0、focus及fallback不变。
9. 无async，取消/进度/timeout不适用；clear是同步恢复，必须清新的weekday/summary。无需storage、timer、权限或新依赖。只算日历日；星期呈现不意味着扣周末/国定假日或适用法律/医疗截止日。

### 验收案例

| ID | 种类／输入 | 精确预期 |
|---|---|---|
| U06-01 | A，表中7个ordinal与weekday helper | 星期索引与写死期望相等；0=Monday，3652058=Friday；1..6分别Tuesday..Sunday。 |
| U06-02 | A，helper -1/3652059/1.5/NaN/Infinity/'0'/null | DATE_RANGE，不抛含输入exception、不clamp/转型。 |
| U06-03 | A+B，2024-02-28→2024-03-01，两语 | 原delta2/inclusive3/forward；摘要周三→周五，ISO与full年月日正确。交换后delta-2/inclusive3/backward，摘要角色对调。 |
| U06-04 | A+B，2024-02-28+1；2024-03-01-1；2024-02-29+0 | 结果均2024-02-29、Thursday；前者after/加1、第二before/减1、0same；date-result仍ASCIIISO。 |
| U06-05 | A+B，A=B=2024-02-29 | delta0/inclusive1/same，开始与结束均Thursday，不隐藏其中角色或造不同星期。 |
| U06-06 | A+B，0001-01-01+0，9999-12-31+0；相应-1/+1 | 0001完整四位年Monday、9999Friday；越界RESULT_RANGE，无旧weekday/summary/ISO。 |
| U06-07 | A，1900-02-29/2100-02-29；B用fallback填2024-02-30/空 | INVALID_DATE/EMPTY原行为，新的星期/摘要无残留；不靠Date自动进位。 |
| U06-08 | A，2024-03-10→11與2024-11-03→04 | 都delta1/inclusive2，Sunday→Monday；与TZ无关，不能从毫秒或装置时区取星期。 |
| U06-09 | A+B，有结果后删空一日期、clear、切mode、pagehide/pageshow、语言导航 | 输入/ISO/count/weekday/summary同时清空；天数0；clear焦点到当前首日期；pageshow恢复初始空diff，不保留旧资料。 |
| U06-10 | A+B，原生value为空且validity.badInput=true；另例为空且badInput=false；script-looking字符串 | 前两例分别DATE_FORMAT/EMPTY，保留原区别，不显示虚假星期；恶意字串DATE_FORMAT，无注入、无额外请求、无raw exception。 |
| U06-11 | A+B，快速input更新，change/Enter，IME/重复Enter，完整英文月/星期长名称 | 可见摘要每次合法input更新；仅原节奏播报当前结果，IME/repeat不改变确认行为；不双重live广播。 |
| U06-12 | B，双语原生date/fallback、纯键盘、320px/200%、Network/storage | 流程相同、标签/星期/长摘要可读并重排，无新增网络/持久化/权限。未跑设备/AT/native项目如实NOT_RUN。 |

原D01–D24及数值/年份round-trip安全gate保留，核心API返回shape仍相同。聚焦新增测试不能取代原完整日期边界测试。

### 建议允许文件与实际命令

原对话手动路径限`tool-projects/06-date-calculator/`下：`public/js/core/dates.mjs`（仅有界weekday helper）、`public/js/i18n.mjs`、`public/js/app.mjs`、`public/index.html`、`public/en/index.html`、`public/styles/app.css`、`test/dates.test.mjs`、`test/i18n.test.mjs`、`test/app-interactions.test.mjs`、`test/ui-contract.test.mjs`、`PRODUCT.md`、`TECHNICAL.md`、`ACCEPTANCE.md`、`UX-SEO.md`、`HANDOFF.md`、`TASKS.md`、`docs/VERIFICATION.md`。`dist/**`只能由build生成；calculator/source安全与release脚本不需要改。

实际package脚本dev=`node scripts/serve.mjs`、test=`node --test`、check=`node scripts/check.mjs`、build=`node scripts/build.mjs`。该工具CWD逐条：

```powershell
node --test test/dates.test.mjs test/i18n.test.mjs test/app-interactions.test.mjs test/ui-contract.test.mjs
npm.cmd test
npm.cmd run check
npm.cmd run build
npm.cmd run dev
```

dev实际固定127.0.0.1:4174；占用时清楚退出，不杀既有服务。两语`/index.html`、`/en/index.html`。release产物复核由主代理排程：

```powershell
npm.cmd run build -- --production --cloudflare --site-url https://date.glossquote.com/
npm.cmd run check -- --production --cloudflare --site-url https://date.glossquote.com/
```

风险／停止：若用`new Date(string)`、Date.parse、Intl时间点格式、本地/UTC午夜或毫秒差替代ordinal，将引入时区与0001年份风险，必须修正后交候选。不得因为星期需求新增工作日/假日/今天/提醒。新节点若破坏collectDom或fake/真实UI的生命周期清理，要修同一scope；不能删fail-closed节点gate或改纯date算法绕过失败。


## 原owner交付與停止契約

先讀根/工具AGENTS、current HANDOFF與實際code/修改。只改本文列明本工具public/test/spec/docs及任務紀錄，相關新增focused tests可新增；check精確資產清單若確有必要只做最小更新與回歸，不降低安全限制。可寫本工具.runs/06-date-calculator-outcome-2026-10-13/與既有獨立reviewed發布副本；不得動他工具/首頁/共享狀態、讀憑證/deploy/改持久Windows環境。所有build/test前後執行check-persistent-environment.ps1並核完整Environment不變；只假資料，無新runtime依賴。

原owner完成focused與package必要test/check/build/release產物gate及current文件；PUBLIC更新既有KYStr repo並核遠端commit/visibility、固定source ZIP/manifest。主代理負責正式部署、首頁与獨立驗收，本文所稱release由主代理排程不禁止owner產生本工具受審候選。

完成回覆原對話供主代理實際收取：任務ID、改檔/行為、命令exit與結果、未驗項/風險、候選來源與ZIP（gate沒有就明示）、真實本機URL、是否釋放寫入權。新版待主驗/發布/外验，不繼承舊通過；新權限/成本/依賴/範圍衝突或兩輪同因無進展就保存重現並具體停止回報。不得自動下一milestone、改模型或重開對話。
