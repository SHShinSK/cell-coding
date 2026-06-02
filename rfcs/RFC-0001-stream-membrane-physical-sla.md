# RFC-0001: Stream 신호와 Membrane Physical SLA

- 상태: Review (Phase 2 parser + runtime enforcement landed)
- 작성일: 2026-06-02
- 작성자: @SHShinSK
- 관련 이슈: (TBD — Physical AI Phase 1)

## 1. 요약

Physical AI는 **이산 이벤트(Pulse)** 와 **연속 센서 흐름(Stream)** 이 공존한다. 본 RFC는 Cell Coding DSL에 `stream` 타입 선언과 `membrane` 물리 SLA(`latency`, `rate`, `staleness`, `onViolation`)를 실험적으로 추가하는 방안을 제안한다. 1단계는 **문법·의미론·관측 메타**만 정의하고, 2단계에서 런타임 enforcement를 도입한다. `examples/spiderling-sim/` 과 `registry/signals/robotics/base.cell` 이 이 RFC의 PoC 참조 구현이다.

## 2. 문제 정의

현재 Cell Coding의 `signal`은 이벤트 단위(`MotionDetected`, `ContactEvent`)에 최적화되어 있다. Physical AI 시스템은 IMU·관절·LiDAR처럼 **고주파 연속 입력**과 E-stop·위협 감지 같은 **저지연 Pulse**를 동시에 처리해야 한다.

또한 `membrane { accepts; emits }` 는 **타입 계약**만 표현한다. 실제 로봇/엣지 환경에서는 **지연 예산**, **샘플 rate**, **stale 데이터 거부**, **계약 위반 시 fail-safe** 가 필수 운영 요구사항이다.

Redis Streams(`signal-bus-streams.ts`)는 분산 nervous 라우팅용 인프라이며, DSL 수준의 Stream/Pulse 구분과는 별개다.

## 3. 목표 / 비목표

### 목표

- Pulse(`signal`)와 Stream(`stream`)의 의미론 분리
- `membrane`에 Physical SLA 필드 추가 (실험 플래그)
- Bridge 레이어에서 Stream sample → Pulse 변환 패턴 표준화
- Viewer trace에 `latencyMs`, `sensorAgeMs`, `streamSeq` 메타 확장

### 비목표

- 독립 언어로의 전환
- 특정 ROS2/DDS 구현에 종속
- 1단계에서 하드웨어 reflex loop 자동 생성
- 기존 `.cell` 파일의 강제 마이그레이션

## 4. 제안 상세

### 4.1 Pulse vs Stream

| 구분 | 키워드 | 의미 | 핸들러 | Bridge |
|------|--------|------|--------|--------|
| Pulse | `signal` | 이산 이벤트 | `on(SignalType)` | 1회 inject (`external`) |
| Stream | `stream` | 연속 샘플 시퀀스 | `onSample(SampleType)` | `stream:<Name>` batch / `--stream` CLI |

```cell
// Pulse — 위협, E-stop, 버튼
signal EstopPulse {
  active: Boolean;
  source: String;
}

// Stream — IMU, 관절, 배터리 telemetry
stream ImuStream {
  rate: 200Hz;
  sample ImuSample {
    timestamp: Number;
    accelX: Number;
    accelY: Number;
    accelZ: Number;
  }
}
```

**Phase 1 호환:** Stream이 아직 컴파일되지 않는 동안, registry 표준 `ImuSample` 을 `signal`로 선언하고 bridge가 주기 inject한다. `ImuStreamGateCell` 이 stream sample → domain pulse 변환을 담당한다.

### 4.2 Membrane Physical SLA

```cell
cell ImuStreamGateCell {
  role: "IMU stream to contact pulse gateway · IMU 스트림→접촉 펄스 게이트";

  membrane {
    accepts: ImuSample;
    emits: ContactEvent;
    latency: budget 20ms;       // experimental · 이 세포 처리 지연 상한
    rate: max 200Hz;             // experimental · accepts 최대 수신 rate
    staleness: reject 50ms;      // experimental · timestamp age 초과 시 drop
    onViolation: holdLastSafe;   // experimental · 위반 시 마지막 안전 출력 유지
  }

  onSample(ImuSample sample) {
    emit ContactEvent;
  }
}
```

**Runtime semantics (v0.3.x):** `onSample` handlers are preferred when inject `from` is `stream:<StreamName>`. Pulse inject (`external`) prefers `on(...)`; if only `onSample` exists, it still runs (bridge compat).

**Rate SSOT:** `stream { rate: NHz }` is the declared nominal rate; default `--interval-ms` = `1000/N`. `membrane { rate: max NHz }` enforces at runtime (virtual 1s window). Mismatch → checker warning.

| 필드 | meaning | Phase 2 runtime |
|------|------|-------------------|
| `latency: budget Nms` | handler wall time (observed **after** handler) | trace + violation; does not undo emits |
| `rate: max NHz` | membrane accepts per virtual 1s window | drop |
| `staleness: reject Nms` | sample age (`ingestWallMs` default, or sensor timestamp mode) | drop |
| `onViolation` | `holdLastSafe` \| `drop` \| `emitFault` | holdLastSafe applies to staleness/rate only |

