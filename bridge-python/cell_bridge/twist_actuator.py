"""Twist actuator — trace PathCommand → ROS2 cmd_vel (L1) · Twist L1 액추에이터."""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Literal

from cell_bridge.ros2_mapping import make_twist_command, path_command_to_twist, twist_command_to_ros2_dict

TwistSink = Literal["sim", "ros2"]


def extract_path_commands(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Find PathCommand entries in cell run trace · trace에서 PathCommand."""
    trace = payload.get("trace")
    if trace is None:
        trace = payload.get("result", {}).get("trace", [])
    out: list[dict[str, Any]] = []
    for entry in trace:
        signal = entry.get("signal", {})
        if signal.get("type") != "PathCommand":
            continue
        out.append(
            {
                "from": entry.get("from"),
                "data": signal.get("data", {}),
                "atMs": entry.get("atMs"),
            }
        )
    return out


def extract_twist_commands(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Find TwistCommand entries, or map PathCommand → TwistCommand."""
    trace = payload.get("trace")
    if trace is None:
        trace = payload.get("result", {}).get("trace", [])
    out: list[dict[str, Any]] = []
    for entry in trace:
        signal = entry.get("signal", {})
        sig_type = signal.get("type")
        if sig_type == "TwistCommand":
            out.append({"from": entry.get("from"), "command": signal, "atMs": entry.get("atMs")})
        elif sig_type == "PathCommand":
            twist = path_command_to_twist(signal.get("data", {}))
            out.append(
                {
                    "from": entry.get("from"),
                    "command": twist,
                    "atMs": entry.get("atMs"),
                    "mappedFrom": "PathCommand",
                }
            )
    return out


def format_twist_log(commands: list[dict[str, Any]]) -> str:
    """Human-readable twist lines for demo."""
    if not commands:
        return "No twist · Twist 출력 없음"
    lines: list[str] = []
    for item in commands:
        data = item.get("command", {}).get("data", {})
        tag = f" (from {item.get('mappedFrom')})" if item.get("mappedFrom") else ""
        lines.append(
            f"TWIST linearX={data.get('linearX')} angularZ={data.get('angularZ')}"
            f" @ {item.get('atMs', 0)}ms{tag}"
        )
    return "\n".join(lines)


@dataclass
class TwistActuator:
    """Publish TwistCommand to sim log or ROS2 geometry_msgs/Twist."""

    sink: TwistSink = "sim"
    ros2_topic: str = "/cmd_vel"

    def publish(self, command: dict[str, Any]) -> None:
        if command.get("type") != "TwistCommand":
            command = make_twist_command(
                linear_x=float(command.get("data", command).get("linearX", 0.0)),
                angular_z=float(command.get("data", command).get("angularZ", 0.0)),
            )
        if self.sink == "sim":
            ros = twist_command_to_ros2_dict(command)
            print(f"[TwistActuator sim] {self.ros2_topic} {ros}")
            return
        self._publish_ros2(command)

    def publish_from_trace(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        """Extract and publish all twist/path commands from a run payload."""
        commands = extract_twist_commands(payload)
        for item in commands:
            self.publish(item["command"])
        return commands

    def _publish_ros2(self, command: dict[str, Any]) -> None:
        try:
            import rclpy  # type: ignore
            from geometry_msgs.msg import Twist  # type: ignore
            from rclpy.node import Node  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "ROS2 rclpy required · ROS2 필요: pip install cell-coding-bridge[ros2]"
            ) from exc

        ros = twist_command_to_ros2_dict(command)
        topic = self.ros2_topic
        rclpy.init(args=None)

        class Publisher(Node):
            def __init__(self) -> None:
                super().__init__("cell_coding_twist_actuator")
                self.pub = self.create_publisher(Twist, topic, 10)

            def send(self, twist_dict: dict[str, Any]) -> None:
                msg = Twist()
                lin = twist_dict["linear"]
                ang = twist_dict["angular"]
                msg.linear.x = float(lin["x"])
                msg.angular.y = float(lin["y"])
                msg.linear.z = float(lin["z"])
                msg.angular.x = float(ang["x"])
                msg.angular.y = float(ang["y"])
                msg.angular.z = float(ang["z"])
                self.pub.publish(msg)

        node = Publisher()
        try:
            node.send(ros)
            deadline = time.time() + 0.5
            while time.time() < deadline:
                rclpy.spin_once(node, timeout_sec=0.05)
        finally:
            node.destroy_node()
            rclpy.shutdown()
