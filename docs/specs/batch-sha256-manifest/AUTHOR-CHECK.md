# 作者檢查 — 多檔 SHA-256 清單校驗

2026-11-11 · 規格工作 `labs-batch-sha256-manifest-spec-20261111`。 [研究 brief](BRIEF.md) · [完整規格](SPEC.md) · [字面案例](fixtures.json)

## 固定來源與工作範圍

固定 brief 與 TASK 取自 `KYStr/glossquote-labs-home@14d3dff09fe8f283726a7e8cb9eaadd905500516`，公開 HTTP 讀回均為 200，與派工副本逐 byte 一致。候選中的 `BRIEF.md` 保留這份固定 brief 原始 10,461 bytes。文件候選的範圍為 `docs/specs/batch-sha256-manifest/` 四檔，作者來源發布證據以實際候選 PR 讀回為準。 [固定 brief](https://github.com/KYStr/glossquote-labs-home/blob/14d3dff09fe8f283726a7e8cb9eaadd905500516/docs/specs/batch-sha256-manifest/BRIEF.md) · [固定 TASK](https://github.com/KYStr/glossquote-labs-home/blob/14d3dff09fe8f283726a7e8cb9eaadd905500516/docs/reviews/five-hour-2026-11-11/dispatch/new-spec-batch-sha256-manifest/TASK.md)

查重涵蓋 registry、來源索引及開放 PR。核對單檔 SHA-256 的單檔控制器與單行 hash、重複檔案工具的 keeper／duplicate 分群、PR #111 的純文字路徑政策及樹衝突。使用者從外部清單和所選檔案精確 basename 配對，才可得到本案的缺件、額外、錯值及讀取失敗報告。承接前查核未發現另一件同範圍候選。 [單檔來源](https://github.com/KYStr/glossquote-labs-file-checksum/blob/eab1da8e69e896be00ff1be54095641352a280a7/public/js/controller.mjs) · [分群來源](https://github.com/KYStr/glossquote-labs-duplicate-files/blob/32bae23bcfc9753cb60756ff9ef2381219565f67/public/js/core/analyze.js) · [路徑預檢候選](https://github.com/KYStr/glossquote-labs-home/pull/111)

工作 owner `local-codex:01a1c8b8-117f-76b3-b938-52143fbd2f10`，claim `batch-sha256-manifest-20261111-recovery-claim-20261111T042231Z-01a1c8b8`。完成本人 ACK 及承接讀回後，在 r1588 進入 working。 [固定登記快照](https://github.com/KYStr/glossquote-labs-home/blob/0f7b5e92f23035fe532ae5cdd98a6db65ce00c50/coordination/work-registry.json)

## 已執行的文件驗證

| 命令或動作 | 環境與結果 |
| --- | --- |
| `node evidence/verify-spec.mjs`（在派工區執行，腳本保存在任務證據） | Node v24.14.0，exit 0。3 組已知 SHA-256、55 個批次案例、5 組控制器共 60 步、8 個邊界配方。 |
| PowerShell `[System.Security.Cryptography.SHA256]::Create().ComputeHash` | Windows，exit 0，獨立重算 ASCII `abc`、`hello`、空內容，三值一致。另用 32 個 1 MiB 零塊餵入 .NET `TransformBlock`，所得 digest `83ee47245398adee79bd9c0a8bc57b821e92aba10f5f9ade8a5d1fae4d8c4302` 與 Node 串流重算相同。 |
| 下方 Node 可攜命令 | PowerShell 7 與 Node v24.14.0，exit 0。12 個有效報告的 JSON bytes、實際 SHA-256 與完整八節可重現。 |
| 持久環境指紋 | Windows 專案 guard 前後 exit 0 / `PASS`。HKCU/HKLM PATH 的長度、類型、SHA-256、暫存項目數及完整 Environment key 指紋一致。 |

SHA-256 已知答案用固定 hex 位元組，主案例以逐行資料、選取順序及固定欄位次序構造 JSON。獨立驗算以 Node `createHash`、線性名稱對照及假事件時間序列檢核，正式實作規格採 Map 與瀏覽器 Worker/SubtleCrypto。錯誤預期含全部六欄與 IO 計數。控制器測例逐步比對完整 snapshot、貼上 raw/display、虛擬 Worker、URL 撤銷及下載字串。例中 `unexpected` 的 SHA 與內容讀取次數為零。主案例 compact UTF-8 846 bytes，末尾 LF，SHA-256 `ce2119748c04ce50cb99c49bafdcc470b707edf34f6e5f415bc8d09b9c137fa8`。 [RFC 6234 參考測試](https://datatracker.ietf.org/doc/html/rfc6234#section-8.5)

| 文件 | SHA-256 |
| --- | --- |
| `BRIEF.md` | `b7421e829b695361a74d6707d4ffad13796f2dc663ae71b213b519f06000ec90` |
| `SPEC.md` | `639af18c02d681f29ab6888761765d5b8d79aa6eada7d9f1a1f7d3091cc9eccf` |
| `fixtures.json` | `5b214e3c5d63c7d5de25496612be265a840c1993e1a8ad22279e921548d10f6c` |

## FH-SHA312-01 退修驗證

boundaries 的零讀取條件限於預檢失敗時的待核對檔，並明列配對讀取失敗與全批執行故障。以 Node v24.14.0 重驗獨審最小反例：合法清單與同名 x 檔（hex 616263），注入 digestRejectAtFileIndex=1，先讀取及呼叫 digest（readSelected=[1]、digestSelected=[1]），再回 DIGEST_FAILED，reportUtf8=null。另核對固定的預檢失敗、配對 read_error 續行與 digest 拒絕案例。BRIEF 與 fixtures 保留原 bytes，沿用原離線算術證據。 [固定獨立審查](https://github.com/KYStr/glossquote-labs-home/blob/b5857f2658d5e10d29756a473c935f9b8a48fb89/docs/reviews/five-hour-2026-11-11/spec-review-01/new-sha256-manifest/REVIEW.md)

## 候選目錄內可重跑的檢查

在 `docs/specs/batch-sha256-manifest` 內，以 Node 24 和 POSIX shell 或 PowerShell 7 執行。命令只讀同目錄的三份檔案。

```sh
node --input-type=module -e '
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const hash = data => createHash("sha256").update(data).digest("hex");
const fixtures = JSON.parse(readFileSync("fixtures.json", "utf8"));
assert.equal(fixtures.schemaVersion, 1);
assert.equal(hash(readFileSync("BRIEF.md")), "b7421e829b695361a74d6707d4ffad13796f2dc663ae71b213b519f06000ec90");

for (const item of fixtures.hashAnswers) {
  assert.equal(hash(Buffer.from(item.bytesHex, "hex")), item.sha256);
}
let reportCount = 0;
for (const item of fixtures.batchCases) {
  if (!item.expect.result.ok) {
    assert.equal(item.expect.reportUtf8, null);
    continue;
  }
  const report = item.expect.result.report;
  const bytes = Buffer.from(item.expect.reportUtf8, "utf8");
  assert.deepEqual(bytes, Buffer.from(JSON.stringify(report) + "\n"));
  assert.equal(report.exactMatch, report.rows.every(row => row.status === "match"));
  assert.equal(Object.values(report.counts).reduce((sum, count) => sum + count, 0), report.rows.length);
  for (const row of report.rows.filter(row => row.actualSha256 !== null)) {
    const file = item.input.selected.find(file => file.name === row.name);
    assert.equal(hash(Buffer.from(file.bytesHex, "hex")), row.actualSha256);
  }
  reportCount++;
}
const main = fixtures.batchCases.find(item => item.id === "main-batch");
const bytes = Buffer.from(main.expect.reportUtf8, "utf8");
assert.equal(bytes.length, 846);
assert.equal(hash(bytes), "ce2119748c04ce50cb99c49bafdcc470b707edf34f6e5f415bc8d09b9c137fa8");
const sections = [...readFileSync("SPEC.md", "utf8").matchAll(/^## (\w+) — /gm)].map(match => match[1]);
assert.deepEqual(sections, ["goal", "scope", "userFlow", "inputsOutputs", "implementation", "acceptance", "tests", "handoff"]);
console.log(JSON.stringify({knownHashes: fixtures.hashAnswers.length, reportCount, mainBytes: bytes.length, mainSha256: hash(bytes), sections: sections.length}));
'
```

本次輸出如下。

```json
{"knownHashes":3,"reportCount":12,"mainBytes":846,"mainSha256":"ce2119748c04ce50cb99c49bafdcc470b707edf34f6e5f415bc8d09b9c137fa8","sections":8}
```

## 待獨立查核

請核對固定 PR head、候選 diff 四檔與相對連結，再逐節驗 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。此作者檢查未填獨立分數。九個產品面向在本階段均為 `NOT_RUN`。真實瀏覽器互動、原生選檔／下載、剪貼簿、真機、讀屏、Network／Storage 與部署要保留到各自的產品候選驗證。此階段未使用本機互動介面，受焦點保護限制的項目保留 `NOT_RUN_USER_FOCUS_INCIDENT`。
