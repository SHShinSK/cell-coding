#!/usr/bin/env python3
"""Physical AI demo via cloud runtime HTTP · cloud runtime HTTP 데모."""

from __future__ import annotations

import argparse

from cell_bridge.actuator import extract_alarm_actions, format_alarm_log
from cell_bridge.cloud import default_cloud_url, default_motion_alarm_url, post_signal
from cell_bridge.sensor import simulate_motion


def main() -> int:
    parser = argparse.ArgumentParser(description="Cell Coding cloud bridge demo")
    parser.add_argument(
        "--url",
        default=default_cloud_url(),
        help="Cloud runtime base URL (motion-alarm default :8087 · auth-organ :8081)",
    )
    parser.add_argument("--confidence", type=float, default=0.98)
    parser.add_argument("--x", type=float, default=150)
    parser.add_argument("--y", type=float, default=220)
    args = parser.parse_args()

    motion = simulate_motion(x=args.x, y=args.y, confidence=args.confidence)
    print(f"Cloud inject → {args.url}: {motion['type']} {motion['data']}")

    payload = post_signal(args.url, motion["type"], motion["data"])
    actions = extract_alarm_actions(payload)
    print(format_alarm_log(actions))

    trace = payload.get("trace") or payload.get("result", {}).get("trace", [])
    trace_types = [t.get("signal", {}).get("type") for t in trace]
    print("Trace:", " -> ".join(trace_types))

    if payload.get("divide"):
        divide = payload["divide"][0]
        print(
            "Divide:",
            f"replicas={divide.get('replicas')} targetReplica={divide.get('targetReplica')}",
        )
    if payload.get("gateway"):
        gw = payload["gateway"]
        print("Gateway:", f"upstream={gw.get('upstream')} targetReplica={gw.get('targetReplica')}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
