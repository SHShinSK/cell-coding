# Spider Robot Sim · 거미 로봇 시뮬 (A3-S)

**Physical AI sim-real parity · Physical AI sim-real parity**

[A3 Spider](../spider-robot/SCENARIO.md)와 **동일한 10세포·3기관·nervous** 구조에 RFC-0001 Phase 2(`stream`, membrane SLA, `onSample`)를 적용한 sim-real 레퍼런스입니다.

**학습 경로:** A1 → A2 → [A2-S](../spiderling-sim/SCENARIO.md) → A3 → **A3-S (this)** → **[A3-H](A3-H.md)** → A4 → A5

---

## Why A3-S · 왜 A3-S

| 단계 | inject | 특징 |
|------|--------|------|
| A3 | `VisionFrame` | 컴파일·nervous 레퍼런스 |
| **A3-S (this)** | `VisionFrame` via sim bridge | stream 선언 + membrane SLA + `onSample` |
| **[A3-H](A3-H.md)** | camera / ROS2 adapter | **동일 `.cell`**, L1 bridge만 교체 |

A3-S는 **organism 구조를 바꾸지 않고** Physical AI 운영 계약(stream rate, latency budget)을 선언하는 방법을 보여줍니다.

---

## Streams · 스트림 선언

```cell
stream VisionStream {
  rate: 30Hz;
  sample: VisionFrame;
}

stream ContactStream {
  rate: 100Hz;
  sample: ContactEvent;
}
```

Bridge는 **`cell run --stream`** (batch) 또는 단일 inject(`external`)로 `VisionFrame`/`ImuSample`을 주입합니다. Runtime SLA enforcement: staleness/rate/latency + Viewer trace.

---

## Entry cell SLA · 진입 세포 SLA

`VisionSenseCell` membrane (RFC-0001 experimental):

| 필드 | 값 | 의미 |
|------|-----|------|
| `latency: budget` | 33ms | ~30Hz vision budget |
| `rate: max` | 30Hz | VisionStream과 정합 |
| `staleness: reject` | 100ms | stale frame drop · runtime enforced |
| `onViolation` | holdLastSafe | 계약 위반 시 fail-safe |

Handler: `onSample(VisionFrame frame)` — stream sample 수신 패턴.

### Causality note · 인과 관계 (교육용 단순화)

이 PoC cascade는 **multimodal fusion이 아니라 linear teaching trace**입니다.

| 선언 | 실제 trace |
|------|------------|
| `ContactStream` / `ContactEvent` | 이 cascade 경로에 **미사용** |
| `TactileSenseCell` | `VisualCue`를 받음 (실제 촉각 stream 아님) |
| Sensing organ | vision → hearing → chemical **순차** (parallel fusion 아님) |

로봇 적용 시: sense organ별 **parallel stream inject** + Decide organ **fusion cell**으로 재구성하세요. A3-S는 **membrane SLA + stream + nervous wiring** 레퍼런스입니다.

---

## Architecture · 아키텍처

```mermaid
flowchart TB
  subgraph L0 [L0 Sim · 시뮬]
    CAM[Mock camera / Gazebo]
    ACT[Actuator log]
  end

  subgraph L1 [L1 bridge-python]
    SENS[simulate_vision_frame]
    OUT[extract_spider_actions]
  end

  subgraph L2 [L2 SpiderSimOrganism]
    S[SensingOrgan]
    L[LocomotionOrgan]
    A[ActionOrgan]
  end

  CAM --> SENS
  SENS -->|VisionFrame| S
  S -->|nervous ThreatAssessment| L
  S -->|nervous ThreatAssessment| A
  L --> OUT
  A --> OUT
  OUT --> ACT
```

---

## Quick start · 빠른 시작

```bash
# TypeScript runtime
cd typescript && npm install
npm run cell:run -- ../examples/spider-robot-sim/spider-sim-organism.cell VisionFrame '{"contrast":0.6,"motion":0.3}'

# Stream batch (single runtime session)
npm run cell:run -- --stream VisionStream --samples 3 --interval-ms 33 ../examples/spider-robot-sim/spider-sim-organism.cell VisionFrame '{"contrast":0.6,"motion":0.3}'

# Python bridge
cd ../bridge-python
python demo_spider_sim.py
python demo_spider_sim.py --contrast 0.05   # SensorFault path
python demo_spider_sim.py --samples 3 --interval-ms 33

# A3-H hardware (same .cell)
python demo_spider_sim.py --source ros2-replay
pip install cell-coding-bridge[camera]
python demo_spider_sim.py --source camera --camera-index 0

# Viewer JSON
cd ../typescript
npm run cell:run -- --json --out ../viewer/live-run.json ../examples/spider-robot-sim/spider-sim-organism.cell VisionFrame '{"contrast":0.6,"motion":0.3}'
```

**기대 trace (threat scenario):**

```text
VisionFrame → VisualCue → … → ThreatAssessment → PathCommand → … → StanceHold
                                                      ├→ WebSpan
                                                      └→ ChemicalPulse
```

---

## vs A3 · A3 대비

| | A3 | A3-S |
|---|-----|------|
| Cells / organs | 10 / 3 | 동일 |
| Nervous | EventBus × 2 | 동일 |
| Streams | — | VisionStream, ContactStream |
| Vision handler | `on(VisionFrame)` | `onSample(VisionFrame)` + SLA |
| Bridge demo | — | `demo_spider_sim.py` |

---

## Files · 파일

| File | Purpose |
|------|---------|
| `spider-sim-organism.cell` | A3-S golden source |
| `SCENARIO.md` | This document |
| `../../bridge-python/demo_spider_sim.py` | Sim bridge demo |
| `../../rfcs/RFC-0001-stream-membrane-physical-sla.md` | Stream + SLA spec |

---

## Compile · 컴파일

```bash
cd typescript && npm test
```
