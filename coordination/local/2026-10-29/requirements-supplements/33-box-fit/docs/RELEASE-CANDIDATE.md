# 箱內排列容量試算候選

## 目前 M2：BOXFIT-M2-20261018-R1

**PUBLIC source／production candidate，待主代理驗收**。本次有明確 M2 GO，僅 CLI／檔案，全程沒有 UI 操作。未部署、未做首頁，未標 external review／complete。詳見 [HANDOFF.md](../HANDOFF.md) 最上方 M2 區段；下方 M1 內容保留作歷史。

Evidence：`C:/Users/<LOCAL_USER>/Documents/Codex/GlossQuote-Labs/.runs/box-fit/20261018-m2-01a14c77/`。

- PUBLIC repository：https://github.com/KYStr/glossquote-labs-box-fit；isPrivate=false，visibility=PUBLIC，local／remote full commit **cc9e23ddcaae09d5a4d5423c305458c86cafb5e2**；branch/default **codex/m2-release**。
- Reviewed independent repository：evidence 下 `publishing-copy/`；只公開 31 檔，內部文件／絕對路徑／證據／generated output 已排除。`publication-manifest.json` 記對照與隱私掃描，README 由公開專用檔映射。
- Source ZIP：`glossquote-labs-box-fit-source.zip`，固定 commit 直接 git archive，根即 package.json，31 files／45,196 bytes，SHA **360575ae86b04404866c226f2e564efa2facfd6e75c1aadd8abd4e935320dce8**。逐檔與 Git blob 一致，見 `source-zip-verification.json`。沒有自我引用後續 commit。
- 本地與乾淨 ZIP：Node v24.14.0；`npm test` **59/59**、check、build、build:production、check:production、release:check 都 exit 0。`clean-source/` 和 `clean-gates.json` 留乾淨 artifact gates，兩份產物 manifest 與候選一致。
- **M1 八檔 public bytes 不變**；production 僅加入 head metadata，body／CSS／app／bootstrap／core／404 保持原 bytes。M1 preview manifest SHA **2da136470d386ed824bb8b381b5f13d4c7409fd06cb77ae2257870c8298f8ab1**。
- `dist-production/` 11 檔；獨立 sibling **dist-production.manifest.json** 不進 deploy assets，固定 SHA **2995c5e2d5707f701e0fc5d6a412a387ba5d60736c86317c7f4689d93e6fb636**，複本 `production-manifest.json`。
- 兩語正式 canonical／互返 hreflang／x-default、index follow、OG、WebApplication JSON-LD 精確 CSP hash；實際 robots longest-match／case／所需 JS/CSS、header merge／! removal 防 noindex 累積、sitemap、redirect／404／405／MIME／security 均通過 offline HTTP gates。
- 純 JSON static-only wrangler config 已固定：glossquote-box-fit、2026-10-18、boxfit.glossquote.com、assets ./dist-production、none／404-page、所有 previews／metrics／observability logs/traces 關閉、無 main/bindings。未執行 Wrangler／Cloudflare 或讀憑證。
- 固定 5213 HTTP model：**PID 82312**，`node.exe scripts/preview-production.mjs`，127.0.0.1；34 筆模型 HTTP 通過，`production-http-5213.json`。原 4213 preview PID **70996** 保留。模型是 exact-path static model，CDN query handling／實際 Cloudflare 仍需 live 驗收。
- 每個 Git block capture／verify fingerprints 不變；Environment guard 前後完整 Snapshots 相同，HKCU 834／HKLM 1227、ephemeral 皆 0、PATH type／hash／Environment fingerprints／TEMP／TMP 不變。Git／gh auth 與 persistent Windows 設定無修改。
- `source-publication.json`、`commands.json`、`source-manifest.json`／`source-manifest.sha256`、`changes-from-baseline.json` 與 `closure.json` 留最終 metadata。本地完整 source manifest 含內部交接文件，不是公開 ZIP；公開範圍以 publication manifest／commit 為準。

所有後續 UI／真機／原生／完整 NetworkStorage／AT／真 BFCache／離線項仍 **NOT_RUN_USER_FOCUS_INCIDENT**，沒有補做或冒稱重播。主代理驗收固定來源後才部署與首頁；M3 及外部確認未開始。

