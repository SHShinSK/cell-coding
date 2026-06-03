#!/usr/bin/env python3
"""VisionFrame metrics tests · VisionFrame 메트릭 테스트."""

from __future__ import annotations

import base64
import json
import tempfile
import unittest
from pathlib import Path

from cell_bridge.vision_metrics import (
    metrics_from_gray,
    vision_frame_from_gray,
    vision_frame_from_ros2_json,
)
from cell_bridge.vision_receptor import VisionReceptor


def _checkerboard(width: int, height: int) -> bytes:
    out = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            out[y * width + x] = 255 if ((x // 4) + (y // 4)) % 2 == 0 else 0
    return bytes(out)


class VisionMetricsTest(unittest.TestCase):
    def test_high_contrast_checkerboard(self) -> None:
        gray = _checkerboard(8, 8)
        contrast, motion = metrics_from_gray(gray, width=8, height=8)
        self.assertGreater(contrast, 0.4)
        self.assertEqual(motion, 0.0)

    def test_motion_from_frame_diff(self) -> None:
        prev = bytes([0] * 64)
        curr = bytes([255] * 64)
        contrast, motion = metrics_from_gray(curr, width=8, height=8, previous=prev)
        self.assertGreater(motion, 0.9)

    def test_vision_frame_from_gray_includes_timestamp(self) -> None:
        frame = vision_frame_from_gray(_checkerboard(8, 8), width=8, height=8, timestamp=123.0)
        self.assertEqual(frame["type"], "VisionFrame")
        self.assertEqual(frame["data"]["timestamp"], 123.0)
        self.assertIn("contrast", frame["data"])

    def test_ros2_json_fixture_roundtrip(self) -> None:
        gray = _checkerboard(8, 8)
        record = {
            "width": 8,
            "height": 8,
            "encoding": "mono8",
            "stamp_ms": 1000.0,
            "data_base64": base64.b64encode(gray).decode("ascii"),
        }
        frame = vision_frame_from_ros2_json(record)
        self.assertEqual(frame["data"]["timestamp"], 1000.0)
        self.assertGreater(frame["data"]["contrast"], 0.4)


class VisionReceptorTest(unittest.TestCase):
    def test_ros2_replay_source(self) -> None:
        gray = _checkerboard(8, 8)
        record = {
            "width": 8,
            "height": 8,
            "encoding": "mono8",
            "stamp_ms": 2000.0,
            "data_base64": base64.b64encode(gray).decode("ascii"),
        }
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "sample.json"
            path.write_text(json.dumps(record), encoding="utf-8")
            receptor = VisionReceptor(source="ros2-replay", ros2_replay_path=str(path))
            frame = receptor.read_frame()
            self.assertEqual(frame["type"], "VisionFrame")
            self.assertEqual(frame["data"]["timestamp"], 2000.0)


if __name__ == "__main__":
    unittest.main()
