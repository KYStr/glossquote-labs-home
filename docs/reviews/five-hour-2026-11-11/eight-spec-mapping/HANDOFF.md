# 八份修訂規格的固定來源映射

整合者：local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf。以有效協調任務 labs-five-hour-coordination-20261111-v2 的本人 claim 進行逐位元來源整合。本候選不是產品，不改任何公式或 fixture；後續映射承接者尚未 register/claim/submit，不能把本次整合列為其製作。

## 來源與範圍

| 規格 | 文件 | 來源 commit | 庫存分類 |
| --- | --- | --- | --- |
| wallpaper-calculator | [SPEC](../../../specs/wallpaper-calculator/SPEC.md) | `c2c3f7715023990b1427e052a25c52f1987eaca9` | 既有續作／升級，排除新 ready |
| ping-area-converter | [SPEC](../../../specs/ping-area-converter/SPEC.md) | `c2c3f7715023990b1427e052a25c52f1987eaca9` | 既有續作／升級，排除新 ready |
| breakeven-calculator | [SPEC](../../../specs/breakeven-calculator/SPEC.md) | `dbbf6eea51e5ea88bb58f34983aa915e584889b4` | 去重與獨立 ready 待完成 |
| markup-margin-calculator | [SPEC](../../../specs/markup-margin-calculator/SPEC.md) | `dbbf6eea51e5ea88bb58f34983aa915e584889b4` | 去重與獨立 ready 待完成 |
| tax-included-converter | [SPEC](../../../specs/tax-included-converter/SPEC.md) | `9dde67ee408491dbfcef0cbadbb6a7f1a876bd02` | 去重與獨立 ready 待完成 |
| stock-profit-calculator | [SPEC](../../../specs/stock-profit-calculator/SPEC.md) | `95ead301f8735dede61bc1911bbc7ed6c4b79bb5` | 去重與獨立 ready 待完成 |
| baking-pan-converter | [SPEC](../../../specs/baking-pan-converter/SPEC.md) | `8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927` | 去重與獨立 ready 待完成 |
| savings-goal-calculator | [SPEC](../../../specs/savings-goal-calculator/SPEC.md) | `35b2d302033af86e48337b7019a286180d5e8259` | 既有續作／升級，排除新 ready |

[逐檔來源](SOURCE-BYTES.json) 收錄 32 個原規格檔與原 README，核過固定 Git blob、bytes、SHA-256。README 繼承中央基線，未變更。六個來源維護任務在 r1627 已 accepted；[來源歷史](SOURCE-HISTORY.json) 保留原作者、owner、claim、審查、真正 makers 及主統籌 assembler。

## 映射與驗證

[mapping.json](mapping.json) 按已合併核心精確 schema；document/source 使用 bytes 與 SHA-256 避免 commit 自指，正式 targets 在公開固定候選後加入同一 commit。8 targets 共 72 個未來產品 criteria，逐字出自各自 SPEC。這項映射本身使用 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff 八節文件 rubric。

用 Node 執行本目錄的 [verify.mjs](verify.mjs)，驗證 33 檔 bytes/雜湊與九面向 label。主統籌另核 source tasks 的現行 acceptance。Astra 的八份內容預審與 peer 數值結果為既有證據，本候選沒有重算並冒稱產品執行。

## 接續

1. MAP9 同一承接者的工作先 accepted；以最新 registry 核此映射候選和來源，收到串行時段後由實際承接者 register/claim/readback/start/submit。
2. 非作者 reviewer 對固定 commit 八節逐項評分，每項至少90且必要檢查完成。任何 makers/assembler 不能作獨立 reviewer。
3. 主統籌合法 apply 八份，同ID、原作者、append-only歷史，全部先回 draft。
4. wallpaper/ping 為既有產品接續，savings 為 compound-interest 升級；三份不計新 ready。其餘五份只有去重、完整規格審查與非作者正式 ready 後才計庫存。
5. 產品九面向、隔離瀏覽器、正式 SEO、部署、雙語首頁與外驗另案，本次均 NOT_RUN／NOT_DEPLOYED。

不動桌面、焦點、鍵盤、IME、剪貼簿或原生 dialog；不改原主工作區、Git 設定或任何憑證。所有原 PR、歷史測試與既有 claim 保留。
