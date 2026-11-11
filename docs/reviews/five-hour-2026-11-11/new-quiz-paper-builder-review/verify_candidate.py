"""Recompute the pinned quiz specification data and download bytes with Python stdlib."""

import argparse
import base64
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

from html_audit import inspect_download


HEADER = "id,topic,prompt,a,b,c,d,correct"
ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,31}")
SEED = re.compile(r"[A-Za-z0-9_-]{1,32}")
QUOTA = re.compile(r"0|[1-9][0-9]{0,2}")
CONTROL = re.compile(r"[\x00-\x1f\x7f-\x9f]")
SINGLE_LINE = re.compile(r"[\x00-\x1f\x7f-\x9f\u2028\u2029\ud800-\udfff]")
BLANK = re.compile(r"[\x09-\x0d \xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+")
BAD_NEWLINE_OR_NUL = re.compile(r"\x00|\r(?!\n)")
UNQUOTED = re.compile(r'[^",\r\n\x00]*')
QUOTED = re.compile(r'"(?:[^"]|"")*"')
FILES = {
    "AUTHOR-CHECK.md": "2c33e9b18ebe6ed3e217428d2092bc085cef6fece1b4bd6babb580fdbb8d2ca4",
    "BRIEF.md": "5ca1b91cc8f74f965d905b5089d5e29b494096d0b4730862a25d57c8fcdc4e4a",
    "SPEC.md": "9c66fcb640084e97fd6ae24c2888bd0d1c1dbf6765132d13d4ae889cebf4f3a4",
    "fixtures.json": "d90fc4154a8a4d15631933abb8927de3e9ea45d6cfec333320b92ad4f4f22fba",
}


def error(code, scope="source", record=None, column=None, quota=None):
    return dict(code=code, scope=scope, record=record, column=column, quotaIndex=quota)


class Rejected(ValueError):
    def __init__(self, problem):
        super().__init__(problem)
        self.problem = problem


def reject(code, record=None, column=None):
    raise Rejected(error(code, record=record, column=column))


def lex_records(text):
    """Tokenize one record at a time, so earlier field errors beat later lexical errors."""
    index = 0
    record = 0
    while index < len(text):
        record += 1
        if record == 502:
            reject("CSV_ROW_LIMIT", record)
        cells = []
        while True:
            col = len(cells) + 1
            quoted = text[index:index + 1] == '"'
            token = (QUOTED if quoted else UNQUOTED).match(text, index)
            if quoted:
                fragment = text[index:token.end()] if token else text[index:]
                bad = BAD_NEWLINE_OR_NUL.search(fragment)
                if bad:
                    reject("CSV_NUL" if bad.group() == "\x00" else "CSV_NEWLINE", record, col)
                if not token:
                    reject("CSV_QUOTE", record, col)
            end = token.end()
            value = token.group()
            cells.append(value[1:-1].replace('""', '"') if quoted else value)
            marker = text[end:end + 1]
            if marker == ",":
                if col == 8:
                    reject("CSV_WIDTH", record, 9)
                index = end + 1
                continue
            if marker == "\x00":
                reject("CSV_NUL", record, col)
            if marker == "\r" and text[end:end + 2] != "\r\n":
                reject("CSV_NEWLINE", record, col)
            if marker not in ("", "\r", "\n"):
                reject("CSV_QUOTE", record, col)
            if len(cells) != 8:
                reject("CSV_WIDTH", record, len(cells) + 1)
            yield record, cells
            index = end + (2 if marker == "\r" else len(marker))
            break


def source_text(source):
    if source["kind"] == "bytes":
        data = bytes.fromhex(source["hex"])
        if len(data) > 524288:
            reject("SOURCE_TOO_LARGE")
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            reject("SOURCE_UTF8")
    else:
        assert source["kind"] == "paste"
        text = source["text"]
        units = len(text.encode("utf-16-le", errors="surrogatepass")) // 2
        if units > 524288:
            reject("SOURCE_TOO_LARGE")
        try:
            size = len(text.encode("utf-8"))
        except UnicodeEncodeError:
            reject("SOURCE_UNICODE")
        if size > 524288:
            reject("SOURCE_TOO_LARGE")
    text = text.removeprefix("\ufeff")
    if text.startswith("\ufeff"):
        reject("CSV_BOM", 1, 1)
    if not text:
        reject("SOURCE_EMPTY")
    return text


