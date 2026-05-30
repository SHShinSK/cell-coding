# Porifera Filter Bot · 해면동물 필터 봇

**Start here for Physical AI reference · Physical AI 레퍼런스 시작점**

Decompose by **role**, declare boundaries with **membrane**, and connect systems through **signal**.  
**역할(role)**로 분해하고, **막(membrane)**으로 경계를 선언하며, **신호(signal)**로 시스템을 연결한다.

---

## Why sponge · 왜 해면동물

Porifera (sponges) are the **simplest multicellular animals**. They have specialized cell types but no classical organs — a perfect match for Cell Coding's **MICROBE tier (3–5 cells)**.

해면동물(Porifera)은 **가장 단순한 다세포 동물**입니다. 역할이 분화된 세포는 있지만 고전적인 장기는 없어, Cell Coding **MICROBE 계층(3~5세포)** 과 잘 맞습니다.

> **Biology vs compiler note · 생물학 ↔ 컴파일러 정합**  
> Real sponges have no anatomical organs. In Cell Coding, `organ` means a **functional boundary**, not a heart or lung. We map the sponge **aquiferous system (body wall)** to a single organ `SpongeBody` so the graph `organism → organ → tissue → cell` stays connected.  
> 실제 해면에는 해부학적 장기가 없습니다. Cell Coding에서 `organ`은 심장·폐 같은 장기가 아니라 **기능 경계**입니다. 해면의 **수관계(몸벽)** 를 `SpongeBody` 하나로 매핑해 `organism → organ → tissue → cell` 그래프를 완전히 연결합니다.

This is the first step after [`validator.cell`](../validator.cell): full hierarchy with tissue, organ, organism, and immune.

[`validator.cell`](../validator.cell) 다음 단계로 tissue·organ·organism·immune 전 계층을 최소 규모로 보여줍니다.

---

## Environment & demo · 환경과 데모

**Setting · 설정:** A virtual **aquarium** Physical AI environment. Water flows through a sponge-shaped filter bot. Particles vary in density; turbidity spikes trigger fault handling.

**가상 수조(aquarium) Physical AI** 환경. 물이 해면형 필터 봇을 통과하며, 입자 밀도와 탁도가 변하고, 과부하 시 immune 정책이 동작합니다.

| Input · 입력 | Meaning · 의미 |
|--------------|----------------|
| `WaterSample.turbidity` | 0.0–1.0, water clarity · 물 탁도 |
| `WaterSample.flowRate` | Flow rate · 유량 |
| `ParticleLoad.density` | Particle concentration · 입자 농도 |

| Output · 출력 | Meaning · 의미 |
|---------------|----------------|
| `FilterCommand.action` | `"pass"` or `"absorb"` · 통과 또는 흡수 |
| `ExhalePulse` | Filtered outflow · 여과수 배출 |
| `SensorFault` | Sensor overload · 센서 과부하 |

**Phase 2 (planned):** Browser canvas or Node simulation — particles flow, three cells react via signals.  
**Phase 2 (예정):** 브라우저 캔버스 또는 Node 시뮬 — 입자 흐름과 3세포 신호 반응.

---

## Cell mapping · 세포 매핑

| Biology · 생물 | Role · 역할 | Cell | role (EN · KR) |
|----------------|------------|------|----------------|
| Choanocyte | Inflow, particle capture · 유입·포집 | `InflowSenseCell` | Water inflow sensing · 물 유입 감지 |
| Amoebocyte | Internal routing · 내부 라우팅 | `FilterDecideCell` | Filter routing · 여과 경로 판단 |
| Pinacocyte / Osculum | Outflow · 배출 | `OutflowActCell` | Filtered outflow · 여과수 배출 |

### Hierarchy · 계층

| Layer · 계층 | Name · 이름 | Description · 설명 |
|-------------|------------|-------------------|
| Cell × 3 | Inflow / Decide / Outflow | Specialized units · 역할 분화 |
| Tissue × 1 | `FilterTissue` | Linear flow · 선형 flow |
| Organ × 1 | `SpongeBody` | Wraps tissue, exports `ExhalePulse` · tissue 감싸기 |
| Organism × 1 | `SpongeOrganism` | References organ + immune · 기관 참조 + 면역 |

---

## Signal flow · 신호 흐름

```
WaterSample
    │
    ▼
InflowSenseCell ──ParticleLoad──▶ FilterDecideCell ──FilterCommand──▶ OutflowActCell ──▶ ExhalePulse
    │
    └── (turbidity > 0.8) ──▶ SensorFault ──▶ immune SensorPolicy (retry × 3, exponential backoff)
```

1. **InflowSenseCell** accepts `WaterSample`. High turbidity → `SensorFault`; otherwise → `ParticleLoad`.
2. **FilterDecideCell** routes by density: low → `pass`, high → `absorb`.
3. **OutflowActCell** accepts `FilterCommand`, emits `ExhalePulse`.
4. **SpongeBody** organ exports `ExhalePulse` to the environment boundary.
5. **SpongeOrganism** immune retries on `SensorFault`.

---

## vs single pipeline · 단일 파이프라인 대비

| Single pipeline · 단일 파이프라인 | Cell Coding · 세포코딩 |
|----------------------------------|------------------------|
| One function chain · 하나의 함수 체인 | Each cell has its own membrane contract · 세포마다 막 계약 |
| Failure stops everything · 실패 시 전체 중단 | `immune` retries only the fault path · immune이 fault 경로만 재시도 |
| Hard to swap a stage · 단계 교체 어려움 | Replace one cell, keep signals · 한 세포만 교체, 신호 유지 |

---

## Growth path · 확장 경로

| Stage · 단계 | Creature · 생물 | Cells · 세포 | Adds · 추가 |
|-------------|----------------|-------------|------------|
| **A1** | Porifera Filter Bot | 3 | tissue, organ, organism, immune |
| **A2** | [Spiderling Bot](../spiderling/SCENARIO.md) | 5 | + TactileSense, GaitAct, terrain path |
| A3 | [Spider Robot](../spider-robot/SCENARIO.md) | 10 | 3 organs, nervous routing |
| A4 | [PET Companion](../pet-robot/SCENARIO.md) | 11 | affect, safety, home interaction |
| A5 | [Humanoid](../humanoid-robot/SCENARIO.md) | 14 | 4 organs, balance + manipulation + interaction |

---

## Compile · 컴파일

Golden file: [`sponge-organism.cell`](sponge-organism.cell)

```bash
cd typescript && npm install && npm test
```

The test suite includes a smoke test that compiles this file with **zero errors**.

---

## Files · 파일

| File · 파일 | Purpose · 목적 |
|------------|---------------|
| `sponge-organism.cell` | Golden `.cell` source · 골든 소스 |
| `SCENARIO.md` | This document · 본 문서 |
