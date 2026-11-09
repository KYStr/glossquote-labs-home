# JWT 解碼與主張檢視 · JWT Decoder and Claims Inspector

完全在本機瀏覽器運算的 JWT 檢視工具：貼上三段式 token，立即看到標頭與酬載的
JSON、exp／nbf／iat 時間主張的本機時間換算與相對說法，以及對照裝置時鐘的
時間狀態。**本工具只解碼，永遠不驗證簽章**——畫面上不會出現任何「這份 token
是真的」式樣的肯定字眼，因為任何人都能偽造未經驗證的內容。零 runtime 依賴、
不連網、不儲存，token 不寫入網址，關閉分頁後不留任何東西。

A JWT inspector that runs entirely in your browser. Paste a three-part
token to see its header and payload JSON, the exp / nbf / iat time claims
translated into local times with relative phrasing, and a time status
stated against the device clock. **This tool decodes only — it never
verifies the signature** — and its wording never affirms that a token is
genuine, because unverified contents can be forged by anyone. Zero
runtime dependencies, no network, no storage; the token never enters
the URL, and closing the tab discards everything.

## 功能 · Features

- 嚴格 base64url 解碼（自製解碼器，非 atob）：字母表外的字元、錯位的
  padding、長度 mod 4 為 1 都以「哪個部分、第幾個字元」明確報錯。
- 標頭摘要（alg／typ／kid）與酬載主張表：時間主張附本機時間、UTC 與
  相對說法（單一最大單位制：滿 48 小時以天計、滿 120 分鐘以小時計）。
- 時間狀態四種：已過期／尚未生效／位於主張的時間窗內／沒有時間主張，
  一律陳述為「主張對裝置時鐘」，exp 恰等於現在即算已過期。
- 五段式輸入辨識為 JWE 並說明不解密；簽章段顯示原文與位元組數，其下
  固定註明「本工具未驗證此簽章」。
- 每欄 JSON 可按鈕複製，複製內容與畫面顯示逐字節相同。

- Strict base64url decoding (in-repo decoder, not `atob`): characters
  outside the alphabet, misplaced padding, and mod-4-equals-1 lengths
  are reported with the part and the character position.
- Header summary (alg / typ / kid) and a claims table: time claims get
  a local time, the UTC instant, and a relative phrase in a single
  largest unit (whole days from 48 h, whole hours from 120 min).
- Four time statuses — EXPIRED, NOT YET VALID, WITHIN STATED WINDOW,
  NO TIME CLAIMS — always worded as claims versus the device clock;
  exp exactly equal to now is EXPIRED.
- Five-part input is recognised as a probable JWE and explained, not
  decoded; the signature segment shows its encoded text and byte
  length under the fixed note "Signature is not verified by this tool."
- Per-pane copy buttons copy exactly the displayed pretty JSON.

## 範例 token · Sample token

規格 §4 的合成範例（簽章段是假字串，不是真正的 HMAC）：

The synthetic fixture from section 4 of the specification (its
signature segment is a dummy string, not a real HMAC):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMzQiLCJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjoiZ2xvc3NxdW90ZS1sYWJzIiwiaWF0IjoxNzYyMDAwMDAwLCJuYmYiOjE3NjIwMDAwMDAsImV4cCI6MTc2MjAwMzYwMCwianRpIjoiZml4dHVyZS0wMDAxIiwic2NvcGUiOiJyZWFkOmRlbW8ifQ.ZHVtbXktc2lnbmF0dXJlLWZvci1maXh0dXJlLW9ubHk
```

## 本機執行 · Run locally

```sh
npm run dev     # 本機靜態伺服（public/）
npm test        # node:test 核心與控制器測試
npm run check   # 專案檢查（結構、CSP、禁用能力與肯定字眼掃描、規格 fixture）
npm run build   # 產生 preview dist（重跑應逐字節相同）
```

Node 24、零 npm 依賴。正式站台網址尚未核准，production build 一律拒絕
（見 `scripts/release.mjs`）。

Node 24, zero npm dependencies. No production site URL has been
approved, so production builds are refused by design (see
`scripts/release.mjs`); the preview build is what this candidate ships.

## 規格 · Specification

實作依 `KYStr/glossquote-labs-home` 的 `docs/specs/jwt-decoder/SPEC.md`
（spec PR #33）。驗證證據見 `VERIFICATION.md`，候選凍結清單見
`CANDIDATE-MANIFEST.json`，製作模式見 `PRODUCTION-STATUS.md`。

Built to `docs/specs/jwt-decoder/SPEC.md` in `KYStr/glossquote-labs-home`
(spec PR #33). Evidence: `VERIFICATION.md`; frozen candidate inventory:
`CANDIDATE-MANIFEST.json`; build mode: `PRODUCTION-STATUS.md`.
