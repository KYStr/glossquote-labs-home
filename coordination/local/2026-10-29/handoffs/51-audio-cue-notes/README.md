# 錄音時間戳筆記

Candidate tool in the Gloss Tools family. It helps someone listening to an interview or lesson record a note at the current audio position, return to that point later, and export or re-import the notes without uploading the recording.

English product name: Timestamped audio notes

Candidate domain: audio-notes.glossquote.com, subject to the family release process. M1 is a noindex local candidate and is not a public release.

The candidate handles one local audio file at a time, up to 64 MiB. It can play only formats supported by the current browser; it does not convert audio, transcribe speech, upload files, or claim support for every codec. Notes are limited to 1,000 entries, 2,000 UTF-16 code units per note, and 1 MiB total UTF-8 note text. JSON schema 1 exports notes and manually editable source title and duration metadata, never audio bytes. Note IDs use a canonical 6–12 digit positive counter capped at 999,999,999,999; imports resume after the largest ID. Markdown and JSON exports are each capped at 4 MiB (8 MiB combined), with no partial Blob when an export exceeds its cap.

Use Node.js 24 and built-in modules for offline checks. No npm install, external runtime dependency, browser automation, telemetry, server upload, or network request is part of M1. The six specification files are README.md, PRODUCT.md, TECHNICAL.md, UX-SEO.md, ACCEPTANCE.md, and TASKS.md.
