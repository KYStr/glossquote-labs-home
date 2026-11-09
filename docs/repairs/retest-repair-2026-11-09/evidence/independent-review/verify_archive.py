import csv
import hashlib
import io
import json
import posixpath
import re
import sys
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit
from zipfile import ZipFile


def sha256(contents):
    return hashlib.sha256(contents).hexdigest()


def safe_name(name):
    path = PurePosixPath(name)
    return (
        bool(name) and not path.is_absolute() and not set(path.parts) & {"..", "."}
        and not re.search(r'[:\\\x00-\x1f]', name) and str(path) == name.rstrip("/")
    )


def verify(archive, expected=None, extracted=None):
    digest = sha256(archive.read_bytes())
    if expected is not None:
        assert digest == expected, (archive, digest)
    with ZipFile(archive) as zipped:
        entries = zipped.infolist()
        assert zipped.testzip() is None
        assert len({entry.filename.casefold() for entry in entries}) == len(entries)
        assert all(safe_name(entry.filename) for entry in entries)
        assert not any((entry.external_attr >> 16) & 0o170000 == 0o120000 for entry in entries)
        files = {entry.filename for entry in entries if not entry.is_dir()}
        manifests = [name for name in files
                     if PurePosixPath(name).name.upper() in {"MANIFEST.SHA256", "FILES.JSON"}]
        assert manifests, manifests
        shallowest = min(len(PurePosixPath(name).parts) for name in manifests)
        top_manifests = [name for name in manifests if len(PurePosixPath(name).parts) == shallowest]
        assert len(top_manifests) == 1, top_manifests
        manifest = top_manifests[0]
        base = PurePosixPath(manifest).parent
        listed = set()
        manifest_text = zipped.read(manifest).decode("utf-8-sig")
        if PurePosixPath(manifest).name.upper() == "FILES.JSON":
            manifest_entries = [(row["sha256"], row["path"], row["bytes"]) for row in json.loads(manifest_text)]
        else:
            manifest_entries = [(*line.split("  ", 1), None) for line in manifest_text.splitlines()]
        for checksum, name, size in manifest_entries:
            assert re.fullmatch(r"[a-f0-9]{64}", checksum) and safe_name(name), name
            full_name = str(base / name)
            assert full_name not in listed, full_name
            contents = zipped.read(full_name)
            assert sha256(contents) == checksum, full_name
            assert size is None or len(contents) == size, full_name
            listed.add(full_name)
        assert files == listed | {manifest}, files ^ (listed | {manifest})
        if extracted is not None:
            relative = {name: str(PurePosixPath(name).relative_to(base)) for name in files}
            assert set(relative.values()) == {p.relative_to(extracted).as_posix() for p in extracted.rglob("*") if p.is_file()}
            assert all(zipped.read(name) == (extracted / relative[name]).read_bytes() for name in files)
        starts = sorted(name for name in files if PurePosixPath(name).name == "00-START-HERE.md")
        portable_links = []
        if starts:
            assert len(starts) == 1, starts
            start = starts[0]
            markdown = zipped.read(start).decode("utf-8-sig")
            for matched in re.finditer(r"\]\((<[^>]+>|[^\s)]+)\)", markdown):
                target = matched.group(1).strip("<>")
                assert not re.match(r"(?i)^(?:file:|[A-Z]:|/|\\)", target), target
                url = urlsplit(target)
                if url.scheme or not url.path:
                    continue
                assert "\\" not in target, target
                resolved = posixpath.normpath(posixpath.join(posixpath.dirname(start), unquote(url.path)))
                assert resolved in files, (start, target, resolved)
                portable_links.append({"source": start, "target": target})
        nested_input = str(base / "external-input/glossquote-retest-2026-11-09.zip")
        if nested_input in files:
            assert sha256(zipped.read(nested_input)) == "9d4a96c782b9bbb5bce7b367bf15a3b4acbc83274a4e1c6fcc53448c80a9b0ef"
        package_checks = {}
        manifest_evidence = str(base / "evidence/manifest-public.json")
        if manifest_evidence in files:
            evidence = json.loads(zipped.read(manifest_evidence))
            artifact_base = str(base / "deployed-artifacts") + "/"
            artifact_paths = {name for name in files if name.startswith(artifact_base)}
            assert artifact_paths == {artifact_base + row["path"] for row in evidence["files"]}
            for row in evidence["files"]:
                data = zipped.read(artifact_base + row["path"])
                assert len(data) == row["bytes"] and sha256(data) == row["sha256"], row["path"]
            core = "/js/core/tts.mjs"
            assert (zipped.read(str(base / "sources/tools/text-to-speech-reader/public") + core)
                    == zipped.read(artifact_base + "assets/__sites/text-to-speech-reader" + core))
            status = json.loads(zipped.read(str(base / "STATUS.json")))
            deployment = json.loads(zipped.read(str(base / "evidence/batch-deployment.json")))
            assert status["candidateCommit"] == deployment["commit"]
            assert status["workerVersion"] == deployment["version"]
            assert status["sourceCommit"] == evidence["sourceCommit"]
            assert len(status["tools"]) == 190
            assert status["counts"]["newlyDeployed"] == 0
            assert status["counts"]["updatedExisting"] == 2
            assert status["counts"]["previousBatchNewlyDeployed"] == 39
            csv_text = zipped.read(str(base / "STATUS.csv")).decode("utf-8-sig")
            csv_rows = list(csv.DictReader(io.StringIO(csv_text)))
            assert [row["slug"] for row in csv_rows] == [row["slug"] for row in status["tools"]]
            assert len({row["slug"] for row in csv_rows}) == 190
            assert [row["state"] for row in csv_rows] == [row["state"] for row in status["tools"]]
            repaired = {row["slug"] for row in status["tools"] if row["state"] == "LIVE_INSPECTION_RETEST_REPAIRED"}
            assert repaired == {"text-to-speech-reader", "fluid-typography"}, repaired
            resolution = json.loads(zipped.read(str(base / "RESOLUTION.json")))
            assert {row["id"] for row in resolution["newFindings"]} == {"FUNC-M2-01", "FUNC-M2-02"}
            assert all(row["status"] == "FIXED_DEPLOYED_AWAITING_EXTERNAL_RETEST" for row in resolution["newFindings"])
            package_checks = {"deployedArtifactsVerified": len(artifact_paths),
                              "statusRows": len(status["tools"]), "repaired": sorted(repaired),
                              "candidateCommit": deployment["commit"], "workerVersion": deployment["version"],
                              "newlyDeployed": status["counts"]["newlyDeployed"],
                              "updatedExisting": status["counts"]["updatedExisting"],
                              "previousBatchNewlyDeployed": status["counts"]["previousBatchNewlyDeployed"]}
    return {"name": archive.name, "sha256": digest, "entries": len(entries), "files": len(files),
            "manifestEntries": len(listed), "extractedBytesMatched": extracted is not None,
            "entryPoint": starts[0] if starts else None, "portableEntryPointLinks": portable_links,
            "delivery": package_checks}


if __name__ == "__main__":
    args = sys.argv[1:]
    print(json.dumps(verify(Path(args[0]), args[1] if len(args) > 1 else None,
                            Path(args[2]) if len(args) > 2 else None), indent=2))
