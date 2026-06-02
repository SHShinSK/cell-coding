"""IMU receptors — sim / ROS2 replay / ROS2 live (L1) · IMU L1 어댑터."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator, Literal

from cell_bridge.ros2_mapping import imu_sample_from_ros2_dict, imu_sample_from_ros2_imu_msg, load_ros2_fixture
from cell_bridge.sensor import iter_imu_stream, simulate_imu_sample

ImuSource = Literal["sim", "ros2", "ros2-replay"]


def _default_imu_replay_path() -> str:
    return str(
        Path(__file__).resolve().parents[2]
        / "examples"
        / "spiderling-sim"
        / "fixtures"
        / "ros2-imu-sample.json"
    )


@dataclass
class ImuReceptor:
    """L1 adapter: physical IMU → ImuSample · L1 IMU→ImuSample."""

    source: ImuSource = "sim"
    ros2_topic: str = "/imu/data"
    ros2_replay_path: str = field(default_factory=_default_imu_replay_path)
    interval_ms: float = 10.0
    slope: float = 0.35

    def read_sample(
        self,
        *,
        slope: float | None = None,
    ) -> dict[str, Any]:
        if self.source == "sim":
            return simulate_imu_sample(slope=slope if slope is not None else self.slope)
        if self.source == "ros2-replay":
            return self._read_ros2_replay_once()
        if self.source == "ros2":
            return self._read_ros2_once()
        raise ValueError(f"unknown imu source · 알 수 없는 source: {self.source}")

    def iter_samples(
        self,
        *,
        samples: int = 1,
        slope: float | None = None,
    ) -> Iterator[dict[str, Any]]:
        if self.source == "sim" and samples > 1:
            yield from iter_imu_stream(samples=samples, interval_ms=self.interval_ms)
            return

        for i in range(samples):
            if i > 0 and self.interval_ms > 0:
                time.sleep(self.interval_ms / 1000.0)
            yield self.read_sample(slope=slope)

    def _read_ros2_replay_once(self) -> dict[str, Any]:
        record = load_ros2_fixture(self.ros2_replay_path)
        return imu_sample_from_ros2_dict(record)

    def _read_ros2_once(self) -> dict[str, Any]:
        try:
            import rclpy  # type: ignore
            from rclpy.node import Node  # type: ignore
            from sensor_msgs.msg import Imu  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "ROS2 rclpy required · ROS2 필요: pip install cell-coding-bridge[ros2]"
            ) from exc

        holder: dict[str, Any] = {}
        outer = self

        class Grabber(Node):
            def __init__(self) -> None:
                super().__init__("cell_coding_imu_receptor")
                self.create_subscription(Imu, outer.ros2_topic, self._on_imu, 10)

            def _on_imu(self, msg: Any) -> None:
                holder["sample"] = imu_sample_from_ros2_imu_msg(msg)

        rclpy.init(args=None)
        node = Grabber()
        try:
            deadline = time.time() + 5.0
            while "sample" not in holder and time.time() < deadline:
                rclpy.spin_once(node, timeout_sec=0.1)
            if "sample" not in holder:
                raise RuntimeError(
                    f"no ROS2 IMU on topic · ROS2 IMU topic 수신 없음: {self.ros2_topic}"
                )
            return holder["sample"]
        finally:
            node.destroy_node()
            rclpy.shutdown()
