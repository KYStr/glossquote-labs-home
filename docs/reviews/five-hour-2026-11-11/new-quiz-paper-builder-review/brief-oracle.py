"""Independent, offline checks of the pinned quiz brief, using synthetic rows only."""

import csv
import hashlib
import io
import json
import sys
from dataclasses import dataclass, replace


HEADER = ("id", "topic", "prompt", "a", "b", "c", "d", "correct")
LETTERS = "ABCD"
BRIEF_CSV = """id,topic,prompt,a,b,c,d,correct
G01,地理,哪一個是島？,蘭嶼,中央山脈,大肚溪,霧峰,A
G02,地理,哪一個是河流？,阿里山,淡水河,澎湖,玉山,B
M01,音樂,以四分音符為一拍時，四分休止符占幾拍？,兩拍,三拍,四拍,一拍,D
M02,音樂,四分音符等於幾個八分音符？,一個,兩個,三個,四個,B
"""


@dataclass(frozen=True)
class Question:
    id: str
    topic: str
    prompt: str
    choices: tuple
    correct: str


def parse_known_valid(csv_text):
    reader = csv.reader(io.StringIO(csv_text, newline=""), strict=True)
    assert tuple(next(reader)) == HEADER
    return [Question(row[0], row[1], row[2], tuple(row[3:7]), row[7]) for row in reader]


def utf16_key(text):
    return text.encode("utf-16-be")


def score(seed, question_id):
    payload = "\n".join(("gq-quiz-v1", seed, question_id)).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def select(rows, seed, quotas):
    """A direct topic-local ranking from the brief, with no dependency on input order."""
    return [
        q
        for topic in sorted(quotas, key=utf16_key)
        for q in sorted(
            (row for row in rows if row.topic == topic),
            key=lambda row: (score(seed, row.id), row.id),
        )[:quotas[topic]]
    ]


def project(rows):
    student = []
    teacher = []
    for number, row in enumerate(rows, 1):
        student.append((number, row.prompt, row.choices))
        teacher.append(
            (number, row.id, row.topic, row.correct, row.choices[LETTERS.index(row.correct)])
        )
    return student, teacher


def exact_size_bank(byte_limit):
    """Use 500 valid rows and ASCII padding, so every extra character is one byte."""
    filler_budget = byte_limit - len(",".join(HEADER) + "\n")
    short_rows = [f"Q{i:03d},Topic,?,a,b,c,d,A\n" for i in range(1, 501)]
    filler_budget -= sum(map(len, short_rows))
    lines = []
    for row in short_rows:
        values = row[:-1].split(",")
        for column, limit in ((2, 500), (3, 200), (4, 200), (5, 200), (6, 200)):
            count = min(filler_budget, limit - len(values[column]))
            values[column] += "x" * count
            filler_budget -= count
        lines.append(",".join(values))
    assert filler_budget == 0
    text = "\n".join([",".join(HEADER), *lines, ""])
    assert len(text.encode("utf-8")) == byte_limit
    questions = parse_known_valid(text)
    assert len(questions) == 500
    assert all(len(row.prompt) <= 500 and all(len(c) <= 200 for c in row.choices) for row in questions)
    return text


