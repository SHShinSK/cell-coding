# PET Robot Sim · 반려(PET) 로봇 시뮬 (A4-S)

**Physical AI sim-real parity · Physical AI sim-real parity**

Same **11 cells · 3 organs · nervous** as [A4 PET](../pet-robot/SCENARIO.md), plus RFC-0001 Phase 2 (`stream`, membrane SLA, `onSample`).

[A4 PET](../pet-robot/SCENARIO.md)와 **동일한 11세포·3기관·nervous** 구조에 RFC-0001 Phase 2(`stream`, membrane SLA, `onSample`)를 적용한 sim-real 레퍼런스입니다.

**Learning path · 학습 경로:** [A1](../porifera-filter/SCENARIO.md) → [A2](../spiderling/SCENARIO.md) → [A3](../spider-robot/SCENARIO.md) → [A3-S](../spider-robot-sim/SCENARIO.md) → [A4](../pet-robot/SCENARIO.md) → **A4-S (this)** → **[A4-H](A4-H.md)** → [A5](../humanoid-robot/SCENARIO.md)

---

## Why A4-S · 왜 A4-S

| Stage · 단계 | Inject · 주입 | Notes · 특징 |
|-------------|--------------|-------------|
| A4 | `OwnerPing` | Compile · nervous · affect reference · 컴파일·nervous·정서 레퍼런스 |
| **A4-S (this) · 지금** | `OwnerPing` via sim bridge | Stream decl + membrane SLA + `onSample` · stream 선언 + membrane SLA + `onSample` |
| **[A4-H](A4-H.md)** | BLE/RSSI ROS2 adapter | **Same `.cell`** — L1 bridge swap only · **동일 `.cell`**, L1 bridge만 교체 |

A4-S shows how to declare Physical AI **operating contracts** (stream rate, latency budget) **without changing organism structure**.

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

Bridge injects `OwnerPing` via **`cell run --stream`** (batch) or single **`external`** inject.

Bridge는 **`cell run --stream`** (batch) 또는 단일 inject(`external`)로 `OwnerPing`을 주입합니다.

---

## Entry cell SLA · 진입 세포 SLA

`PresenceSenseCell` membrane (RFC-0001 experimental):

| Field · 필드 | Value · 값 | Meaning · 의미 |
|-------------|-----------|----------------|
| `latency: budget` | 500ms | ~2Hz owner ping budget · ~2Hz owner ping 예산 |
| `rate: max` | 2Hz | Aligned with OwnerStream · OwnerStream과 정합 |
| `staleness: reject` | 2000ms | Drop stale pings · stale ping 거부 |
| `onViolation` | holdLastSafe | Fail-safe on contract breach · 계약 위반 시 fail-safe |

Handler: `onSample(OwnerPing ping)` — stream sample receive pattern · stream sample 수신 패턴.

### Causality note · 인과 관계 (teaching simplification · 교육용 단순화)

This PoC cascade is a **linear teaching trace**, not multimodal fusion.

이 PoC cascade는 **multimodal fusion이 아니라 linear teaching trace**입니다.

| Declared · 선언 | Actual trace · 실제 trace |
|----------------|--------------------------|
| `TouchStream` / `TouchSample` | **Unused** on this path · 이 cascade 경로에 **미사용** |
| `TouchSenseCell` | Accepts `OwnerPresence` (not touch pad stream) · `OwnerPresence`를 받음 (실제 touch pad stream 아님) |
| Perception organ | Sequential presence → voice → context (not parallel fusion) · presence → voice → context **순차** (parallel fusion 아님) |

For real robots: **parallel stream inject** per sense organ + **fusion cell** in Decide organ. A4-S is a **membrane SLA + stream + nervous wiring** reference.

로봇 적용 시: sense organ별 **parallel stream inject** + Decide organ **fusion cell**으로 재구성하세요. A4-S는 **membrane SLA + stream + nervous wiring** 레퍼런스입니다.

---

## Signal chain · 신호 연쇄

`OwnerPing.rssi` → `OwnerPresence.distance` → `TouchSignal.pressure` → `VoiceTone.calm` → `HomeContext.quiet` → `AffectState.valence` → `SocialIntent.mode`

| rssi | valence | intent | interaction |
|------|---------|--------|-------------|
| `0.8` (close · 가까움) | 0.75 | comfort | purr + nuzzle + warm LED |
| `0.6` (moderate · 중간) | 0.35 | follow | FollowPulse + woof |
| `0.01` (lost · 소실) | — | distress | immune ComfortAction fallback |

---

## Quick start · 빠른 시작

```bash
cd bridge-python
python demo_pet.py --source sim --rssi 0.8
python demo_pet.py --source sim --rssi 0.6 --publish-twist
python demo_pet.py --source ros2-replay
python demo_pet.py --source ros2-replay --samples 3 --interval-ms 500
```

Golden A4 (no stream · stream 없음):

```bash
python demo_pet.py --cell ../examples/pet-robot/pet-organism.cell --source sim --rssi 0.8
```

---

## Files · 파일

| File · 파일 | Purpose · 목적 |
|------------|---------------|
| [`pet-sim-organism.cell`](pet-sim-organism.cell) | A4-S `.cell` (stream + SLA) |
| [`A4-H.md`](A4-H.md) | Hardware / ROS2 bridge · 하드웨어 / ROS2 bridge |
| [`fixtures/`](fixtures/) | RSSI replay JSON |

---

## Growth path · 확장 경로

**A4-H:** [Hardware bridge · 하드웨어 bridge (A4-H)](A4-H.md)

**A5 Humanoid:** [Humanoid reference (14 cells) · 휴머노이드 레퍼런스 (14세포)](../humanoid-robot/SCENARIO.md)
