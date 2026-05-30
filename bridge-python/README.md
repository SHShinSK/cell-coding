# Cell Coding Python Bridge

Python adapters for **sensor inject** and **actuator readback** against the TypeScript `cell run` CLI.

Physical AI PoC: `MotionDetected` → `AlarmPulse`  
**Full guide · 전체 가이드:** [`examples/physical-ai-motion-alarm.md`](../examples/physical-ai-motion-alarm.md)

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

Future: camera/mic streams, GPIO alarm hardware.
