# Cell Coding Python Bridge

Python adapters for **sensor inject** and **actuator readback** against the TypeScript `cell run` CLI.

Physical AI PoC: `MotionDetected` → `AlarmPulse`  
**Full guide · 전체 가이드:** [`examples/physical-ai-motion-alarm.md`](../examples/physical-ai-motion-alarm.md)

Spiderling sim (IMU → locomotion): [`examples/spiderling-sim/`](../examples/spiderling-sim/SCENARIO.md) · `python demo_spiderling_sim.py`

Spider sim (VisionFrame → nervous cascade): [`examples/spider-robot-sim/`](../examples/spider-robot-sim/SCENARIO.md) · `python demo_spider_sim.py`

**Robotics L1 bridge (registry `@signals/robotics-base`):** [`ROBOTICS.md`](ROBOTICS.md) · IMU / JointState / Vision / Twist

A3-H hardware (camera / ROS2, same `.cell`): [`examples/spider-robot-sim/A3-H.md`](../examples/spider-robot-sim/A3-H.md)

## Prerequisites · 사전 준비

Node.js 20+ and Python 3.10+. Requires **`@cell-coding/cli`** on PATH (or monorepo clone):

```bash
npm install -g @cell-coding/cli
pip install cell-coding-bridge   # PyPI · after v0.1.0 release
```

Monorepo dev:

```bash
cd typescript && npm install
```

## Demo · 데모

```bash
cd bridge-python
python demo.py
python demo.py --transpiled          # transpiled TS handlers
python demo.py --confidence 0.3      # no alarm · 알람 없음
python demo_spiderling_sim.py
python demo_spiderling_sim.py --source ros2-replay
python demo_spiderling_sim.py --samples 5 --interval-ms 50 --publish-twist
python demo_spider_sim.py --source ros2-replay --samples 3 --interval-ms 33
python demo_robotics_bridge.py
python demo_spider_sim.py --source camera --camera-index 0
python demo_pet.py --rssi 0.6 --publish-twist
python test_vision_metrics.py
python test_ros2_mapping.py
```

## Cloud runtime · cloud runtime

[`runtime-docker`](../runtime-docker/) organ HTTP ingress (`POST /v1/signals`):

```bash
# motion-alarm organ (:8087) — Physical AI default
docker compose -f runtime-docker/docker-compose.yml up -d motion-alarm redis
python demo_cloud.py

# auth-organ (:8081)
python demo_cloud.py --url http://127.0.0.1:8081

# divide gateway (:8086, profile divide-scale)
python demo_cloud.py --url http://127.0.0.1:8086
```

Environment · 환경 변수:

| Variable | Default | Description |
|----------|---------|-------------|
| `CELL_CLOUD_URL` | `http://127.0.0.1:8087` | `demo_cloud.py` base URL |
| `CELL_MOTION_ALARM_URL` | `http://127.0.0.1:8087` | motion-alarm organ |
| `CELL_NODE` | `node` | Node binary for `cell run` |
| `CELL_CLI` | `cell` | Override `cell` binary path |
| `CELL_FORCE_GLOBAL_CLI` | — | Use global `cell` even in monorepo |

## PyPI package · PyPI 패키지

```bash
pip install cell-coding-bridge
```

Requires `@cell-coding/cli` or monorepo `typescript/` for `run_cell_file()`.

## API · API

```python
from cell_bridge import simulate_motion, run_cell_file, extract_alarm_actions

motion = simulate_motion(confidence=0.95, x=100, y=200)
payload = run_cell_file("../examples/motion-alarm/motion-alarm.cell", motion["type"], motion["data"])
payload_ts = run_cell_file("../examples/motion-alarm/motion-alarm.cell", motion["type"], motion["data"], transpiled=True)
payload_valid = run_cell_file(
    "../examples/validator.cell",
    "RawInput",
    {"payload": "ok"},
    transpiled=True,
    functions="../examples/validator.functions.json",
)
payload_obs = run_cell_file(
    "../examples/motion-alarm/motion-alarm.cell",
    motion["type"],
    motion["data"],
    jaeger_ui_url="http://127.0.0.1:16686",
)
alarms = extract_alarm_actions(payload)

# stream batch (RFC-0001 · cell run --stream)
from cell_bridge import run_cell_stream, simulate_imu_sample

payload_stream = run_cell_stream(
    "../examples/spiderling-sim/spiderling-sim-organism.cell",
    "ImuSample",
    stream_name="ImuStream",
    template=simulate_imu_sample()["data"],
    sample_count=5,
    interval_ms=50,
)

# cloud runtime
from cell_bridge import post_signal, default_cloud_url
cloud = post_signal(default_cloud_url(), motion["type"], motion["data"])
alarms = extract_alarm_actions(cloud)
```

## Architecture · 구조

```
Python sensor (simulate_motion)
    → cell run --json (TypeScript runtime)
    → trace JSON
    → Python actuator (extract_alarm_actions)
```

Cloud path · cloud 경로:

```
simulate_motion → POST /v1/signals → cloud-serve (AlarmOrgan) → trace → extract_alarm_actions
```

Future: GPIO alarm hardware; see [`ROBOTICS.md`](ROBOTICS.md) for IMU/Joint/Vision/Twist adapters.

Optional extras · 선택 의존성:

```bash
pip install cell-coding-bridge[camera]   # USB camera (A3-H)
pip install cell-coding-bridge[ros2]     # ROS2 live (requires sourced ROS env)
```
