"""Registry signal ↔ ROS2 message mapping · registry 신호 ↔ ROS2 매핑."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any


def _vec3(record: dict[str, Any], key: str) -> tuple[float, float, float]:
    block = record.get(key, {})
    if not isinstance(block, dict):
        return 0.0, 0.0, 0.0
    return (
        float(block.get("x", 0.0)),
        float(block.get("y", 0.0)),
        float(block.get("z", 0.0)),
    )


def make_imu_sample(
    *,
    timestamp: float | None = None,
    accel_x: float = 0.0,
    accel_y: float = 0.0,
    accel_z: float = 9.81,
    gyro_x: float = 0.0,
    gyro_y: float = 0.0,
    gyro_z: float = 0.0,
) -> dict[str, Any]:
    """Build ImuSample inject payload · ImuSample inject."""
    return {
        "type": "ImuSample",
        "data": {
            "timestamp": timestamp if timestamp is not None else time.time() * 1000,
            "accelX": round(accel_x, 4),
            "accelY": round(accel_y, 4),
            "accelZ": round(accel_z, 4),
            "gyroX": round(gyro_x, 4),
            "gyroY": round(gyro_y, 4),
            "gyroZ": round(gyro_z, 4),
        },
    }


def imu_sample_from_ros2_dict(record: dict[str, Any]) -> dict[str, Any]:
    """sensor_msgs/Imu-like dict → ImuSample · ROS2 Imu fixture/msg."""
    ax, ay, az = _vec3(record, "linear_acceleration")
    gx, gy, gz = _vec3(record, "angular_velocity")
    stamp_ms = record.get("stamp_ms")
    ts = float(stamp_ms) if stamp_ms is not None else time.time() * 1000
    return make_imu_sample(
        timestamp=ts,
        accel_x=ax,
        accel_y=ay,
        accel_z=az,
        gyro_x=gx,
        gyro_y=gy,
        gyro_z=gz,
    )


def imu_sample_from_ros2_imu_msg(msg: Any) -> dict[str, Any]:
    """Live rclpy sensor_msgs/Imu → ImuSample."""
    stamp_ms = msg.header.stamp.sec * 1000.0 + msg.header.stamp.nanosec / 1_000_000.0
    return make_imu_sample(
        timestamp=stamp_ms,
        accel_x=float(msg.linear_acceleration.x),
        accel_y=float(msg.linear_acceleration.y),
        accel_z=float(msg.linear_acceleration.z),
        gyro_x=float(msg.angular_velocity.x),
        gyro_y=float(msg.angular_velocity.y),
        gyro_z=float(msg.angular_velocity.z),
    )


def make_joint_state(
    *,
    joint_id: str,
    angle: float,
    velocity: float = 0.0,
    torque: float = 0.0,
    timestamp: float | None = None,
) -> dict[str, Any]:
    """Build JointState inject payload · JointState inject."""
    payload: dict[str, Any] = {
        "type": "JointState",
        "data": {
            "jointId": joint_id,
            "angle": round(angle, 4),
            "velocity": round(velocity, 4),
            "torque": round(torque, 4),
        },
    }
    if timestamp is not None:
        payload["data"]["timestamp"] = timestamp
    return payload


def joint_state_from_ros2_dict(
    record: dict[str, Any],
    *,
    joint_index: int | None = None,
    joint_name: str | None = None,
) -> dict[str, Any]:
    """sensor_msgs/JointState-like dict → single JointState · ROS2 JointState fixture."""
    names = list(record.get("name") or [])
    positions = list(record.get("position") or [])
    velocities = list(record.get("velocity") or [])
    efforts = list(record.get("effort") or [])

    idx = 0
    if joint_name and joint_name in names:
        idx = names.index(joint_name)
    elif joint_index is not None:
        idx = joint_index
    elif "joint_index" in record:
        idx = int(record["joint_index"])

    if not names:
        names = [str(record.get("joint_id", record.get("jointId", f"joint_{idx}")))]

    if idx >= len(names):
        raise ValueError(f"joint index {idx} out of range · 관절 index 범위 초과")

    stamp_ms = record.get("stamp_ms")
    ts = float(stamp_ms) if stamp_ms is not None else None
    return make_joint_state(
        joint_id=str(names[idx]),
        angle=float(positions[idx]) if idx < len(positions) else 0.0,
        velocity=float(velocities[idx]) if idx < len(velocities) else 0.0,
        torque=float(efforts[idx]) if idx < len(efforts) else 0.0,
        timestamp=ts,
    )


def joint_state_from_ros2_joint_state_msg(
    msg: Any,
    *,
    joint_index: int = 0,
    joint_name: str | None = None,
) -> dict[str, Any]:
    """Live rclpy sensor_msgs/JointState → JointState."""
    names = list(msg.name)
    idx = names.index(joint_name) if joint_name and joint_name in names else joint_index
    stamp_ms = msg.header.stamp.sec * 1000.0 + msg.header.stamp.nanosec / 1_000_000.0
    return make_joint_state(
        joint_id=str(names[idx]),
        angle=float(msg.position[idx]) if idx < len(msg.position) else 0.0,
        velocity=float(msg.velocity[idx]) if idx < len(msg.velocity) else 0.0,
        torque=float(msg.effort[idx]) if idx < len(msg.effort) else 0.0,
        timestamp=stamp_ms,
    )


def make_twist_command(*, linear_x: float = 0.0, angular_z: float = 0.0) -> dict[str, Any]:
    """Build TwistCommand cell signal · TwistCommand."""
    return {
        "type": "TwistCommand",
        "data": {
            "linearX": round(linear_x, 4),
            "angularZ": round(angular_z, 4),
        },
    }


def path_command_to_twist(data: dict[str, Any]) -> dict[str, Any]:
    """Heuristic PathCommand → TwistCommand (demo actuator) · PathCommand→Twist."""
    speed = float(data.get("speed", 0.0))
    direction = str(data.get("direction", "forward")).lower()
    linear_x = 0.0
    angular_z = 0.0
    if direction in ("forward", "ahead", "front"):
        linear_x = speed
    elif direction in ("back", "backward", "rear", "retreat"):
        linear_x = -speed
    elif direction == "left":
        angular_z = speed
    elif direction == "right":
        angular_z = -speed
    else:
        linear_x = speed * 0.5
    return make_twist_command(linear_x=linear_x, angular_z=angular_z)


def follow_pulse_to_twist(data: dict[str, Any]) -> dict[str, Any]:
    """FollowPulse → TwistCommand (PET follow locomotion) · FollowPulse→Twist."""
    pace = float(data.get("pace", 0.3))
    return make_twist_command(linear_x=pace, angular_z=0.0)


def make_owner_ping(
    *,
    rssi: float,
    timestamp: float | None = None,
) -> dict[str, Any]:
    """Build OwnerPing inject payload · OwnerPing inject."""
    data: dict[str, Any] = {"rssi": round(rssi, 4)}
    if timestamp is not None:
        data["timestamp"] = timestamp
    return {"type": "OwnerPing", "data": data}


def owner_ping_from_ros2_dict(record: dict[str, Any]) -> dict[str, Any]:
    """BLE/ROS fixture dict → OwnerPing · owner RSSI fixture/msg."""
    rssi = float(record.get("rssi", record.get("data", 0.5)))
    stamp_ms = record.get("stamp_ms")
    ts = float(stamp_ms) if stamp_ms is not None else None
    return make_owner_ping(rssi=rssi, timestamp=ts)


def owner_ping_from_ros2_float_msg(msg: Any) -> dict[str, Any]:
    """Live rclpy std_msgs/Float32 (normalized RSSI) → OwnerPing."""
    return make_owner_ping(rssi=float(msg.data))


def twist_command_to_ros2_dict(cmd: dict[str, Any]) -> dict[str, Any]:
    """TwistCommand → geometry_msgs/Twist-like dict · ROS2 Twist publish용."""
    data = cmd.get("data", cmd)
    linear_x = float(data.get("linearX", 0.0))
    angular_z = float(data.get("angularZ", 0.0))
    return {
        "linear": {"x": linear_x, "y": 0.0, "z": 0.0},
        "angular": {"x": 0.0, "y": 0.0, "z": angular_z},
    }


def load_ros2_fixture(path: str | Path) -> dict[str, Any]:
    """Load JSON fixture (object or first element of array)."""
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    if isinstance(raw, list):
        if not raw:
            raise ValueError("fixture array is empty · fixture 배열 비어 있음")
        raw = raw[0]
    if not isinstance(raw, dict):
        raise ValueError("fixture must be JSON object · fixture는 object")
    return raw