## M1 歷史候選

候選 ID：**BOXFIT-M1-20261018-R1**。狀態：**M1 本機候選，待主代理獨立驗收；UI 因使用者焦點事件暫停**。不是公開交付完成，也未進入 awaiting external review。

詳盡修改檔、命令／exit、測試數、B01–B20 對照、服務與事件紀錄見 [HANDOFF.md](../HANDOFF.md)。本候選只含 noindex preview；來源未公開、production 未建立、Cloudflare／首頁未開始。M2 必須主代理明確 GO。

## 固定來源與產物

Evidence 根：`C:/Users/<LOCAL_USER>/Documents/Codex/GlossQuote-Labs/.runs/box-fit/20261018-m1-01a14c77/`。

- `source-manifest.json`：完整來源逐檔 bytes／SHA-256，排除 dist／evidence／manifest 本身；摘要在 `source-manifest.sha256`，避免文件與自身摘要循環。
- `candidate-source/`：依 source manifest 凍結的可審查來源副本；`candidate-freeze-verification.json` 核對逐檔相同。
- `changes-from-baseline.json`：相對開工前既有檔案的新增／修改／未變更清單。
- `preview-build-manifest.json`：最終 `dist/manifest.json` 的固定副本；SHA-256 **2da136470d386ed824bb8b381b5f13d4c7409fd06cb77ae2257870c8298f8ab1**。
- final public compact manifest SHA-256：**2d5c7543591eadd202270056add4d2b951c30fb6431c343bb158ad5afd7a8eb1**。
- 最終靜態 preview：`http://127.0.0.1:4213/index.html` 及 `/en/index.html`，PID **70996**；`node.exe scripts/dev.mjs`，cwd 本工具，只綁 loopback。未打開新的 UI。

## 驗證

Node v24.14.0；`npm test` exit 0，48/48；`npm run check` exit 0；`npm run build` exit 0；最終 HTTP 校對 exit 0，13 筆。對應 `npm-*-final.txt`、`final-preview-http.json`、`commands.json`。test/check/build 完全使用 Node built-ins，無安裝、無外部網路依賴。

`browser-evidence.json` 保留兩語 C01、C02 六向並列、C04 無解、七欄錯誤、編輯失效、清除取消／確認、兩語切換取消／確認、初始免確認、320 CSS px 和大數字換行等既有證據。故障 fixture 已實際驗證原 app 初始化失敗保持 disabled、原 bootstrap 同步防提交。synthetic lifecycle handler 清理有證據，但不是真 BFCache。

瀏覽器證據後的唯一產品 code 修正為 core hostile Proxy 自行 revoke 的 catch 邊界；最後離線 oracle 全部重驗，HTML／CSS／UI JS 未改。使用者焦點事件後，最後核心 bytes 的完整 UI 重播沒有進行。所有後續 UI 項一律 **NOT_RUN_USER_FOCUS_INCIDENT**，優先於 browser gate，待主代理重新通知。原生 200% zoom、真機 decimal keyboard、真 BFCache、完整 Network/Storage、AT、離線與額外 runtime reload 均沒有通過證據；實物裝箱不保證。

焦點事件詳見 `ui-focus-incident.json`：最後實際 UI 無直接時間戳，上界 **2026-10-18 08:59:07.3106771 +08:00**；最後輸入 `locator.fill()`，最後讀取 `getAXState()`／唯讀 evaluate。先前曾用 fill/click/press/viewport/導航／截圖，三頁 visible:false，不以 hidden 作安全保證。沒有 pending UI call、未啟動 UI automation 子程序，未為調查再次操作 UI／關閉分頁。

Environment guard 前後 PASS，完整 Snapshots 完全一致；PATH 長度 HKCU 834／HKLM 1227，ephemeral 皆 0，所有 raw hash／registry type／Environment fingerprints／TEMP／TMP 不變。Git publication guard 不適用 M1；未發布／未更動 Git 設定。

## 原始 M0 紀錄（歷史保留）

SPEC_ONLY。M1完成後記錄固定manifest、精確命令/exit、主要雙語UI、人工NOT_RUN；M2另附PUBLIC來源commit、git archive ZIP逐檔hash、production manifest。M3由主代理。
