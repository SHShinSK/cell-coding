# Spiderling Sim — L1 Bridge · L1 브리지

**Registry mapping · 레지스트리 매핑:** [`registry/signals/robotics/cell.sig.json`](../../registry/signals/robotics/cell.sig.json)

## ImuSample (A2-S)

| `--source` | ROS2 type | Fixture · 픽스처 |
|------------|-----------|-----------------|
| `sim` | — | synthetic · synthetic |
| `ros2-replay` | `sensor_msgs/Imu` | [`fixtures/ros2-imu-sample.json`](fixtures/ros2-imu-sample.json) |
| `ros2` | live topic (default `/imu/data`) · live topic | ROS env required · ROS env 필요 |

```bash
cd bridge-python

# sim
python demo_spiderling_sim.py

# ROS2 replay (no ROS install · ROS 설치 없음)
python demo_spiderling_sim.py --source ros2-replay

# stream batch → cell run --stream
python demo_spiderling_sim.py --source ros2-replay --samples 5 --interval-ms 50

# PathCommand → TwistCommand log
python demo_spiderling_sim.py --publish-twist
```

## JointState (library / smoke · 라이브러리 / 스모크)

| `--source` | ROS2 type | Fixture · 픽스처 |
|------------|-----------|-----------------|
| `sim` | — | synthetic · synthetic |
| `ros2-replay` | `sensor_msgs/JointState` | [`fixtures/ros2-joint-state-sample.json`](fixtures/ros2-joint-state-sample.json) |
| `ros2` | live topic (default `/joint_states`) · live topic | ROS env required · ROS env 필요 |

```python
from cell_bridge import JointStateReceptor

js = JointStateReceptor(source="ros2-replay").read_sample()
```

## API · Python API

```python
from cell_bridge import ImuReceptor, run_cell_stream, TwistActuator

imu = ImuReceptor(source="ros2-replay").read_sample()
payload = run_cell_stream(
    "../examples/spiderling-sim/spiderling-sim-organism.cell",
    "ImuSample",
    stream_name="ImuStream",
    samples=[imu["data"]],
    interval_ms=10,
)
TwistActuator(sink="sim").publish_from_trace(payload)
```

See also · 참고: [`../spider-robot-sim/A3-H.md`](../spider-robot-sim/A3-H.md) (VisionFrame), [`../pet-robot-sim/A4-H.md`](../pet-robot-sim/A4-H.md) (OwnerPing).
