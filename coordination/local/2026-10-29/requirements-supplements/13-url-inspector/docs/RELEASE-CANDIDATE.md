# 網址參數檢視與整理發布候選

狀態：已上線，待外部複驗。主對話已完成2026-10-12正式工具/雙語首頁發布與有界驗收；本功能對話只記錄主代理來源，沒有代稱親跑正式站。人工缺口與外部確認仍未完成。

**來源封裝更正（AUDIT-13-SOURCE-ZIP）：下方旧352394... ZIP只保留失敗歷史，不能部署/交付。有效包為`.runs/url-inspector/url-inspector-source-c5f21708-lf-02.zip`，SHA256 `0df8cb23e000d153c73ed238b02c179f7a126a7ae8d83ea4d5a41bb84141c308`。固定commit仍c5f21708b0630e703b4cf5b6bbdb2a2899726f8c，42/42來源manifest+43/43遠端Gitblob及解壓bytes核對PASS；從此實際ZIP的check/build:production/check:production exit0，production manifest仍be2871abc81b6c7bc2aaa2c5373c45d0a7b27b0aace439faee85152b540b2130。**

- 實作：雙語本機URL工作區、精確raw query編輯、移除/新增/常見追蹤選取、copy/nativeTXT與revision/lifecycle已實作；零runtime依賴。
- test/check/build：23個Node測試PASS/exit0；語言提醒修後ui-contract單測PASS/exit0；check、preview/production build與check:production PASS/exit0。Node24.14.0/npm11.9.0。
- 真Chrome/Edge主流程、raw保留/界線/錯誤/clear/copy：PASS；實際下載bytes：PASS。完整Keyboard/Edge320CSS/200%/Network/Storage等仍PARTIAL/NOT_RUN，見[逐層報告](TEST-RESULTS.md)，不能稱28案全部通過。
- GitHub：https://github.com/KYStr/glossquote-labs-url-inspector；owner KYStr、visibility PUBLIC，default branch codex/url-inspector-v1。固定實作來源commit c5f21708b0630e703b4cf5b6bbdb2a2899726f8c，gh repo view及git ls-remote HEAD/branch已實際核對相同。後续僅交接文件更新的HEAD另見HANDOFF，不改此ZIP實作版本。
- Hosting：主代理正式部署PASS；實作c5f21708b0630e703b4cf5b6bbdb2a2899726f8c，Cloudflare version b0af355e-a06b-4ce7-b72d-5d4f28ca15d0。
- 主代理獨立驗收：有界PASS（core/scaffold/UI、來源ZIP/發布產物、正式HTTP/SEO/404/Chrome兩語主要操作、雙語首頁整合）；完整Network/Storage/設備等manual項仍未驗，非全面放行。
- 外部驗收：NOT_RUN；版本未完成。

T05填入固定commit與sha、实际命令、案例/證據檔、資產包、已知風險及主代理需補的驗證；不得直接刪未驗項。此文件本地相對引用[發布規範](RELEASE.md)及[HANDOFF](../HANDOFF.md)。

正式網址（主代理已驗上線）：https://urls.glossquote.com/index.html / https://urls.glossquote.com/en/index.html。依固定Wrangler assets-only配置部署dist，沒有server運算；正式操作及驗收由主對話依既有授權執行。功能對話沒有讀部署token/改DNS/部署。

最新production asset-manifest SHA256：be2871abc81b6c7bc2aaa2c5373c45d0a7b27b0aace439faee85152b540b2130；preview：9f41deb95a1444d975d75ab1f641d3e5bdbf53148a7678a094a7870e8748a17e。build可重現，12檔精確allowlist；拒絕unsafe ancestor/hardlink/stale檔。舊README/規格開頭保留派工前歷史，不替代本紀錄。

外部回報請提供：來源commit/正式URL與語言、瀏覽器與裝置/zoom、對应U案例、假輸入、預期/實際、重現步驟、可公開的截圖；勿提供真token或私人URL。錯誤仍回THREAD-13-url-inspector原功能對話修正。

## 固定來源包與主代理交接（上線前歷史）

