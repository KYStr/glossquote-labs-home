"""Offline inspection of fixed download fixture strings. Never opens a browser."""

import base64
import hashlib
from html.parser import HTMLParser
import re


class DownloadStructure(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.head_meta = []
        self.style_parts = []
        self.comments = []
        self.body_parts = []
        self.in_head = False
        self.in_style = False
        self.in_body = False

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        assert len(attributes) == len(attrs), "Duplicate HTML attributes"
        self.tags.append((tag, attributes))
        if tag == "head":
            self.in_head = True
        elif tag == "meta" and self.in_head:
            self.head_meta.append(attributes)
        elif tag == "style":
            self.in_style = True
        elif tag == "body":
            self.in_body = True

    def handle_endtag(self, tag):
        if tag == "head":
            self.in_head = False
        elif tag == "style":
            self.in_style = False
        elif tag == "body":
            self.in_body = False

    def handle_data(self, data):
        if self.in_style:
            self.style_parts.append(data)
        if self.in_body:
            self.body_parts.append(data)

    def handle_comment(self, data):
        self.comments.append(data)


def inspect_download(text, lang, expected_role):
    """Check the actual literal fixture bytes and the policy they contain."""
    assert expected_role in ("student", "teacher")
    raw = text.encode("utf-8")
    assert raw[:15].lower() == b"<!doctype html>", "HTML document envelope"
    assert not raw.startswith(b"\xef\xbb\xbf"), "BOM-free output"
    assert raw.endswith(b"\n") and not raw.endswith(b"\n\n"), "Exactly one final LF"
    assert b"\r" not in raw and len(raw) <= 2 * 1024 * 1024, "LF serialization and byte limit"
    p = DownloadStructure()
    p.feed(text)
    p.close()
    assert not p.comments, "Generated comments must not carry document data"
    assert [(tag, attr.get("lang")) for tag, attr in p.tags if tag == "html"] == [("html", lang)]
    assert any(attr.get("charset", "").lower() == "utf-8" for attr in p.head_meta)
    assert any(
        attr.get("name", "").lower() == "robots" and "noindex" in attr.get("content", "").lower()
        for attr in p.head_meta
    ), "Noindex metadata"
    policies = [
        attr["content"] for attr in p.head_meta
        if attr.get("http-equiv", "").lower() == "content-security-policy"
    ]
    assert len(policies) == 1
    clauses = [x.split() for x in policies[0].split(";") if x.strip()]
    directives = {clause[0].lower(): clause[1:] for clause in clauses}
    assert len(directives) == len(clauses), "Duplicate CSP directives"
    assert directives.get("default-src") == ["'none'"]
    for clause in ("script-src", "connect-src", "base-uri", "form-action"):
        assert directives.get(clause) == ["'none'"], clause
    for clause in ("script-src-elem", "script-src-attr", "style-src-attr"):
        assert directives.get(clause, ["'none'"]) == ["'none'"], clause
    assert sum(tag == "style" for tag, _ in p.tags) == 1
    stylesheet = "".join(p.style_parts)
    digest = base64.b64encode(hashlib.sha256(stylesheet.encode("utf-8")).digest()).decode("ascii")
    assert directives.get("style-src") == [f"'sha256-{digest}'"], "Fixed stylesheet hash"
    assert not re.search(r"@import\b|\burl\s*\(", stylesheet, re.IGNORECASE)
    assert all(
        tag not in ("a", "audio", "base", "embed", "form", "iframe", "img", "link", "object", "script", "svg", "video")
        and all(
            attr not in ("href", "src", "srcset", "style", "action", "formaction")
            and not attr.startswith(("on", "data-"))
            for attr in attrs
        )
        for tag, attrs in p.tags
    ), "Only inert structure and fixed stylesheet"
    assert all(attr.get("http-equiv", "").lower() != "refresh" for attr in p.head_meta)
    return {
        "role": expected_role,
        "bytes": len(raw),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "styleSha256Base64": digest,
        "bodyText": "".join(p.body_parts),
    }
