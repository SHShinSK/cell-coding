# Cell Coding

[![GitHub Pages](https://img.shields.io/badge/docs-GitHub%20Pages-2dff8f?style=flat-square&logo=github)](https://shshinsk.github.io/cell-coding/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](LICENSE)
[![Issues](https://img.shields.io/github/issues/SHShinSK/cell-coding?style=flat-square)](https://github.com/SHShinSK/cell-coding/issues)
[![Discussions](https://img.shields.io/github/discussions/SHShinSK/cell-coding?style=flat-square)](https://github.com/SHShinSK/cell-coding/discussions)

> **한국어** | [English README](README.en.md)

A biological programming paradigm for Physical AI, built on event-driven architecture.  
Physical AI를 위한 이벤트 기반 생물학적 프로그래밍 패러다임.

**Repository:** https://github.com/SHShinSK/cell-coding  
**저장소:** https://github.com/SHShinSK/cell-coding  
**Site:** https://shshinsk.github.io/cell-coding/  
**문서 사이트:** https://shshinsk.github.io/cell-coding/

## Why this was created | 왜 이 개념을 만들었는가

Classical software assumed a narrower `input -> process -> output` frame.  
고전 소프트웨어는 비교적 좁은 `입력 -> 처리 -> 출력` 프레임을 전제로 했습니다.

Inputs expanded from keyboard and mouse to camera, microphone, and location data, while outputs stayed mostly screen- and printer-centric.  
입력은 키보드/마우스에서 카메라/마이크/위치정보로 확장됐지만, 출력은 대체로 화면·프린터 중심에 머물렀습니다.

Physical AI changes both sides: many sensing channels and many real-world action channels emerge together.  
Physical AI는 양쪽을 동시에 바꿉니다. 다중 감각 채널과 다중 현실 행동 채널이 함께 등장합니다.

## Problem reframe | 문제 재정의

In embodied systems, reducing everything to plain I/O is often insufficient.  
구현체(embodied) 시스템에서는 모든 것을 단순 I/O로 환원하는 모델이 충분하지 않은 경우가 많습니다.

We need software modeled as a network of many specialized functional units.  
우리는 다수의 특화 기능 단위가 네트워크로 협력하는 소프트웨어 모델이 필요합니다.

Cell Coding defines those units as `Cell`s with explicit `role`, `membrane`, and `signal` contracts.  
Cell Coding은 그 단위를 `role`, `membrane`, `signal` 계약을 가진 `Cell`로 정의합니다.

## Physical AI scenarios | Physical AI 시나리오

Cell Coding maps embodied systems into functional cell networks, not one monolithic controller.  
Cell Coding은 구현체 시스템을 단일 거대 컨트롤러가 아니라 기능 세포 네트워크로 매핑합니다.

### Spider robot | 거미 로봇

A spider robot ingests vision, hearing, tactile, and chemical context simultaneously, then produces locomotion patterns, web generation, and chemical actions — sensing and acting cells adapt to terrain rather than following a fixed pipeline.  
거미 로봇은 시각·청각·촉각·화학적 맥락을 동시에 받아들이고, 보행 패턴·거미줄 생성·화학적 작동을 만들어냅니다. 감각·행동 세포가 고정 파이프라인이 아니라 지형에 적응합니다.

### Humanoid robot | 휴머노이드

A humanoid ingests vision, proprioception, balance, hand tactile, and speech context at once. Its actions span bipedal locomotion, grasping, gestures, facial expression, and speech — better modeled as cooperating organs (balance, manipulation, interaction) than one controller pipeline.  
휴머노이드는 시각·고유수용감각·균형·손 촉각·음성 맥락을 동시에 처리합니다. 이족 보행, 파지, 제스처, 표정, 발화는 단일 컨트롤러가 아니라 균형·조작·상호작용 기관의 협업으로 표현하는 편이 적합합니다.

### PET robot | 반려(PET) 로봇

A companion PET robot reads owner presence, touch, voice tone, and ambient home context continuously. Its behaviors include following, responsive vocalization, tail/LED expression, and comfort actions — modeled as affect and safety cells, not discrete I/O events.  
반려(PET) 로봇은 주인 존재, 터치, 음성 톤, 가정 환경 맥락을 연속적으로 읽습니다. 따라가기, 반응형 발성, 꼬리/LED 표현, 위로 행동은 이산 I/O가 아니라 정서·안전 세포 네트워크로 모델링합니다.

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

## Goals (v0.x) | 프로젝트 목표 (v0.x)

1. **Runtime first**: working event bus + contract validation  
   **런타임 우선**: 실제 동작하는 이벤트 버스 + 계약 검증
2. **Observability**: React Viewer for signal flow visualization  
   **관측 가능성**: React Viewer로 신호 흐름 시각화
3. **Extensibility**: Python bridge for sensors and actuators  
   **확장성**: Python 브리지로 센서/액추에이터 연동
4. **Progressive DSL**: optional `.cell` syntax later  
   **점진적 DSL**: 이후 `.cell` 문법을 선택적으로 도입

## Operating principles | 저장소 운영 원칙

- Prefer runnable examples and tests over abstract narratives  
  철학 문서보다 실행 가능한 예제와 테스트를 우선
- Keep PRs small and demo-oriented  
  PR은 작게, 데모 가능한 단위로 병합
- Lower friction for first-time contributors  
  외부 기여자가 첫 1회 기여를 빠르게 끝낼 수 있도록 이슈를 관리

## Quick start | 빠른 시작

1. Check milestones in [ROADMAP.md](ROADMAP.md)
2. Read [OPEN_SOURCE_CHARTER.md](OPEN_SOURCE_CHARTER.md)
3. Start with `good first issue` tasks in [issue drafts](.github/issue-drafts/README.md)

## Grow together | 함께 발전시키기

This repository is public, so anyone can read code, discuss ideas, and contribute via fork and PR.  
이 저장소는 공개(Public) 저장소이므로 누구나 코드를 보고, 토론하고, 포크/PR로 기여할 수 있습니다.

1. [Issues](https://github.com/SHShinSK/cell-coding/issues) — bugs, features, questions  
   버그·기능·질문
2. [Discussions](https://github.com/SHShinSK/cell-coding/discussions) — ideas and usage  
   아이디어·사용법
3. [contributing.html](https://shshinsk.github.io/cell-coding/contributing.html) or [CONTRIBUTING.md](CONTRIBUTING.md) — contribution process  
   [contributing.html](https://shshinsk.github.io/cell-coding/contributing.html) 또는 [CONTRIBUTING.md](CONTRIBUTING.md) — 기여 절차
   기여 절차

## Maintainer setup | 유지보수자 설정

- [Discussions · About · Topics](.github/DISCUSSIONS_SETUP.md)
- [Pages workflow](.github/workflows/pages.yml) — Settings → Pages → **GitHub Actions**

## Documentation | 문서

| 한국어 | English |
|--------|---------|
| [README.md](README.md) | [README.en.md](README.en.md) |
| [OPEN_SOURCE_CHARTER.md](OPEN_SOURCE_CHARTER.md) | [OPEN_SOURCE_CHARTER.en.md](OPEN_SOURCE_CHARTER.en.md) |
| [ROADMAP.md](ROADMAP.md) | [ROADMAP.en.md](ROADMAP.en.md) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | [CONTRIBUTING.en.md](CONTRIBUTING.en.md) |
| [행동 강령](CODE_OF_CONDUCT.md) | |
| [보안 정책](SECURITY.md) | |
| [이슈 라벨 가이드](ISSUE_LABELS.md) | |
| [RFC 가이드](rfcs/README.md) | |
| [발표 아웃라인](PRESENTATION_OUTLINE.md) | |

### Concept & specification (HTML) | 개념·명세 (HTML)

- [cell-coding.html](cell-coding.html) — paradigm overview / 패러다임 소개
- [개발명세서.html](개발명세서.html) — language specification v0.1 / 언어 명세 v0.1
- [roadmap.html](roadmap.html) — implementation roadmap / 구현 로드맵
- [Cell Coding Blueprint.html](Cell%20Coding%20Blueprint.html) — Physical AI blueprint / Physical AI 블루프린트

## License | 라이선스

[Apache-2.0](LICENSE)
