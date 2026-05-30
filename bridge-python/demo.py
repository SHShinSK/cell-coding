#!/usr/bin/env python3
"""MotionDetected → AlarmPulse Physical AI demo · Physical AI 데모."""

from __future__ import annotations

import argparse
from pathlib import Path

from cell_bridge.actuator import extract_alarm_actions, format_alarm_log
from cell_bridge.runner import repo_root, run_cell_file
from cell_bridge.sensor import simulate_motion


def main() -> int:
    parser = argparse.ArgumentParser(description="Cell Coding Python bridge demo")
    parser.add_argument(
        "--cell",
        default=str(repo_root() / "examples" / "motion-alarm" / "motion-alarm.cell"),
        help="Path to .cell program",
    )
    parser.add_argument("--confidence", type=float, default=0.98)
    parser.add_argument("--x", type=float, default=150)
    parser.add_argument("--y", type=float, default=220)
    parser.add_argument(
        "--transpiled",
        action="store_true",
        help="Use cell run --transpiled TS handlers · transpiled handler",
    )
    args = parser.parse_args()

    motion = simulate_motion(x=args.x, y=args.y, confidence=args.confidence)
    mode = "transpiled" if args.transpiled else "AST"
    print(f"Bridge inject ({mode}): {motion['type']} {motion['data']}")

    payload = run_cell_file(
        Path(args.cell),
        motion["type"],
        motion["data"],
        transpiled=args.transpiled,
    )
    actions = extract_alarm_actions(payload)
    print(format_alarm_log(actions))

    trace_types = [t.get("signal", {}).get("type") for t in payload["result"]["trace"]]
    print("Trace:", " -> ".join(trace_types))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
