# Cell Coding Execution Plan (Evolved)

> English first · [한국어 병렬](EXECUTION_PLAN.md)  
> **Source docs:** [ROADMAP.en.md](ROADMAP.en.md) · [LAUNCH_CHECKLIST.md](.github/LAUNCH_CHECKLIST.md) · [RFC-0001](rfcs/RFC-0001-stream-membrane-physical-sla.md)  
> **Last updated:** 2026-07-07

---

## 1. One-line summary

The original 90-day roadmap’s **technical foundation (days 0–60) is largely complete**; focus shifts to **passing the launch gate → community cold start → RFC-0001 Phase 3 release train**.

---

## 2. Current state snapshot

| Area | Original roadmap window | Status | Evidence |
|------|-------------------------|--------|----------|
| Runtime (emit/on, membrane, immune, nervous) | Day 0–30 | ✅ Done | `typescript/runtime.ts`, 191 tests pass |
| Python bridge | Day 0–30 | ✅ Done | `bridge-python/`, robotics demos |
| Motion-alarm PoC | Day 0–30 | ✅ Done | `examples/motion-alarm/` |
| Viewer (React) | Day 31–60 | ✅ MVP | `viewer-react/`, `--json --watch` |
| E2E / CI | Day 31–60 | ✅ Working | GitHub Actions, observability compose |
| DSL subset + transpiler PoC | Day 61–90 | ✅ Phase 3 level | `transpiler.ts`, `--transpiled` |
| Physical AI examples A1–A5 | Day 61–90 | ✅ Docs + code | `examples/README.md` |
| Stream + Physical SLA (RFC-0001 Phase 2) | — | ✅ Landed | A2-S / A3-S / A4-S organisms |
| **v0.1.0 npm release** | Day 61–90 | ⏳ Pending | LAUNCH Phase 1 |
| **Issue cleanup + 3–5 starters** | Day 0–30 | ⏳ Partial | [ISSUE_CLEANUP.md](.github/ISSUE_CLEANUP.md) |
| **10+ external contributors / 30+ PRs** | Day 61–90 | ⏳ Post-launch | Community KPIs |

**Assessment:** The project has passed “buildable, not only conceptual.” The next bottlenecks are **first-run path verification** and **contributor entry-point hygiene**.

---

## 3. Workstreams (5 parallel tracks)

| ID | Stream | Owner | Next milestone |
|----|--------|-------|----------------|
| **W1** | Launch readiness | Maintainer | v0.1.0 tag + clean-machine verify |
| **W2** | Community | Maintainer + Core | Welcome pin + 3 good first issues |
| **W3** | Physical AI reference | Runtime + Bridge | Discussion #003 consensus → issues #20·#21 |
| **W4** | DSL / RFC | Compiler | Register RFC-0001 Phase 3 umbrella issue |
| **W5** | Ops & quality | Maintainer | 72h issue SLA, monthly release cadence |

---

## 4. Phased execution

### Phase A — Launch gate (Day -2 → Day 0)

**Goal:** First visitor runs in 5 minutes · contributor opens first PR in 30 minutes.

| # | Task | Output | Done when | Depends on |
|---|------|--------|-----------|------------|
| A.1 | Duplicate issue cleanup | 3–5 open starters | ISSUE_CLEANUP §6 checklist | — |
| A.2 | GitHub About + Discussions | Pinned Welcome | LAUNCH Phase 0 all ☐→☑ | A.1 |
| A.3 | Secrets + v0.1.0 tag | npm `@cell-coding/cli` | Clean-machine `npx` succeeds | A.2 |
| A.4 | README GIF + social preview | First-impression assets | One Quick start screenshot | A.3 |
| A.5 | Go/No-Go decision | Start promotion? | LAUNCH § Go criteria (5 items) | A.1–A.4 |

**No-Go fallback:** If Secrets are missing, temporarily emphasize the **clone path** at the top of README (LAUNCH 1.7).

---

### Phase B — Cold start (Day 0 → Week 2)