def utf16(s):
    return s.encode("utf-16-be")


def parse_bank(source):
    rows, ids, totals = [], set(), Counter()
    for number, fields in lex_records(source_text(source)):
        if number == 1:
            for column, (actual, wanted) in enumerate(zip(fields, HEADER.split(",")), 1):
                if actual != wanted:
                    reject("CSV_HEADER", number, column)
            continue
        ident, topic, prompt, *choices, correct = fields
        if not ID.fullmatch(ident):
            reject("ID_FORMAT", number, 1)
        if ident in ids:
            reject("ID_DUPLICATE", number, 1)
        if not 1 <= len(topic) <= 60:
            reject("TOPIC_LENGTH", number, 2)
        if SINGLE_LINE.search(topic):
            reject("TOPIC_CONTROL", number, 2)
        if topic.startswith(" ") or topic.endswith(" "):
            reject("TOPIC_SPACE", number, 2)
        if topic not in totals and len(totals) == 30:
            reject("TOPIC_LIMIT", number, 2)
        for col, value in enumerate([prompt, *choices], 3):
            if not 1 <= len(value) <= (500 if col == 3 else 200):
                reject("TEXT_LENGTH", number, col)
            if CONTROL.search(value.replace("\r\n", "").replace("\n", "")):
                reject("TEXT_CONTROL", number, col)
            if BLANK.fullmatch(value):
                reject("TEXT_BLANK", number, col)
        for i, value in enumerate(choices):
            if value in choices[:i]:
                reject("OPTION_DUPLICATE", number, i + 4)
        if correct not in ("A", "B", "C", "D"):
            reject("CORRECT_FORMAT", number, 8)
        rows.append(dict(id=ident, topic=topic, prompt=prompt, choices=choices, correct=correct))
        ids.add(ident)
        totals[topic] += 1
    if not rows:
        reject("CSV_EMPTY_BANK", 2)
    return dict(rows=rows, topics=[dict(topic=t, available=totals[t]) for t in sorted(totals, key=utf16)])


def summarize(bank):
    return dict(questions=len(bank["rows"]), topics=bank["topics"])


def settings_error(bank, settings):
    if (
        set(settings) != {"title", "seed", "quotas"}
        or not all(isinstance(settings[k], str) for k in ("title", "seed"))
        or not isinstance(settings["quotas"], list)
        or len(settings["quotas"]) != len(bank["topics"])
        or not all(isinstance(x, str) for x in settings["quotas"])
    ):
        return error("SETTINGS_SHAPE", "quota")
    if not 1 <= len(settings["title"]) <= 80:
        return error("TITLE_LENGTH", "title")
    if SINGLE_LINE.search(settings["title"]):
        return error("TITLE_CONTROL", "title")
    if not SEED.fullmatch(settings["seed"]):
        return error("SEED_FORMAT", "seed")
    for i, (q, t) in enumerate(zip(settings["quotas"], bank["topics"])):
        if not QUOTA.fullmatch(q):
            return error("QUOTA_FORMAT", "quota", quota=i)
        if int(q) > t["available"]:
            return error("QUOTA_RANGE", "quota", quota=i)
    if not 1 <= sum(map(int, settings["quotas"])) <= 60:
        return error("QUOTA_TOTAL", "quota")
    return None


def outcome(source):
    try:
        return summarize(parse_bank(source))
    except Rejected as e:
        return e.problem


