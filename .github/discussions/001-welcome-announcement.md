<!--
  GitHub Discussions 게시 가이드
  ─────────────────────────────
  Category : Announcements
  Title    : Welcome to Cell Coding Open Source 🧬
  Pin      : Yes (고정 권장)

  게시 경로:
  https://github.com/SHShinSK/cell-coding/discussions/new?category=announcements
-->

# Welcome to Cell Coding Open Source 🧬

Cell Coding is an **event-driven biological programming paradigm for Physical AI**.  
Cell Coding은 **Physical AI를 위한 이벤트 기반 생물학적 프로그래밍 패러다임**입니다.

We are **not** trying to replace TypeScript, Python, or React. Cell Coding is an **extensible architecture model** that runs on top of them.  
우리는 TypeScript·Python·React를 대체하려는 것이 아닙니다. Cell Coding은 그 위에서 동작하는 **확장형 아키텍처 모델**입니다.

---

## Why Cell Coding exists | 왜 Cell Coding이 필요한가

Classical software assumed a narrower `input -> process -> output` model.  
고전 소프트웨어는 비교적 좁은 `입력 -> 처리 -> 출력` 모델을 전제로 했습니다.

Inputs expanded from keyboard and mouse to camera, microphone, and location — but outputs often stayed screen- and printer-centric.  
입력은 키보드·마우스에서 카메라·마이크·위치정보로 확장됐지만, 출력은 여전히 화면·프린터 중심에 머무는 경우가 많았습니다.

Physical AI changes both sides at once: many sensing channels and many real-world action channels.  
Physical AI는 다중 감각 채널과 다중 현실 행동 채널을 동시에 요구합니다.

Cell Coding reframes software as a **network of cooperating functional cells**, not one monolithic I/O pipeline.  
Cell Coding은 소프트웨어를 단일 거대 I/O 파이프라인이 아닌 **협업하는 기능 세포 네트워크**로 재정의합니다.

---

## Core principles | 핵심 원칙

| Principle | English | 한국어 |
|-----------|---------|--------|
| **Role** | Each cell has one clear responsibility | 각 세포는 하나의 명확한 책임 |
| **Membrane** | Explicit signal contracts at boundaries | 경계에서 명시적인 신호 계약 |
| **Signal** | Cells communicate only through signals | 세포 간 통신은 신호를 통해서만 |

Hierarchy: `Cell` → `Tissue` → `Organ` → `Organism` (+ `Nervous` / `Immune`)  
계층: `Cell` → `Tissue` → `Organ` → `Organism` (+ `Nervous` / `Immune`)

---

## Physical AI scenarios | Physical AI 시나리오

Three embodied examples show why a cell network beats a single pipeline:  
세 가지 구현체 예시가 단일 파이프라인보다 세포 네트워크가 필요한 이유를 보여줍니다.

### Spider robot | 거미 로봇
Terrain-adaptive sensing and non-standard actuation — locomotion, web generation, chemical actions.  
지형 적응형 감각과 비정형 행동 — 보행, 거미줄 생성, 화학적 작동.

### Humanoid robot | 휴머노이드
Multi-organ coordination for balance, manipulation, and interaction — bipedal locomotion, grasping, gestures, speech.  
균형·조작·상호작용을 위한 다기관 협업 — 이족 보행, 파지, 제스처, 발화.

### PET robot | 반려(PET) 로봇
Continuous affect and safety interaction at home — following, vocalization, tail/LED expression, comfort behavior.  
가정 환경에서의 정서·안전 중심 지속 상호작용 — 따라가기, 반응형 발성, 꼬리/LED 표현, 위로 행동.

All three map to cells with **roles, membranes, and signals** — not plain input/output events.  
세 가지 모두 단순 입출력 이벤트가 아니라 **역할·막·신호**를 가진 세포 모델로 표현합니다.

---

## Explore the project | 바로 살펴보기

| Resource | Link |
|----------|------|
| Docs (GitHub Pages) | https://shshinsk.github.io/cell-coding/ |
| Paradigm | https://shshinsk.github.io/cell-coding/cell-coding.html |
| Spec v0.1 | https://shshinsk.github.io/cell-coding/%EA%B0%9C%EB%B0%9C%EB%AA%85%EC%84%B8%EC%84%9C.html |
| Roadmap | https://github.com/SHShinSK/cell-coding/blob/main/ROADMAP.en.md |
| Contributing | https://github.com/SHShinSK/cell-coding/blob/main/CONTRIBUTING.md |
| Good first issues | https://github.com/SHShinSK/cell-coding/labels/good%20first%20issue |

Current status: **v0.1 concept + compiler draft + community bootstrap**  
현재 상태: **v0.1 개념·컴파일러 초안·커뮤니티 부트스트랩**

---

## How to participate | 참여 방법

1. **Issues** — pick a [`good first issue`](https://github.com/SHShinSK/cell-coding/labels/good%20first%20issue)  
   **Issues** — [`good first issue`](https://github.com/SHShinSK/cell-coding/labels/good%20first%20issue)부터 시작
2. **Show and tell** — share demos, prototypes, or Physical AI use cases  
   **Show and tell** — 데모, 프로토타입, Physical AI 사례 공유
3. **Q&A** — ask about design, runtime, or DSL direction  
   **Q&A** — 설계·런타임·DSL 방향 질문
4. **Ideas** — propose new cells, organs, or reference scenarios (humanoid, PET, etc.)  
   **Ideas** — 새 세포·기관·레퍼런스 시나리오(휴머노이드, PET 등) 제안
5. **RFC** — for design changes, open an issue and discuss in [`rfcs/`](https://github.com/SHShinSK/cell-coding/tree/main/rfcs)  
   **RFC** — 설계 변경은 이슈를 열고 [`rfcs/`](https://github.com/SHShinSK/cell-coding/tree/main/rfcs)에서 논의

We welcome first-time contributors. **Small PRs are excellent.**  
첫 기여자를 환영합니다. **작은 PR도 매우 좋습니다.**

---

## What we need from you | 함께 만들어 주실 것

- Feedback on the **3 Physical AI scenarios** (Spider / Humanoid / PET)  
  **3종 Physical AI 시나리오**(거미 / 휴머노이드 / PET)에 대한 피드백
- Reference examples in your domain (robotics, IoT, simulation)  
  각자 도메인(로봇, IoT, 시뮬레이션)의 레퍼런스 예제
- Docs, tests, and starter-issue contributions  
  문서·테스트·starter issue 기여

Reply in this thread with your background and what you'd like to work on — we'll help you find a good first task.  
이 스레드에 배경과 관심 분야를 남겨 주시면, 첫 작업을 함께 찾아드리겠습니다.

— Maintainer · SHShinSK/cell-coding