Checker warns on experimental membrane SLA; runtime enforces as of v0.3.x.

### 4.3 3계층 Physical Stack

```
L0 Physical   — 센서/액추에이터/시뮬
L1 Bridge     — Receptor/Actuator adapter (Python, ROS2, GPIO)
L2 Organism   — Sense / Decide / Act cells (.cell)
```

Bridge는 L1에서 Stream을 sample 단위로 inject하고, organism 내부 `*GateCell` 이 domain pulse로 변환한다. Act 쪽은 `StanceHold`, `AlarmPulse` 등을 actuator adapter가 읽는다.

### 4.4 Sense · Decide · Act 레인 (권장 규칙)

- **Sense tissue:** 외부 입력만 accepts, Act tissue에 직접 연결 금지
- **Decide tissue:** fusion/routing
- **Act tissue:** actuator-bound emits

`spiderling-sim` 은 단일 linear tissue PoC이며, A3 Spider는 organ 단위로 Sense/Decide/Act 분리를 따른다.

## 5. 예시

### 입력 (bridge — IMU sample)

```json
{
  "type": "ImuSample",
  "data": {
    "timestamp": 1710000000123,
    "accelX": 0.1,
    "accelY": 0.2,
    "accelZ": 9.81,
    "gyroZ": 0.05
  }
}
```

### 출력 (organism trace)

```text
ImuSample → ContactEvent → TactilePing → TerrainScan → PathCommand → GaitStep → StanceHold
```

### Registry 표준 신호

`registry/signals/robotics/base.cell` — `ImuSample`, `JointState`, `BatteryLevel`, `EstopPulse`

## 6. 대안 비교

| 대안 | 장점 | 단점 |
|------|------|------|
| **A. signal만 유지 + bridge downsampling** | 구현 비용 최소 | 연속성·SLA 표현 불가 |
| **B. stream 키워드 추가 (본 RFC)** | Physical AI 모델과 정합 | 컴파일러·런타임 확장 필요 |
| **C. ROS msg를 membrane 타입으로 직접 import** | 생태계 호환 | 벤더 종속, DSL 비대화 |
| **D. annotation 주석만 (`// @rate 200Hz`)** | 빠른 PoC | 도구화·검증 어려움 |

**권장:** B를 목표로, A로 Phase 1 PoC (`spiderling-sim`), D는 RFC 토론용으로만 허용.

## 7. 하위 호환성 영향

- **브레이킹 변경:** 없음 (신규 키워드·선택적 membrane 필드)
- **기존 `.cell`:** 그대로 컴파일
- **마이그레이션:** Physical AI 예제는 registry signal 복사 또는 향후 `import` 문법 도입

## 8. 롤아웃 계획

1. **실험 (v0.2.x):** RFC Accepted, `spiderling-sim`, registry signals, checker SLA warning
2. **기본 (v0.3.x):** `stream` / `onSample` parser, trace physical meta, **`cell run --stream` batch inject**
3. **강화 (v0.3.x+):** runtime SLA enforcement (staleness/rate/latency), Viewer SLA UI, `ingestWallMs` bridge staleness
4. **다음 (v0.4.x):** immune ↔ SLA 연동, multi-stream co-inject, ROS2 live adapters 확장

## 9. 테스트 및 검증 계획

- `registry/signals/robotics/base.cell` compile smoke
- `examples/spiderling-sim/spiderling-sim-organism.cell` compile + `cell run` E2E
- `bridge-python/demo_spiderling_sim.py` — ImuSample inject → StanceHold
- Phase 2: synthetic overload test (rate/staleness violation counters)

## 10. 보안 / 성능 / 운영 영향

- **보안:** `EstopPulse` 는 highest-priority nervous route 후보; reflex loop는 organism 밖 문서화
- **성능:** Stream enforcement는 organ별 rate limiter; divide gateway와 호환 검토 필요
- **관측:** trace JSON에 `physical: { latencyMs, sensorAgeMs, streamSeq }` 추가

## 11. 오픈 이슈

- ~~`onSample` vs `on`~~ → v0.3.x: stream inject prefers `onSample`, external prefers `on` (fallback if only one kind)
- ~~stream rate vs membrane rate~~ → checker warning; CLI default interval from `stream.rateHz`
- `stream` 윈도우 집계 (`window: 100ms`) 문법
- multi-stream **parallel** co-inject (vision + IMU same session)
- `endocrine` 키워드와 BatteryLevel stream 관계
- ROS2 live adapters: `JointState`, `TwistCommand` (registry only today)
- immune ↔ SLA escalation 연동
- long-running runtime (no subprocess per pulse)

## 12. 부록

- PoC: [`examples/spiderling-sim/`](../examples/spiderling-sim/)
- Registry: [`registry/signals/robotics/base.cell`](../registry/signals/robotics/base.cell)
- Bridge: [`bridge-python/demo_spiderling_sim.py`](../bridge-python/demo_spiderling_sim.py)
- Related: [`examples/physical-ai-motion-alarm.md`](../examples/physical-ai-motion-alarm.md)
