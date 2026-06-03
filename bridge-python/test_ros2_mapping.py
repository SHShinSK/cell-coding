"""Unit tests for ROS2 ↔ Cell signal mapping · ROS2 매핑 테스트."""

from __future__ import annotations

import unittest
from pathlib import Path

from cell_bridge.ros2_mapping import (
    imu_sample_from_ros2_dict,
    joint_state_from_ros2_dict,
    path_command_to_twist,
    follow_pulse_to_twist,
    make_owner_ping,
    owner_ping_from_ros2_dict,
    twist_command_to_ros2_dict,
)


class Ros2MappingTests(unittest.TestCase):
    def test_imu_fixture_mapping(self) -> None:
        record = {
            "stamp_ms": 1000.0,
            "linear_acceleration": {"x": 0.1, "y": 0.2, "z": 9.8},
            "angular_velocity": {"x": 0.0, "y": 0.0, "z": 0.05},
        }
        sample = imu_sample_from_ros2_dict(record)
        self.assertEqual(sample["type"], "ImuSample")
        self.assertAlmostEqual(sample["data"]["accelZ"], 9.8)
        self.assertAlmostEqual(sample["data"]["gyroZ"], 0.05)
        self.assertEqual(sample["data"]["timestamp"], 1000.0)

    def test_joint_fixture_by_index(self) -> None:
        record = {
            "name": ["a", "b"],
            "position": [0.1, 0.9],
            "velocity": [0.01, 0.02],
            "effort": [0.0, 3.0],
        }
        js = joint_state_from_ros2_dict(record, joint_index=1)
        self.assertEqual(js["data"]["jointId"], "b")
        self.assertAlmostEqual(js["data"]["angle"], 0.9)
        self.assertAlmostEqual(js["data"]["torque"], 3.0)

    def test_path_to_twist_forward(self) -> None:
        twist = path_command_to_twist({"direction": "forward", "speed": 0.5})
        self.assertAlmostEqual(twist["data"]["linearX"], 0.5)
        self.assertAlmostEqual(twist["data"]["angularZ"], 0.0)

    def test_path_to_twist_retreat(self) -> None:
        twist = path_command_to_twist({"direction": "retreat", "speed": 0.4})
        self.assertAlmostEqual(twist["data"]["linearX"], -0.4)

    def test_follow_pulse_to_twist(self) -> None:
        twist = follow_pulse_to_twist({"pace": 0.5})
        self.assertAlmostEqual(twist["data"]["linearX"], 0.5)
        self.assertAlmostEqual(twist["data"]["angularZ"], 0.0)

    def test_owner_ping_fixture_mapping(self) -> None:
        sample = owner_ping_from_ros2_dict({"rssi": 0.75, "stamp_ms": 2000.0})
        self.assertEqual(sample["type"], "OwnerPing")
        self.assertAlmostEqual(sample["data"]["rssi"], 0.75)
        self.assertEqual(sample["data"]["timestamp"], 2000.0)

    def test_owner_ping_fixture_without_stamp(self) -> None:
        sample = owner_ping_from_ros2_dict({"rssi": 0.6})
        self.assertNotIn("timestamp", sample["data"])

    def test_twist_to_ros2_dict(self) -> None:
        ros = twist_command_to_ros2_dict({"data": {"linearX": 0.2, "angularZ": -0.1}})
        self.assertAlmostEqual(ros["linear"]["x"], 0.2)
        self.assertAlmostEqual(ros["angular"]["z"], -0.1)

    def test_repo_imu_fixture_loads(self) -> None:
        root = Path(__file__).resolve().parents[2]
        path = root / "examples" / "spiderling-sim" / "fixtures" / "ros2-imu-sample.json"
        if not path.is_file():
            self.skipTest("fixture missing")
        import json

        sample = imu_sample_from_ros2_dict(json.loads(path.read_text(encoding="utf-8")))
        self.assertEqual(sample["type"], "ImuSample")
        self.assertGreater(sample["data"]["accelZ"], 9.0)


if __name__ == "__main__":
    unittest.main()