def boundaries(rows):
    duplicate_bank = "\n".join([
        ",".join(HEADER), "Q1,Topic A,First?,A1,B1,C1,D1,B", "Q1,Topic B,Second?,A2,B2,C2,D2,C", ""
    ])
    duplicate_rows = parse_known_valid(duplicate_bank)
    assert duplicate_rows[1].id == duplicate_rows[0].id and duplicate_rows[1].topic != duplicate_rows[0].topic
    distinct_topics = [replace(rows[0], id=f"T{i:02d}", topic=f"T{i:02d}") for i in range(1, 32)]
    assert len({row.topic for row in distinct_topics[:30]}) == 30
    assert len({row.topic for row in distinct_topics}) == 31

    enough = [replace(rows[0], id=f"Q{i:03d}", topic="A" if i <= 31 else "B") for i in range(1, 62)]
    got_60 = project(select(enough, "lesson-1", {"A": 31, "B": 29}))
    assert [x[0] for x in got_60[1]] == list(range(1, 61))
    assert len(set(x[1] for x in got_60[1])) == 60
    assert [sum(x[2] == topic for x in got_60[1]) for topic in ("A", "B")] == [31, 29]

    exact_and_over = [exact_size_bank(limit).encode("utf-8") for limit in (524288, 524289)]
    return {
        "source-byte-limits": [
            {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "expectBank": index == 0}
            for index, data in enumerate(exact_and_over)
        ],
        "duplicate-id": {
            "csv": duplicate_bank, "expectError": "global duplicate ID", "record": 3, "column": 1
        },
        "too-many-topics": {
            "rowConstruction": "unique ID and topic T01..T31, all other fields copied from G01",
            "expectBankAt30": True, "expectBankAt31": False, "firstOverLimitRecord": 32,
        },
        "insufficient-topic": {"quotas": {"地理": 3, "音樂": 1}, "available": 2, "expectOutputs": False},
        "total-limit": {
            "bank": "61 valid questions, 31 in A and 30 in B",
            "valid": {"A": 31, "B": 29}, "expectedLastNumber": 60,
            "invalid": {"A": 31, "B": 30}, "expectOutputsAt61": False,
        },
    }


def main():
    rows = parse_known_valid(BRIEF_CSV)
    quotas = {"音樂": 1, "地理": 1}
    lesson_1 = project(select(rows, "lesson-1", quotas))
    assert lesson_1[1] == [(1, "G01", "地理", "A", "蘭嶼"), (2, "M01", "音樂", "D", "一拍")]
    assert lesson_1[0][0] == (1, "哪一個是島？", ("蘭嶼", "中央山脈", "大肚溪", "霧峰"))
    assert project(select(list(reversed(rows)), "lesson-1", quotas)) == lesson_1

    lesson_3 = project(select(rows, "lesson-3", quotas))
    assert lesson_3[1] == [(1, "G02", "地理", "B", "淡水河"), (2, "M01", "音樂", "D", "一拍")]

    answer_changed = [replace(rows[0], correct="B"), *rows[1:]]
    answer_projection = project(select(answer_changed, "lesson-1", quotas))
    assert answer_projection[0] == lesson_1[0]
    assert answer_projection[1] == [
        (1, "G01", "地理", "B", "中央山脈"), (2, "M01", "音樂", "D", "一拍")
    ]

    reordered = [replace(rows[0], choices=("中央山脈", "蘭嶼", "大肚溪", "霧峰"), correct="B"), *rows[1:]]
    reordered_projection = project(select(reordered, "lesson-1", quotas))
    assert reordered_projection[0][0] == (1, "哪一個是島？", ("中央山脈", "蘭嶼", "大肚溪", "霧峰"))
    assert reordered_projection[1] == [(1, "G01", "地理", "B", "蘭嶼"), (2, "M01", "音樂", "D", "一拍")]

    mixed_rows = [
        replace(rows[0], id="PrivateUse", topic="\ue000"),
        replace(rows[1], id="Astral", topic="\U00010000"),
    ]
    mixed_order = [row.id for row in select(mixed_rows, "lesson-1", {"\ue000": 1, "\U00010000": 1})]
    assert mixed_order == ["Astral", "PrivateUse"]

    digests = {
        seed: {q.id: score(seed, q.id) for q in rows}
        for seed in ("lesson-1", "lesson-3")
    }
    assert [digests["lesson-1"][q.id][:8] for q in rows] == [
        "99daada7", "af2294ab", "091965b7", "d3157a50"
    ]
    assert [digests["lesson-3"][i][:8] for i in ("G01", "G02")] == ["bf40a7e4", "b8f8eed7"]

    report = {
        "status": "PASS_PINNED_BRIEF_ONLY",
        "runtime": sys.version.split()[0],
        "digests": digests,
        "lesson-1": lesson_1,
        "lesson-3": lesson_3,
        "answers-only-mutation": answer_projection,
        "manually-swapped-a-and-b": reordered_projection,
        "utf16-topic-order": mixed_order,
        "brief-boundaries": boundaries(rows),
        "candidate": None,
        "productChecks": "NOT_RUN",
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
