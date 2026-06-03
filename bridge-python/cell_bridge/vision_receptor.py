"""Vision receptors — sim / camera / ROS2 (A3-H L1 adapters) · Vision 수용체."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator, Literal

from cell_bridge.sensor import iter_vision_stream, simulate_vision_frame
from cell_bridge.vision_metrics import vision_frame_from_gray, vision_frame_from_ros2_json

VisionSource = Literal["sim", "camera", "ros2", "ros2-replay"]


def _default_ros2_replay_path() -> str:
    return str(
        Path(__file__).resolve().parents[2]
        / "examples"
        / "spider-robot-sim"
        / "fixtures"
        / "ros2-image-sample.json"
    )


@dataclass
class VisionReceptor:
    """L1 adapter: physical vision → VisionFrame · L1 Vision→VisionFrame."""

    source: VisionSource = "sim"
    camera_index: int = 0
    ros2_topic: str = "/camera/image_raw"
    ros2_replay_path: str = field(default_factory=_default_ros2_replay_path)
    interval_ms: float = 33.0
    _previous_gray: bytes | None = field(default=None, init=False, repr=False)

    def read_frame(
        self,
        *,
        contrast: float | None = None,
        motion: float | None = None,
    ) -> dict[str, Any]:
        if self.source == "sim":
            return simulate_vision_frame(contrast=contrast, motion=motion)
        if self.source == "camera":
            return self._read_camera_frame()
        if self.source == "ros2-replay":
            return self._read_ros2_replay_once()
        if self.source == "ros2":
            return self._read_ros2_once()
        raise ValueError(f"unknown vision source · 알 수 없는 source: {self.source}")

    def iter_frames(
        self,
        *,
        samples: int = 1,
        contrast: float | None = None,
        motion: float | None = None,
    ) -> Iterator[dict[str, Any]]:
        if self.source == "sim" and samples > 1:
            yield from iter_vision_stream(samples=samples, interval_ms=self.interval_ms)
            return

        for i in range(samples):
            if i > 0 and self.interval_ms > 0:
                time.sleep(self.interval_ms / 1000.0)
            yield self.read_frame(contrast=contrast, motion=motion)

    def _read_camera_frame(self) -> dict[str, Any]:
        try:
            import cv2  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "OpenCV required for camera source · camera 소스는 opencv 필요: "
                "pip install cell-coding-bridge[camera]"
            ) from exc

        cap = cv2.VideoCapture(self.camera_index)
        if not cap.isOpened():
            raise RuntimeError(f"camera not opened · 카메라 열기 실패: index={self.camera_index}")

        try:
            ok, frame = cap.read()
            if not ok or frame is None:
                raise RuntimeError("camera read failed · 카메라 read 실패")
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            h, w = gray.shape[:2]
            payload = vision_frame_from_gray(
                gray.tobytes(),
                width=w,
                height=h,
                previous=self._previous_gray,
                timestamp=time.time() * 1000,
            )
            self._previous_gray = gray.tobytes()
            return payload
        finally:
            cap.release()

    def _read_ros2_replay_once(self) -> dict[str, Any]:
        path = Path(self.ros2_replay_path)
        if not path.is_file():
            raise RuntimeError(f"ros2 replay file not found · replay 파일 없음: {path}")
        records = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(records, dict):
            records = [records]
        if not records:
            raise RuntimeError("ros2 replay fixture is empty · replay fixture 비어 있음")
        record = records[0]
        return vision_frame_from_ros2_json(record)

    def _read_ros2_once(self) -> dict[str, Any]:
        try:
            import rclpy  # type: ignore
            from rclpy.node import Node  # type: ignore
            from sensor_msgs.msg import Image  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "ROS2 rclpy required · ROS2 필요: source ROS2 install, then "
                "pip install cell-coding-bridge[ros2] (see A3-H.md)"
            ) from exc

        holder: dict[str, Any] = {}
        outer = self

        class Grabber(Node):
            def __init__(self) -> None:
                super().__init__("cell_coding_vision_receptor")
                self.create_subscription(Image, outer.ros2_topic, self._on_image, 10)

            def _on_image(self, msg: Any) -> None:
                stamp_ms = msg.header.stamp.sec * 1000.0 + msg.header.stamp.nanosec / 1_000_000.0
                holder["frame"] = vision_frame_from_ros2_image_msg(
                    width=int(msg.width),
                    height=int(msg.height),
                    encoding=str(msg.encoding),
                    data=bytes(msg.data),
                    stamp_ms=stamp_ms,
                    previous_gray=outer._previous_gray,
                )
                outer._previous_gray = _decode_gray_bytes(
                    bytes(msg.data),
                    width=int(msg.width),
                    height=int(msg.height),
                    encoding=str(msg.encoding),
                )

        rclpy.init(args=None)
        node = Grabber()
        try:
            deadline = time.time() + 5.0
            while "frame" not in holder and time.time() < deadline:
                rclpy.spin_once(node, timeout_sec=0.1)
            if "frame" not in holder:
                raise RuntimeError(
                    f"no ROS2 image on topic · ROS2 topic 수신 없음: {self.ros2_topic}"
                )
            return holder["frame"]
        finally:
            node.destroy_node()
            rclpy.shutdown()


def _decode_gray_bytes(data: bytes, *, width: int, height: int, encoding: str) -> bytes:
    from cell_bridge.vision_metrics import _decode_ros_image_gray

    return _decode_ros_image_gray(data, width=width, height=height, encoding=encoding)


def vision_frame_from_ros2_image_msg(**kwargs: Any) -> dict[str, Any]:
    from cell_bridge.vision_metrics import vision_frame_from_ros2_image_msg as _fn

    return _fn(**kwargs)