def paper(bank, settings, forced_digest=None):
    assert settings_error(bank, settings) is None
    seed = settings["seed"]
    digests = {
        row["id"]: forced_digest or hashlib.sha256(
            b"gq-quiz-v1\n" + seed.encode("ascii") + b"\n" + row["id"].encode("ascii")
        ).hexdigest()
        for row in bank["rows"]
    }
    picked = []
    for topic, quota in zip(bank["topics"], settings["quotas"]):
        group = [row for row in bank["rows"] if row["topic"] == topic["topic"]]
        picked.extend(sorted(group, key=lambda row: (digests[row["id"]], row["id"]))[:int(quota)])
    student = [dict(number=i, prompt=r["prompt"], choices=r["choices"]) for i, r in enumerate(picked, 1)]
    answer = [
        dict(number=i, id=r["id"], topic=r["topic"], correct=r["correct"], answer=r["choices"]["ABCD".index(r["correct"])])
        for i, r in enumerate(picked, 1)
    ]
    title = settings["title"]
    return dict(student=dict(title=title, questions=student), answer=dict(title=title, answers=answer)), digests


ESCAPE = str.maketrans({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "\r": "&#13;"})


def isolated(text):
    return "<bdi>" + text.translate(ESCAPE) + "</bdi>"


def serialize(document, role, locale, style, policy):
    title = document["title"]
    frame = f'''<!doctype html>
<html lang="{locale}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="{policy}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>{title.translate(ESCAPE)}</title>
<style>{style}</style>
</head>
<body>
<main>
<h1>{isolated(title)}</h1>
'''
    if role == "student":
        questions = []
        for row in document["questions"]:
            choices = "\n".join("<li>" + isolated(c) + "</li>" for c in row["choices"])
            questions.append(
                '<li class="question">\n<p>' + isolated(row["prompt"]) + '</p>\n'
                '<ol class="choices" type="A">\n' + choices + '\n</ol>\n</li>'
            )
        body = '<ol class="questions">\n' + "\n".join(questions) + "\n</ol>\n"
    else:
        labels = (
            ("題號", "題庫 ID", "主題", "正解", "正解文字")
            if locale == "zh-Hant" else ("No.", "Question ID", "Topic", "Answer", "Correct choice")
        )
        heading = "".join(f'<th scope="col">{label}</th>' for label in labels)
        rows = "\n".join(
            f'<tr><th scope="row">{r["number"]}</th>'
            + "".join("<td>" + value + "</td>" for value in (isolated(r["id"]), isolated(r["topic"]), r["correct"], isolated(r["answer"])))
            + "</tr>"
            for r in document["answers"]
        )
        body = f"<table>\n<thead><tr>{heading}</tr></thead>\n<tbody>\n{rows}\n</tbody>\n</table>\n"
    return frame + body + "</main>\n</body>\n</html>\n"


def paste(text):
    return dict(kind="paste", text=text)


def bank_text(lines):
    return "\n".join([HEADER, *lines, ""])


def numbered(count, row_pattern):
    return [row_pattern.replace("{n:3}", str(n).zfill(3)) for n in range(1, count + 1)]


