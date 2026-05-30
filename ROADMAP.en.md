# Cell Coding Roadmap (90 days)

> [한국어 로드맵](ROADMAP.md) | **English**

## Goal

Turn Cell Coding from a concept presentation into an open-source project that external developers can install, run, and contribute to.

## Strategy

1. **Runtime / bridge / viewer** first — something that works
2. **`.cell` DSL** as an optional layer
3. Reference examples and community contribution loop

---

## Day 0–30: MVP foundation

**Deliverables**

- `cell-runtime` core: emit/subscribe, membrane checks, basic error hooks
- `cell-bridge-python`: camera/mic → standard signals; alarm/motor commands
- Example: `MotionDetected → AlarmActuator`

**Ops**

- Publish README, charter, contributing guide, code of conduct
- Label setup: `good first issue`, `help wanted`, `rfc`
- At least 10 starter issues for first-time contributors

**Done when**

- New user runs demo in ~30 minutes
- External contributor can open a first PR from labeled issues

---

## Day 31–60: Observability & quality

**Deliverables**

- `cell-viewer` MVP: live signal graph, cell timeline, filters
- E2E tests for core scenarios and contract violations

**Done when**

- Bug reports reproducible ≥80%
- At least one scenario traceable live in Viewer

---

## Day 61–90: Public launch & ecosystem

**Deliverables**

- Minimal `.cell` DSL subset (experimental): `cell`, `signal`, `membrane`, `on`, `emit`
- Transpile PoC: `.cell` → TypeScript
- 3+ reference examples (smart home, robot monitoring, ops alerts)

**Done when**

- 10+ external contributors
- 30+ external PRs
- Stable monthly release cadence

---

## KPIs

- Install success rate
- Demo reproduction time
- External PR merge rate
- Issue response time
- Release cadence adherence