**Goal:** “Active repo” signals + at least one external contribution.

| # | Task | Cadence | KPI |
|---|------|---------|-----|
| B.1 | Reply to Issues / Discussions / HN | 15 min daily | Response ≤ 72h |
| B.2 | Show HN + Announcements | Day 0–1 | HN comments answered within 24h |
| B.3 | One Show and tell demo | Within 1 week | Share motion-alarm trace |
| B.4 | Merge or constructively review external PR | Within 2 weeks | ≥ 1 |
| B.5 | Star cold start | Launch week | Direct share to 5–10 contacts |

---

### Phase C — v0.2.x experiment (Week 2 → Month 2)

**Goal:** Stabilize RFC-0001 experimental flags · agree on Physical AI sim-real track.

Maps to RFC-0001 §8 rollout step 1.

| # | Task | Issue draft | Done when |
|---|------|-------------|-----------|
| C.1 | Physical AI track community review | `19-physical-ai-sim-real-track` | Maintainer summary on Discussion #003 |
| C.2 | Register RFC-0001 Phase 3 umbrella | `21-rfc-0001-phase3-tracking` | GitHub issue + RFC header link |
| C.3 | `holdLastSafe` integration tests | Phase 3 backlog | Extend `physical-sla.test.ts` |
| C.4 | SECURITY.md EN summary | `07` / #25 | Bilingual SECURITY |
| C.5 | Transpiler diagnostics | `14-transpiler-error-diagnostics` | Friendly compile errors |

---

### Phase D — v0.3.x baseline (Month 2 → Month 4)

**Goal:** Stream/SLA runtime enforcement · Viewer physical metadata.

| # | Task | Output | Verification |
|---|------|--------|--------------|
| D.1 | Stabilize `cell run --stream` batch | CLI docs | A2-S / A3-S E2E |
| D.2 | SLA enforcement (staleness/rate/latency) | `physical-sla.ts` | Synthetic overload test |
| D.3 | Viewer SLA UI | `viewer-react` | Show latencyMs / sensorAgeMs |
| D.4 | Bridge `ingestWallMs` staleness | `bridge-python` | `--staleness sensor\|ingest` |
| D.5 | Stream scheduler | runtime | Declared rate ≠ manual interval only |

**v0.3.0 release gate:**

- [ ] A2-S, A3-S, A4-S `cell run` + bridge demos green
- [ ] RFC-0001 Phase 3 runtime items 50%+ checked
- [ ] No breaking changes (existing `.cell` still compiles)

---

### Phase E — v0.4.x ecosystem (Month 4+)

**Goal:** immune ↔ SLA integration · distributed nervous · self-sustaining contributor loop.

