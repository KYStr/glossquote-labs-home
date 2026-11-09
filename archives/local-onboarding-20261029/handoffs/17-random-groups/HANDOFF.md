# 名單隨機分組交接

目前狀態（2026-10-13）：**READY_FOR_INTEGRATION / OWNER_RELEASED**。M1_PRIMARY_PASS；M2正式靜態產物、PUBLIC source固定HEAD、固定ZIP及解壓重驗均PASS。主代理M3的正式部署／HTTP／首頁整合與外部複驗仍未開始。下方M1與M2歷史紀錄保留；不把source publication當成live或產品complete。

## 規格建立紀錄（保留當時狀態）

2026-10-13：**SPEC_ONLY**。本輪建立規格文件，不建立功能 chat、不實作 runtime、測試或網站、不發布 source、不部署。模型請求和 backend 都尚未確認：requested model 預定 `gpt-6.1-sol` / `max`；thread 尚不存在。產品所有測試與 browser/SEO 結果都是 **NOT_RUN**。

工作使用者假設為活動主持人、教師、帶團者或朋友；沒有需求訪談、搜尋量、排名或流量 evidence。產品範圍以 `PRODUCT.md` 為準。演算法與 API 規範以 `TECHNICAL.md` 為準，預期案例以 `ACCEPTANCE.md` 為準。官方 random API 參考為 [MDN Crypto.getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues)；已由主代理於 2026-10-13 查核，支援 integer typed arrays 且本身不強制 HTTPS。此 API 不等於公證或可公開驗證的抽籤。

| 項目 | 目標／目前狀態 |
|---|---|
| project folder | `tool-projects/17-random-groups/`，規格資料夾已建立 |
| slug / title | `random-groups` / 名單隨機分組 |
| local port / spike | 4197 / 5197，未啟動程序 |
| requested feature model | `gpt-6.1-sol` / `max`，尚未建 thread，尚無 runtime evidence |
| source repository | `KYStr/glossquote-labs-random-groups`，not created / not verified |
| live origin | `https://groups.glossquote.com`，未配置 / 未部署 |
| external review | NOT_RUN |

## 此次只建立的規格交付

規格目錄應包含 17 個文件：11 個 root documents（README、START-HERE、PRODUCT、TECHNICAL、UX-SEO、ACCEPTANCE、TASKS、TASK-ENTRY、AGENTS、HANDOFF、project.json）和 `docs/` 的 BRAND、ENGINEERING、PRIVACY-SECURITY、DESIGN-SYSTEM、RELEASE、RELEASE-CANDIDATE。設計系統副本源自家族正式契約，其他文件針對本工具自包含。

## 必要 M1/T00 驗收仍未執行

- 核心測試案例 A01–A44、`npm test`、`npm run check`、`npm run build`：NOT_RUN。
- 繁中/英文真 Chrome/Edge 操作、剪貼簿、鍵盤/focus、320px/200% zoom、Network/Storage：NOT_RUN。
- Cloudflare/SEO/正式 HTTP、GitHub public source、首頁 catalog、部署與外部驗收：NOT_RUN。

後續每一里程碑追加真實任務 ID、scope、改檔、命令/exit、Browser/OS/觀察或 NOT_RUN、source commit/ZIP hash、部署版本/URL、風險、下步。不得改寫舊失敗或 NOT_RUN 成 PASS。

## M1/T00 與 RG-M1-R1：本機雙語 MVP 固定交接

任務 `RANDOM-GROUPS-M1-LOCAL-MVP`；package version `0.1.0`；日期 2026-10-13。功能 chat `01a13361-86f1-7e13-a1ef-573ec200bc4f`，host local。主代理提供的 create_thread 實際建立紀錄接受 requested `gpt-6.1-sol` / `max`；後端身份工具未提供證據，**未獨立確認**。沒有另開 chat 或子代理。

### 實作與固定輸入

