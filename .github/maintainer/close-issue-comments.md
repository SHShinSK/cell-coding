# Close issue comment templates · 이슈 종료 코멘트 초안

Maintainer: paste into GitHub issue before **Close as completed**.  
Maintainer: GitHub 이슈에서 **Close as completed** 전에 붙여넣기.

**전체 정리 절차:** [ISSUE_CLEANUP.md](../ISSUE_CLEANUP.md) · **런칭:** [LAUNCH_CHECKLIST.md](../LAUNCH_CHECKLIST.md)

Duplicate pairs: if both old (#2–#10) and bootstrap (#20–#28) exist, close the **older duplicate** with a link to the kept issue.

---

## #20 · Add examples/validator.cell golden file

```markdown
Closing as **completed** — already on `main`.

- Golden file: [`examples/validator.cell`](https://github.com/SHShinSK/cell-coding/blob/main/examples/validator.cell)
- Used by Phase 1 docs, `cell:run`, `cell:build`, and `phase3.test.ts`

Thanks to everyone who picked this up — no further work needed on this ticket.
```

---

## #21 · Add typescript/package.json and build scripts

```markdown
Closing as **completed** — already on `main`.

- [`typescript/package.json`](https://github.com/SHShinSK/cell-coding/blob/main/typescript/package.json)
- Scripts: `npm test`, `cell:run`, `cell:build`, `cell:test`, etc.
- CI runs in [`.github/workflows/ci.yml`](https://github.com/SHShinSK/cell-coding/blob/main/.github/workflows/ci.yml)

Follow-up ideas (separate issues): `cell build --watch` → see draft `15-cell-build-watch.md`.
```

---

## #22 · Lexer: disambiguate generic `<` vs comparison `<`

```markdown
Closing as **completed** — implemented and tested on `main`.

- Lexer handles `→` / `->` and generic contexts via parser precedence
- Test: `typescript/compile.test.ts` — *tokenizes generic and comparison angle brackets* (`List<String> a < b`)

If you find a **new** counterexample, please open a bug with a minimal `.cell` snippet.
```

---

## #23 · Parser: parse List/Map type expressions

```markdown
Closing as **completed** — implemented on `main`.

- `typescript/parser.ts` — `List<T>`, `Map<K,V>` → `ListType` / `MapType` AST nodes
- Covered by compiler smoke tests

Remaining type-system work (if any) should be filed as a **new** issue with a concrete failing program.
```

---

## #25 · Add English summary section to SECURITY.md

```markdown
**Not closing** — still valid. Keeping open for contributors.

Current `SECURITY.md` is Korean-only. This issue tracks an **English summary section** at the top (parallel to site docs EN/KR style).

Draft checklist: see [`.github/issue-drafts/07-security-en-summary.md`](https://github.com/SHShinSK/cell-coding/blob/main/.github/issue-drafts/07-security-en-summary.md).

Note: duplicate #16 was closed earlier; this bootstrap issue (#25) is the canonical tracker unless you prefer to merge titles.
```

*(Use the block above as a **status comment**, not a close comment.)*

---

## #26 · Add GitHub contribution CTA banner to cell-coding.html

```markdown
Closing as **completed** — CTA section exists on `main`.

- [`cell-coding.html`](https://github.com/SHShinSK/cell-coding/blob/main/cell-coding.html) — open-source contribution paragraph (EN/KR) + GitHub / Contributing links
- Related: #17 (closed)

If you want a **different** layout or stronger CTA copy, please open a **new** docs issue with a mockup or screenshot.
```

---

## #27 · Checker: validate signal extends compatibility

```markdown
**Partially completed** — updating scope (not closing yet).

**Done on `main`:**
- `finalizeSignals()` — unknown/cyclic `extends`
- `signalsCompatible()` / `isSubtypeOf()` — membrane / tissue flow (spec §11)
- Tests in `typescript/compile.test.ts`

**Remaining (this issue):**
- [ ] Structural field compatibility (not just signal name subtyping)
- [ ] `priority` inheritance from parent signals

See updated draft: [`.github/issue-drafts/09-checker-signal-extends.md`](https://github.com/SHShinSK/cell-coding/blob/main/.github/issue-drafts/09-checker-signal-extends.md)

Contributors: please comment here before starting to avoid duplicate PRs.
```

*(Status comment — keep issue **open**.)*

---

## #28 · Document MotionDetected → AlarmActuator Physical AI example

```markdown
Closing as **completed** — documentation landed on `main`.

- [`examples/physical-ai-motion-alarm.md`](https://github.com/SHShinSK/cell-coding/blob/main/examples/physical-ai-motion-alarm.md) — EN/KR, quick start, mermaid, bridge + cloud paths
- Program: [`examples/motion-alarm/motion-alarm.cell`](https://github.com/SHShinSK/cell-coding/blob/main/examples/motion-alarm/motion-alarm.cell)

**Next track (broader Physical AI path):** see Discussion [003 draft](https://github.com/SHShinSK/cell-coding/blob/main/.github/discussions/003-physical-ai-samples-feedback.md) and issue draft `19-physical-ai-sim-real-track.md`.
```

---

## Old duplicates (#2–#10) · 구 중복 이슈

If still open, close with:

```markdown
Closing as **duplicate** of #XX (bootstrap bilingual issue).

Please use #XX for comments and PRs linking to this task. Thanks!
```

| Old | Close as duplicate of |
|-----|------------------------|
| #2 | #20 |
| #3 | #21 |
| #6, #15 | #24 (closed) |
| #7, #16 | #25 |
| #8, #17 | #26 |
| #9, #18 | #27 |
| #10, #19 | #28 |

---

## Maintainer checklist · 메인테이너 체크리스트

상세 단계: [ISSUE_CLEANUP.md §3](../ISSUE_CLEANUP.md) · 런칭: [LAUNCH_CHECKLIST.md](../LAUNCH_CHECKLIST.md)

- [ ] Post status/close comments above
- [ ] Close #20, #21, #22, #23, #24, #26, #28 as **completed**
- [ ] Close #2–#19 duplicates per mapping table in ISSUE_CLEANUP.md
- [ ] Leave #25 open; leave #27 open with updated scope
- [ ] Register drafts **14–15, 19–21** (see `issue-drafts/README.md`)
- [ ] Publish Discussion **003** (Physical AI samples feedback)
