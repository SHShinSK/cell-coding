# Robotics L1 Bridge · 로보틱스 L1 브리지

**Registry · 레지스트리:** [`registry/signals/robotics/cell.sig.json`](../registry/signals/robotics/cell.sig.json)

Cell Coding **L1** adapters map ROS2 (or sim) messages ↔ Cell signals, then call `cell run` / `cell run --stream`.

Cell Coding **L1** adapter가 ROS2(또는 sim) 메시지 ↔ Cell signal을 매핑한 뒤 `cell run` / `cell run --stream`을 호출합니다.

```
ROS2 / sim / fixture JSON
    → Receptor (Imu / Joint / Vision / Owner)
    → ImuSample | JointState | VisionFrame | OwnerPing
    → cell run [--stream] (.cell organism)
    → trace JSON
    → Actuator (Twist / stance / social log)
    → geometry_msgs/Twist or /cmd_vel (optional)
```

## Receptors · 수용체

| Class · 클래스 | Cell signal | ROS2 message | Demo |
|---------------|-------------|--------------|------|
| `ImuReceptor` | `ImuSample` | `sensor_msgs/Imu` | `demo_spiderling_sim.py` |
| `JointStateReceptor` | `JointState` | `sensor_msgs/JointState` | `demo_robotics_bridge.py --mode joint` |
| `VisionReceptor` | `VisionFrame` | `sensor_msgs/Image` | `demo_spider_sim.py` |
| `OwnerReceptor` | `OwnerPing` | `std_msgs/Float32` (RSSI) | `demo_pet.py` |

Sources · 소스: `sim` · `ros2-replay` (JSON fixture, no ROS · ROS 불필요) · `ros2` (live — sourced ROS + `[ros2]` extra)

## Actuators · 액추에이터

| Class · 클래스 | Cell signal | ROS2 output · ROS2 출력 |
|---------------|-------------|-------------------------|
| `TwistActuator` | `TwistCommand` (or `PathCommand` mapped) | `geometry_msgs/Twist` on `/cmd_vel` |
| `SpiderActuator` | `PathCommand` + discrete (`WebSpan`, …) | same + trace readback · trace readback |
| `PetActuator` | `FollowPulse` + discrete (`VocalCue`, …) | same + trace readback · trace readback |

```bash
python demo_spiderling_sim.py --publish-twist
python demo_spider_sim.py --publish-twist --motion 0.8
python demo_pet.py --rssi 0.6 --publish-twist
python demo_spiderling_sim.py --publish-twist --twist-sink ros2 --cmd-vel-topic /cmd_vel
```

## Fixtures · 픽스처

| File · 파일 | Use · 용도 |
|------------|-----------|
| `examples/spiderling-sim/fixtures/ros2-imu-sample.json` | IMU replay |
| `examples/spiderling-sim/fixtures/ros2-joint-state-sample.json` | JointState replay |
| `examples/spider-robot-sim/fixtures/ros2-image-sample.json` | Vision replay |
| `examples/pet-robot-sim/fixtures/ros2-owner-ping-sample.json` | Owner RSSI replay |

## Smoke test · 스모크

```bash
cd bridge-python
python demo_robotics_bridge.py
python test_ros2_mapping.py
python test_vision_metrics.py
python demo_spiderling_sim.py --source ros2-replay
python demo_spider_sim.py --source ros2-replay --samples 3 --interval-ms 33
python demo_pet.py --source ros2-replay --samples 3 --interval-ms 500
```

## Optional deps · 선택 의존성

```bash
pip install cell-coding-bridge[camera]   # VisionReceptor camera
pip install cell-coding-bridge[ros2]     # live ros2 sources + Twist publish
```

## Not in scope (yet) · 미구현

- Multi-stream parallel inject (vision + IMU one session) · multi-stream parallel inject
- Long-running bridge daemon (still subprocess `cell run`) · 상시 bridge daemon
- `BatteryLevel` / `EstopPulse` live adapters · live Battery/Estop adapter

## Docs · 문서

| Tier · 계층 | SCENARIO | Hardware · 하드웨어 |
|------------|----------|-------------------|
| A2-S | [`spiderling-sim/SCENARIO.md`](../examples/spiderling-sim/SCENARIO.md) | [`BRIDGE.md`](../examples/spiderling-sim/BRIDGE.md) |
| A3-S / A3-H | [`spider-robot-sim/SCENARIO.md`](../examples/spider-robot-sim/SCENARIO.md) | [`A3-H.md`](../examples/spider-robot-sim/A3-H.md) |
| A4-S / A4-H | [`pet-robot-sim/SCENARIO.md`](../examples/pet-robot-sim/SCENARIO.md) | [`A4-H.md`](../examples/pet-robot-sim/A4-H.md) |