- 新增 `package.json`、`.gitignore`，runtime/development dependencies 都為零。
- 新增 `public/index.html`、`public/en/index.html`、`public/styles/app.css`、`public/js/app.mjs`、`public/js/i18n.mjs`、`public/js/core/random-groups.mjs`、preview `public/robots.txt`。
- 新增 `scripts/serve.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`scripts/validation.mjs`。
- 新增 `test/random-groups.test.mjs`、`test/app.test.mjs`、`test/scaffold.test.mjs`；只用合成假名單。
- 更新目前狀態檔 `project.json`、`START-HERE.md`、`docs/RELEASE-CANDIDATE.md` 與本 HANDOFF。其餘規格／設計契約不變；`dist/` 只由 build 產生且 gitignored。沒有 root Git 操作、首頁／兄弟工具／GlossGate／040141.xyz 變更。
- 原工具資料夾本來是 untracked；M1 沒有 commit，沒有公開發布。`git status --short -- .` 仍是 `?? ./`；`git diff --check -- .` exit 0 只涵蓋 Git 已知 diff，不能冒稱查過 untracked 全文。工具本身 check 和固定 manifest 是新檔的證據。

固定 16 個 source/test/tooling 檔案：[code-manifest.json](../../.runs/random-groups/m1-20261013-01a13361/code-manifest.json)。其 aggregate SHA-256（path-sorted `{path,bytes,sha256}` compact JSON）為 `c7d8f1dc648365d0adaf58b1530ce03eaa0b614165b6e26e117e1f07e6534e83`；7 個 public runtime 資產 aggregate 為 `6dc7af1d6c7b1d19f4bd500f5be0f1dc1348a920c27e47a3a205eb5e1046fc1a`。此 manifest 不包含可追加狀態文件、dist 或 evidence，也不是 Git commit／ZIP。R1 固定檔案：

| 檔案 | bytes | SHA-256 |
|---|---:|---|
| scripts/validation.mjs | 11411 | `72dbe3b09cf07bd100a06212284b2deb0de1a29b18849ee56530cf3f16e53691` |
| test/scaffold.test.mjs | 17691 | `67eabc611cd9f97f6cb2ae64fc61b3a68fb967770b6fef660db2e5c914c80da5` |

核心使用精確 UTF-16/parser 邊界、連續且獨立的 ID、BigInt 組數 grammar、真正 browser Crypto adapter、128 次 bounded rejection Fisher–Yates 與均衡連續切分。App 編輯、重洗、範例、clear/pagehide 都失效舊結果，copy 使用 content revision 與 request sequence；pending completion 不復活舊提示／fallback，不承諾取消 OS 寫入。姓名僅用文字節點及 value，HTML-looking 名字保留字面值。範例開始生成後清掉「尚未分組」提示，已加入回歸。

### 真命令與歷史結果

所有命令在本工具目錄，Windows / Node **v24.14.0**，OS release `10.0.26200`。沒有安裝套件、改 PATH／registry／永久環境、讀憑證、公開或部署。

| 命令 | 結果 | 固定 evidence |
|---|---|---|
| `node --version` | exit 0，v24.14.0 | 開工工具輸出／code manifest |
| `npm test`（最終 R1） | exit 0；53 tests PASS，0 FAIL／skip | `test-03-r1.txt` |
| `npm run check`（最終 R1） | exit 0；兩語、資產、語法、相對引用、preview noindex | `check-02-r1.txt` |
| `npm run build`（最終 R1） | exit 0；7 個 allowlist 資產，preview dist | `build-02-r1.txt` |
| `npm run dev` | READY；loopback only；持續 session，尚未退出 | exec session 67125、PID 34032、啟動工具輸出 |
| Windows guard 前後 | PASS；完整 snapshots 完全一致 | `environment-before.json`／`environment-after.json`／`environment-comparison.json` |

以上 log 均位於孵化器 `.runs/random-groups/m1-20261013-01a13361/`，只追加，不把舊結果改成 PASS。第一輪 `test-01.txt` 是 41 PASS／2 FAIL：高值測試 fixture 在部分 n 正確被拒絕，另把英文 “at least” 誤判 stack；只修正 oracle 與過寬比對，拒絕取樣與 128 門檻保留。`test-02.txt` 為 43 PASS、check-01/build-01 exit 0。R1 的必要新輸入再跑最終上表，不要求重做未變 runtime 的 browser cases。最初 guard 啟動命令錯把 PowerShell `$LASTEXITCODE` 當 guard 結果而提前停下；guard JSON 其實 PASS，改讀固定 Status 後才執行 npm，未造成環境漂移。

### RG-M1-R1 主代理回饋修正

1. Fixture 建立前逐段驗證 workspace／test／test/.tmp 的 lstat、realpath，拒絕 junction/symlink 或解析出 workspace；mkdir 不再遞迴穿越未查 parent。記錄 parent 與 task-owned fixture 的 dev/ino 身分，每次 recursive rm 前重驗祖先、實體範圍、目錄身分和非根條件，異常直接拒絕，不 force delete。回歸只使用工具 workspace 內隔離合成 sentinel：test 或 .tmp parent junction 在寫入前拒絕；建立後 parent 被替換時清理拒絕；原 sentinel 和停放的原 fixture 皆不變；正常 fixture 全通過。
2. 靜態 ESM 引用檢查補上普通 side-effect import，拒絕遠端／bare／非 allowlist 路徑；本地 named 和 side-effect import 回歸通過。沒有導航遠端、引入依賴或通用 JS parser。此 regex 是有限的 source inspection evidence，不能證明任意混淆 JS 無外傳，Network/Storage 仍 NOT_RUN。

### 真瀏覽器證據與未驗

[browser-observations.json](../../.runs/random-groups/m1-20261013-01a13361/browser-observations.json) 是 CUA 驅動**真 Chrome 與 Edge** 的表單／鍵盤操作、AX 與唯讀 DOM 觀察。不是 Node mock。Chrome tab 1636110979，Edge tab 1991446741；只操作本任務建立的分頁。兩語 B02–B06 有實際輸入、結果、行號和狀態。Chrome 及 Edge 完整版本**未獨立觀察**：Chrome `chrome://version` 被瀏覽器安全審查拒絕，工具只准 HTTP/HTTPS；沒有繞過該政策。Edge enabled API 未提供完整版本。瀏覽器名稱由工具回報，不能把版本猜成已確認。

