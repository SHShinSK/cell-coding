#!/usr/bin/env python3
"""VisionFrame → spider nervous cascade (A3-S / A3-H) · spider sim·hardware bridge."""

from __future__ import annotations

import argparse
from pathlib import Path

from cell_bridge.actuator import extract_spider_actions, format_spider_log
from cell_bridge.runner import repo_root, run_cell_file, run_cell_stream
from cell_bridge.spider_actuator import SpiderActuator
from cell_bridge.vision_receptor import VisionReceptor


def main() -> int:
    default_replay = (
        repo_root()
        / "examples"
        / "spider-robot-sim"
        / "fixtures"
        / "ros2-image-sample.json"
    )
    parser = argparse.ArgumentParser(description="Spider sim/hardware bridge (A3-S / A3-H)")
    parser.add_argument(
        "--cell",
        default=str(repo_root() / "examples" / "spider-robot-sim" / "spider-sim-organism.cell"),
        help="Path to .cell program (same for sim and hardware)",
    )
    parser.add_argument(
        "--source",
        choices=("sim", "camera", "ros2", "ros2-replay"),
        default="sim",
        help="L1 vision source · L1 vision 소스 (A3-S sim / A3-H camera|ros2)",
    )
    parser.add_argument("--contrast", type=float, default=0.6, help="sim-only override")
    parser.add_argument("--motion", type=float, default=0.3, help="sim-only override")
    parser.add_argument("--camera-index", type=int, default=0, help="OpenCV device index")
    parser.add_argument("--ros2-topic", default="/camera/image_raw", help="sensor_msgs/Image topic")
    parser.add_argument(
        "--ros2-replay",
        default=str(default_replay),
        help="JSON fixture for ros2-replay (no ROS install required)",
    )
    parser.add_argument("--samples", type=int, default=1)
    parser.add_argument("--interval-ms", type=float, default=33.0)
    parser.add_argument(
        "--publish-twist",
        action="store_true",
        help="Map PathCommand → Twist on cmd_vel (sim log or ROS2)",
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

    receptor = VisionReceptor(
        source=args.source,
        camera_index=args.camera_index,
        ros2_topic=args.ros2_topic,
        ros2_replay_path=args.ros2_replay,
        interval_ms=args.interval_ms,
    )

    frames = list(
        receptor.iter_frames(
            samples=args.samples,
            contrast=args.contrast if args.source == "sim" else None,
            motion=args.motion if args.source == "sim" else None,
        )
    )

    mode = "transpiled" if args.transpiled else "AST"

    if args.samples <= 1:
        frame = frames[0]
        inject = {"type": frame["type"], "data": dict(frame["data"])}
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
            f"[stream] Bridge ({args.source}, {mode}): VisionStream × {len(frames)} "
            f"@ {args.interval_ms}ms"
        )
        last_payload = run_cell_stream(
            cell_path,
            "VisionFrame",
            stream_name="VisionStream",
            samples=[f["data"] for f in frames],
            interval_ms=args.interval_ms,
            transpiled=args.transpiled,
        )
        print(f"  first frame {frames[0]['data']}")

    actions = extract_spider_actions(last_payload)
    if not args.actuator_only:
        print(format_spider_log(actions))

    if args.publish_twist:
        actuator = SpiderActuator(
            twist_sink=args.twist_sink,
            cmd_vel_topic=args.cmd_vel_topic,
        )
        result = actuator.apply_from_trace(last_payload)
        print(actuator.format_summary(result))

    trace_types = [t.get("signal", {}).get("type") for t in last_payload["result"]["trace"]]
    print("Trace:", " -> ".join(trace_types))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