| # | Task | Area |
|---|------|------|
| E.1 | immune ↔ SLA escalation | runtime |
| E.2 | multi-stream co-inject + daemon | bridge (#20) |
| E.3 | ROS2 live adapter expansion | bridge + registry |
| E.4 | A5 Humanoid stream/SLA pattern | examples |
| E.5 | Cell Registry / cloud deploy PoC | Phase 4 CLI |
| E.6 | Monthly release + CHANGELOG automation | ops |

**Community KPIs (carried from original Day 61–90):**

| Metric | Target |
|--------|--------|
| External contributors | 10+ |
| External PRs | 30+ |
| Monthly releases | 3 consecutive on-time |

---

## 5. Physical AI learning path

```
A1 Porifera (3 cells)     — membrane·immune intro
  ↓
A2 Spiderling (5)         — nervous basics
  ↓
A2-S Sim (6 + IMU)        — first stream·SLA touchpoint  ← RFC-0001 PoC
  ↓
A3 Spider (10, 3 organs)  — multi-organ routing
  ↓
A3-S / A3-H Sim·Hardware  — VisionFrame + bridge
  ↓
A4 PET (11)               — affect + safety fallback
  ↓
A4-S / A4-H               — OwnerPing stream
  ↓
A5 Humanoid (14, 4 organs)— Phase E target
```

---

## 6. Contributor entry playbook

**Register now (priority):**

1. #25 SECURITY EN (already open)
2. `14-transpiler-error-diagnostics.md`
3. `19-physical-ai-sim-real-track.md`
4. `21-rfc-0001-phase3-tracking.md`
5. `20-bridge-daemon-multistream.md` (intermediate)

**PR review SLA:**

| Type | First response | Merge target |
|------|----------------|--------------|
| docs / good first issue | 72h | 7 days |
| runtime / compiler | 72h | 14 days |
| RFC / breaking | Discussion first | After RFC Accepted |

---

## 7. Release train

| Version | Timing | Focus | Gate |
|---------|--------|-------|------|
| **v0.1.0** | Phase A | First public npm, motion-alarm | Clean-machine `npx` |
| **v0.1.x** | Phase B | hotfix, docs, GIF | CI green |
| **v0.2.0** | Phase C | RFC experimental, teaching track consensus | Discussion #003 closed |
| **v0.3.0** | Phase D | SLA enforcement, Viewer meta | RFC Phase 3 50% |
| **v0.4.0** | Phase E | daemon, immune-SLA, A5 draft | External PRs ≥ 5 |

---

## 8. Risk register

| Risk | Impact | Mitigation |
|------|--------|------------|
| npm Secrets not configured | Quick start fails during promotion | Emphasize clone path + prioritize Phase A.3 |
| Duplicate good first issues | Contributor confusion | Run ISSUE_CLEANUP immediately |
| Teaching simplification misunderstood | Physical AI credibility | SCENARIO “Known limits” + Discussion consensus |
| subprocess per pulse performance | sim-real demo fails | Document in v0.2, daemon in v0.3 (#20) |
| DSL transpiler scope creep | Slow merges | #24 follow-ups only (14–18), no mega-issues |
| Single-maintainer bottleneck | 72h SLA missed | Expand good first issue share |

---

## 9. Open decisions

| # | Question | Decision path | By when |
|---|----------|---------------|---------|
| Q1 | Accept linear teaching trace? | Discussion #003 | Phase C |
| Q2 | Add DSL `-` operator vs spec omit | RFC or issue #27 scope | Phase C |
| Q3 | A5 Humanoid stream entry point | Community review | Phase E |
| Q4 | RFC-0001 → Accepted timing | Phase 3 50% or explicit defer | Phase D |

---

## 10. Next 7 days (maintainer checklist)

- [ ] Run ISSUE_CLEANUP Steps 1–3 (completed + duplicate close)
- [ ] Pin Welcome Discussion + post Physical AI #003
- [ ] Register 2 starter issues (14, 21)
- [ ] Push v0.1.0 tag or decide clone-path README emphasis
- [ ] Verify `npx @cell-coding/cli run` 3× on clean machine
- [ ] Add one README GIF (viewer-react or Jaeger)
- [ ] Record Go/No-Go decision (LAUNCH §)

---

## 11. Document map

| Doc | Role |
|-----|------|
| [ROADMAP.en.md](ROADMAP.en.md) | Original 90-day goals (historical baseline) |
| **EXECUTION_PLAN.en.md** (this doc) | Current state + phased execution |
| [LAUNCH_CHECKLIST.md](.github/LAUNCH_CHECKLIST.md) | Day -2–0 launch checkboxes |
| [PRESENTATION_OUTLINE.md](PRESENTATION_OUTLINE.md) | External talk + demo script |
| [RFC-0001](rfcs/RFC-0001-stream-membrane-physical-sla.md) | Stream/SLA technical direction |
| [issue-drafts/](.github/issue-drafts/) | Contributor task backlog |

---

## 12. Update rules

1. **On phase transition** — refresh §2 snapshot table
2. **Within 48h of release** — check §7 release train
3. **Monthly** — §6 KPIs + RFC Phase 3 umbrella comment
4. **Quarterly** — align with ROADMAP.md (draft next-quarter roadmap when 90 days complete)
