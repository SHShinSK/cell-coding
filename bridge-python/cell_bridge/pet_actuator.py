"""PET robot L1 actuator — FollowPulse→Twist + social expression log · PET L1 액추에이터."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from cell_bridge.actuator import extract_pet_actions, format_pet_log
from cell_bridge.ros2_mapping import follow_pulse_to_twist
from cell_bridge.twist_actuator import TwistActuator, format_twist_log

TwistSink = Literal["sim", "ros2"]


def extract_pet_twist_commands(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Map FollowPulse entries in trace to TwistCommand."""
    trace = payload.get("trace")
    if trace is None:
        trace = payload.get("result", {}).get("trace", [])
    out: list[dict[str, Any]] = []
    for entry in trace:
        signal = entry.get("signal", {})
        if signal.get("type") != "FollowPulse":
            continue
        twist = follow_pulse_to_twist(signal.get("data", {}))
        out.append(
            {
                "from": entry.get("from"),
                "command": twist,
                "atMs": entry.get("atMs"),
                "mappedFrom": "FollowPulse",
            }
        )
    return out


@dataclass
class PetActuator:
    """Read PET organism trace and drive cmd_vel + log vocal/expression/comfort."""

    twist_sink: TwistSink = "sim"
    cmd_vel_topic: str = "/cmd_vel"
    log_discrete: bool = True

    def apply_from_trace(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Publish follow twists and return structured actuator readback."""
        twist = TwistActuator(sink=self.twist_sink, ros2_topic=self.cmd_vel_topic)
        commands = extract_pet_twist_commands(payload)
        for item in commands:
            twist.publish(item["command"])
        actions = extract_pet_actions(payload)
        return {"twists": commands, "actions": actions}

    def format_summary(self, result: dict[str, Any]) -> str:
        """Human-readable actuator block for demos."""
        lines: list[str] = ["", "  Actuator · 액추에이터:"]
        twist_lines = format_twist_log(result.get("twists", [])).splitlines()
        for line in twist_lines:
            lines.append(f"    {line}")
        if self.log_discrete:
            pet_lines = format_pet_log(result.get("actions", {})).splitlines()
            for line in pet_lines:
                if line.strip():
                    lines.append(f"    {line}")
        return "\n".join(lines)