- git archive固定commit生成43個本工具來源/規格/config/test檔：孵化器根 `.runs/url-inspector/url-inspector-source-c5f2170.zip`；SHA256 352394b60250b26665c3768fbfe0dc9cfd784fec3e563b5bd0e3539d592bab88。ZIP不含dist、node_modules、.runs、憑證、其他工具。zip內RC保留當時publication pending歷史；此後docs-only提交記錄核實結果。
- reviewed copy：根 `.runs/github-publish/glossquote-labs-url-inspector/`；42檔source manifest+manifest本身共43檔，publishing-copy-hashes-01.json逐檔核對來源一致。copy內check/build:production/check:production exit0，產物manifest與本工具be287...一致。
- 主代理已固定snapshot親跑core14+獨立2案、scaffold boundary4/build；修後controller+ui2與previewbuild、兩語header disclosure，以及Chrome/Edge真native43byte假fixture下載（其SHA52dbaeea3d6f526cbaa75c7613568b9a8a115065ef26231599a604a588c6885c）。這些是有界驗收，未補完整Network/Storage/320/200或正式Cloudflare。
- 下一步：主對話以本固定來源/產物補有界獨立驗收與必要人工缺口、序列免費Cloudflare部署、正式HTTP/頁面/Network驗證，再更新並部署首頁兩語catalog。已有授權，沒有要求重新批准。只有之後外部確認才稱版本完成。

## 封裝修復與最新補驗

2026-10-12主代理從舊ZIP發現CRLF/.gitignore 49bytes，而remote blob為44bytes LF。已核實Git安裝層設定core.autocrlf=true，原git archive未套用單次override。舊ZIP43/43檔都與remote bytes不同，先前ZIP hash只證明封裝本身、不能證明來源bytes；該交付PASS主張撤回，舊包不覆寫保留。

新命令（在獨立publishing copy）：`git -c core.autocrlf=false archive --format=zip --output=<new-absolute-path.zip> c5f21708b0630e703b4cf5b6bbdb2a2899726f8c`。沒有修改Git安裝/使用者設定或任何Windows持久環境。新包commit comment、entry集合、42檔SHA256、43個SHA1 Gitblob/size及實際解壓bytes全部通過；remote tree由gh api單獨取得。沒有改主代理stage或acceptance腳本，也沒有改public產品程式。

證據（孵化器根.runs/url-inspector）：zip-audit-results-02.json、zip-audit-remote-tree-02.json、verify-source-zip-02.py、zip-stage-{check,build-production,check-production}-02.log及zip-lf-stage-02/。公開commit內SOURCE-MANIFEST本身無錯，只有artifact封裝與交接指標修復。

鍵盤補驗已在安全點停止以優先本確定缺陷：source/inspect/edit/remove/raw/add/delete/tracking/generate以鍵盤操作並得到expected；剪貼簿工具核對兩次不一致（UI已報copied），原因尚未建立，未稱全流程PASS；download及反向Tab clear未完成。單獨record為PARTIAL/VERIFY_FAIL，私證keyboard-supplement-partial-01.json，請主代理在獨立環境核對。早前及主代理的native/copy用例PASS仍保留為不同fixture證據；這不是實際permission-denial/race或完整鍵盤放行。

## 主代理正式發布紀錄（2026-10-12）

證據來源：主對話實際回報與孵化器`tool-projects/review-packages/2026-10-12-url/00-STATUS.md`，本對話已讀；不是功能對話重新測量。外驗包已存在，含01-EXTERNAL-CHECKLIST、修正版source-c5f21708.zip及發布/HTTP/瀏覽器等證據。公開repo獨立自包含，外驗包由主對話另交付。

- 工具：11公開assets/30HTTPresponses bytes、headers、MIME、SEO、404、UA變體PASS；Cloudflare version b0af355e-a06b-4ce7-b72d-5d4f28ca15d0，production manifest be2871abc81b6c7bc2aaa2c5373c45d0a7b27b0aace439faee85152b540b2130。
- 真Chrome正式zh移除utm_source，保留tag重複、a+b、%2f與fragment，改source清空舊output並停用copy/download；en範例追蹤移除PASS。兩語JSON-LD url各等同同頁canonical/inLanguage；DOM script集合沒有額外analytics，但不能代替完整Network PASS。
- 首頁：PUBLIC source3cc725927fd9b60983f771b824223d6f5fa1d325；Cloudflare version22519ef6-ed78-4fab-bf76-d8a8c3f13425。12/12 tests/check/build/dryrun、5公開assets/21HTTP PASS；兩語實際11工具入口、同語往返PASS，Bill仍draft不渲染。
- 剪貼簿有界補驗：主代理用相同50字expected URL、先設受控fake baseline，分別click與Enter複製，已複製狀態後同batch讀值兩輪exactmatch、baseline=false，PASS。未重現完整原鍵盤edit/add/delete鏈，根因未知舊觀察保留；不改為完整keyboard PASS。
- 完整Network/Storage/hidden回復、完整鍵盤鏈/200%/Edge320CSS/AT/實體touch、實際permission拒絕/競態等仍NOT_RUN/PARTIAL。正式站本輪未重做native下載，沿用同runtime既有主代理Chrome/Edge實際43byte證據。
- 下一步為使用者/外部複驗及必要原chat修正；不得把尚無外部確認寫成complete。依主對話要求，本次最小文件公開後釋放owner並停止等待循環。
