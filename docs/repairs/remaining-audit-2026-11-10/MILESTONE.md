# R3 external audit repairs — 2026-11-10

Task `labs-remaining-audit-repair-20261110`; primary actor `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf`. Input ZIP SHA256 `280f9d1c6ae082a0e74f3c9b9ba9d01651d1a179b66c035b2a7cc3d9b9ea7e5e` (693 files/692 manifest rows). Source baseline `328dee40ef0de631d7d50a443e5d5eb2e7668164`, current inspection release candidate `e9eb54813a55bd9f0a04b703ecbccee8c2510f4d`; preserve all previous repair history.

## Scope and outcome

Repair FUNC-R3-01 percentage async DOM completion and FUNC-R3-02/R3-03 overtime monthly aggregation and own-data validation. Keep 140 inspection sites, 47 historical formal sites and noindex/CSP/host routes unchanged. Existing TTS/Fluid fixes have external confirmation in this input and must remain intact. No new tools, formal promotion or unrelated SEO redesign. SEO-01, SEO-03, rent optional Blob Worker restriction and full device/network/domain acceptance remain separately recorded.

## Percentage contract

All actual worker completion paths must notify/render exactly through a shared completion route: success, validation error, onerror, constructor/post failure. Preserve generation checks and prevent stale completion/error after reset/edit/cancel/new run. Worker errors bind to the worker/generation that produced them, not the current job. Reproduce original built-app failures; tests exercise actual built app + controlled transport and visible DOM state, not core tests alone. No arithmetic/report changes unless a proven coupled defect.

## Overtime contract correction

Keep monthly aggregation purpose; replace ambiguous total-hour fields with individual daily records. Input is exactly `{monthlySalary,month,entries}`, month strict YYYY-MM (years 1900–2100), entries dense array 1–31, each exactly `{date,kind,hours}`. Date is valid civil YYYY-MM-DD in chosen month, unique; kind is weekday/restDay/holiday selected by user, never inferred from weekday. Hours decimal strings in 0.5h steps: weekday 0–4, restDay/holiday 0–12; zero allowed. Salary retains 1–99999999 integer syntax. Reject legacy aggregate schema rather than silently interpreting it.

Use pure civil date validation, no timezone/network/calendar service. UI adds/removes rows, visible date/type/hours labels and per-row errors, month/salary fields, bilingual copy/FAQ/report/SEO explaining daily input and monthly sum. Preserve state invalidation, reset/cancel and bounded worker behavior; deep-copy nested draft snapshots. No storage or native dialogs.

Compute every day separately: monthly salary/240 hourly basis; weekday first2h 4/3 then2h 5/3; restDay first2h 4/3,next6h5/3,next4h8/3; eligible unshifted holiday attendance up to8h earns extra salary/30 per day, extra2h4/3,next2h5/3. Exact BigInt rational arithmetic, each daily subtotal half-up whole NTD then category/month sums (explicit estimate rounding assumption, not statutory rounding claim). Result includes daily date/kind/hours/bands/pay, category subtotals, total, counted overtime (weekday + restDay + holiday beyond8h) and reachable >46h informational warning. State simple normal8h/monthly240h assumptions and exceptions; not a complete labor-law compliance engine. Update current SPEC/fixtures with traceable correction; original spec commit remains provenance.

Validate own data descriptors on input/entries/rows, reject accessors before any field reads; reject unknown fields/symbols/sparse arrays and malformed prototypes. Getter counters stay zero; no claim of generic Proxy trap immunity. Core errors carry row index where appropriate.

Independent literal examples: salary36000, three different weekdays at1h =>600; one weekday3h=>650. Two different eligible holidays1h each=>2400; one holiday2h=>1200. Two restDays1h each=>400 versus one restDay2h=>400 (tier boundary control). Distinct dates ensure day separation; duplicate dates reject. Twelve weekday4h records=>48 counted hours and warning; 46/46.5 boundary. Calendar month/leap/day bounds,31/32 rows,0/max, getter/nested accessor, rounding, stale jobs, row edit/removal/reset and report determinism.

Official sources checked 2026-11-10: https://calcr2.mol.gov.tw/Monthly ; https://calcr2.mol.gov.tw/Index ; https://www.mol.gov.tw/1607/28690/2282/2284/2290/7154/post . These substantiate daily tiers, extra holiday day wage and limited normal monthly/hourly assumptions, not complete legal applicability.

## Fixed maintenance acceptance aspects

`source-provenance`: exact input/source/current release, original failures and scopes verified. `defect-resolution`: actual built-app percentage four failure paths and daily overtime/descriptor cases pass, coupled tests/check/build pass. `release-security`: no credential/settings drift, unchanged routes/CSP/noindex and other138 sites verified. `bilingual-release`: both affected languages rendered in isolated remote browser, functional fixture/remote interaction evidence explicit, actual deployed assets/header/links match frozen candidate. `delivery-integrity`: one ZIP with two complete sources, revised docs, status, input, evidence, SHA256/bytes/safe paths/relative links, independently verified. Non-author reviewer scores all >=90 against same candidate; full native/device/network and external retest remain distinct NOT_RUN. Source candidate PR precedes independent review; verified maintenance inspection deployment remains authorized, no formal product acceptance implied.

## Execution boundaries

Use two bounded implementation agents requested gpt-6.1-sol/medium, no recursive delegation. Separate `implementation-percentage/**` and `implementation-overtime/**`; primary alone writes shared release/GitHub/registry. Stop/report source mismatch, conflicting ownership, missing needed authorization, credential/settings drift, or repeated failure without progress. Agents must provide diff, commands/exit/results, remaining gaps and risks. No desktop/local UI/IME/clipboard operations; offline Node and remote isolated browser only. No installs/fees/global auth or persistent environment modifications. Preserve user changes and old evidence. Primary reviews actual diff, runs independent cases, publishes exact candidate, gets non-author review, deploys free existing inspection Worker, updates bilingual inspection directory and provides one ZIP.