def verify_boundaries(b):
    outputs = {}
    for v in b["sourceBytes"]["variants"]:
        lines = [
            f"Q{i:03},T," + ",".join(("p" * 500, "a" * 200, "b" * 200, "c" * (
                133 + int(i <= 256) + (v["firstRowCOffset"] if i == 1 else 0)
            ), "d", "A"))
            for i in range(1, 501)
        ]
        source = bank_text(lines)
        assert len(source.encode("utf-8")) == v["byteLength"]
        assert outcome(paste(source)) == v["expected"]
    outputs["sourceBytes"] = [v["byteLength"] for v in b["sourceBytes"]["variants"]]
    for v in b["recordCount"]["variants"]:
        assert outcome(paste(bank_text(numbered(v["records"], b["recordCount"]["rowPattern"])))) == v["expected"]
    outputs["recordCount"] = [v["records"] for v in b["recordCount"]["variants"]]
    for v in b["topicCount"]["variants"]:
        got = outcome(paste(bank_text(numbered(v["records"], b["topicCount"]["rowPattern"]))))
        if "topics" in got:
            topics = got["topics"]
            assert len({r["available"] for r in topics}) == 1
            got = dict(questions=got["questions"], topicCount=len(topics), first=topics[0]["topic"],
                       last=topics[-1]["topic"], availableEach=topics[0]["available"])
        assert got == v["expected"]
    outputs["topicCount"] = [v["records"] for v in b["topicCount"]["variants"]]
    draw = b["drawCount"]
    bank = parse_bank(paste(bank_text(numbered(draw["bank"]["recordCount"], draw["bank"]["rowPattern"]))))
    ok, _ = paper(bank, draw["accepted"]["settings"])
    expected = draw["accepted"]
    assert len(ok["student"]["questions"]) == expected["questions"]
    assert len(ok["answer"]["answers"]) == expected["answers"]
    assert [r["number"] for r in ok["answer"]["answers"]] == list(range(expected["firstNumber"], expected["lastNumber"] + 1))
    assert len({r["id"] for r in ok["answer"]["answers"]}) == 60
    assert settings_error(bank, draw["rejected"]["settings"]) == draw["rejected"]["expected"]
    outputs["drawCount"] = [60, 61]
    for item in b["codePoints"]:
        field = item["field"]
        for valid in (True, False):
            value = item["unit"] * item["validCount" if valid else "invalidCount"]
            if field in ("title", "seed"):
                setting = dict(title="T", seed="s", quotas=["1"])
                setting[field] = value
                actual = settings_error(bank, setting)
            else:
                cells = ["Q", "T", "p", "a", "b", "c", "d", "A"]
                cells[HEADER.split(",").index(field)] = value
                actual = outcome(paste(bank_text([",".join(cells)])))
                if "topics" in actual:
                    actual = None
            assert actual == (None if valid else item["expected"]), (field, actual)
    outputs["codePoints"] = len(b["codePoints"]) * 2
    for v in b["outputBytes"]["variants"]:
        lengths = [len(bytes([b["outputBytes"]["fillByte"]]) * v[k]) for k in ("studentBytes", "answerBytes")]
        actual = "ok" if max(lengths) <= 2097152 else error("OUTPUT_TOO_LARGE", "output")
        assert actual == v["expected"]
    outputs["outputBytes"] = len(b["outputBytes"]["variants"])
    for key in ("utf16TopicOrder", "digestTie"):
        c = b[key]
        bank = parse_bank(c["source"])
        if "topics" in c:
            assert [t["topic"] for t in bank["topics"]] == c["topics"]
        model, _ = paper(bank, c["settings"], c.get("digestHex"))
        ids = [a["id"] for a in model["answer"]["answers"]]
        assert ids == c["ids"]
        outputs[key] = ids
    return outputs


