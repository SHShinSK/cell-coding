"""Read alarm actuation from runtime trace · trace에서 알람 액션 추출."""

from __future__ import annotations

from typing import Any


def extract_alarm_actions(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Find AlarmPulse entries in cell run or cloud runtime payload."""
    trace = payload.get("trace")
    if trace is None:
        trace = payload.get("result", {}).get("trace", [])
    actions: list[dict[str, Any]] = []
    for entry in trace:
        signal = entry.get("signal", {})
        if signal.get("type") != "AlarmPulse":
            continue
        actions.append(
            {
                "from": entry.get("from"),
                "level": signal.get("data", {}).get("level"),
                "atMs": entry.get("atMs"),
            }
        )
    return actions


def format_alarm_log(actions: list[dict[str, Any]]) -> str:
    """Human-readable alarm lines for demo output."""
    if not actions:
        return "No alarm · 알람 없음"
    lines = []
    for action in actions:
        lines.append(
            f"ALARM [{action.get('level')}] from {action.get('from')} @ {action.get('atMs', 0)}ms"
        )
    return "\n".join(lines)
