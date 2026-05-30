# -*- coding: utf-8 -*-
import json
import pathlib
import urllib.request

url = "https://api.github.com/repos/SHShinSK/cell-coding/issues?state=all&per_page=100"
req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json"})
with urllib.request.urlopen(req) as resp:
    items = json.load(resp)

issues = [i for i in items if "pull_request" not in i]
open_ = [i for i in issues if i["state"] == "open"]
closed_ = [i for i in issues if i["state"] == "closed"]
lines = [
    f"Open: {len(open_)}",
    f"Closed: {len(closed_)}",
    "",
    "=== OPEN ===",
]
for i in sorted(open_, key=lambda x: x["number"]):
    labels = ", ".join(l["name"] for l in i.get("labels", []))
    lines.append(f"#{i['number']} {i['title']}")
    lines.append(f"    {labels}")
lines.append("")
lines.append("=== CLOSED (recent) ===")
for i in sorted(closed_, key=lambda x: x["number"]):
    lines.append(f"#{i['number']} {i['state']} {i['title'][:80]}")

path = pathlib.Path(r"d:\Claude\_issues_audit.txt")
path.write_text("\n".join(lines), encoding="utf-8")
print(path.read_text(encoding="utf-8"))
