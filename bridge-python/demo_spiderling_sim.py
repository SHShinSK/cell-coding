#!/usr/bin/env python3
"""ImuSample → StanceHold Physical AI demo (spiderling-sim) · spiderling-sim 데모."""

from __future__ import annotations

import argparse
from pathlib import Path

from cell_bridge.actuator import extract_stance_actions, format_stance_log
from cell_bridge.imu_receptor import ImuReceptor
from cell_bridge.runner import repo_root, run_cell_file, run_cell_stream
from cell_bridge.sensor import imu_magnitude
from cell_bridge.twist_actuator import TwistActuator, format_twist_log


def main() -> int:
    default_replay = (
        repo_root() / "examples" / "spiderling-sim" / "fixtures" / "ros2-imu-sample.json"
    )
    parser = argparse.ArgumentParser(description="Spiderling-sim IMU bridge (A2-S)")
    parser.add_argument(
        "--cell",
        default=str(repo_root() / "examples" / "spiderling-sim" / "spiderling-sim-organism.cell"),
        help="Path to .cell program",
    )
    parser.add_argument(
        "--source",
        choices=("sim", "ros2", "ros2-replay"),
        default="sim",
        help="L1 IMU source · sim / ROS2 live / JSON replay",
    )
    parser.add_argument("--slope", type=float, default=0.35, help="sim-only terrain proxy")
    parser.add_argument("--samples", type=int, default=1, help="IMU stream sample count")
    parser.add_argument("--interval-ms", type=float, default=50.0, help="Stream virtual interval (ms)")
    parser.add_argument("--ros2-topic", default="/imu/data", help="sensor_msgs/Imu topic")
    parser.add_argument("--ros2-replay", default=str(default_replay), help="JSON fixture path")
    parser.add_argument(
        "--publish-twist",
        action="store_true",
        help="Map PathCommand → TwistCommand and log/publish",
    )
    parser.add_argument("--twist-sink", choices=("sim", "ros2"), default="sim")
    parser.add_argument("--cmd-vel-topic", default="/cmd_vel")
    parser.add_argument("--transpiled", action="store_true")
    args = parser.parse_args()
    cell_path = Path(args.cell)
    mode = "transpiled" if args.transpiled else "AST"

    receptor = ImuReceptor(
        source=args.source,
        ros2_topic=args.ros2_topic,
        ros2_replay_path=args.ros2_replay,
        interval_ms=args.interval_ms,
        slope=args.slope,
    )

    if args.samples <= 1:
        imu = receptor.read_sample(slope=args.slope if args.source == "sim" else None)
        mag = imu_magnitude(imu)
        print(f"[1/1] Bridge ({args.source}, {mode}): {imu['type']} mag={mag:.3f} data={imu['data']}")
        payload = run_cell_file(
            cell_path,
            imu["type"],
            imu["data"],
            transpiled=args.transpiled,
        )
    else:
        samples = list(receptor.iter_samples(samples=args.samples))
        print(
            f"[stream] Bridge ({args.source}, {mode}): ImuStream × {len(samples)} "
            f"@ {args.interval_ms}ms"
        )
        template = samples[0]["data"]
        payload = run_cell_stream(
            cell_path,
            "ImuSample",
            stream_name="ImuStream",
            samples=[s["data"] for s in samples],
            interval_ms=args.interval_ms,
            transpiled=args.transpiled,
        )
        print(f"  first sample mag={imu_magnitude(samples[0]):.3f}")

    print(format_stance_log(extract_stance_actions(payload)))

    if args.publish_twist:
        actuator = TwistActuator(sink=args.twist_sink, ros2_topic=args.cmd_vel_topic)
        twists = actuator.publish_from_trace(payload)
        print(format_twist_log(twists))

    trace_types = [t.get("signal", {}).get("type") for t in payload["result"]["trace"]]
    print("Trace:", " -> ".join(trace_types))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
