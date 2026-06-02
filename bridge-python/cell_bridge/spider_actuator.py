"""Spider robot L1 actuator — PathCommand→Twist + discrete actions · 거미 L1 액추에이터."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from cell_bridge.actuator import extract_spider_actions, format_spider_log
from cell_bridge.twist_actuator import TwistActuator, extract_twist_commands, format_twist_log

TwistSink = Literal["sim", "ros2"]


@dataclass
class SpiderActuator:
    """Read spider organism trace and drive cmd_vel + log Web/Chemical/Stance."""

    twist_sink: TwistSink = "sim"
    cmd_vel_topic: str = "/cmd_vel"
    log_discrete: bool = True

    def apply_from_trace(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Publish twists and return structured actuator readback."""
        twist = TwistActuator(sink=self.twist_sink, ros2_topic=self.cmd_vel_topic)
        twists = twist.publish_from_trace(payload)
        actions = extract_spider_actions(payload)
        return {"twists": twists, "actions": actions}

    def format_summary(self, result: dict[str, Any]) -> str:
        """Human-readable actuator block for demos."""
        lines: list[str] = ["", "  Actuator · 액추에이터:"]
        twist_lines = format_twist_log(result.get("twists", [])).splitlines()
        for line in twist_lines:
            lines.append(f"    {line}")
        if self.log_discrete:
            spider_lines = format_spider_log(result.get("actions", {})).splitlines()
            for line in spider_lines:
                if line.strip():
                    lines.append(f"    {line}")
        return "\n".join(lines)