Edge 最早一批 helper closure 誤讀先前 Chrome 分頁，共 10 筆已明記 **INVALID_OBSERVATION** 並保留原回報值；不能用作 Edge PASS。改用明確 tab 參數和 expected-state 檢查後，Edge 兩語 B02–B06 都重新取得有效 PASS 證據。其後規劃的額外 Chrome 鍵盤錯誤恢復步驟遇到旧 browser binding unavailable，未重試／改用外部控制路徑，該部分 NOT_RUN。

| Case | 實際狀態／範圍 |
|---|---|
| B01 | PARTIAL：Chrome/Edge 語言切換、lang、同語 home href 正確；正式首頁往返未驗（M3）。 |
| B02–B05 | PASS：Chrome/Edge、zh-Hant/en，5人K2完整3/2、ID各一次；改名字／K即清結果；人數降至2但K3不自改；明確重分只保留唯一結果。 |
| B06 | PASS：兩瀏覽器兩語，CRLF/trim、空行忽略2、同名ID1/2；內部TAB／控制碼／101-unit姓名拒絕及實體行號。Chrome測NUL，Edge另測DEL/C1，無錯誤姓名回顯。 |
| B07 | PASS（Chrome/en）：2人、500人各可用；1人／501人拒絕，無半成品。500/2實際250/250。 |
| B08 | PASS（Chrome/en）：K2/K50，K1/K51拒絕，` 0002\t`接受，500/50每組10人。 |
| B09 | PASS（Chrome）：不同假名單多次正常 Crypto 分組，全ID完整且均衡；不作統計公平主張。 |
| B10 | NOT_RUN：沒有可用的真瀏覽器 Crypto 置換 harness；A30/A33/A37 是獨立 Node evidence。 |
| B11 | PASS（Chrome/兩語）：指定六個假名、K2、清結果、標示示範且未自動生成。 |
| B12 | PARTIAL：Chrome/en 明確 Copy 操作與成功 UI；原生文字編輯器貼上未驗，沒有讀 OS clipboard。 |
| B13/B14 | NOT_RUN：真瀏覽器 clipboard 拒絕／延遲注入能力未提供；Node A41/A42 guards PASS 不替代 browser。 |
| B15 | PARTIAL：Chrome clear與導航後返回皆空白／K2；实际BFCache命中未獨立觀察；pagehide/pageshow純state另有Node PASS。 |
| B16 | NOT_RUN：無完整 Network/Storage 觀察能力，不能由 source scan／CSP 推論 PASS。 |
| B17 | PARTIAL：Chrome兩語鍵盤輸入、Tab/Enter及clear/copy主要操作可達；繁中焦點順序roster→group-count→generate→sample→clear→copy；額外純鍵盤錯誤恢復未驗。 |
| B18 | PASS（Chrome/en）：320px viewport override、500人K50，50組/500個成員全在DOM；scrollWidth=clientWidth=305（320 viewport減15px scrollbar），無外頁水平溢位；主要控制均至少44px高；非真手機。 |
| B19 | NOT_RUN：未提供原生200% browser zoom控制，不用CSS模擬代替。 |
| B20 | PARTIAL：截圖可見雙層focus；[contrast-tokens.json](../../.runs/random-groups/m1-20261013-01a13361/contrast-tokens.json) 的實際CSS token算術全PASS；真reduce-motion切換／讀屏未驗。 |
| B21 | NOT_RUN：無停用JS的原生控制；noscript/hidden startup有靜態與Node檢查，不能替代browser。 |
| B22/B23 | NOT_RUN（M3）：正式HTTP/SEO、部署、雙語首頁往返與catalog未開始。 |
| 真機／讀屏 | NOT_RUN：目前沒有可用裝置／native assistive technology控制。 |

