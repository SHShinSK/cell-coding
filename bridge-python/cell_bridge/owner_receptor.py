"""Owner presence receptors — sim / ROS2 replay / live (A4-H L1) · Owner 수용체."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator, Literal

from cell_bridge.ros2_mapping import load_ros2_fixture, owner_ping_from_ros2_dict
from cell_bridge.sensor import iter_owner_stream, simulate_owner_ping

OwnerSource = Literal["sim", "ros2", "ros2-replay"]


def _default_ros2_replay_path() -> str:
    return str(
        Path(__file__).resolve().parents[2]
        / "examples"
        / "pet-robot-sim"
        / "fixtures"
        / "ros2-owner-ping-sample.json"
    )


@dataclass
class OwnerReceptor:
    """L1 adapter: owner BLE/RSSI → OwnerPing · L1 Owner→OwnerPing."""

    source: OwnerSource = "sim"
    ros2_topic: str = "/owner/rssi"
    ros2_replay_path: str = field(default_factory=_default_ros2_replay_path)
    interval_ms: float = 500.0

    def read_ping(
        self,
        *,
        rssi: float | None = None,
    ) -> dict[str, Any]:
        if self.source == "sim":
            return simulate_owner_ping(rssi=rssi)
        if self.source == "ros2-replay":
            return self._read_ros2_replay_once()
        if self.source == "ros2":
            return self._read_ros2_once()
        raise ValueError(f"unknown owner source · 알 수 없는 source: {self.source}")

    def iter_pings(
        self,
        *,
        samples: int = 1,
        rssi: float | None = None,
        sequence_path: str | Path | None = None,
    ) -> Iterator[dict[str, Any]]:
        if self.source == "ros2-replay" and sequence_path:
            yield from self._iter_replay_sequence(sequence_path)
            return
        if self.source == "sim" and samples > 1:
            yield from iter_owner_stream(
                samples=samples,
                interval_ms=self.interval_ms,
                rssi=rssi,
            )
            return

        for i in range(samples):
            if i > 0 and self.interval_ms > 0:
                time.sleep(self.interval_ms / 1000.0)
            yield self.read_ping(rssi=rssi)

    def _read_ros2_replay_once(self) -> dict[str, Any]:
        record = load_ros2_fixture(self.ros2_replay_path)
        return owner_ping_from_ros2_dict(dict(record))

    def _iter_replay_sequence(self, path: str | Path) -> Iterator[dict[str, Any]]:
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
        if not isinstance(raw, list):
            raise ValueError("sequence fixture must be JSON array · sequence는 배열")
        base = time.time() * 1000
        for i, item in enumerate(raw):
            if i > 0 and self.interval_ms > 0:
                time.sleep(self.interval_ms / 1000.0)
            record = dict(item)
            if "stamp_ms" in record:
                record["stamp_ms"] = base + i * self.interval_ms
            yield owner_ping_from_ros2_dict(record)

    def _read_ros2_once(self) -> dict[str, Any]:
        try:
            import rclpy  # type: ignore
            from rclpy.node import Node  # type: ignore
            from std_msgs.msg import Float32  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "ROS2 rclpy required · ROS2 필요: pip install cell-coding-bridge[ros2]"
            ) from exc

        from cell_bridge.ros2_mapping import owner_ping_from_ros2_float_msg

        topic = self.ros2_topic
        rclpy.init(args=None)
        result: dict[str, Any] = {}

        class Subscriber(Node):
            def __init__(self) -> None:
                super().__init__("cell_coding_owner_receptor")
                self.create_subscription(Float32, topic, self._on_msg, 10)

            def _on_msg(self, msg: Any) -> None:
                result.update(owner_ping_from_ros2_float_msg(msg))

        node = Subscriber()
        try:
            deadline = time.time() + 5.0
            while time.time() < deadline and not result:
                rclpy.spin_once(node, timeout_sec=0.1)
        finally:
            node.destroy_node()
            rclpy.shutdown()

        if not result:
            raise TimeoutError(
                f"no message on {topic} within 5s · 5초 내 메시지 없음: ros2 topic list"
            )
        return result
