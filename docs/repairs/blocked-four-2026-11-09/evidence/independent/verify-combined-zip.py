import csv
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
import stat
import sys
from urllib.parse import unquote, urlsplit
import zipfile

archive = Path(sys.argv[1])
prior_root = Path(sys.argv[2])
sha = lambda data: hashlib.sha256(data).hexdigest()
candidate = "df37047f963e0f06044e0136448c70c95aa58a2e"
source = "541a0cd73fd24fc3536501793d551bfa81f63524"
version = "e43d1822-dcbc-493e-b9d3-a85c25c53322"
repaired = {"word-frequency", "text-to-speech-reader", "fluid-typography", "svg-to-png-converter"}
blocked = {"video-to-audio", "audio-transcription"}
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    names = {}
    folded = set()
    for info in z.infolist():
        name = info.filename.rstrip("/")
        parts = name.split("/")
        assert all(part and part not in {".", ".."} and not part.endswith((" ", ".")) for part in parts), name
        assert not re.search(r'[\\:*?"<>|\x00-\x1f]', name), name
        assert not any(re.fullmatch(r"(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?", part, re.I) for part in parts), name
        assert not stat.S_ISLNK(info.external_attr >> 16), name
        assert not (info.flag_bits & 1), name
        assert name.casefold() not in folded, name
        folded.add(name.casefold())
        if not info.is_dir():
            names[name] = info
    assert [name for name in names if PurePosixPath(name).name == "00-START-HERE.md"] == ["00-START-HERE.md"]
    fixture_zips = {
        "M1/security-fix/file-bundler/fixtures/" + variant + "/bundle-001.zip"
        for variant in ("empty-a", "pair-180", "single-x")
    }
    assert {name for name in names if name.lower().endswith(".zip")} == fixture_zips
    def load(name):
        return json.loads(z.read(name).decode("utf-8-sig"))
    files = load("FILES.json")
    assert len(files) == len({f["path"] for f in files})
    assert {f["path"] for f in files} == names.keys() - {"FILES.json"}
    for f in files:
        data = z.read(f["path"])
        assert len(data) == f["bytes"] and sha(data) == f["sha256"], f["path"]
    receipt = load("M1-ARCHIVE-RECEIPT.json")
    prior_archive = (prior_root / receipt["file"]).read_bytes()
    assert len(prior_archive) == receipt["bytes"] and sha(prior_archive) == receipt["sha256"]
    historical = 0
    with zipfile.ZipFile(io.BytesIO(prior_archive)) as prior:
        for old in prior.namelist():
            if old.endswith("/"):
                continue
            if old == "FILES.json":
                target = "M1/FILES.json"
                if z.read(target) != prior.read(old):
                    for f in load(target):
                        data = z.read("M1/" + f["path"])
                        assert len(data) == f["bytes"] and sha(data) == f["sha256"], f["path"]
                continue
            if old == "00-START-HERE.md":
                candidates = [name for name in names if name.startswith("M1/") and name.count("/") == 1 and name.endswith(".md")]
                assert any(z.read(name) == prior.read(old) for name in candidates), old
            else:
                assert z.read("M1/" + old) == prior.read(old), old
            historical += 1
    summary = load("STATUS.json")
    assert summary["candidateCommit"] == candidate and summary["sourceCommit"] == source
    assert summary["workerVersion"] == version
    rows = summary["tools"]
    assert len(rows) == len({row["slug"] for row in rows}) == 190
    assert {row["slug"] for row in rows if row["state"] == "BLOCKED_NOT_DEPLOYED"} == blocked
    assert {row["slug"] for row in rows if row["state"] == "LIVE_INSPECTION_REPAIRED"} == repaired
    assert sum(row["state"] == "LIVE_INSPECTION" for row in rows) == 97
    assert sum(row["state"] == "HISTORICAL_FORMAL_RELEASE" for row in rows) == 47
    assert sum(row["state"] == "SOURCE_PR_UNREGISTERED_UNREVIEWED" for row in rows) == 40
    csv_rows = list(csv.DictReader(io.StringIO(z.read("STATUS.csv").decode("utf-8-sig"))))
    assert [(row["slug"], row["state"]) for row in csv_rows] == [(row["slug"], row["state"]) for row in rows]
    sources = load("M2/evidence/source-records.json")
    assert {record["slug"] for record in sources} == repaired
    assert sum(len(record["files"]) for record in sources) == 105
    for record in sources:
        for f in record["files"]:
            name = "M2/primary/{0}/tools/{0}/{1}".format(record["slug"], f["path"])
            data = z.read(name)
            assert len(data) == f["bytes"] and sha(data) == f["sha256"], name
    live = load("M2/evidence/live-verification.json")
    assert len(live["results"]) == 1180 and len(live["edge"]) == 306
    assert all(row["pass"] for row in live["results"] + live["edge"])
    docs = ["00-START-HERE.md"] + [name for name in names if name.startswith("M2/independent-review/") and name.endswith(".md")]
    links = 0
    for name in docs:
        for match in re.finditer(r"\]\(([^\s()]+)\)", z.read(name).decode("utf-8-sig")):
            url = urlsplit(match.group(1))
            if url.scheme or url.netloc or not url.path:
                continue
            target = posixpath.normpath(posixpath.join(posixpath.dirname(name), unquote(url.path)))
            assert not target.startswith("../") and not target.startswith("/")
            assert target in names or any(n.startswith(target + "/") for n in names), (name, target)
            links += 1
    print(json.dumps({
        "archive": archive.name, "sha256": sha(archive.read_bytes()), "bytes": archive.stat().st_size,
        "files": len(names), "manifestFiles": len(files), "historicalFilesChecked": historical,
        "sourceFilesChecked": 105, "statusRows": len(rows), "relativeReviewAndEntryLinks": links,
        "candidate": candidate, "workerVersion": version, "status": "PASS"
    }, indent=2))
