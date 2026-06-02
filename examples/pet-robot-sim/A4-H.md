# PET Robot Hardware · 반려(PET) 로봇 하드웨어 (A4-H)

**Physical AI sim-real parity — L1 adapter swap · L1 어댑터 교체**

[A4-S](SCENARIO.md)와 **동일한** [`pet-sim-organism.cell`](pet-sim-organism.cell)을 사용합니다.  
변경되는 것은 **L1 bridge만** — BLE owner tag RSSI 또는 ROS2 `std_msgs/Float32` → `OwnerPing`.

**학습 경로:** A4 → [A4-S](SCENARIO.md) → **A4-H (this)** → A5

---

## Principle · 원칙

| Layer | A4-S | A4-H |
|-------|------|------|
| L0 | Mock owner tag | BLE gateway / ROS2 RSSI topic |
| L1 | `simulate_owner_ping` | `OwnerReceptor(source=ros2\|ros2-replay)` |
| L2 | `PetSimOrganism` | **동일** `.cell` |

Organism·stream·membrane SLA는 그대로 두고, **Receptor만 교체**합니다.

---

## L1 adapters · L1 어댑터

| `--source` | 입력 | 의존성 |
|------------|------|--------|
| `sim` | mock RSSI | (없음) · A4-S |
| `ros2` | `std_msgs/Float32` on `/owner/rssi` | ROS2 + `rclpy` |
| `ros2-replay` | JSON fixture | (없음) · CI/Windows 데모 |

### OwnerPing mapping · 매핑

| Physical | Cell signal | 필드 |
|----------|-------------|------|
| normalized BLE RSSI | `OwnerPing.rssi` | 0.0–1.0 |
| sample time | `OwnerPing.timestamp` | epoch ms (SLA staleness) |

Registry hint: `OwnerPing` ↔ owner tag RSSI (see [`cell.sig.json`](../../registry/signals/robotics/cell.sig.json))

---

## Quick start · 빠른 시작

### 1) ROS2 replay (ROS 설치 없음)

```bash
cd bridge-python
python demo_pet.py --source ros2-replay
```

Fixture: [`fixtures/ros2-owner-ping-sample.json`](fixtures/ros2-owner-ping-sample.json)

Stale SLA demo (sensor timestamp in fixture — use with stream batch for enforcement):

```bash
python demo_pet.py --source ros2-replay \
  --ros2-replay ../examples/pet-robot-sim/fixtures/ros2-owner-ping-stale.json \
  --cell ../examples/pet-robot-sim/pet-sim-organism.cell
```

단일 `external` inject는 기본 **ingest staleness** 모드라 `stamp_ms`만으로는 drop되지 않을 수 있습니다. Stream batch + 오래된 `timestamp` 샘플은 `physical-sla.test.ts` 패턴을 참고하세요.

### 2) Owner stream replay (sequence)

```bash
python demo_pet.py --source ros2-replay --samples 3 --interval-ms 500 \
  --replay-sequence ../examples/pet-robot-sim/fixtures/owner-ping-sequence.json
```

### 3) ROS2 live topic

```bash
# ROS2 Humble/Jazzy — 터미널에서 ROS env source 후
source /opt/ros/humble/setup.bash
export ROS_DOMAIN_ID=0

python demo_pet.py --source ros2 --ros2-topic /owner/rssi
```

토픽이 없으면 5초 타임아웃 — `ros2 topic pub /owner/rssi std_msgs/Float32 "{data: 0.8}"` 로 테스트하세요.

### 4) Actuator · FollowPulse → cmd_vel

```bash
python demo_pet.py --source sim --rssi 0.6 --publish-twist
python demo_pet.py --rssi 0.8 --publish-twist   # comfort only, no twist
python demo_pet.py --publish-twist --twist-sink ros2 --cmd-vel-topic /cmd_vel
```

`FollowPulse` → `TwistCommand` → ROS2 `geometry_msgs/Twist`. `VocalCue` / `ExpressionPulse` / `ComfortAction`는 trace readback 로그.

### 5) A4 golden .cell (stream 없음)

```bash
python demo_pet.py --cell ../examples/pet-robot/pet-organism.cell --source sim --rssi 0.6 --publish-twist
```

---

## Architecture · 아키텍처

```mermaid
flowchart LR
  subgraph L0 [L0 Hardware · 하드웨어]
    BLE[Owner BLE tag]
    ROS[std_msgs/Float32]
  end

  subgraph L1 [L1 bridge-python]
    OR[OwnerReceptor]
    PA[PetActuator]
  end

  subgraph L2 [L2 unchanged · L2 동일]
    ORG[PetSimOrganism]
  end

  BLE --> OR
  ROS --> OR
  OR -->|OwnerPing| ORG
  ORG -->|trace| PA
  PA -->|/cmd_vel| ROS
```

---

## Smoke test · 스모크

```bash
cd bridge-python
python demo_pet.py --source ros2-replay
python demo_pet.py --source sim --rssi 0.6 --publish-twist
python test_ros2_mapping.py
npm run cell:test -- ../examples/pet-robot/pet-organism.cell   # from typescript/
```

---

## Not in scope (yet) · 미구현

- Live touch pad / microphone adapters (TouchStream remains teaching-only)
- Long-running bridge daemon
- Multi-stream parallel inject (owner + touch + voice)
