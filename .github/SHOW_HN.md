# Show HN 게시 초안 · Launch post draft

> **용도:** [Hacker News Show HN](https://news.ycombinator.com/showhn.html) 및 Reddit r/opensource 등에 붙여넣기  
> **런칭 전:** [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) Phase 0–1 완료 후 게시  
> **한국어 메모:** 각 섹션 하단에 유지보수용 설명

---

## A. Show HN — Title (택 1)

**권장 (짧고 구체적):**

```
Show HN: Cell Coding – event-driven “cells” for Physical AI (TS/Python, open source)
```

**대안:**

```
Show HN: Cell Coding – biological architecture for robots and embodied systems
```

```
Show HN: Cell Coding – role/membrane/signal model for multi-sensor Physical AI
```

**HN 제목 팁:** “Show HN:” 접두 필수. “framework/language/platform” 중 하나만. 과장 금지.

---

## B. Show HN — Body (영문, 그대로 게시)

```
Hi HN — I'm building Cell Coding, an open-source architecture model for Physical AI.

Classical software often assumes a narrow input → process → output pipeline. Physical AI systems have many sensing channels (vision, audio, touch, proprioception) and many action channels (locomotion, manipulation, expression) at the same time. Cell Coding models software as a network of cooperating functional units called Cells, with explicit role, membrane (contract), and signal boundaries — not a single monolithic controller.

This is NOT trying to replace TypeScript, Python, or React. It's an extensible layer that runs on top of them.

What's working today (v0.1):
- CLI: npx @cell-coding/cli run — compile/run .cell programs
- Runtime: event bus, membrane checks, signal routing
- Examples: motion-alarm (Physical AI PoC), spider/humanoid/PET robot scenario docs
- Viewer: signal-flow visualization (React + VS Code extension)
- Python bridge for sensors/actuators

Try in ~1 minute (after clone, or via npx once published):

  npx @cell-coding/cli run ./examples/motion-alarm/motion-alarm.cell MotionDetected '{"x":150,"y":220,"confidence":0.98}'

Links:
- Repo: https://github.com/SHShinSK/cell-coding
- Docs: https://shshinsk.github.io/cell-coding/
- Good first issues: https://github.com/SHShinSK/cell-coding/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22

I'd love feedback on:
1. Does the cell/membrane/signal framing help for embodied systems you work on?
2. Which reference scenario is most compelling (spider robot, humanoid, PET companion)?
3. What would make you try this on a weekend project?

Small PRs welcome — docs, tests, and examples especially.
```

**게시 전 교체:** `npx` 줄이 아직 npm 미배포면 아래 **Fallback body** 사용.

---

## C. Fallback body (npm 미배포 시)

```
Hi HN — I'm building Cell Coding, an open-source architecture model for Physical AI.

[… 동일 intro …]

Quick start from source (Node 20+):

  git clone https://github.com/SHShinSK/cell-coding.git
  cd cell-coding/typescript && npm install && npm test
  npm run cell:run -- ../examples/motion-alarm/motion-alarm.cell MotionDetected '{"x":1,"y":2,"confidence":0.9}'

Links: [same as above]
```

---

## D. Reddit r/opensource — Title + Body

**Title:**

```
[Project] Cell Coding – open-source cell architecture for Physical AI (TypeScript + Python)
```

**Body (짧은 버전):**

```
Cell Coding models embodied systems as networks of Cells (role + membrane + signal), not one I/O pipeline. Built for Physical AI: multi-sensor, multi-actuator robots and companions.

Stack: TypeScript runtime/DSL compiler, Python bridge, React viewer. Apache-2.0.

- GitHub: https://github.com/SHShinSK/cell-coding
- Docs: https://shshinsk.github.io/cell-coding/
- Looking for feedback on 3 scenarios: spider robot, humanoid, PET companion
- Good first issues for contributors

Happy to answer design questions in the thread.
```

---

## E. X (Twitter) / LinkedIn — 한 줄 + 링크

**영문:**

```
Open-sourced Cell Coding — event-driven “cells” (role · membrane · signal) for Physical AI. Not replacing TS/Python; an architecture layer for multi-sensor robots. Try the motion-alarm demo → https://github.com/SHShinSK/cell-coding
```

**한국어:**

```
Physical AI용 오픈소스 Cell Coding을 공개했습니다. 단일 I/O 파이프가 아니라 role·membrane·signal 세포 네트워크로 로봇/구현체 시스템을 모델링합니다. TS/Python 위 확장 레이어 — 데모와 good first issue → https://github.com/SHShinSK/cell-coding
```

---

## F. 게시 타이밍 · 댓글 대응

| 항목 | 권장 |
|------|------|
| **요일** | 화~목 (US West Coast 오전) |
| **시간** | 09:00–12:00 PT ≈ 한국 01:00–04:00 (다음날) |
| **준비** | Release + 이슈 정리 완료, 2–3시간 댓글 답변 가능할 때 |
| **HN 첫 댓글** | 본인 계정으로 “Author here — happy to answer…” (선택) |
| **피드백 수집** | Discussion Show and tell / Issues `question` 라벨로 유도 |

**자주 나올 질문 — 짧은 답변 초안:**

| 질문 | 답변 요지 |
|------|-----------|
| “Why not ROS / microservices?” | ROS는 로봇 미들웨어; Cell Coding은 **애플리케이션 아키텍처**와 DSL/계약 검증에 초점. ROS2 매핑 예제 있음 (`bridge-python/ros2_mapping.py`). |
| “Production ready?” | v0.1 — **concept + runtime PoC**. Production 전 RFC/테스트 확장 예정 ([ROADMAP.md](../ROADMAP.md)). |
| “vs actors / event sourcing?” | 유사점 있음; **membrane 계약**과 Physical AI **시나리오 레퍼런스**가 차별점. |
| “License?” | Apache-2.0 |

---

## G. Show HN 제출 절차

1. https://news.ycombinator.com/submit
2. **url:** `https://github.com/SHShinSK/cell-coding` (또는 Docs URL — repo 권장)
3. **title:** 섹션 A에서 선택
4. **text:** 섹션 B (또는 C)
5. Submit 후 **새 탭에서 글 URL 확인** → Discussion/Welcome에 링크 공유

---

## H. 체크리스트 (게시 직전)

- [ ] [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) Go 기준 충족
- [ ] Quick start 명령 **본인 PC에서 재현**
- [ ] [ISSUE_CLEANUP.md](ISSUE_CLEANUP.md) 완료 — embarrassing duplicate 없음
- [ ] Welcome Discussion Pin
- [ ] 2–3시간 HN/Reddit 모니터링 시간 확보
