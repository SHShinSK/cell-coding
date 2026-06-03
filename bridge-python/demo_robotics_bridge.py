#!/usr/bin/env python3
"""Robotics L1 bridge smoke — IMU / Joint / Vision receptors · 로보틱스 L1 스모크."""

from __future__ import annotations

import argparse
from pathlib import Path

from cell_bridge.imu_receptor import ImuReceptor
from cell_bridge.joint_receptor import JointStateReceptor
from cell_bridge.ros2_mapping import path_command_to_twist, twist_command_to_ros2_dict
from cell_bridge.runner import repo_root
from cell_bridge.vision_receptor import VisionReceptor


def main() -> int:
    root = repo_root()
    parser = argparse.ArgumentParser(description="Robotics L1 bridge smoke test")
    parser.add_argument(
        "--mode",
        choices=("all", "imu", "joint", "vision", "twist-map"),
        default="all",
    )
    args = parser.parse_args()

    if args.mode in ("all", "imu"):
        imu = ImuReceptor(
            source="ros2-replay",
            ros2_replay_path=str(root / "examples/spiderling-sim/fixtures/ros2-imu-sample.json"),
        ).read_sample()
        print("ImuSample:", imu["data"])

    if args.mode in ("all", "joint"):
        joint = JointStateReceptor(
            source="ros2-replay",
            ros2_replay_path=str(root / "examples/spiderling-sim/fixtures/ros2-joint-state-sample.json"),
        ).read_sample()
        print("JointState:", joint["data"])

    if args.mode in ("all", "vision"):
        vision = VisionReceptor(
            source="ros2-replay",
            ros2_replay_path=str(root / "examples/spider-robot-sim/fixtures/ros2-image-sample.json"),
        ).read_frame()
        print("VisionFrame:", vision["data"])

    if args.mode in ("all", "twist-map"):
        twist = path_command_to_twist({"direction": "forward", "speed": 0.4})
        ros = twist_command_to_ros2_dict(twist)
        print("PathCommand→Twist:", twist["data"], "→ ROS", ros)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