畫面證據：`chrome-zh-desktop.png`（完整五人3/2結果）、`chrome-en-320px.png`（320px密集名單）、`chrome-en-keyboard.png`（可見雙層輸入focus，截取到鍵入中的畫面；不作完整結果證據）。UI沿Product App與Impeccable單方向，共用家族tokens、系統fallback字型；沒有外部圖片／字型／圖示、動畫loading或新功能。

### Windows 環境保護結果

前後 User/Machine PATH 型別、length、hash、ephemeral count、TEMP/TMP hashes與完整 Environment-key fingerprint **完全相同**，comparison `AllPersistentSnapshotsUnchanged=true`。

| Scope | PATH type / length / ephemeral | PATH SHA-256 | Environment-key SHA-256 |
|---|---|---|---|
| HKCU User | ExpandString / 834 / 0 | `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb` | `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a` |
| HKLM Machine | String / 1227 / 0 | `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8` | `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82` |

### 預覽、風險與主決策

- 保留 task-owned preview `http://127.0.0.1:4197/index.html`、`http://127.0.0.1:4197/en/index.html`，PID34032／exec session67125，啟動命令 `npm run dev`→`node scripts/serve.mjs`。未殺其他程序／釋放埠或關閉既有分頁。Edge預覽標為deliverable。
- 必要M1核心／工具鏈自驗無FAIL；主代理R1两項已修測。主代理的獨立驗收仍由主代理裁定，作者不替它勾PASS。
- 未驗項有上表的明確能力限制；不要把Node fake DOM、靜態檢查或UI copy提示當成原生clipboard／storage／readscreen／完整browser版本證明。
- 主代理指定非阻塞M2後續：FAQ中的 production Network/Storage 驗收字眼屬內部工程文案，M2時改成使用者可理解的資料說明；本輪不改M1 UI以免越級。
- source：未公開，目標 `KYStr/glossquote-labs-random-groups`；commit/ZIP均未建立。hosting：未部署，目標 groups.glossquote.com；homepage：未整合；external review：NOT_RUN。不將source push、本機URL或spec例当成live release。
- **Owner已釋放**，M1固定碼保持不變。下一步僅主代理独立驗收／明確M2放行；M2仍 **BLOCKED_PENDING_PRIMARY_M1_ACCEPTANCE**。

