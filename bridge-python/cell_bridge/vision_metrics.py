"""VisionFrame metrics from grayscale pixels · 그레이스케일→VisionFrame 메트릭."""

from __future__ import annotations

import base64
import math
import time
from typing import Any


def make_vision_frame(
    *,
    contrast: float,
    motion: float,
    timestamp: float | None = None,
) -> dict[str, Any]:
    """Build a VisionFrame inject payload · VisionFrame inject 페이로드."""
    return {
        "type": "VisionFrame",
        "data": {
            "timestamp": timestamp if timestamp is not None else time.time() * 1000,
            "contrast": round(max(0.0, min(1.0, contrast)), 4),
            "motion": round(max(0.0, min(1.0, motion)), 4),
        },
    }


def metrics_from_gray(
    gray: bytes | bytearray,
    *,
    width: int,
    height: int,
    previous: bytes | bytearray | None = None,
) -> tuple[float, float]:
    """Compute contrast (std/128) and motion (mean abs diff) · contrast·motion 계산."""
    expected = width * height
    if len(gray) < expected:
        raise ValueError(f"gray buffer too small · 버퍼 부족: {len(gray)} < {expected}")

    pixels = gray[:expected]
    mean = sum(pixels) / expected
    variance = sum((p - mean) ** 2 for p in pixels) / expected
    contrast = min(1.0, math.sqrt(variance) / 128.0)

    if previous is None or len(previous) < expected:
        return contrast, 0.0

    prev = previous[:expected]
    motion = sum(abs(a - b) for a, b in zip(pixels, prev, strict=True)) / (expected * 255.0)
    return contrast, min(1.0, motion)


def vision_frame_from_gray(
    gray: bytes | bytearray,
    *,
    width: int,
    height: int,
    previous: bytes | bytearray | None = None,
    timestamp: float | None = None,
) -> dict[str, Any]:
    """Grayscale buffer → VisionFrame · 그레이스케일→VisionFrame."""
    contrast, motion = metrics_from_gray(gray, width=width, height=height, previous=previous)
    return make_vision_frame(contrast=contrast, motion=motion, timestamp=timestamp)


def vision_frame_from_ros2_image_msg(
    *,
    width: int,
    height: int,
    encoding: str,
    data: bytes | bytearray,
    stamp_ms: float | None = None,
    previous_gray: bytes | bytearray | None = None,
) -> dict[str, Any]:
    """Map sensor_msgs/Image fields to VisionFrame · ROS2 Image→VisionFrame."""
    gray = _decode_ros_image_gray(data, width=width, height=height, encoding=encoding)
    ts = stamp_ms if stamp_ms is not None else time.time() * 1000
    return vision_frame_from_gray(
        gray,
        width=width,
        height=height,
        previous=previous_gray,
        timestamp=ts,
    )


def vision_frame_from_ros2_json(record: dict[str, Any]) -> dict[str, Any]:
    """Replay fixture: width/height/encoding + data_base64 · JSON fixture 재생."""
    width = int(record["width"])
    height = int(record["height"])
    encoding = str(record.get("encoding", "mono8"))
    raw = base64.b64decode(record["data_base64"])
    stamp_ms = record.get("stamp_ms")
    if stamp_ms is not None:
        stamp_ms = float(stamp_ms)
    return vision_frame_from_ros2_image_msg(
        width=width,
        height=height,
        encoding=encoding,
        data=raw,
        stamp_ms=stamp_ms,
    )


def _decode_ros_image_gray(
    data: bytes | bytearray,
    *,
    width: int,
    height: int,
    encoding: str,
) -> bytes:
    enc = encoding.lower()
    if enc in ("mono8", "8uc1"):
        return bytes(data[: width * height])
    if enc in ("rgb8", "bgr8"):
        step = 3
        out = bytearray(width * height)
        for y in range(height):
            for x in range(width):
                i = (y * width + x) * step
                out[y * width + x] = int((data[i] + data[i + 1] + data[i + 2]) / 3)
        return bytes(out)
    raise ValueError(f"unsupported ROS image encoding · 지원하지 않는 encoding: {encoding}")
