# RFC-0001 Phase 3 tracking — SLA, streams, bridge parity · RFC-0001 Phase 3 추적

**Labels:** `rfc`, `feature`, `area:runtime`, `area:bridge-python`, `area:dsl-compiler`, `priority:medium`

**Related:** [`rfcs/RFC-0001-stream-membrane-physical-sla.md`](../../rfcs/RFC-0001-stream-membrane-physical-sla.md) · Issue draft [`19`](19-physical-ai-sim-real-track.md)

---

## Goal · 목표

Track **post-Phase-2** work for RFC-0001 (stream + membrane physical SLA) in one place and link it from the RFC header.

RFC-0001(stream + membrane physical SLA) **Phase 2 이후** 작업을 한곳에서 추적하고 RFC 헤더에 링크합니다.

**Phase 2 landed on `main` (reference):**
- `stream` / `onSample` parser + runtime SLA guard
- `physical-sla.ts`, `stream-run.ts`, checker warnings (stream rate SSOT)
- Examples: A2-S, A3-S, A4-S organisms + bridge demos

---

## Phase 3 backlog · Phase 3 백로그

### Runtime · 런타임

- [ ] CLI `cell run --staleness sensor|ingest` for bridge stale demos · staleness 모드 CLI
- [ ] `holdLastSafe` integration tests across organisms · holdLastSafe 테스트
- [ ] Stream scheduler (declared rate ≠ manual `--interval-ms` only) · stream scheduler
- [ ] Query membrane runtime semantics · query accepts runtime ([12-query-membrane-unification.md](12-query-membrane-unification.md))

### Language · 언어

- [ ] Binary arithmetic (`-`, `+`) in handler expressions — or spec “intentionally omitted” · `-`/`+` 연산 또는 명시적 omit
- [ ] Multi-stream organism wiring syntax (parallel inject declaration) · multi-stream wiring

### Bridge · 브리지

- [ ] See [20-bridge-daemon-multistream.md](20-bridge-daemon-multistream.md) · daemon / multi-stream
- [ ] PET touch/mic live adapters (A4-F) · PET touch/mic L1
- [ ] `BatteryLevel` / `EstopPulse` receptors · Battery/Estop L1

### Docs · 문서

- [ ] RFC header: replace `(TBD — Physical AI Phase 1)` with this issue link · RFC TBD → 이슈 링크
- [ ] RFC EN summary section (optional) · RFC 영문 요약

---

## Tasks · 작업 (this issue)

- [ ] Check off Phase 3 items as issues/PRs land · 항목별 체크
- [ ] Monthly maintainer comment with status snapshot · 월간 상태 코멘트
- [ ] Split large items into child issues (don’t grow this into a mega-issue) · child issue 분리

---

## Definition of done · 완료 기준

This issue stays **open** as a tracking umbrella until RFC-0001 moves to **Accepted** with Phase 3 scope either completed or explicitly deferred in the RFC.

RFC-0001이 **Accepted**가 되고 Phase 3가 완료 또는 RFC에 defer 명시될 때까지 **open** tracking umbrella.

---

## References · 참고

- `typescript/physical-sla.test.ts`
- `examples/spiderling-sim/spiderling-sim-organism.cell`
- `examples/spider-robot-sim/spider-sim-organism.cell`
- `examples/pet-robot-sim/pet-sim-organism.cell`
