# PET Robot Sim · 반려(PET) 로봇 시뮬 (A4-S)

**Physical AI sim-real parity · Physical AI sim-real parity**

[A4 PET](../pet-robot/SCENARIO.md)와 **동일한 11세포·3기관·nervous** 구조에 RFC-0001 Phase 2(`stream`, membrane SLA, `onSample`)를 적용한 sim-real 레퍼런스입니다.

**학습 경로:** A1 → A2 → A3 → [A3-S](../spider-robot-sim/SCENARIO.md) → A4 → **A4-S (this)** → **[A4-H](A4-H.md)** → A5

---

## Why A4-S · 왜 A4-S

| 단계 | inject | 특징 |
|------|--------|------|
| A4 | `OwnerPing` | 컴파일·nervous·정서 레퍼런스 |
| **A4-S (this)** | `OwnerPing` via sim bridge | stream 선언 + membrane SLA + `onSample` |
| **[A4-H](A4-H.md)** | BLE/RSSI ROS2 adapter | **동일 `.cell`**, L1 bridge만 교체 |

A4-S는 **organism 구조를 바꾸지 않고** Physical AI 운영 계약(stream rate, latency budget)을 선언하는 방법을 보여줍니다.

---

## Streams · 스트림 선언

```cell
stream OwnerStream {
  rate: 2Hz;
  sample: OwnerPing;
}

stream TouchStream {
  rate: 10Hz;
  sample: TouchSample;
}
```

Bridge는 **`cell run --stream`** (batch) 또는 단일 inject(`external`)로 `OwnerPing`을 주입합니다.

---

## Entry cell SLA · 진입 세포 SLA

`PresenceSenseCell` membrane (RFC-0001 experimental):

| 필드 | 값 | 의미 |
|------|-----|------|
| `latency: budget` | 500ms | ~2Hz owner ping budget |
| `rate: max` | 2Hz | OwnerStream과 정합 |
| `staleness: reject` | 2000ms | stale ping drop |
| `onViolation` | holdLastSafe | 계약 위반 시 fail-safe |

Handler: `onSample(OwnerPing ping)` — stream sample 수신 패턴.

### Causality note · 인과 관계 (교육용 단순화)

이 PoC cascade는 **multimodal fusion이 아니라 linear teaching trace**입니다.

| 선언 | 실제 trace |
|------|------------|
| `TouchStream` / `TouchSample` | 이 cascade 경로에 **미사용** |
| `TouchSenseCell` | `OwnerPresence`를 받음 (실제 touch pad stream 아님) |
| Perception organ | presence → voice → context **순차** (parallel fusion 아님) |

로봇 적용 시: sense organ별 **parallel stream inject** + Decide organ **fusion cell**으로 재구성하세요. A4-S는 **membrane SLA + stream + nervous wiring** 레퍼런스입니다.

---

## Signal chain · 신호 연쇄

`OwnerPing.rssi` → `OwnerPresence.distance` → `TouchSignal.pressure` → `VoiceTone.calm` → `HomeContext.quiet` → `AffectState.valence` → `SocialIntent.mode`

| rssi | valence | intent | interaction |
|------|---------|--------|-------------|
| `0.8` (close) | 0.75 | comfort | purr + nuzzle + warm LED |
| `0.6` (moderate) | 0.35 | follow | FollowPulse + woof |
| `0.01` (lost) | — | distress | immune ComfortAction fallback |

---

## Quick start · 빠른 시작

```bash
cd bridge-python
python demo_pet.py --source sim --rssi 0.8
python demo_pet.py --source sim --rssi 0.6 --publish-twist
python demo_pet.py --source ros2-replay
python demo_pet.py --source ros2-replay --samples 3 --interval-ms 500
```

Golden A4 (stream 없음):

```bash
python demo_pet.py --cell ../examples/pet-robot/pet-organism.cell --source sim --rssi 0.8
```

---

## Files · 파일

| File · 파일 | Purpose · 목적 |
|------------|---------------|
| [`pet-sim-organism.cell`](pet-sim-organism.cell) | A4-S `.cell` (stream + SLA) |
| [`A4-H.md`](A4-H.md) | Hardware / ROS2 bridge |
| [`fixtures/`](fixtures/) | RSSI replay JSON |

---

## Growth path · 확장 경로

**A4-H:** [Hardware bridge (A4-H)](A4-H.md)

**A5 Humanoid:** [Humanoid reference (14 cells)](../humanoid-robot/SCENARIO.md)
