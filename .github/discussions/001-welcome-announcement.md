# Welcome to Cell Coding Open Source 🧬

Cell Coding is an **event-driven biological programming paradigm for Physical AI**.
Cell Coding은 **Physical AI를 위한 이벤트 기반 생물학적 프로그래밍 패러다임**입니다.

Classical software assumed a narrower `input -> process -> output` model.
고전 소프트웨어는 비교적 좁은 `입력 -> 처리 -> 출력` 모델을 전제로 했습니다.

Physical AI introduces many sensing channels and many real-world action channels at once.
Physical AI는 다중 감각 채널과 다중 현실 행동 채널을 동시에 요구합니다.

Cell Coding reframes software as a network of cooperating functional cells, not one monolithic I/O pipeline.
Cell Coding은 소프트웨어를 단일 거대 I/O 파이프라인이 아닌 협업하는 기능 세포 네트워크로 재정의합니다.

## Core Principles | 핵심 원칙

- **Role**: each cell has one clear responsibility  
  **역할(Role)**: 각 세포는 하나의 명확한 책임을 가짐
- **Membrane**: explicit signal contracts at boundaries  
  **막(Membrane)**: 경계에서 명시적인 신호 계약을 정의
- **Signal**: cells communicate only through signals  
  **신호(Signal)**: 세포 간 통신은 신호를 통해서만 수행

## Why now | 지금 필요한 이유

Three embodied scenarios show why a cell network beats a single I/O pipeline:
세 가지 구현체 시나리오가 단일 I/O 파이프라인보다 세포 네트워크가 필요한 이유를 보여줍니다.

- **Spider robot**: terrain-adaptive sensing and non-standard actuation (locomotion, web, chemical actions)  
  **거미 로봇**: 지형 적응형 감각과 비정형 행동(보행, 거미줄, 화학 작동)
- **Humanoid robot**: multi-organ coordination for balance, manipulation, and interaction  
  **휴머노이드**: 균형·조작·상호작용을 위한 다기관 협업
- **PET robot**: continuous affect and safety interaction in home environments  
  **반려(PET) 로봇**: 가정 환경에서의 정서·안전 중심 지속 상호작용

All three are better modeled as cells with roles, membranes, and signals — not plain input/output events.
세 가지 모두 단순 입출력 이벤트가 아니라 역할·막·신호를 가진 세포 모델로 표현하는 편이 더 적합합니다.

## Explore the project | 바로 살펴보기

- Docs: [https://shshinsk.github.io/cell-coding/](https://shshinsk.github.io/cell-coding/)
- Paradigm: [cell-coding.html](https://shshinsk.github.io/cell-coding/cell-coding.html)
- Spec v0.1: [개발명세서.html](https://shshinsk.github.io/cell-coding/%EA%B0%9C%EB%B0%9C%EB%AA%85%EC%84%B8%EC%84%9C.html)
- Contributing: [CONTRIBUTING.md](https://github.com/SHShinSK/cell-coding/blob/main/CONTRIBUTING.md)
- Starter issues: [good first issue](https://github.com/SHShinSK/cell-coding/labels/good%20first%20issue)

## How to participate | 참여 방법

1. Pick a `good first issue` from **Issues**.  
   **Issues**에서 `good first issue`를 선택하세요.
2. Share demos/ideas in **Show and tell**.  
   **Show and tell**에 데모와 아이디어를 공유하세요.
3. Ask design and usage questions in **Q&A**.  
   **Q&A**에 설계/사용 질문을 남겨주세요.
4. For design changes, open an RFC issue and discuss in [`rfcs/`](https://github.com/SHShinSK/cell-coding/tree/main/rfcs).  
   설계 변경은 RFC 이슈를 열고 [`rfcs/`](https://github.com/SHShinSK/cell-coding/tree/main/rfcs) 기준으로 논의해 주세요.

We welcome first-time contributors. Small PRs are excellent.
첫 기여자를 환영합니다. 작은 PR도 매우 좋습니다.

— Maintainer
