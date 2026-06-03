# [discussion] Physical AI sim-real track A2-S → A4-S — review & gaps · Physical AI sim-real 트랙 검토

**Labels:** `rfc`, `help wanted`, `docs`, `area:runtime`, `area:bridge-python`, `priority:medium`

**Related:** Closes scope gap after #28 · RFC-0001 · PR `feat/physical-ai-samples-a3-a4`

---

## Goal · 목표

Community review of the **sim-real Physical AI reference path** (not only motion-alarm PoC):

Community가 **sim-real Physical AI 레퍼런스 경로**를 검토합니다 (motion-alarm PoC만이 아님):

| Tier | Path | Inject |
|------|------|--------|
| A2-S | [`examples/spiderling-sim/`](../spiderling-sim/) | `ImuSample` |
| A3 / A3-S / A3-H | [`examples/spider-robot/`](../spider-robot/) · [`spider-robot-sim/`](../spider-robot-sim/) | `VisionFrame` |
| A4 / A4-S / A4-H | [`examples/pet-robot/`](../pet-robot/) · [`pet-robot-sim/`](../pet-robot-sim/) | `OwnerPing` |

Docs: [`bridge-python/ROBOTICS.md`](../../bridge-python/ROBOTICS.md), [`rfcs/RFC-0001-stream-membrane-physical-sla.md`](../../rfcs/RFC-0001-stream-membrane-physical-sla.md)

---

## Questions for Discussion · Discussion 질문

1. Is the **linear teaching trace** (declared streams unused on path) honest enough for learners?  
   **linear teaching trace**(선언 stream 미사용)가 학습용으로 충분히 정직한가?
2. Are **SCENARIO / A3-H / A4-H** EN/KR docs clear for international contributors?  
   **SCENARIO / A3-H / A4-H** EN/KR 문서가 국제 기여자에게 명확한가?
3. What should **A5 Humanoid** borrow from this pattern (streams, SLA entry cell)?  
   **A5 Humanoid**가 이 패턴(stream, SLA entry)에서 무엇을 가져가야 하는가?

---

## Known limits (documented, need consensus) · 알려진 한계 (합의 필요)

- [ ] Subprocess `cell run` per bridge pulse (no daemon) · pulse마다 subprocess
- [ ] No multi-stream parallel inject in one session · 단일 세션 multi-stream inject 없음
- [ ] PET `TouchStream` teaching-only · PET TouchStream teaching-only
- [ ] DSL has no binary `-` — samples use `if/else` branches · DSL `-` 연산 없음

---

## Tasks · 작업 (optional PRs)

- [ ] Link learning path from root `README.md` to A4-S / A4-H after merge · README 학습 경로 링크
- [ ] Add `cell:test` sidecar note for `pet-sim-organism.cell` in `examples/README.md` · cell:test 문서
- [ ] Viewer traces for PET comfort/follow paths · Viewer trace 추가
- [ ] Respond in Discussion with agreed “won’t fix vs roadmap” for each known limit · Discussion에 한계 합의

---

## Definition of done · 완료 기준

- Discussion thread has maintainer summary: **accepted teaching simplifications** vs **planned issues**  
  Discussion에 maintainer 요약: **수용한 teaching simplification** vs **계획된 이슈**
- At least one external contributor comment or reaction  
  외부 기여자 코멘트 또는 reaction 1건 이상
- Remaining work split into trackable issues (20, 21, …)  
  잔여 작업이 추적 가능한 이슈로 분리됨

---

## References · 참고

- [`examples/pet-robot/SCENARIO.md`](../../examples/pet-robot/SCENARIO.md)
- [`examples/pet-robot-sim/SCENARIO.md`](../../examples/pet-robot-sim/SCENARIO.md)
- [`examples/spider-robot-sim/SCENARIO.md`](../../examples/spider-robot-sim/SCENARIO.md)
- [`.github/discussions/003-physical-ai-samples-feedback.md`](../discussions/003-physical-ai-samples-feedback.md)
