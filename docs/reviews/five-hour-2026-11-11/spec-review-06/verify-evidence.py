"""Verify the public review package and replay the five fixed fixture sets."""

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess
import sys


SLUGS = (
    "currency-converter", "dice-roller", "pool-volume-calculator",
    "baby-feeding-calculator", "pet-feeding-calculator",
)


def git_blob(data):
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def package_path(root, name):
    relative = PurePosixPath(name)
    if relative.is_absolute() or ".." in relative.parts or relative.as_posix() != name or "\\" in name:
        raise ValueError(f"Invalid package path: {name}")
    path = root.joinpath(*relative.parts)
    if not path.resolve().is_relative_to(root) or path.is_symlink():
        raise ValueError(f"Package path escapes the directory: {name}")
    return path


def verify_package(root, manifest):
    expected = {
        "SUMMARY.md", "summary.json", "intake.json", "production-rubric-check.json",
        "REPRODUCE.md", "verify-evidence.py", "fixture_support.py",
    }
    for slug in SLUGS:
        expected.update(f"{slug}/{name}" for name in ("REVIEW.md", "review.json", "verification.json", "verify.py"))
    records = manifest["files"]
    if len(records) != len(expected) or {entry["path"] for entry in records} != expected:
        raise ValueError("The manifest does not name the complete review package")
    for entry in records:
        data = package_path(root, entry["path"]).read_bytes()
        if len(data) != entry["bytes"] or hashlib.sha256(data).hexdigest() != entry["sha256"]:
            raise ValueError(f"Published evidence checksum differs: {entry['path']}")
        if git_blob(data) != entry["gitBlobSha"]:
            raise ValueError(f"Published evidence Git blob differs: {entry['path']}")
    return len(records)


def replay(root, fixtures_dir, sources):
    if len(sources) != len(SLUGS) or {entry["slug"] for entry in sources} != set(SLUGS):
        raise ValueError("The manifest does not name the five fixture sources")
    results = []
    for source in sources:
        slug = source["slug"]
        fixture = fixtures_dir / f"{slug}.json"
        data = fixture.read_bytes()
        if git_blob(data) != source["gitBlobSha"]:
            raise ValueError(f"Fixture bytes do not match the fixed candidate: {fixture.name}")
        verification = package_path(root, f"{slug}/verification.json")
        expected = json.loads(verification.read_bytes())
        process = subprocess.run(
            [sys.executable, "-B", str(package_path(root, f"{slug}/verify.py")), str(fixture)],
            capture_output=True, check=False, timeout=30,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
        )
        if process.returncode != 0 or process.stderr:
            raise RuntimeError(f"Verifier failed for {slug} (exit {process.returncode})")
        actual = json.loads(process.stdout)
        version = actual.pop("pythonVersion")
        expected.pop("pythonVersion")
        if actual != expected or not all(case["match"] for case in actual["fixtures"]):
            raise ValueError(f"Independent replay differs from the review evidence: {slug}")
        results.append({
            "slug": slug, "pythonVersion": version, "fixtures": len(actual["fixtures"]),
            "counts": actual["counts"], "exit": process.returncode,
        })
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixtures-dir", type=Path, required=True,
                        help="Directory containing the fixed <slug>.json files from REPRODUCE.md")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / "manifest.json").read_bytes())
    manifest_count = verify_package(root, manifest)
    results = replay(root, args.fixtures_dir.resolve(), manifest["fixtureSources"])
    total = sum(entry["fixtures"] for entry in results)
    if total != manifest["fixtureCount"]:
        raise ValueError("Fixture replay total differs from the manifest")
    print(json.dumps({"status": "PASS", "manifestFiles": manifest_count,
                      "totalFixtures": total, "replayed": results}, indent=2))


if __name__ == "__main__":
    main()
