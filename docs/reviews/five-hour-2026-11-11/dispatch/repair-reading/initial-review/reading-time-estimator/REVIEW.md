> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：9794b07cfd275ae7a19f3fc7d218687aebc1b46d411dc1666d50030f9795ec4e。

# 閱讀時間估算規格獨立審查

**文件審查 FAIL · 整體 暫不可放行**

審查人 `local-codex:01a1c87c-f8d5-7e92-8aed-25f805df2a6a`，核對到候選作者、owner 和 contributors 均與本人不同。原 task `labs-reading-time-estimator-spec-20261109`，spec `spec-reading-time-estimator-20261109`，候選 `131cea60be513f3790bf3327930c6251fd622569`。登記冊 r1530，讀取時間 2026-11-11 02:54:38 UTC。PR 與 4 份候選檔案逐一核對，詳見遠端讀回（本地證據：../remote-readback.json）。 [固定 PR #254](https://github.com/KYStr/glossquote-labs-home/pull/254)

## 八節

| 必要面向 | 分數 | 結果 | 證據 |
| --- | ---: | --- | --- |
| goal | 98 | PASS | 桌面完整稿、手機錄音前短稿兩種場景，輸出漢字／詞數和兩種時間，並附速度及計數規則。 |
| scope | 97 | PASS | 上限、Unicode 單位、無檔案／頻率／播放都有定義。核對相鄰詞頻、語音朗讀和 legacy 閱讀進度規格，三者各有不同產物。 |
| userFlow | 84 | FAIL | 草稿、範例、編輯、取消、錯誤、重設均可追蹤。兩語 FAQ 的乘法、日文零計數說法會誤導實際使用者。見 READ-01。 |
| inputsOutputs | 97 | PASS | 四組速率端點與欄位順序、兩種 Unicode 單位、25 個分隔字元、精確加總和 JSON 契約都有界線。另跑 NEL／FEFF、混合 token 與 100000 單位。 |
| implementation | 96 | PASS | 靜態 HTML、純核心、Worker 及世代控制可由原生 ESM 與 Node 24 實作。無外部語言服務或持久儲存。 |
| acceptance | 95 | PASS | 九面向都有實測方法，靜讀混合捨入、H:MM:SS、兩語／CSP／離線、真瀏覽器與正式 SEO 均有檢查路徑。 |
| tests | 87 | FAIL | 17 筆 core 與 3 筆狀態 fixture 全數相符。AUTHOR-CHECK 的補充平面手算複製成 U+10000 後不相符，與測例字面不同。見 READ-02。 |
| handoff | 97 | PASS | 固定 SPEC、BRIEF、作者檢查及 fixture。`tools/reading-time-estimator/`、階段、停止條件與原 owner 可追溯。 |

## 字面案例

Node v24.14.0，exit 0，20/20 個相符，64 ms。程式只從固定 fixture 讀輸入，算出結果後才比對作者 expected。 驗算腳本（本地證據：verify.mjs） · 逐筆輸入、獨立預期與實際比對（本地證據：fixture-results.json）

17 個 core／3 個 controller。`mixed-sum-rounding` 的 0.75 + 0.6 = 1.35 秒只進位一次，結果 1 秒。100,001 字元原始值已從固定 blob 完整讀入，輸出保留全字面值。

## 阻擋放行

### READ-01 兩語 FAQ 的時間公式與日文支援說明和核心相反

定位 SPEC.md §tests 兩語 FAQ、§userFlow 零計數說明。

重現輸入

```json
{
  "text": "漢字かな",
  "zhSilentRate": "400",
  "zhSpeakRate": "240",
  "enSilentRate": "200",
  "enSpeakRate": "150"
}
```

觀察結果。 FAQ 說字數乘上每分鐘字數，並把日文本文概括成計數 0。按核心，漢字兩個、英文詞零，靜讀 0 秒、朗讀 1 秒；純假名才零。另以 400 個「字」、400 字/分為例，應是 1 分鐘，乘法無法得出時間。

修正驗收。 中英文 FAQ 改用字數除以速度，並描述按碼點計數。四區段內的日文漢字可計，假名／韓文音節不計。加入混合日文最小案例，重跑字面案例並核對兩語 0 計數說明。

### READ-02 作者手算的字面碼點和固定 fixture 不同

定位 AUTHOR-CHECK.md 的 astral-cjk；fixtures.json 的 astral-cjk。

重現輸入

```json
{
  "text": "𐀀😀好",
  "zhSilentRate": "400",
  "zhSpeakRate": "240",
  "enSilentRate": "200",
  "enSpeakRate": "150"
}
```

觀察結果。 作者手算字串首字與其行內例字均為 U+10000，按規則只得 1 個漢字、朗讀 0 秒。固定 fixture 首字為 U+20000，才有 2 個漢字、朗讀 1 秒。

修正驗收。 AUTHOR-CHECK 使用和 fixture 完全相同的 U+20000 字面，核對 U+10000、U+20000 各自分類。固定 fixture 的正確輸入及 expected 可維持。

### READ-03 可調預設的普遍速率宣稱欠相同口徑的來源

定位 SPEC.md §inputsOutputs 的四預設、§tests 的來源 FAQ；AUTHOR-CHECK.md 的速率依據。

重現輸入

```json
{
  "zhSilentRate": "400",
  "zhSpeakRate": "240",
  "enSilentRate": "200",
  "enSpeakRate": "150"
}
```

觀察結果。 作者將中文靜讀 400–600、朗讀 240–300、英文朗讀 130–160 稱為常見範圍，但未給可查來源或說明文字計數與樣本口徑。實查 Brysbaert 英文資料中，238 wpm 是成人非小說靜讀平均，朗讀平均 183。臺灣有 240–258 字/分的朗讀錄音實驗材料，計入標點且是國中評量用途。

修正驗收。 保留四個產品預設即可，把未證實的一般速率改為可調估算慣例，或補一級來源並註明語料、讀法、計數單位。兩語 FAQ 和作者查核要有同一口徑。

## 非必要改善

- §tests 寫「實際鍵入或合成檔」。驗收可明寫用合成文字貼到 textarea，與 MVP 的貼文工作流一致。

## Production 繼承契約

**REG-01 · FAIL，阻擋 ready。** 登記冊 r1530 的 `spec.acceptanceCriteria` 是原規格製作 task 的八節。前表的文件評分維持獨立。

- 原規格製作 task 的面向。 `goal`、`scope`、`userFlow`、`inputsOutputs`、`implementation`、`acceptance`、`tests`、`handoff`。
- 已登記 spec 的面向。 `goal`、`scope`、`userFlow`、`inputsOutputs`、`implementation`、`acceptance`、`tests`、`handoff`。
- 應繼承的產品面向。 `functionality`、`boundaries`、`privacy`、`security`、`usability`、`accessibility`、`localization-seo`、`toolchain-provenance`、`compatibility`。

由主統籌依維護流程更正登記，保留原規格 task、候選和 owner；讀回相符九面向後才重評 ready/可開工。

## 九項產品檢查

以下是規格已列的未來驗證路徑。產品檢查均為 NOT_RUN，分數均為 null。

| 面向 ID | 文件中的驗證路徑 | 結果 |
| --- | --- | --- |
| functionality | 真實文字估算與下載、混合總秒數一次捨入、跨一小時格式。 | NOT_RUN |
| boundaries | UTF-16 100000/100001、四速度首錯與上下限、三個 controller 案例。 | NOT_RUN |
| privacy | Network/Storage/URL/console 及重設清除稿件。 | NOT_RUN |
| security | 文本 inert、CSP、固定報告、上限、Worker/Blob dispose。 | NOT_RUN |
| usability | 雙語桌面與行動、零計數說明、忙碌／取消／錯誤／修正／下載。 | NOT_RUN |
| accessibility | 鍵盤、焦點、錯誤、狀態回報、320px/200% zoom、對比與觸控。 | NOT_RUN |
| localization-seo | 兩 HTML、同語回鏈、候選 noindex 與正式 canonical/hreflang。 | NOT_RUN |
| toolchain-provenance | Node 24、離線 check/test/build、重建 SHA-256、同一 PR head。 | NOT_RUN |
| compatibility | 隔離 Chrome/Edge、兩語 Worker、Blob 與 reflow。 | NOT_RUN |

## 來源

- 主產物為頻率／排名／篩選與 CSV。 [固定詞頻規格](https://github.com/KYStr/glossquote-labs-home/blob/131cea60be513f3790bf3327930c6251fd622569/docs/specs/word-frequency/SPEC.md)
- 實際語音播放，含語音選擇與播放狀態。 [固定語音朗讀規格](https://github.com/KYStr/glossquote-labs-home/blob/131cea60be513f3790bf3327930c6251fd622569/docs/specs/text-to-speech-reader/SPEC.md)
- 依書本頁數與截止日期輸出逐日頁碼計畫。 [固定既有閱讀進度規格](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/26-reading-plan/SPEC.md)
- 25 個 White_Space code point 與規格相符，包含 U+0085，沒有 U+FEFF。 [Unicode 17.0 PropList](https://www.unicode.org/Public/17.0.0/ucd/PropList.txt)
- U+10000 屬 Linear B。 [Unicode Linear B 碼表](https://www.unicode.org/charts/PDF/U10000.pdf)
- 成人英語非小說靜讀平均 238 wpm、小說 260、朗讀 183。 [Brysbaert（2019）作者校方典藏](https://biblio.ugent.be/publication/8647789)
- 評量錄音口徑是 240–258 字/分，計入標點。只能支持該材料設定。 [臺灣國中 TTS 閱讀研究 Methods](https://link.springer.com/article/10.1007/s11145-025-10738-5)

GitHub 審查登記尚待主統籌分配寫入時段。
