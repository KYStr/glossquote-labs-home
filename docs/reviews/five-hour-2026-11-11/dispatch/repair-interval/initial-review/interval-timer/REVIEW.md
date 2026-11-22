> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：2ce91017328974dd60a4820f6f58a62954b3499c69ce08dc2f1c4600bd5682ed。

# 間歇計時器規格獨立審查

**文件審查 FAIL · 整體 暫不可放行**

審查人 `local-codex:01a1c87c-f8d5-7e92-8aed-25f805df2a6a`，核對到候選作者、owner 和 contributors 均與本人不同。原 task `labs-interval-timer-spec-20261109`，spec `spec-interval-timer-20261109`，候選 `e86816781bc220d184a8c31ad50168730e1b973b`。登記冊 r1530，讀取時間 2026-11-11 03:07:17 UTC。PR 與 4 份候選檔案逐一核對，詳見遠端讀回（本地證據：../remote-readback.json）。 [固定 PR #257](https://github.com/KYStr/glossquote-labs-home/pull/257)

## 八節

| 必要面向 | 分數 | 結果 | 證據 |
| --- | ---: | --- | --- |
| goal | 97 | PASS | 教練桌面編排節目、手機訓練看段落及剩餘秒數，Tabata 型合成例可驗 16 段及 240 秒。 |
| scope | 87 | FAIL | 多段節目與單段 focus-timer、連續節拍 metronome 的工作不同。MVP 是否提供聲音提示的界線和手機情境矛盾。見 TMR-02。 |
| userFlow | 84 | FAIL | 段表、計時、編輯丟棄、重設與段落播報有規定。聲音是手機情境中的使用步驟，未固定產品是否提供或退回視覺。 |
| inputsOutputs | 64 | FAIL | 節目 builder、輸出、有效段界和 ceil 均可核對；同一 blob 的狀態轉換表在第一行截斷。見 TMR-01。 |
| implementation | 48 | FAIL | 固定 SPEC 無 §implementation。BRIEF 與作者檢查提到分層和單調時鐘，沒有完整控制器、計時重基準、資源及隱私契約。 |
| acceptance | 0 | FAIL | 固定 SPEC 無 §acceptance，無九個已預宣告的產品面向、方法與必要證據。 |
| tests | 65 | FAIL | 15 個 builder fixture 按規格吻合。3 個 session、3 個 controller 以作者敘述及 reviewer 模型重放吻合，但缺完整規範及產品測試命令／方法。 |
| handoff | 54 | FAIL | BRIEF 有目標路徑及里程碑，固定 SPEC 缺 §handoff、交驗格式、停止條件與發布責任。 |

## 字面案例

Node v24.14.0，exit 0，21/21 個相符，60 ms。程式只從固定 fixture 讀輸入，算出結果後才比對作者 expected。 驗算腳本（本地證據：verify.mjs） · 逐筆輸入、獨立預期與實際比對（本地證據：fixture-results.json）

15 筆 builder 依固定 SPEC 驗算。3 筆 session 和 3 筆 controller 依殘存的規格、BRIEF 與 AUTHOR-CHECK 的敘述重建，預期全數吻合。完整狀態契約驗證仍是 NOT_RUN。另驗到 199 段最大節目恰為 716,400 秒。

## 阻擋放行

### TMR-01 遠端規格在轉換表截斷，後四節完全缺失

定位 SPEC.md 檔尾，PR 257 固定 e86816781bc220d184a8c31ad50168730e1b973b。

重現輸入

```json
{
  "gitBlob": "f226984a4dc8a755c91f3cf16c05d48e21739143",
  "bytes": 11513,
  "lastLines": [
    "轉換表（未列出的組",
    "...[truncated 8188 chars]"
  ],
  "exampleProgram": {
    "prepareSeconds": "0",
    "workSeconds": "20",
    "restSeconds": "5",
    "rounds": "2",
    "finalRest": "include"
  },
  "events": [
    "start",
    "tick(3000)",
    "skip",
    "tick one second later"
  ]
}
```

觀察結果。 GitHub connector 與本地核對相同 Git blob，只有 goal、scope、userFlow、inputsOutputs。缺正式轉換表、implementation、acceptance、tests、handoff。用作者說明重建，skip 將位置從 3000 移到 20000，休息剩 5 秒。若 controller 下個 tick 照未調整活動鐘送 4000，讀數倒退而保持 5 秒。重定基準後應送 21000，休息剩 4 秒。

修正驗收。 從作者完整來源復原缺漏並發固定新版；明訂事件允許階段、提示、pause/resume、skip 後 controller 時間重定基準、晚到 tick/隱藏回復、驗收九面向、命令與交接。新增 skip 後正常 tick 的最小案例，按完整規格重新核對目前 21 筆與新例。

### TMR-02 手機使用情境依賴提示音，產品範圍沒有決定它是否存在

定位 BRIEF.md MVP；SPEC.md §goal 行動、§scope 非目標與 §userFlow 計時面板。

重現輸入

```json
{
  "scene": "手機放在墊子旁做間歇訓練",
  "program": "10 秒準備、20 秒運動、10 秒休息",
  "event": "segmentStart"
}
```

觀察結果。 §goal 要使用者聽提示音辨識段界，§scope 把播放聲音列為非目標並說交給 controller 決定，剩餘流程只釘視覺和 ARIA。產品無可驗的提示行為。

修正驗收。 復原規格時確認產品本身的段界提示。若聲音屬 MVP，釘版使用者啟動、靜音／不可用時的同等視覺回饋和必要實聽證據。若為純視覺範圍，兩語情境與產品驗收使用視覺段名和狀態，保留純核心 cue。

## Production 繼承契約

**REG-01 · FAIL，阻擋 ready。** 登記冊 r1530 的 `spec.acceptanceCriteria` 是原規格製作 task 的八節。此固定 SPEC 的 §acceptance 本身也缺失。前表的文件評分維持獨立。

- 原規格製作 task 的面向。 `goal`、`scope`、`userFlow`、`inputsOutputs`、`implementation`、`acceptance`、`tests`、`handoff`。
- 已登記 spec 的面向。 `goal`、`scope`、`userFlow`、`inputsOutputs`、`implementation`、`acceptance`、`tests`、`handoff`。
- 依本輪家族基線須復原並釘版的產品面向。 `functionality`、`boundaries`、`privacy`、`security`、`usability`、`accessibility`、`localization-seo`、`toolchain-provenance`、`compatibility`。

先恢復完整 SPEC 和預宣告九面向，再由主統籌依維護流程同步 spec.acceptanceCriteria，保留原規格 task、候選及 owner 並重審。

## 九項產品檢查

固定版缺 §acceptance，以下列出須補齊的家族九面向。產品檢查均為 NOT_RUN，分數均為 null。

| 面向 ID | 需在固定文件補齊的驗證路徑 | 結果 |
| --- | --- | --- |
| functionality | 固定版無驗收節。待復原節目表、跳段、暫停、結束及匯出的必要驗證。 | NOT_RUN |
| boundaries | 固定版無驗收節。待復原 199 段、邊界、倒退 tick 和 skip 後時計。 | NOT_RUN |
| privacy | 固定版無驗收節。待復原零工作請求、Storage、清除與離頁規則。 | NOT_RUN |
| security | 固定版無驗收節。待復原 CSP、Worker/Blob 生命周期、固定檔名與上限。 | NOT_RUN |
| usability | 固定版無驗收節。待復原雙語手機訓練、段名／計時、操作及提示回復。 | NOT_RUN |
| accessibility | 固定版無驗收節。待復原鍵盤、焦點、段界播報、觸控、縮放及 reflow。 | NOT_RUN |
| localization-seo | 固定版無驗收節。待復原雙語頁、同語首頁回鏈與正式 SEO。 | NOT_RUN |
| toolchain-provenance | 固定版無驗收節。待復原離線建置、重建 bytes、Node 命令和固定候選。 | NOT_RUN |
| compatibility | 固定版無驗收節。待復原隔離瀏覽器、可見與隱藏時序、下載及裝置測試路徑。 | NOT_RUN |

## 來源

- 文件本身含截斷標記，和本地 bytes、blob SHA 一致。 [固定間歇計時器 SPEC blob](https://github.com/KYStr/glossquote-labs-home/blob/e86816781bc220d184a8c31ad50168730e1b973b/docs/specs/interval-timer/SPEC.md)
- 固定範圍是一段 1–180 分鐘倒數，無多段表或回合。 [固定專注計時規格](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/07-focus-timer/SPEC.md)
- 輸入 BPM 與節拍，維持連續拍點，沒有結束的運動／休息節目表。 [固定節拍器規格](https://github.com/KYStr/glossquote-labs-home/blob/44c38dfaf95cbe7e61863cb3e6acb8a27f8fb57c/docs/specs/metronome/SPEC.md)
- 計時器回呼排程不保證精確，需由 controller 時間契約定義可觀察行為。 [WHATWG HTML 計時器](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)

GitHub 審查登記尚待主統籌分配寫入時段。
