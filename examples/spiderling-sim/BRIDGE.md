# Spiderling Sim — L1 Bridge · L1 브리지

**Registry mapping:** [`registry/signals/robotics/cell.sig.json`](../../registry/signals/robotics/cell.sig.json)

## ImuSample (A2-S)

| `--source` | ROS2 type | Fixture |
|------------|-----------|---------|
| `sim` | — | synthetic |
| `ros2-replay` | `sensor_msgs/Imu` | [`fixtures/ros2-imu-sample.json`](fixtures/ros2-imu-sample.json) |
| `ros2` | live topic (default `/imu/data`) | ROS env required |

```bash
cd bridge-python

# sim
python demo_spiderling_sim.py

# ROS2 replay (no ROS install)
python demo_spiderling_sim.py --source ros2-replay

# stream batch → cell run --stream
python demo_spiderling_sim.py --source ros2-replay --samples 5 --interval-ms 50

# PathCommand → TwistCommand log
python demo_spiderling_sim.py --publish-twist
```

## JointState (library / smoke)

| `--source` | ROS2 type | Fixture |
|------------|-----------|---------|
| `sim` | — | synthetic |
| `ros2-replay` | `sensor_msgs/JointState` | [`fixtures/ros2-joint-state-sample.json`](fixtures/ros2-joint-state-sample.json) |
| `ros2` | live topic (default `/joint_states`) | ROS env required |

```python
from cell_bridge import JointStateReceptor

js = JointStateReceptor(source="ros2-replay").read_sample()
```

## API · Python

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

See also: [`../spider-robot-sim/A3-H.md`](../spider-robot-sim/A3-H.md) (VisionFrame).
