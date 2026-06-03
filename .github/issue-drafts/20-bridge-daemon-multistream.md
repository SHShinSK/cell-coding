# [good-first-issue] bridge-python: long-running bridge or multi-stream inject · bridge 상시 데몬 또는 multi-stream inject

**Labels:** `feature`, `help wanted`, `area:bridge-python`, `area:runtime`, `priority:medium`

**Related:** [`bridge-python/ROBOTICS.md`](../../bridge-python/ROBOTICS.md) · Not in scope · [`19-physical-ai-sim-real-track.md`](19-physical-ai-sim-real-track.md)

---

## Context · 배경

Current demos (`demo_spider_sim.py`, `demo_pet.py`, …) spawn **subprocess `cell run`** per sample. That is fine for CI and learning, but real robots need either:

현재 데모는 샘플마다 **subprocess `cell run`** 을 호출합니다. CI·학습에는 적합하나, 실제 로봇에는 다음 중 하나가 필요합니다:

1. **Long-running bridge** — one runtime session, periodic inject  
   **상시 bridge** — 단일 런타임 세션, 주기 inject
2. **Multi-stream parallel inject** — e.g. vision + IMU in one organism session  
   **multi-stream parallel inject** — 예: vision + IMU 동시 inject

`cell run --stream` today batches **one stream name** per session (`stream-run.ts`).

---

## Goal · 목표

Design + minimal PoC for **one** of (maintainer picks scope in Discussion):

Design + minimal PoC (**Discussion에서 범위 선택**):

| Option | Deliverable |
|--------|-------------|
| **A** | `demo_* --daemon` loop: in-process `CellRuntime` or persistent Node worker · in-process 런타임 |
| **B** | `run_cell_multi_stream()` — two stream payloads, one session API · dual-stream API |
| **C** | Document **won’t fix in v0.1** with recommended external orchestration (ROS2 node, etc.) · v0.1 won’t fix 문서 |

---

## Tasks · 작업 (Option A example)

- [ ] Spike: embed TypeScript runtime from Python without subprocess per tick · subprocess 없이 inject
- [ ] CLI or env flag: `--daemon --interval-ms 33` on `demo_spider_sim.py` · 데몬 플래그
- [ ] Graceful shutdown + SLA staleness with wall clock · 종료·SLA
- [ ] Update `ROBOTICS.md` architecture diagram · 문서
- [ ] Test: smoke script or integration test with 3 ticks · 스모크 테스트

---

## Tasks · 작업 (Option B example)

- [ ] Extend `stream-run.ts` / `runner.py` for `{ VisionStream: [...], ImuStream: [...] }` · dual stream
- [ ] Sample: spider-sim organism with **parallel** sensing (may require `.cell` change — separate RFC) · parallel sensing
- [ ] Document teaching vs real fusion in SCENARIO · SCENARIO 정직화

---

## Definition of done · 완료 기준

- Discussion link in PR describing chosen option (A/B/C)  
  PR에 선택한 옵션(A/B/C) Discussion 링크
- `npm test` + bridge smoke tests pass  
  `npm test` + bridge smoke 통과
- `ROBOTICS.md` “Not in scope” section updated  
  `ROBOTICS.md` 미구현 섹션 갱신

---

## References · 참고

- `typescript/stream-run.ts`, `bridge-python/cell_bridge/runner.py`
- `rfcs/RFC-0001-stream-membrane-physical-sla.md`
