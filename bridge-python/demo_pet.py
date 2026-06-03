#!/usr/bin/env python3
"""OwnerPing → PET nervous cascade (A4 / A4-S / A4-H) · PET sim·hardware bridge."""

from __future__ import annotations

import argparse
from pathlib import Path

from cell_bridge.actuator import extract_pet_actions, format_pet_log
from cell_bridge.owner_receptor import OwnerReceptor
from cell_bridge.pet_actuator import PetActuator
from cell_bridge.runner import repo_root, run_cell_file, run_cell_stream


def trace_types(payload: dict) -> list[str]:
    trace = payload.get("trace") or payload.get("result", {}).get("trace", [])
    return [entry.get("signal", {}).get("type", "?") for entry in trace]


def main() -> int:
    default_replay = (
        repo_root()
        / "examples"
        / "pet-robot-sim"
        / "fixtures"
        / "ros2-owner-ping-sample.json"
    )
    default_sequence = (
        repo_root()
        / "examples"
        / "pet-robot-sim"
        / "fixtures"
        / "owner-ping-sequence.json"
    )
    parser = argparse.ArgumentParser(description="PET companion bridge (A4 / A4-S / A4-H)")
    parser.add_argument(
        "--cell",
        default=str(repo_root() / "examples" / "pet-robot-sim" / "pet-sim-organism.cell"),
        help="Path to .cell program (A4-S default; use pet-organism.cell for A4 golden)",
    )
    parser.add_argument(
        "--source",
        choices=("sim", "ros2", "ros2-replay"),
        default="sim",
        help="L1 owner source · L1 owner 소스",
    )
    parser.add_argument("--rssi", type=float, default=0.8, help="sim-only RSSI override (0–1)")
    parser.add_argument("--ros2-topic", default="/owner/rssi", help="std_msgs/Float32 RSSI topic")
    parser.add_argument(
        "--ros2-replay",
        default=str(default_replay),
        help="JSON fixture for ros2-replay (no ROS install required)",
    )
    parser.add_argument(
        "--replay-sequence",
        default="",
        help="JSON array fixture for multi-sample ros2-replay",
    )
    parser.add_argument("--samples", type=int, default=1)
    parser.add_argument("--interval-ms", type=float, default=500.0)
    parser.add_argument(
        "--publish-twist",
        action="store_true",
        help="Map FollowPulse → Twist on cmd_vel (sim log or ROS2)",
    )
    parser.add_argument(
        "--twist-sink",
        choices=("sim", "ros2"),
        default="sim",
        help="Twist output: stdout sim log or ROS2 publish",
    )
    parser.add_argument(
        "--cmd-vel-topic",
        default="/cmd_vel",
        help="geometry_msgs/Twist topic when --twist-sink ros2",
    )
    parser.add_argument(
        "--actuator-only",
        action="store_true",
        help="Skip organism action log; show actuator summary only",
    )
    parser.add_argument("--transpiled", action="store_true")
    args = parser.parse_args()
    cell_path = Path(args.cell)

    sequence_path = args.replay_sequence or (
        str(default_sequence) if args.source == "ros2-replay" and args.samples > 1 else None
    )

    receptor = OwnerReceptor(
        source=args.source,
        ros2_topic=args.ros2_topic,
        ros2_replay_path=args.ros2_replay,
        interval_ms=args.interval_ms,
    )

    pings = list(
        receptor.iter_pings(
            samples=args.samples,
            rssi=args.rssi if args.source == "sim" else None,
            sequence_path=sequence_path if sequence_path else None,
        )
    )

    mode = "transpiled" if args.transpiled else "AST"
    use_stream = args.samples > 1 and cell_path.name.endswith("-sim-organism.cell")

    if not use_stream:
        ping = pings[0]
        inject = {"type": ping["type"], "data": dict(ping["data"])}
        print(
            f"[1/1] Bridge ({args.source}, {mode}): "
            f"{inject['type']} {inject['data']}"
        )
        last_payload = run_cell_file(
            cell_path,
            inject["type"],
            inject["data"],
            transpiled=args.transpiled,
        )
    else:
        print(
            f"[stream] Bridge ({args.source}, {mode}): OwnerStream × {len(pings)} "
            f"@ {args.interval_ms}ms"
        )
        last_payload = run_cell_stream(
            cell_path,
            "OwnerPing",
            stream_name="OwnerStream",
            samples=[p["data"] for p in pings],
            interval_ms=args.interval_ms,
            transpiled=args.transpiled,
        )
        print(f"  last sample {pings[-1]['data']}")

    if not args.actuator_only:
        actions = extract_pet_actions(last_payload)
        print(format_pet_log(actions))

    if args.publish_twist:
        actuator = PetActuator(
            twist_sink=args.twist_sink,
            cmd_vel_topic=args.cmd_vel_topic,
        )
        result = actuator.apply_from_trace(last_payload)
        print(actuator.format_summary(result))

    print("Trace:", " -> ".join(trace_types(last_payload)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
