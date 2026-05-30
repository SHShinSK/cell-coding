# Cell Coding

[![GitHub Pages](https://img.shields.io/badge/docs-GitHub%20Pages-2dff8f?style=flat-square&logo=github)](https://shshinsk.github.io/cell-coding/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](LICENSE)
[![Issues](https://img.shields.io/github/issues/SHShinSK/cell-coding?style=flat-square)](https://github.com/SHShinSK/cell-coding/issues)
[![Discussions](https://img.shields.io/github/discussions/SHShinSK/cell-coding?style=flat-square)](https://github.com/SHShinSK/cell-coding/discussions)

> [한국어 README](README.md) | **English**

A biological programming paradigm for Physical AI, built on event-driven architecture.  
피지컬 AI를 위한 이벤트 기반 생물학적 프로그래밍 패러다임.

Cell Coding is not a campaign to replace existing frameworks. It is an **extensible architecture model** that runs on top of `TypeScript`, `Python`, and `React`.  
Cell Coding은 기존 프레임워크를 대체하려는 언어 운동이 아니라, `TypeScript`·`Python`·`React` 위에서 동작하는 **확장형 아키텍처 모델**입니다.

## Why this was created | 왜 이 개념을 만들었는가

Classical software assumes a relatively narrow `input -> process -> output` model.  
고전 소프트웨어는 비교적 좁은 `입력 -> 처리 -> 출력` 모델을 전제로 합니다.

Historically, inputs expanded from keyboard/mouse to camera/microphone/location data, while outputs remained mostly screen- and printer-centric.  
역사적으로 입력은 키보드/마우스에서 카메라/마이크/위치정보로 확장됐지만, 출력은 여전히 화면·프린터 중심에 머무는 경우가 많았습니다.

Physical AI changes both sides at once: many sensory channels and many real-world action channels.  
Physical AI는 양쪽을 동시에 바꿉니다. 다중 감각 채널과 다중 현실 행동 채널이 함께 등장합니다.

## Problem reframe | 문제 재정의

For embodied systems, treating everything as plain I/O is often too reductive.  
구현체(embodied) 시스템에서는 모든 것을 단순 I/O로 취급하는 방식이 과도하게 단순화될 수 있습니다.

We need a software model where many specialized functions coexist as living units, not just pipeline steps.  
우리는 파이프라인 단계가 아니라, 다수의 특화 기능이 살아있는 단위처럼 공존하는 소프트웨어 모델이 필요합니다.

Cell Coding defines those units as `Cell`s with explicit `role`, `membrane`, and `signal` contracts.  
Cell Coding은 그 단위를 `role`, `membrane`, `signal` 계약을 가진 `Cell`로 정의합니다.

## Spider robot example | 거미 로봇 예시

A spider robot may ingest vision, hearing, tactile, and chemical context simultaneously.  
거미 로봇은 시각·청각·촉각·화학적 맥락을 동시에 받아들일 수 있습니다.

Its outputs are also diverse: locomotion patterns, web-generation behavior, and chemical actions.  
출력 또한 다양합니다. 보행 패턴, 거미줄 생성 행동, 화학적 작동 같은 결과가 함께 발생합니다.

Cell Coding maps this into a functional network, not one monolithic controller.  
Cell Coding은 이를 단일 거대 컨트롤러가 아니라 기능 네트워크로 매핑합니다.

- `Cell`: one specialized function | 단일 특화 기능
- `Tissue`: cooperating cells for a local goal | 국소 목표를 위한 세포 협업
- `Organ`: domain capability boundary | 도메인 기능 경계
- `Organism`: full embodied system | 전체 구현 시스템

## One-liner | 한 줄 정의

Decompose by **role**, declare boundaries with **membrane**, and connect systems through **signal**.  
**역할(role)**로 분해하고, **막(membrane)**으로 경계를 선언하며, **신호(signal)**로 시스템을 연결한다.

## Core concepts | 핵심 개념

- `Cell`: minimal unit of execution, single responsibility  
  `Cell`: 최소 실행 단위, 단일 책임
- `Membrane`: functional boundary and signal contract  
  `Membrane`: 기능 경계이자 신호 계약
- `Signal`: the only communication primitive between cells  
  `Signal`: 세포 간 유일한 통신 원시 단위
- `Tissue/Organ/Organism`: scalable biological hierarchy  
  `Tissue/Organ/Organism`: 확장 가능한 생물학적 계층
- `Nervous/Immune`: routing and resilience policies  
  `Nervous/Immune`: 라우팅 및 회복 탄력성 정책

## Goals (v0.x) | 목표 (v0.x)

1. **Runtime first**: working event bus + contract validation  
   **런타임 우선**: 동작 가능한 이벤트 버스 + 계약 검증
2. **Observability**: React Viewer for signal flow visualization  
   **관측 가능성**: React Viewer 기반 신호 흐름 시각화
3. **Extensibility**: Python bridge for sensors and actuators  
   **확장성**: Python 브리지로 센서/액추에이터 연동
4. **Progressive DSL**: optional `.cell` syntax later  
   **점진적 DSL**: 이후 `.cell` 문법을 선택적으로 도입

## Repository | 저장소

- GitHub: https://github.com/SHShinSK/cell-coding
- Site: https://shshinsk.github.io/cell-coding/
- Issues: https://github.com/SHShinSK/cell-coding/issues
- Discussions: https://github.com/SHShinSK/cell-coding/discussions

## How to contribute | 기여 방법

1. Check milestones in [ROADMAP.en.md](ROADMAP.en.md)  
   [ROADMAP.en.md](ROADMAP.en.md)에서 마일스톤 확인
2. Read [OPEN_SOURCE_CHARTER.en.md](OPEN_SOURCE_CHARTER.en.md)  
   [OPEN_SOURCE_CHARTER.en.md](OPEN_SOURCE_CHARTER.en.md)에서 프로젝트 원칙 확인
3. Start with issues labeled `good first issue`  
   `good first issue` 라벨 작업부터 시작

See [CONTRIBUTING.en.md](CONTRIBUTING.en.md) for details.  
자세한 절차는 [CONTRIBUTING.en.md](CONTRIBUTING.en.md) 참고.

## Documentation | 문서

| Korean | English |
|--------|---------|
| [README.md](README.md) | [README.en.md](README.en.md) |
| [OPEN_SOURCE_CHARTER.md](OPEN_SOURCE_CHARTER.md) | [OPEN_SOURCE_CHARTER.en.md](OPEN_SOURCE_CHARTER.en.md) |
| [ROADMAP.md](ROADMAP.md) | [ROADMAP.en.md](ROADMAP.en.md) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | [CONTRIBUTING.en.md](CONTRIBUTING.en.md) |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | (Korean primary; English summary in charter) |
| [SECURITY.md](SECURITY.md) | (Korean primary) |
| [ISSUE_LABELS.md](ISSUE_LABELS.md) | (Korean primary) |
| [rfcs/README.md](rfcs/README.md) | RFC process (Korean) |
| [PRESENTATION_OUTLINE.md](PRESENTATION_OUTLINE.md) | Launch deck outline (Korean) |

### Concept & specification (HTML)

- [cell-coding.html](cell-coding.html) — paradigm overview
- [개발명세서.html](개발명세서.html) — language specification v0.1
- [roadmap.html](roadmap.html) — implementation roadmap
- [Cell Coding Blueprint.html](Cell%20Coding%20Blueprint.html) — Physical AI blueprint

## License | 라이선스

Apache-2.0 — see [LICENSE](LICENSE).  
Apache-2.0 — [LICENSE](LICENSE) 참고.
