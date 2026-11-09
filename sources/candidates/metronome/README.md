# 節拍器（WebAudio）· WebAudio Metronome with Tap Tempo

完全在本機瀏覽器運算的節拍器。核心合約只有一句：每一聲點擊都由裝置的
音訊時鐘計算並預先排程，畫面上的計時器只負責觸發排程，永不負責計時——
主執行緒再忙，拍點也不漂移。30–240 BPM（滑桿、數值、± 鈕、點按定速）、
固定拍號清單、每拍 1／2／3／4 細分、第一拍重音、音量控制，點擊全由
振盪器合成，沒有音訊檔案。零 runtime 依賴、不連網、不儲存、不要求任何
權限；設定只在記憶體，重整回到預設。

A metronome that runs entirely in your browser. Its one-sentence
contract: every click time is computed from the device's audio clock
and scheduled ahead; the UI timer exists only to trigger scheduling,
never to keep time — a busy main thread cannot make the beat drift.
30–240 BPM (slider, number, ± buttons, tap tempo), a fixed signature
list, subdivisions of 1/2/3/4 per beat, beat-1 accent, and volume,
with all clicks synthesised by oscillators — no audio files. Zero
runtime dependencies, no network, no storage, no permissions;
settings live in memory only and reload restores the defaults.

## 排程模型 · Scheduling model

- 預覽式排程（lookahead）：每 25 毫秒觸發一次，將 0.12 秒內的事件
  預先排入音訊時鐘；事件時間以 `nextNoteTime += 間距` 累加，公式上
  位在理想格線上，不含計時器抖動。
- 點擊合成：重音 1568 Hz、一般拍 1046 Hz、細分拍 784 Hz，增益
  分別為音量的 1.0／0.7／0.4 倍，每聲在 50 毫秒內結束（故 240 BPM
  × 4 細分的 62.5 毫秒間距不會重疊）。
- 播放中改設定只影響尚未排程的事件；隱藏分頁回來時，過去的事件
  跳過不補播、拍位照常前進，樂曲回到同相位繼續。

- Lookahead scheduling: a 25 ms trigger schedules every event inside
  a 0.12 s horizon; event times accumulate as `nextNoteTime += spacing`,
  so they sit exactly on the ideal grid with no timer jitter.
- Click synthesis: accent 1568 Hz, beat 1046 Hz, subdivision 784 Hz
  at 1.0 / 0.7 / 0.4 × volume, each ending within 50 ms (so the
  62.5 ms spacing at 240 BPM × 4 never overlaps).
- Mid-play changes affect only unscheduled events; after a hidden
  tab, past events are skipped without a catch-up burst while the
  beat counter advances, resuming in phase.

## 點按定速 · Tap tempo

間隔在 2.0 秒內的連續點按視為同一輪；滿 2 次點按起，以最近至多 6 個
間隔的平均換算 BPM（四捨五入，限制在 30–240）。單次點按只開啟一輪。

Taps within 2.0 s of each other form a run; from the second tap, BPM
is the rounded mean of the last up to 6 intervals, clamped to
30–240. A single tap only starts a run.

## 本機執行 · Run locally

```sh
npm run dev     # 本機靜態伺服（public/；file:// 可能限制 AudioContext）
npm test        # node:test 假時鐘排程核心與控制器測試
npm run check   # 專案檢查（結構、CSP、禁用能力、排程格線與點按斷言）
npm run build   # 產生 preview dist（重跑應逐字節相同）
```

Node 24、零 npm 依賴。正式站台網址尚未核准，production build 一律拒絕
（見 `scripts/release.mjs`）。

Node 24, zero npm dependencies. No production site URL has been
approved, so production builds are refused by design (see
`scripts/release.mjs`); the preview build is what this candidate ships.

## 規格 · Specification

實作依 `KYStr/glossquote-labs-home` 的 `docs/specs/metronome/SPEC.md`
（spec PR #35）。驗證證據見 `VERIFICATION.md`，候選凍結清單見
`CANDIDATE-MANIFEST.json`，製作模式見 `PRODUCTION-STATUS.md`。

Built to `docs/specs/metronome/SPEC.md` in
`KYStr/glossquote-labs-home` (spec PR #35). Evidence:
`VERIFICATION.md`; frozen candidate inventory:
`CANDIDATE-MANIFEST.json`; build mode: `PRODUCTION-STATUS.md`.