## RG-M2-T01：PUBLIC source／ZIP 固定交接

主代理已閱讀R1修正並對獨立fixedcopy跑53/53、check/build、16code/7runtime/dist逐bytehash及代表真Edge兩語操作，報告在孵化器 `.runs/new-tools-2026-10-13/primary-m1/groups-primary-acceptance.md`；明確放行M2。作者本階段仍請求gpt-6.1-sol/max，backend未獨立確認，沒有委派或另開chat。

**現在owner釋放、固定碼READY_FOR_INTEGRATION。** Source repo：[KYStr/glossquote-labs-random-groups](https://github.com/KYStr/glossquote-labs-random-groups)，實際 `isPrivate=false`。GitHub commits/main API、git ls-remote與publishing-copy HEAD全部為 **`a8711a7cb8dc477dfee18c5667935c5be44602e1`**。沒有root Git commit／force push。公開copy是本工具獨立main repo，38項source allowlist，未含dist/node_modules/.runs/.wrangler/憑證／私人名單／兄弟工具；只將HANDOFF、START-HERE、project.json換成不含私有chat／機器metadata的公開摘要，其餘bytes一致。

### 實際變更與實作界線

- `public/index.html`、`public/en/index.html` 只改FAQ資料說明：移除內部Network/Storage驗收字眼，保留本機名單與正常網站檔案請求、OS clipboard不隨清頁移除。`public/404.html` 新增雙語404內容、根相對CSS／工具links，深層未知路徑也可用。
- `scripts/production.mjs` 固定origin与2 canonical URLs、互返hreflang/x-default、OG、可見WebApplication JSON-LD、精確CSP hash、robots/sitemap與alias301；preview無正式metadata/sitemap並保持noindex。
- `scripts/build.mjs/check.mjs/validation.mjs`、package scripts支持preview與production gate。只寫已核准dist檔，mode切換只unlink已驗證的已知generated檔，不遞迴刪dist；unknown stale/hardlink/junction仍拒絕。
- `wrangler.jsonc` 是assets-only配置，無main/bindings，groups.glossquote.com custom domain，2026-10-13 compatibility，html_handling=none／not_found_handling=404-page，workers.dev/preview_urls和logs/traces关闭。配置與離線產物不是真Cloudflare HTTP證據。
- `scripts/release.mjs` 38項source白名單／public-copy metadata篩查，Git固定tree、ZIP path/CRC/size/mode/commit與逐blob bytehash、只解壓到全新已核准owned子目錄。標準 `.wrangler` cache只驗lstat/realpath後排除，不讀／發布其內容；cache junction回歸拒絕且synthetic sentinel不變。M2未明列.gitignore，因此沒改它；必要源碼白名單保證cache不進repo/ZIP，不為可選ignore行延後source交付。
- `test/release.test.mjs` 新增固定metadata／mutation、preview隔離、source拒絕與native Git ZIP還原回歸；`test/scaffold.test.mjs` 適配新tooling與處理同時建立正常temp parent的EEXIST，仍保留R1實體路徑／身分保護。
- README、TASK-ENTRY、START-HERE、project.json、RELEASE及RELEASE-CANDIDATE更新實際流程與狀態。core、app、i18n、CSS與M1主驗固定bytes完全不變，瀏覽器M1核心證據依主代理要求直接重用；沒有另開UI探索或重寫產品。

### 最終命令／exit與離線邊界

Node24.14.0；Git2.40.0.windows.1；Wrangler既有reviewed4.147.0，本地schema SHA256 `07a867ae03d86102eba23fee15136cc4fadbf2fd708d619223c3976ec6047301`。無新增runtime/development dependency，不需npm install；Git CLI是ZIP回歸工具。

| 命令／檢查 | 結果 | evidence（M2目錄） |
|---|---|---|
| `npm test` | exit0；57/57 PASS、0skip | test-final-02-cache.txt |
| `npm run check` | exit0 | check-final-02-cache.txt |
| `npm run build` | exit0；preview9檔 | build-preview-final-02-cache.txt |
| `npm run build:production` | exit0；production11檔 | build-production-final-02-cache.txt |
| `npm run check:production` | exit0 | check-production-final-02-cache.txt |
| `npm run release:check` | exit0；38 source | release-check-final-02-cache.txt |
| 隔離Wrangler deploy `--dry-run --autoconfig=false` | exit0；未上傳／部署，無bindings | wrangler-dry-run.txt/json |
| public source私有metadata／copy review | PASS | public-copy-reviewed-02.json（歷史）；當前fixed manifest/ZIP資料 |
| PUBLIC／remote HEAD | PASS | remote-repository.json、remote-main-head.txt，另實際git ls-remote |
| ZIP／逐Git blob／解壓 | PASS；38/38 | source-zip-verification.json |
| 解壓後全部npm gates | exit0；57/57、check、preview/production build/check、source check | restored-*.txt |
| owner/pubcopy/restore三份production | PASS；11/11 bytes/hash一致 | code-manifest-m2.json |
| 全Windows持久Environment前後 | PASS，完整Snapshots不變 | environment-before/after/comparison.json |

所有M2 evidence位於 `.runs/random-groups/m2-20261013-01a13361/`，逐次追加。CLI loader只讀主代理給的精確現有Wrangler executable/package/schema，不執行別人工具wrapper；shell:false/windowsHide、明確非secret env allowlist，USERPROFILE/XDG_CONFIG_HOME/TEMP/TMP/log/outdir均為本工具owned .runs，metrics=false/CI=true與空env-file，不繼承帳戶env、不讀token。標準.cwd `.wrangler`cache保留，不刪進度。CF結果只是dry-run，不是部署。

早期ZIP gate如實失敗：先因Git普通非執行檔使用DOS attr=0／目錄=16被誤拒，依Git官方實作／實際header修正普通mode相容，仍拒symlink；接著逐blob mismatch的診斷證明每LF被account Git working-tree設定轉CRLF，多出恰lineCount個CR。`createSourceZip`只以 `git -c core.autocrlf=false -c core.eol=lf archive` 暫時關閉轉換，未改global Git。affected native ZIP回歸通過後最終全gate再跑；沒有弱化byte比對、CRC、path或mode門檻。

### 固定source／產物／ZIP

- 公開38檔source aggregate SHA256：`a2994eeaa3ba5cc322c309e1e66b4e908eb08eb6e7bfcda94eb1ed790036444e`。
- 固定21檔code aggregate SHA256：`257780e59a915f93069bb819d99371c866802604508784ebdfbb9830520431e5`。
- production11檔 aggregate SHA256：`11512b2ae9c8c66bc8a6a2f8c44c271245f74d5561e55c2f2ba5ec385528d74d`。
- [完整M2 manifest](../../.runs/random-groups/m2-20261013-01a13361/code-manifest-m2.json) 記錄每檔bytes/hash与3份產物一致。
- [固定 source ZIP](../../.runs/random-groups/m2-20261013-01a13361/random-groups-source-a8711a7cb8dc477dfee18c5667935c5be44602e1.zip)：**104713 bytes**，SHA256 **`ca4a81cb5e7b01a7bbede325601b49dcac14cf5d7f2f89b9f9bfbcf8812b05d4`**。
- ZIP還原在同目錄 `source-restored-a8711a7/`，保留完整自包含code与production产物供主代理；public publishing copy亦保留，無force/reset/刪重建。

### 狀態、風險與下步

Windows前後完整Environment-key與PATH/TEMP/TMP snapshots完全相同；User PATH ExpandString/834/ephemeral0、Machine String/1227/ephemeral0，hash同前表，無永久系統修改。原preview PID34032／session67125、4197與已建立分頁保留，沒有殺其他程序。未碰根repo／兄弟／首頁／GlossGate／040141.xyz。

M1表列browser版本、原生clipboard、API注入、完整Network/Storage（含同源/cdn-cgi/rum）、BFCache命中、200%zoom、停用JS、reduce-motion、讀屏／真機等NOT_RUN/PARTIAL仍有效。M2 metadata／headers／404均為artifact或配置驗證，正式URL的HTTP/MIME/CSP/robots/sitemap/實際browser與homepage仍 **NOT_RUN / M3**；外部review仍 **NOT_RUN**，不標complete。

**Owner已釋放，READY_FOR_INTEGRATION。** 主代理從固定PUBLIC commit／ZIP親驗、在已授權免費Cloudflare流程序列部署groups.glossquote.com，實測正式兩語與headers/network/storage後才整合雙語首頁與外部驗收。任何外驗修正回本原功能chat；保留固定碼等待具體回報。

<!-- primary-handoff-release-2026-10-13 -->
## 2026-10-13 主代理正式發布與驗收

最新固定來源：https://github.com/KYStr/glossquote-labs-random-groups/commit/a8711a7cb8dc477dfee18c5667935c5be44602e1（PUBLIC獨立核實）。主代理由固定ZIP逐Git blob核对，再跑57測試及test / check / build / build:production / check:production / release:check全通過。33項正式HTTP回應及9資產核對通過；Cloudflare version dd13e28f-97a8-46a8-983d-6990149834b6。

正式站：[繁中](https://groups.glossquote.com/index.html) / [English](https://groups.glossquote.com/en/index.html)；雙語首頁已實際列出本工具。已複驗均衡分組、同名者保留、每列只出現一次；M2發布工具鏈。

狀態：**主驗通過，等待外部驗收**。保留原紀錄中的人工NOT_RUN；本輪更精確的瀏覽器範圍見批次驗收包，24正式英文頁Edge封鎖未繞過。沒有把發布前固定文件的NOT_RUN視為最新狀態，也沒有將自動或HTTP測試冒稱真裝置/AT/完整Network與Storage測試。

主證據：`.runs/handoff-release-2026-10-13/`；工作區狀態註記不是固定公開commit內的檔案。
<!-- primary-handoff-release-2026-10-13-end -->

<!-- external-followup-accepted-2026-10-16 -->
## 2026-10-16 主代理採納外部複驗

固定版本 `a8711a7cb8dc477dfee18c5667935c5be44602e1` 標記 **外部測試通過（本輪核心與雙語離線受測範圍）**：57項原測試、1,000組對照、6項雙語離線核心操作。這些是外部實跑結果；主代理已核對版本、回報及封裝完整性，未在本輪重跑整套。

完整正式站Network／Storage、原生操作與真機等仍待驗；NEL停用的提供者紀錄比對一致，不代表既有瀏覽器policy／queue全部清除。沒有新增確認產品缺陷，無需產品返工或重發。詳[最新外驗總表](../EXTERNAL-FOLLOWUP-2026-10-16.md)。本註記不改公開固定commit；下方／上方較早等待外驗狀態保留為歷史。
<!-- external-followup-accepted-2026-10-16-end -->
