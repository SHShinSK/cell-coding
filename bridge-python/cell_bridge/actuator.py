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


def extract_stance_actions(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Find StanceHold entries in cell run payload · StanceHold 추출."""
    trace = payload.get("trace")
    if trace is None:
        trace = payload.get("result", {}).get("trace", [])
    actions: list[dict[str, Any]] = []
    for entry in trace:
        signal = entry.get("signal", {})
        if signal.get("type") != "StanceHold":
            continue
        data = signal.get("data", {})
        actions.append(
            {
                "from": entry.get("from"),
                "stable": data.get("stable"),
                "atMs": entry.get("atMs"),
            }
        )
    return actions


def format_stance_log(actions: list[dict[str, Any]]) -> str:
    """Human-readable stance lines for spiderling-sim demo."""
    if not actions:
        return "No stance · 자세 출력 없음"
    lines = []
    for action in actions:
        stable = action.get("stable")
        lines.append(
            f"STANCE [stable={stable}] from {action.get('from')} @ {action.get('atMs', 0)}ms"
        )
    return "\n".join(lines)


def extract_spider_actions(payload: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    """Extract locomotion/action outputs from spider sim trace · spider sim 출력 추출."""
    trace = payload.get("trace")
    if trace is None:
        trace = payload.get("result", {}).get("trace", [])
    result: dict[str, list[dict[str, Any]]] = {
        "StanceHold": [],
        "WebSpan": [],
        "ChemicalPulse": [],
        "SensorFault": [],
    }
    for entry in trace:
        signal = entry.get("signal", {})
        sig_type = signal.get("type")
        if sig_type not in result:
            continue
        result[sig_type].append(
            {
                "from": entry.get("from"),
                "data": signal.get("data", {}),
                "atMs": entry.get("atMs"),
            }
        )
    return result


def format_spider_log(actions: dict[str, list[dict[str, Any]]]) -> str:
    """Human-readable spider sim action summary."""
    lines: list[str] = []
    for kind in ("StanceHold", "WebSpan", "ChemicalPulse", "SensorFault"):
        items = actions.get(kind, [])
        if not items:
            continue
        for item in items:
            lines.append(f"{kind} from {item.get('from')} @ {item.get('atMs', 0)}ms {item.get('data')}")
    return "\n".join(lines) if lines else "No spider actions · spider 출력 없음"


def extract_pet_actions(payload: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    """Extract interaction outputs from PET trace · PET trace 출력 추출."""
    trace = payload.get("trace")
    if trace is None:
        trace = payload.get("result", {}).get("trace", [])
    result: dict[str, list[dict[str, Any]]] = {
        "FollowPulse": [],
        "VocalCue": [],
        "ExpressionPulse": [],
        "ComfortAction": [],
        "DistressSignal": [],
    }
    for entry in trace:
        signal = entry.get("signal", {})
        sig_type = signal.get("type")
        if sig_type not in result:
            continue
        result[sig_type].append(
            {
                "from": entry.get("from"),
                "data": signal.get("data", {}),
                "atMs": entry.get("atMs"),
            }
        )
    return result


def format_pet_log(actions: dict[str, list[dict[str, Any]]]) -> str:
    """Human-readable PET action summary."""
    lines: list[str] = []
    for kind in ("FollowPulse", "VocalCue", "ExpressionPulse", "ComfortAction", "DistressSignal"):
        items = actions.get(kind, [])
        if not items:
            continue
        for item in items:
            lines.append(f"{kind} from {item.get('from')} @ {item.get('atMs', 0)}ms {item.get('data')}")
    return "\n".join(lines) if lines else "No pet actions · PET 출력 없음"
