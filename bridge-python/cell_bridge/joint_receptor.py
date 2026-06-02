"""JointState receptors — sim / ROS2 replay / ROS2 live · JointState L1 어댑터."""

from __future__ import annotations

import random
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator, Literal

from cell_bridge.ros2_mapping import (
    joint_state_from_ros2_dict,
    joint_state_from_ros2_joint_state_msg,
    load_ros2_fixture,
    make_joint_state,
)

JointSource = Literal["sim", "ros2", "ros2-replay"]


def _default_joint_replay_path() -> str:
    return str(
        Path(__file__).resolve().parents[2]
        / "examples"
        / "spiderling-sim"
        / "fixtures"
        / "ros2-joint-state-sample.json"
    )


def simulate_joint_state(
    *,
    joint_id: str = "hip_joint",
    angle: float | None = None,
    velocity: float | None = None,
    torque: float | None = None,
    seed: int | None = None,
) -> dict[str, Any]:
    """Synthetic JointState for demos · 가상 JointState."""
    rng = random.Random(seed)
    return make_joint_state(
        joint_id=joint_id,
        angle=angle if angle is not None else round(rng.uniform(-0.5, 0.5), 3),
        velocity=velocity if velocity is not None else round(rng.uniform(-0.1, 0.1), 3),
        torque=torque if torque is not None else round(rng.uniform(0.0, 2.0), 3),
        timestamp=time.time() * 1000,
    )


@dataclass
class JointStateReceptor:
    """L1 adapter: ROS2 JointState → Cell JointState (single joint)."""

    source: JointSource = "sim"
    ros2_topic: str = "/joint_states"
    ros2_replay_path: str = field(default_factory=_default_joint_replay_path)
    interval_ms: float = 20.0
    joint_index: int = 0
    joint_name: str | None = None
    sim_joint_id: str = "hip_joint"

    def read_sample(self) -> dict[str, Any]:
        if self.source == "sim":
            return simulate_joint_state(joint_id=self.sim_joint_id)
        if self.source == "ros2-replay":
            record = load_ros2_fixture(self.ros2_replay_path)
            return joint_state_from_ros2_dict(
                record,
                joint_index=self.joint_index,
                joint_name=self.joint_name,
            )
        if self.source == "ros2":
            return self._read_ros2_once()
        raise ValueError(f"unknown joint source · 알 수 없는 source: {self.source}")

    def iter_samples(self, *, samples: int = 1) -> Iterator[dict[str, Any]]:
        for i in range(samples):
            if i > 0 and self.interval_ms > 0:
                time.sleep(self.interval_ms / 1000.0)
            yield self.read_sample()

    def _read_ros2_once(self) -> dict[str, Any]:
        try:
            import rclpy  # type: ignore
            from rclpy.node import Node  # type: ignore
            from sensor_msgs.msg import JointState as RosJointState  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "ROS2 rclpy required · ROS2 필요: pip install cell-coding-bridge[ros2]"
            ) from exc

        holder: dict[str, Any] = {}
        outer = self

        class Grabber(Node):
            def __init__(self) -> None:
                super().__init__("cell_coding_joint_receptor")
                self.create_subscription(
                    RosJointState,
                    outer.ros2_topic,
                    self._on_joint,
                    10,
                )

            def _on_joint(self, msg: Any) -> None:
                holder["sample"] = joint_state_from_ros2_joint_state_msg(
                    msg,
                    joint_index=outer.joint_index,
                    joint_name=outer.joint_name,
                )

        rclpy.init(args=None)
        node = Grabber()
        try:
            deadline = time.time() + 5.0
            while "sample" not in holder and time.time() < deadline:
                rclpy.spin_once(node, timeout_sec=0.1)
            if "sample" not in holder:
                raise RuntimeError(
                    f"no ROS2 JointState on topic · topic 수신 없음: {self.ros2_topic}"
                )
            return holder["sample"]
        finally:
            node.destroy_node()
            rclpy.shutdown()
