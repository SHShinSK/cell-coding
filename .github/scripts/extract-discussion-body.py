#!/usr/bin/env python3
"""Extract discussion body — strip HTML comments and title H1."""
"""Discussion 게시용 본문 추출 — HTML 주석·제목 H1 제거."""
import re
import sys
from pathlib import Path


def extract(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"<!--.*?-->\s*", "", text, flags=re.S)
    lines = text.splitlines()
    if lines and lines[0].startswith("# "):
        lines = lines[1:]
    while lines and not lines[0].strip():
        lines.pop(0)
    return "\n".join(lines).strip()


if __name__ == "__main__":
    print(extract(Path(sys.argv[1])))
