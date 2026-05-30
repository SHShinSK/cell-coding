"""Cloud runtime HTTP client · cloud runtime HTTP 클라이언트."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any


def post_signal(
    base_url: str,
    signal_type: str,
    signal_data: dict[str, Any],
    *,
    timeout: float = 30,
) -> dict[str, Any]:
    """POST /v1/signals to a Cell cloud runtime."""
    url = base_url.rstrip("/") + "/v1/signals"
    payload = json.dumps({"type": signal_type, "data": signal_data}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(body or str(e)) from e


def default_cloud_url() -> str:
    return os.environ.get("CELL_CLOUD_URL", "http://127.0.0.1:8087")


def default_motion_alarm_url() -> str:
    """Physical AI motion-alarm organ · runtime-docker :8087."""
    return os.environ.get("CELL_MOTION_ALARM_URL", "http://127.0.0.1:8087")
