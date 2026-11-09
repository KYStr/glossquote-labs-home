# 血型相容查詢規格來源調查

**維持 `BLOCKED_SPEC_TRUNCATED`。** 本輪查詢範圍內，唯一包含該 `SPEC.md` 的固定版本仍在第 41 行截斷，沒有找到完整且經獨立審查的同份規格。 [機器可讀證據](blood-spec-recovery.json)

- 規格 PR #172 仍為 open draft，只有一個 commit `27343e5d448ef476ba11f09697a8c5f9b30a77e0`。同一路徑的歷史也只有該 commit。SPEC blob `aa6b85cf87270ae1d383c95f160ade71afd67713` 為 4,924 bytes、41 行，只包含 `goal`、`scope` 與未完的 `userFlow`。末行是 `...[truncated 13571 chars]`，後續五節缺失。規格 PR 的 review、inline review comments 和 issue comments 均為零。 [規格 PR](https://github.com/KYStr/glossquote-labs-home/pull/172) · [固定規格第 41 行](https://github.com/KYStr/glossquote-labs-home/blob/27343e5d448ef476ba11f09697a8c5f9b30a77e0/docs/specs/blood-type-compatibility/SPEC.md#L41)
- 共用分支兩次固定讀回 `4f61bc169bbe74607f8a0d8f8a9cafe86d9de807`、`73f3eb79c561bfdc2d5fa829b9dfb11216096874` 均無規格目錄，該路徑 GitHub commit history 都為零。後一次讀回 registry r1374 的規格 task 仍為 reviewing，候選仍固定在 `27343e5d…`，acceptance 為 null。 [固定 registry](https://github.com/KYStr/glossquote-labs-home/blob/73f3eb79c561bfdc2d5fa829b9dfb11216096874/coordination/work-registry.json)
- Production PR #217、該 PR 明列的 build base、registry 的 README 來源、維護分支本次讀回都沒有該規格目錄。#217 的 PR、HANDOFF 與 VERIFICATION 均只引用同一截斷版本，記錄從 brief、fixtures、作者查核及樣板推補缺失部分。#217 的 review、inline review comments 和 issue comments 均為零。 [產品 PR](https://github.com/KYStr/glossquote-labs-home/pull/217) · [固定交接](https://github.com/KYStr/glossquote-labs-home/blob/b667d1f59bf41bf320545b63cfa9c1aa37294d8b/tools/blood-type-compatibility/HANDOFF.md)

解除條件是可追溯的完整同份規格 commit，以及精確對應該版本的非作者審查。