def verify(folder):
    for name, digest in FILES.items():
        assert hashlib.sha256((folder / name).read_bytes()).hexdigest() == digest
    fixture = json.loads((folder / "fixtures.json").read_text(encoding="utf-8"))
    css = fixture["htmlContract"]["style"]
    hash_b64 = base64.b64encode(hashlib.sha256(css.encode("utf-8")).digest()).decode("ascii")
    policy = (
        "default-src 'none'; script-src 'none'; connect-src 'none'; "
        "form-action 'none'; base-uri 'none'; style-src 'sha256-" + hash_b64 + "';"
    )
    assert fixture["htmlContract"]["styleSha256Base64"] == hash_b64
    assert fixture["htmlContract"]["csp"] == policy
    checked_files, models, summary_reference_differences, successes = {}, {}, {}, []
    for c in fixture["successCases"]:
        bank = parse_bank(fixture["sources"][c["sourceRef"]])
        assert summarize(bank) == fixture["bankSummaries"][c["bankRef"]], c["id"]
        if bank != fixture["banks"][c["bankRef"]]:
            summary_reference_differences[c["id"]] = {
                "observedIds": [r["id"] for r in bank["rows"]],
                "referenceIds": [r["id"] for r in fixture["banks"][c["bankRef"]]["rows"]],
                "observedFirstCorrect": bank["rows"][0]["correct"],
                "referenceFirstCorrect": fixture["banks"][c["bankRef"]]["rows"][0]["correct"],
            }
        model, digests = paper(bank, c["settings"])
        assert model == fixture["papers"][c["paperRef"]], c["id"]
        rows = model["answer"]["answers"]
        ids = [a["id"] for a in rows]
        if c["bankRef"] == "sample":
            rank = fixture["ranking"][c["settings"]["seed"]]
            assert digests == rank["digests"] and ids == rank["selected"]
            assert [x["topic"] for x in bank["topics"]] == rank["topicOrder"]
        for role, ref in c["files"].items():
            file = fixture["htmlFiles"][ref]
            actual = serialize(model[role], role, c["locale"], css, policy)
            assert actual == file["utf8"], ref
            parsed = inspect_download(actual, c["locale"], "teacher" if role == "answer" else "student")
            assert parsed["bytes"] == file["byteLength"] and parsed["sha256"] == file["sha256"], ref
            assert file["filename"] == fixture["htmlContract"]["filenames"][role]
            assert file["mime"] == "text/html;charset=utf-8"
            checked_files[ref] = {k: v for k, v in parsed.items() if k != "bodyText"}
        models[c["id"]] = model
        successes.append({"id": c["id"], "numberIdChoiceText": [[a["number"], a["id"], a["correct"], a["answer"]] for a in rows],
                          "studentSha256": checked_files[c["files"]["student"]]["sha256"],
                          "answerSha256": checked_files[c["files"]["answer"]]["sha256"]})
    assert set(checked_files) == set(fixture["htmlFiles"])
    changed = models["correct-only-changes-answer"]
    assert changed["student"] == models["sample-zh"]["student"]
    assert changed["answer"]["answers"][0] == dict(number=1, id="G01", topic="地理", correct="B", answer="中央山脈")
    assert len({case["studentSha256"] for case in successes if case["id"] in {
        "sample-zh", "correct-only-changes-answer", "reversed-bytes-equal", "quoted-header-bom-mixed-endings"
    }}) == 1
    base = fixture["sources"]["sample"]["text"]
    manually_swapped = base.replace("蘭嶼,中央山脈,大肚溪,霧峰,A", "中央山脈,蘭嶼,大肚溪,霧峰,B")
    assert manually_swapped != base
    extra_bank = parse_bank(paste(manually_swapped))
    extra, _ = paper(extra_bank, fixture["successCases"][0]["settings"])
    assert extra["student"]["questions"][0]["choices"] == ["中央山脈", "蘭嶼", "大肚溪", "霧峰"]
    assert extra["answer"]["answers"][0] == dict(number=1, id="G01", topic="地理", correct="B", answer="蘭嶼")

    errors = []
    for c in fixture["errorCases"]:
        if c["stage"] == "parse":
            got = outcome(c["input"])
        else:
            assert c["stage"] == "settings"
            got = settings_error(fixture["banks"][c["input"]["bankRef"]], c["input"]["settings"])
        assert got == c["expected"], (c["id"], got, c["expected"])
        errors.append(dict(id=c["id"], independentlyDerived=got))
    for name, bank in fixture["banks"].items():
        assert parse_bank(fixture["sources"][name]) == bank
        assert summarize(bank) == fixture["bankSummaries"][name]

    return dict(
        candidate="e9e973c14f74f6fb7ca10042355cd7c90ffb481e",
        successes=successes, errors=errors, fullDownloads=checked_files,
        boundaries=verify_boundaries(fixture["boundaryCases"]),
        manualSwap=extra["answer"]["answers"][0], summaryReferenceDifferences=summary_reference_differences,
        productChecks="NOT_RUN",
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("candidate_dir", type=Path)
    options = parser.parse_args()
    print(json.dumps(verify(options.candidate_dir), indent=2))
