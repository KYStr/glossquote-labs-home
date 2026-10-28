# M01：可驗證的換算核心

日期：2026-09-24。狀態：PASS（僅 M01，產品 MVP 尚未完成）。

## 授權與邊界

使用者要求依先前工具計畫開始實作，指定主代理 Astra/max、實作子代理 Luna/max，並要求專案 .codex/config.toml 設定預設值。本次採 ROADMAP 第一款常用單位換算，依 TASKS.md 依序完成 T00、T01、T02。這項新授權不改原 GlossGate 008a 佇列與五份既有修改。使用者的新模型路由指示優先於舊 GlossGate 文件中的 Spark/Terra 限制。

範圍：零依賴 Node 24 ESM 開發基礎、靜態佔位頁、固定單位表核對、純函式數字解析／換算／格式化及離線測試。非目標：T03 以後的完整互動介面、完整 SEO、產品相容性認證、發布、安裝依賴、雲端服務及其他十一款工具。

## 檔案責任

- 主代理：根目錄 `.codex/config.toml`（依使用者明示）、本文件、HANDOFF.md、project.json 的 implementationStatus、T01 的 docs/RESEARCH.md；親自覆核 diff 與執行驗收。
- 子代理任務 UC-T00：只准 TASKS.md T00 列出的 package、scripts、public 與 test/scaffold.test.mjs；不寫 HANDOFF 或其他文件，結果由主代理整合。
- 子代理任務 UC-T02：只准 TASKS.md T02 列出的三個 public/js/core 模組及兩份 test；T00/T01 通過後才啟動。
- build 只可生成本工具 dist；測試暫存限 test/.tmp，清理先驗證解析後絕對路徑。所有其他工具與根目錄產品檔案不得修改。
- 任一時刻最多兩位實作子代理；本次依序使用一位。禁止子代理再委派；主代理不與實作者同時修改其負責檔案。

## 設計約定

使用既有 PRODUCT/TECHNICAL 的封閉單位表、數值文法、回傳物件與固定錯誤碼。無前端框架、套件、Worker、網路運算或持久化。T00 靜態頁清楚表示功能尚未接上，不展示假的成功結果。

serve 僅綁 127.0.0.1:4173，GET/HEAD，public 白名單資源；測試可以用匯出的 server factory 綁 loopback 隨機埠，不能關閉別人的伺服器。URL 解析前後均限制穿越、反斜線、NUL、dotfile 及實體路徑逃逸。check 只要求當前存在階段的檔案，所有既有本地引用必須可解析；build 必須拒絕 dist junction/symlink，且只複製核准靜態檔。

核心 API 為 parseNumber(raw)、convert({category,from,to,value})、formatNumber(value)、getFormula(from,to)。運算與呈現分離；明確值用獨立標準預期，不以同一函式算 expected。數字值用規定容差，字串與錯誤碼用精確相等。

## 必要驗收

1. 設定檔欄位與型別經官方文件、可用本機 CLI 檢查；不把預設值誤稱成當前模型的執行證據。
2. T00：Node >=24、npm test、npm run check 成功，實際瀏覽器載入本地靜態頁、非法 HTTP 路徑拒絕，server 停止。
3. T01：每個比例係數、六個溫度公式有官方來源核對；實際瀏覽器測 ESM、output、CSS，記版本與未測平台。
4. T02：U01–U17、自有欄位驗證、型別／數值上下限／負零／格式閾值與每對單位往返測試通過；主代理獨立重跑。
5. 主代理讀取全部新增原始碼與測試 diff，補充獨立反例；保留未驗證項。
6. 既有五檔雜湊及 Windows User/Machine PATH、TEMP/TMP、完整 Environment 指紋前後相同。

必要驗收失敗就停在該步；同一問題兩轮修正無進展，由主代理重查設計與根因。缺必要模型參數能力時不改用別的模型；僅繼續唯讀分析。

## 執行配置與委派證據

