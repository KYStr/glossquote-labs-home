"""Independent stdlib reader; expected fixtures are not derived from the writer."""
import json
import sys
import zipfile

expected = [("é.bin", bytes([0, 255, 16, 65, 0])), ("空檔.txt", b""), ("crc.txt", b"123456789")]
with zipfile.ZipFile(sys.argv[1], "r") as archive:
    assert archive.namelist() == ["é.bin", "空檔.txt", "crc.txt"]
    assert archive.testzip() is None
    assert archive.comment == b""
    for entry, (name, payload) in zip(archive.infolist(), expected, strict=True):
        assert entry.filename == name
        assert archive.read(name) == payload
        assert entry.file_size == len(payload)
        assert entry.compress_size == len(payload)
        assert entry.compress_type == zipfile.ZIP_STORED
        assert entry.flag_bits == 0x0800
        assert entry.extract_version == 10
        assert entry.create_version == 20
        assert entry.create_system == 0
        assert entry.date_time == (1980, 1, 1, 0, 0, 0)
        assert entry.extra == b"" and entry.comment == b""
        assert entry.external_attr == 0 and entry.internal_attr == 0
        assert not entry.is_dir()
    assert archive.getinfo("crc.txt").CRC == 0xCBF43926
    assert archive.getinfo("空檔.txt").CRC == 0
print(json.dumps({"status": "PASS", "python": sys.version.split()[0], "reader": "stdlib zipfile", "entries": 3, "payloadEquality": True, "testzip": None, "crcVector": "CBF43926"}))
