<!--
  GitHub Discussions 게시 가이드
  ─────────────────────────────
  Category : Ideas  (or Announcements if tied to PR merge)
  Title    : Physical AI samples A2-S → A4-S — feedback wanted · Physical AI 샘플 피드백 요청
  Pin      : Optional for 2 weeks after publish

  게시 경로:
  https://github.com/SHShinSK/cell-coding/discussions/new?category=ideas
-->

# Physical AI samples A2-S → A4-S — feedback wanted · Physical AI 샘플 피드백 요청

We added a **discussion-oriented sample track** for Physical AI — sim-real parity, L1 bridge, and membrane SLA — beyond the original motion-alarm PoC.

Physical AI **discussion-oriented sample track**를 추가했습니다 — motion-alarm PoC를 넘어 sim-real parity, L1 bridge, membrane SLA까지 포함합니다.

**PR / branch:** `feat/physical-ai-samples-a3-a4`  
(Link the merged PR URL here after merge · merge 후 PR URL을 여기에 붙이세요)

---

## What shipped · 포함 내용

| Tier | Docs | Bridge demo |
|------|------|-------------|
| **A2-S** | [`spiderling-sim/SCENARIO.md`](https://github.com/SHShinSK/cell-coding/tree/main/examples/spiderling-sim/SCENARIO.md) | `demo_spiderling_sim.py` |
| **A3-S / A3-H** | [`spider-robot-sim/SCENARIO.md`](https://github.com/SHShinSK/cell-coding/tree/main/examples/spider-robot-sim/SCENARIO.md), [`A3-H.md`](https://github.com/SHShinSK/cell-coding/tree/main/examples/spider-robot-sim/A3-H.md) | `demo_spider_sim.py` |
| **A4 / A4-S / A4-H** | [`pet-robot/SCENARIO.md`](https://github.com/SHShinSK/cell-coding/tree/main/examples/pet-robot/SCENARIO.md), [`pet-robot-sim/`](https://github.com/SHShinSK/cell-coding/tree/main/examples/pet-robot-sim/) | `demo_pet.py` |
| **RFC** | [`RFC-0001`](https://github.com/SHShinSK/cell-coding/blob/main/rfcs/RFC-0001-stream-membrane-physical-sla.md) | — |

All SCENARIO docs use **English first · Korean parallel** (same pattern as golden A4 PET).

모든 SCENARIO는 **영어 우선 · 한국어 병렬** 형식입니다 (A4 golden과 동일).

---

## Try it in 5 minutes · 5분 체험

```bash
git clone https://github.com/SHShinSK/cell-coding.git
cd cell-coding/typescript && npm install && npm test

# PET comfort vs follow
cd ../bridge-python
python demo_pet.py --source sim --rssi 0.8
python demo_pet.py --source sim --rssi 0.6 --publish-twist

# Spider vision cascade
python demo_spider_sim.py --source sim --motion 0.3
python demo_spider_sim.py --source sim --motion 0.8 --publish-twist
```

---

## We want your opinion on · 의견을 구합니다

1. **Teaching honesty** — Linear cascades declare `ContactStream` / `TouchStream` but don’t use them on the trace path. Is that OK for v0.1?  
   **Teaching honesty** — linear cascade는 stream을 선언하지만 trace 경로에 쓰지 않습니다. v0.1에서 acceptable한가요?

2. **Bridge API** — Is `OwnerReceptor` / `VisionReceptor` / `--source sim|ros2-replay|ros2` the right L1 surface?  
   **Bridge API** — L1 surface가 적절한가요?

3. **Real robots** — What would you wire first on hardware (camera, IMU, BLE RSSI, cmd_vel)?  
   **Real robots** — 하드웨어에 무엇을 먼저 연결하시겠습니까?

4. **Missing tier** — Do we need **A4-F** (touch/mic adapters) before A5 Humanoid?  
   **Missing tier** — A5 전에 **A4-F**가 필요한가요?

---

## Known limits (please don’t surprise new contributors) · 알려진 한계

- Subprocess `cell run` per pulse — no long-running bridge daemon yet  
  pulse마다 subprocess — 상시 daemon 아직 없음
- No multi-stream parallel inject in one session  
  단일 세션 multi-stream inject 없음
- DSL: no `-` operator in `.cell` handlers (samples use branches)  
  DSL: handler에 `-` 연산 없음 (샘플은 분기 사용)

Tracking issues (drafts ready to register):  
- `19-physical-ai-sim-real-track.md` — meta review  
- `20-bridge-daemon-multistream.md` — daemon / multi-stream  
- `21-rfc-0001-phase3-tracking.md` — RFC Phase 3 umbrella  

---

## How to respond · 참여 방법

- 👍 / 👎 on this post for “direction feels right”  
  방향성에 👍 / 👎
- Comment with **one** concrete improvement (doc, API, or test)  
  **한 가지** 구체적 개선안 댓글
- Open a PR — small docs fixes welcome; larger changes please comment first  
  PR 환영 — 큰 변경은 먼저 댓글

Related **good first issues** (transpiler follow-ups): see [issue-drafts 14–18](https://github.com/SHShinSK/cell-coding/tree/main/.github/issue-drafts).

---

Thanks for helping shape Cell Coding as a **community-driven** Physical AI paradigm.  
Cell Coding을 **커뮤니티 주도** Physical AI 패러다임으로 함께 만들어 주셔서 감사합니다.

— Maintainer · SHShinSK/cell-coding