已要求：主代理 gpt-6-astra/max；子代理 gpt-6-luna/max。現有 collaboration.spawn_agent schema 支援指定兩參數；兩次建立均使用 fork_turns=none，並附完整任務契約。

本輪主代理的實際底層模型／推理強度目前未確認；寫入預設值不會作為本輪執行證明。子代理以工具呼叫參數、工具回覆所載 metadata 為準，不採子代理自述。

官方欄位依據（2026-09-24）：[OpenAI configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)、[GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)。本機 Node v24.14.0、npm 11.9.0、Codex CLI 0.155.0-alpha.16.3。

| 任務 | 真正工具呼叫與回覆 | 配置可確認程度 | 責任 |
|---|---|---|---|
| UC-T00 | spawn_agent → /home/<LOCAL_USER>/uc_t00_luna | 呼叫指定 gpt-6-luna / max，工具接受；未回傳 model/effort metadata | T00 九個來源檔，已停筆交付 |
| UC-T02 | spawn_agent → /home/<LOCAL_USER>/uc_t02_luna | 呼叫指定 gpt-6-luna / max，工具接受；未回傳 model/effort metadata | T02 五個來源／測試檔 |
| UC-T02-REVIEW | followup_task → /home/<LOCAL_USER>/uc_t00_luna | 沿用該子代理建立時已要求的參數；實際底層仍未確認 | 唯讀規格與獨立邊界案例審查 |
| UC-T00-FIX | 兩次 followup_task → /home/<LOCAL_USER>/uc_t00_luna | 沿用該子代理建立時已要求的參數；實際底層仍未確認 | 只修 scaffold 的暫時頁面斷言，保留安全與建置回歸 |

最多同時兩個子代理工作；沒有子代理再委派。每次實作委派都含任務 ID、背景、相關文件、allowed paths、契約與不可破壞行為、測試命令、驗收與停止條件。不是要求使用者轉貼提示詞。主代理的實際本輪模型／推理強度無可見 metadata，維持「未確認」。

根設定通過 Python tomllib 六項值斷言。CLI 的 `--strict-config features list` 不支援此組合（退出 1），之後 `codex --strict-config doctor --summary` 退出 0 並報 config loaded；它沒有證明本轮有效模型路由。設定內容只代表預設值。

## 結果

T00 已由主代理閱讀九份完整新增來源檔（相當於相對空檔的 diff），親自重跑 9/9 測試、check、build 及 11 個 HTTP 案例，實際頁面通過並停止 server。

T01 已完成 [逐列研究](RESEARCH.md) 並重跑 check，無來源衝突。瀏覽器 ESM/output/CSS 實測通過；瀏覽器版本未確認，完整平台相容性未測。

T02 已通過。主代理親讀三模組與兩測試的實際新增 diff，修正驗證順序意見並核對 U01–U17；親自執行核心 26/26、整套 36/36（0 skip）、check 13 個受管來源、build 7 個靜態檔，皆退出 0。下方主代理獨立程式實跑 79 個斷言，全部通過。

主代理直接接手 scaffold 清理路徑的跨磁碟拒絕與 test/.tmp junction 拒絕，新增一項必要回歸；這不涉及子代理正在修改的核心。最终 36 項是 26 核心 + 10 scaffold。中途 checker 因測試名稱誤撞 eval 子字串出現的 2 個失敗已修正並重跑，未刪案例或放寬檢查器。逐步委派、返工與命令記錄見 [HANDOFF](../HANDOFF.md)。

M01 判定依據：本文件六項必要驗收在各自範圍內通過，配置/瀏覽器版本可驗證程度如實保留；沒有阻止 M01 的未解實作問題。T03–T06 與完整產品瀏覽器驗收尚未開始，不能宣稱完整 MVP、跨平台支援、發布或模型底層路由認證。

## 最終產物與環境核對

