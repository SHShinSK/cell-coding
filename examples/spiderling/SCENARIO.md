# Spiderling Bot · 거미 새끼 봇

**Physical AI reference A2 · Physical AI 레퍼런스 A2**

After [Porifera Filter Bot (A1)](../porifera-filter/SCENARIO.md), this is the next step: **5 cells**, terrain-adaptive locomotion, linking toward the full [Spider robot](../../README.en.md#spider-robot--거미-로봇) scenario.

[A1 해면동물](../porifera-filter/SCENARIO.md) 다음 단계입니다. **5세포**, 지형 적응 보행, README **거미 로봇** 시나리오로 확장하는 중간 레퍼런스입니다.

Decompose by **role**, declare boundaries with **membrane**, connect through **signal**.  
**역할**로 분해하고, **막**으로 경계를 선언하며, **신호**로 연결합니다.

---

## Why spiderling · 왜 거미 새끼

| Stage · 단계 | Creature · 생물 | Cells · 세포 | Tier · 계층 |
|-------------|----------------|-------------|------------|
| A1 | Porifera Filter Bot | 3 | MICROBE |
| **A2 (this) · 지금** | **Spiderling Bot** | **5** | **PLANKTON** |
| A3 | Spider robot | 10+ | INSECT |
| A4 | Humanoid / PET | organ scale | — |

Spiderlings are small arachnids with **few specialized limbs and simple terrain reaction** — enough to show **TactileSense + GaitAct** without full vision/hearing/web organs.

거미 새끼는 **적은 수의 특화 다리와 단순한 지형 반응**으로, 비전·청각·거미줄 기관 없이 **촉각(TactileSense)과 보행(GaitAct)** 을 보여주기에 적합합니다.

> **Organ note · 기관 노트**  
> `SpiderThorax` is a **functional boundary** (cephalothorax + leg cluster), not an anatomical heart. It wraps `LocomotionTissue` and exports `StanceHold`.  
> `SpiderThorax`는 심장 같은 해부학적 장기가 아니라 **흉부+다리 군집 기능 경계**입니다.

---

## Environment · 환경

**Setting · 설정:** A small **ground robot** on uneven terrain. Contact pressure and slope/friction drive path and gait.

**작은 지면 로봇**이 울퉁불퉁한 지형을 이동합니다. 접촉 압력과 경사·마찰이 경로·보행을 결정합니다.

| Input · 입력 | Cell · 세포 |
|--------------|------------|
| `ContactEvent` | External touch · 외부 접촉 |
| `TactilePing` | After tactile sense · 촉각 처리 후 |
| `TerrainScan` | Slope / friction · 경사·마찰 |

| Output · 출력 | Meaning · 의미 |
|---------------|----------------|
| `PathCommand.direction` | `"forward"` or `"turn"` |
| `GaitStep` | Leg pattern · 다리 패턴 |
| `StanceHold.stable` | Posture locked · 자세 고정 |
| `LegFault` | Overload · 과부하 → immune retry |

---

## Cell mapping · 세포 매핑

| Cell | role (EN · KR) | Layer · 계층 |
|------|----------------|-------------|
| `TactileSenseCell` | Tactile contact sensing · 촉각 접촉 감지 | Sense · 감각 |
| `TerrainSenseCell` | Terrain slope and friction scan · 지형 경사·마찰 스캔 | Sense · 감각 |
| `PathDecideCell` | Path and gait routing · 경로·보행 라우팅 | Decide · 판단 |
| `GaitActCell` | Leg gait execution · 다리 보행 실행 | Act · 행동 |
| `StanceActCell` | Posture stabilization · 자세 안정화 | Act · 행동 |

### Hierarchy · 계층

```
ContactEvent
    → TactileSenseCell → TerrainSenseCell → PathDecideCell → GaitActCell → StanceActCell → StanceHold
         ↓ (pressure > 0.95)
    LegFault → immune LegPolicy (retry × 2, linear backoff)

LocomotionTissue (linear)
    └── SpiderThorax (organ, exports StanceHold)
            └── SpiderlingOrganism
```

---

## vs Porifera (A1) · A1 대비

| A1 Porifera | A2 Spiderling |
|-------------|---------------|
| 3 cells, aquarium filter | 5 cells, ground locomotion |
| Filter / absorb | Forward / turn |
| `SensorFault` + exponential backoff | `LegFault` + linear backoff |
| MICROBE | PLANKTON |

---

## Growth path · 확장 경로

**A3 Spider:** [Spider Robot reference (10 cells, 3 organs, nervous)](../spider-robot/SCENARIO.md)

**A3 거미:** [거미 로봇 레퍼런스 (10세포, 3기관, nervous)](../spider-robot/SCENARIO.md)

---

## Compile · 컴파일

Golden file: [`spiderling-organism.cell`](spiderling-organism.cell)

```bash
cd typescript && npm install && npm test
```

---

## Files · 파일

| File · 파일 | Purpose · 목적 |
|------------|---------------|
| `spiderling-organism.cell` | Golden `.cell` source |
| `SCENARIO.md` | This document |
