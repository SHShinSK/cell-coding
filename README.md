# Cell Coding

> **한국어** | [English README](README.en.md)

Physical AI를 위한 이벤트 기반 생물학적 프로그래밍 패러다임.

**저장소:** https://github.com/SHShinSK/cell-coding

Cell Coding은 기존 프레임워크를 대체하는 언어 운동이 아니라, `TypeScript`/`Python`/`React` 위에 얹어 사용할 수 있는 **확장형 아키텍처 모델**을 지향합니다.

## 한 줄 소개

`역할(role)`로 분해하고, `막(membrane)`으로 경계를 선언하며, `신호(signal)`로 시스템을 연결한다.

## 왜 필요한가

- Physical AI 시스템은 센서/판단/행동 경로가 섞이면서 결합도가 급격히 높아짐
- 기존 OOP 계층은 실시간 이벤트 흐름을 관찰/검증하기 어려움
- Cell Coding은 이벤트 중심 구조를 도메인 용어로 직접 표현해 운영 가시성을 높임

## 핵심 개념

- `Cell`: 최소 실행 단위, 단일 역할
- `Membrane`: 입력/출력 신호 계약
- `Signal`: 세포 간 유일한 통신 단위
- `Tissue/Organ/Organism`: 복잡도 계층
- `Nervous/Immune`: 라우팅/복구 정책 계층

## 프로젝트 목표 (v0.x)

1. **런타임 우선**: 실제 동작하는 이벤트 버스 + 계약 검증
2. **관측 가능성**: React Viewer로 신호 흐름 시각화
3. **확장성**: Python 브리지로 센서/액추에이터 연동
4. **점진적 DSL**: 이후 `.cell` 문법을 선택적으로 도입

## 저장소 운영 원칙

- 철학 문서보다 실행 가능한 예제와 테스트를 우선
- PR은 작게, 데모 가능한 단위로 병합
- 외부 기여자가 첫 1회 기여를 1일 안에 끝낼 수 있게 이슈를 관리

## 빠른 시작 (현재 상태 기준)

현재 저장소는 개념/명세/초안 단계입니다. 아래 순서로 진행합니다.

1. `ROADMAP.md`에서 현재 마일스톤 확인
2. `OPEN_SOURCE_CHARTER.md`에서 프로젝트 범위/의사결정 원칙 확인
3. `CONTRIBUTING.md`의 `good first issue` 라벨 작업부터 기여 시작

## 함께 발전시키기 (오픈소스)

이 저장소를 **Public(공개)** 으로 두면 누구나 코드를 보고, 이슈/토론을 남기고, 포크 후 PR로 기여할 수 있습니다.

1. [Issues](https://github.com/SHShinSK/cell-coding/issues) — 버그·기능·질문
2. [Discussions](https://github.com/SHShinSK/cell-coding/discussions) — 아이디어·사용법
3. [CONTRIBUTING.md](CONTRIBUTING.md) — 기여 절차
4. `good first issue` 라벨 — 첫 기여용 작업

## 문서

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

### 개념·명세 (HTML)

- [cell-coding.html](cell-coding.html) — 패러다임 소개
- [개발명세서.html](개발명세서.html) — 언어 명세 v0.1
- [roadmap.html](roadmap.html) — 구현 로드맵
- [Cell Coding Blueprint.html](Cell%20Coding%20Blueprint.html) — Physical AI 블루프린트

## 라이선스

[Apache-2.0](LICENSE)