主代理用 Node 讀取 dist 目錄與 SHA256：恰好 index.html、js/app.mjs、js/core/units.mjs、js/core/numbers.mjs、js/core/convert.mjs、styles/tokens.css、styles/app.css；每一檔與 public 相同，無 docs/test/輸入資料。test/.tmp 已不存在；主代理再次綁定並釋放 127.0.0.1:4173，确认預覽埠已釋放。臨時預覽分頁已關閉。

主代理於長時間開發／測試前後執行帳號既有 `check-persistent-environment.ps1`，均退出 0 / PASS。下表為前後相同值；沒有修改既有重複 PATH 條目。

| 範圍 | PATH 登錄型別 | 長度／條目數／暫存條目 | PATH SHA256（前 = 後） | 完整 Environment-key SHA256（前 = 後） |
|---|---|---|---|---|
| HKCU / User | ExpandString | 834 / 16 / 0 | 3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb | 3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a |
| HKLM / Machine | String | 1227 / 30 / 0 | 52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8 | a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82 |

User Environment value count 前後均 18，Machine 均 26。User TEMP/TMP 均 ExpandString、長度 32、SHA256 `6419b675e0a677e2fa237deacbf7fd1b6af9f3685b28897b4349704d91d821c7`；Machine TEMP/TMP 均 ExpandString、長度 17、SHA256 `99e709292d85386d0db9b41c1c3c80033d9a3ed03264a5b0a5fb69e87e1d9fdf`。前後完全相同。

主代理對原先已修改的五檔作 SHA256 等值斷言，退出 0。以下路徑相對 repo 根目錄，值均為前 = 後：

| 既有檔案 | SHA256 |
|---|---|
| packages/glossgate/README.md | F1CB589A148C73516AE64873F2EE9014376D6A2E15606A483D7F09EF98C49175 |
| packages/glossgate/src/contracts.mjs | F490EC97B99699F961D4550F10DB87A438B6E7D96461CFE4ABEA0649A4BF20AE |
| packages/glossgate/src/policy.mjs | A96C074A2C488034D2CB63925793B7615E9D89F2DBD8861AFBB686583B683572 |
| packages/glossgate/test/contracts.test.mjs | B715005CE4B77FC3435F77FA96F79855F133896D3206958CCB584473CDC1F36E |
| packages/glossgate/test/policy.test.mjs | A4F1EF227DE5C49BCCDBBE8631E923882597B0C7ED65C6B4AF0E8A7B0A95891B |

本次修改範圍：根 .codex/config.toml；本工具 M01、RESEARCH、HANDOFF、project.json implementationStatus；T00 九份與 T02 五份來源／測試；本工具 build 生成的 dist。未安裝依賴、提交、推送、部署或改動其他產品實作。其餘藍圖仍是本次開始前既有的未追蹤檔案，不能把 `git status` 中整個 tool-projects/ 當成本次全部新增。

## 主代理獨立反例程式（已執行：79 斷言 PASS）

以下測試由主代理在子代理測試交付前準備；固定預期值不取自實作表。從本工具根目錄以 `node --input-type=module -` 接收下列程式作為 stdin。主代理已於最終整合執行，退出碼 0；數值選用可精確預期的案例，格式與錯誤逐字比較。

