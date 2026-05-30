# Cell Coding One-Page Talk Narrative (EN-first, KR-parallel)

## Talk Goal | 발표 목표

Explain a new paradigm and convert audience interest into immediate open-source participation.
새로운 패러다임을 설명하고, 청중의 관심을 즉시 오픈소스 참여로 전환한다.

## Recommended Duration | 권장 시간

- 25 to 30 minutes total
- 20 min talk + 5 min demo + 5 min Q&A
- 총 25~30분 (발표 20분 + 데모 5분 + Q&A 5분)

## 12-Slide Structure | 12장 구성

### 1) Problem Reframe | 문제 재정의

- Classical software evolved around narrow `input -> process -> output`.
- Physical AI needs many sensing and many action channels simultaneously.
- 고전 소프트웨어는 좁은 `입력 -> 처리 -> 출력`을 중심으로 발전했고, Physical AI는 다중 감각/다중 행동 채널을 동시에 요구한다.

**Key message | 핵심 메시지**  
We need functional execution units for complexity control.
복잡도를 제어할 기능 단위가 필요하다.

### 2) Concept Proposal | 제안 개념

- Cell Coding models software as cooperating functional cells.
- Cell Coding은 소프트웨어를 협업하는 기능 세포 네트워크로 모델링한다.

**Physical AI scenarios (compare on one slide) | Physical AI 시나리오 (한 슬라이드 비교)**

- **Spider**: terrain-adaptive sensing and non-standard actuation  
  **거미**: 지형 적응형 감각 + 비정형 행동
- **Humanoid**: multi-organ coordination (balance, manipulation, interaction)  
  **휴머노이드**: 다기관 협업(균형·조작·상호작용)
- **PET**: continuous affect and safety in home environments  
  **반려(PET)**: 가정 환경의 정서·안전 지속 상호작용

**Key message | 핵심 메시지**  
Design by signal response, not direct object calls.
객체 직접 호출이 아니라 신호 반응 중심으로 설계한다.

### 3) Three Principles | 3대 원칙

- **Role**: one clear responsibility  
- **Membrane**: explicit boundary contracts  
- **Signal**: only communication channel  
- **역할(Role)**: 단일 책임 / **막(Membrane)**: 경계 계약 / **신호(Signal)**: 유일한 통신 수단

**Key message | 핵심 메시지**  
Contract-driven design scales better across teams.
계약 중심 설계는 팀 규모가 커질수록 유리하다.

### 4) Layer Model | 계층 모델

- `Cell -> Tissue -> Organ -> Organism`
- System-level control via `Nervous` and `Immune`
- `Nervous`/`Immune`를 통한 시스템 수준 제어

**Key message | 핵심 메시지**  
Complexity becomes visible through layered structure.
복잡도가 계층 구조로 표현된다.

### 5) Difference from OOP | OOP 대비 차이

- Method-call centric vs signal-contract centric
- Implementation dependency vs signal-type dependency
- 메서드 호출 중심 vs 이벤트 계약 중심, 내부 구현 의존 vs 신호 타입 의존

**Key message | 핵심 메시지**  
Reduce blast radius of change.
변경 영향 반경을 줄인다.

### 6) Current State | 현재 구현 상태

- TypeScript compiler draft (`lexer/parser/checker`)
- Runtime/bridge/viewer roadmap
- TS 컴파일러 초안과 런타임/브리지/뷰어 로드맵 존재

**Key message | 핵심 메시지**  
This is already buildable, not only conceptual.
아이디어를 넘어 구현 가능한 상태다.

### 7) Live Demo Story | 라이브 데모 시나리오

- `CameraReceptor` emits `MotionDetected`
- `AlarmActuator` processes only membrane-accepted signals
- Viewer shows real-time signal flow
- `CameraReceptor`가 `MotionDetected`를 발생시키고, `AlarmActuator`는 막 계약 통과 신호만 처리하며, Viewer에서 흐름을 관찰한다.

**Key message | 핵심 메시지**  
Execution and observability happen together.
실행과 관측이 동시에 가능하다.

### 8) Open Source Operating Model | 오픈소스 운영 방식

- BDFL + core maintainers in early phase
- RFC-based change governance
- Monthly release cadence
- 초기 BDFL+코어 메인터이너 체계, RFC 기반 변경 관리, 월간 릴리즈

**Key message | 핵심 메시지**  
Clear operations sustain communities.
운영 원칙이 명확해야 커뮤니티가 유지된다.

### 9) Contribution Entry Points | 기여 진입점

- `good first issue`
- docs/examples/tests first contributions
- first PR SLA: 72 hours
- `good first issue`, 문서/예제/테스트 우선 기여, 첫 PR SLA 72시간

**Key message | 핵심 메시지**  
Lower friction for first-time contributors.
첫 기여자 마찰을 낮춘다.

### 10) 90-Day Roadmap | 90일 로드맵

- Day 0-30: MVP behaviors
- Day 31-60: observability and quality
- Day 61-90: public launch and expansion
- 0~30일 MVP, 31~60일 관측/품질, 61~90일 공개 확장

**Key message | 핵심 메시지**  
Predictable delivery builds trust.
예측 가능한 전달이 신뢰를 만든다.

### 11) Call to Action | 요청 사항

- recruit core contributors
- collect domain reference examples
- invite feedback and RFC participation
- 코어 기여자 모집, 도메인 레퍼런스 예제 수집, 피드백/RFC 참여 요청

**Key message | 핵심 메시지**  
Grow this as a co-created standard.
함께 만드는 표준으로 성장시킨다.

### 12) Closing | 마무리

Cell Coding is not a language replacement; it is a shared design structure to make Physical AI software clearer and more scalable.
Cell Coding은 기존 언어를 대체하려는 것이 아니라, Physical AI 소프트웨어를 더 명확하고 확장 가능하게 만드는 공용 설계 구조다.

**Closing line | 마무리 문장**  
We do not force a new language. We provide a common structure on top of existing technologies.
우리는 새로운 언어를 강요하지 않는다. 기존 기술 위에서 공통 구조를 제안한다.

---

## Demo Script (5 min) | 데모 스크립트 (5분)

1. Show `MotionDetected` emission log  
2. Show membrane pass/block behavior  
3. Show routing path in Viewer  
4. Trigger an error and show immune policy response  
5. Link reproduction steps via Issues/PR

1. `MotionDetected` 발생 로그 확인  
2. membrane 계약 통과/차단 동작 확인  
3. Viewer 라우팅 경로 확인  
4. 오류 발생 시 immune 정책 동작 확인  
5. Issues/PR로 재현 절차 공유

## Post-Talk Action Items | 발표 후 액션 아이템

- On launch day: repository public, 10 starter issues, 3-min demo video
- Within 48 hours: publish FAQ and first contributor onboarding session
- 발표 당일: 저장소 공개, starter issue 10개, 3분 데모 영상 업로드
- 발표 후 48시간: FAQ 공개, 첫 기여자 온보딩 세션 공지

