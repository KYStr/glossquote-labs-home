# Credit Card Payoff Calculator （信用卡還款試算）

輸入信用卡欠款餘額與年利率 APR，試算每月固定還款要多久還清、總利息多少，或在目標月數內還清每月要繳多少；含永遠還不完（每月還款不超過每月利息）的偵測。單張卡、單一固定 APR、月結循環利息模型：利息每月按月初餘額以整數分 half-up 計算，目標月數模式以 BigInt 精確年金公式反推月付並以同一模擬驗證。全部計算在本機 Worker 內完成，不連銀行、不上傳、不儲存。

Enter a card balance and APR to see how long a fixed monthly payment takes to clear it, the total interest, or the payment needed to finish within a target number of months — including never-payoff detection. All computation runs locally in a Worker; nothing is uploaded or stored.

## Commands

- `npm test` — Node test suites (core fixtures, controller states, pages, embedded worker).
- `npm run check` — static project check (structure, pinned page copy, CSP, i18n parity, core spot checks).
- `npm run build:preview` — build the noindex preview into `dist-preview/` (embeds the fixed core source for the Worker).
- `npm run check:generated:preview` — verify `dist-preview/` matches a fresh preview build byte for byte.
- `npm run serve` — serve `dist-preview/` on 127.0.0.1:4173 (`--host`, `--port`, `--dir` supported).

Zero runtime dependencies; Node >= 24. See HANDOFF.md and VERIFICATION.md for provenance and evidence.