```javascript
import assert from 'node:assert/strict';
import {parseNumber,formatNumber} from './public/js/core/numbers.mjs';
import {convert,getFormula} from './public/js/core/convert.mjs';
let assertions = 0;
const eq=(actual,expected)=>{assert.deepEqual(actual,expected); assertions++;};
const ok=(value)=>({ok:true,value});
const bad=(code)=>({ok:false,code});
for (const [raw,expected] of [
 ['0e-999',ok(0)],['+0.000e999',ok(0)],['1e-999',bad('INPUT_RANGE')],
 ['0'.repeat(63)+'1',ok(1)],[' '.repeat(65),bad('INPUT_TOO_LONG')],['0'.repeat(65),bad('INPUT_TOO_LONG')],
 ['\t\r\n 1. \t',ok(1)],['\u00a01',bad('INVALID_NUMBER')],['1\u000b',bad('INVALID_NUMBER')],
 ['.000000000001',ok(1e-12)],['1000000000000',ok(1e12)],
 ['.000000000000999',bad('INPUT_RANGE')],['1_000',bad('INVALID_NUMBER')],
 ['1e309',bad('INVALID_NUMBER')],['-0e-123',ok(-0)]
]) eq(parseNumber(raw),expected);
for (const raw of [null,undefined,true,[],{},1,1n]) eq(parseNumber(raw),bad('INVALID_NUMBER'));
for (const [value,expected] of [
 [999999999999.6,'1e+12'],[0.0000009999999999996,'0.000001'],
 [-0,'0'],[1e-18,'1e-18'],[1e18,'1e+18'],[1000000,'1000000'],
 [-1000.5,'-1000.5'],[1.234567890123456,'1.23456789012']
]) eq(formatNumber(value),expected);
const base={category:'length',from:'m',to:'cm',value:1};
eq(convert(base),ok(100));
eq(convert({...base,to:'script',value:'1'}),bad('INVALID_NUMBER'));
eq(convert({...base,category:'mass'}),bad('UNIT_MISMATCH'));
for (const id of ['__proto__','constructor','toString','script']) {
 eq(convert({...base,to:id}),bad('UNKNOWN_UNIT'));
 eq(convert({...base,category:id}),bad('UNKNOWN_UNIT'));
}
for (const value of [NaN,Infinity,-Infinity,null,true,'1',1n]) eq(convert({...base,value}),bad('INVALID_NUMBER'));
for (const value of [1e-13,1e12+1]) eq(convert({...base,value}),bad('INPUT_RANGE'));
eq(convert({...base,value:-1}),bad('NEGATIVE_QUANTITY'));
eq(convert({...base,value:-0}),ok(0));
eq(Object.is(convert({...base,value:-0}).value,-0),false);
eq(convert({...base,[Symbol('extra')]:1}),bad('INVALID_NUMBER'));
eq(convert(Object.defineProperty({...base},'extra',{value:1,enumerable:false})),bad('INVALID_NUMBER'));
eq(convert(Object.assign(Object.create({category:'length'}),{from:'m',to:'cm',value:1})),bad('INVALID_NUMBER'));
let reads=0;
eq(convert(Object.defineProperty({...base},'value',{get(){reads++;return 1;}})),bad('INVALID_NUMBER'));
eq(reads,0);
eq(convert({...base,to:'m',value:123.456}),ok(123.456));
eq(convert({category:'area',from:'km2',to:'cm2',value:1e8}),ok(1e18));
eq(convert({category:'area',from:'km2',to:'cm2',value:1e12}),bad('RESULT_RANGE'));
eq(convert({category:'area',from:'cm2',to:'km2',value:1e-12}),bad('RESULT_RANGE'));
eq(convert({category:'length',from:'mm',to:'km',value:1e-12}),bad('RESULT_RANGE'));
for(const [from,to,value,expected] of [
 ['C','K',-273.15,0],['F','K',-459.67,0],['K','F',0,-459.67],
 ['C','F',100,212],['F','C',-40,-40],['K','C',273.15,0]
]) eq(convert({category:'temperature',from,to,value}),ok(expected));
for(const [from,value] of [['C',-273.15000000000003],['F',-459.6700000000001],['K',-1e-12]])
 eq(convert({category:'temperature',from,to:'K',value}),bad('BELOW_ABSOLUTE_ZERO'));
for (const [from,to] of [['C','K'],['F','K'],['m','cm']]) {
 const formula=getFormula(from,to); eq(typeof formula,'string');assert.ok(formula.length>0);assertions++;
}
assert.throws(()=>getFormula('script','m'),RangeError); assertions++;
console.log('Primary independent core checks:',assertions,'assertions PASS.');
```
