# Starter Issues (good first issue)

GitHub에 등록할 첫 기여용 이슈 초안 10개입니다.  
Each draft uses **English first · Korean parallel** (same structure as site docs).

| # | File | Area |
|---|------|------|
| 1 | [01-readme-badges.md](01-readme-badges.md) | docs | ✅ done on main |
| 2 | [02-validator-cell-example.md](02-validator-cell-example.md) | dsl-compiler | ✅ done — close #20 |
| 3 | [03-typescript-package-json.md](03-typescript-package-json.md) | dsl-compiler | ✅ done — close #21 |
| 4 | [04-lexer-generic-disambiguation.md](04-lexer-generic-disambiguation.md) | dsl-compiler | ✅ done — close #22 |
| 5 | [05-parser-list-map-types.md](05-parser-list-map-types.md) | dsl-compiler | ✅ done — close #23 |
| 6 | [06-transpiler-stub.md](06-transpiler-stub.md) | dsl-compiler | ✅ #24 closed — see 14–18 for follow-ups |
| 7 | [07-security-en-summary.md](07-security-en-summary.md) | docs |
| 8 | [08-paradigm-page-cta.md](08-paradigm-page-cta.md) | docs | ✅ done — close #26 |
| 9 | [09-checker-signal-extends.md](09-checker-signal-extends.md) | dsl-compiler |
| 10 | [10-physical-ai-example-doc.md](10-physical-ai-example-doc.md) | runtime/docs | ✅ done — close #28 |
| 11 | [11-grammar-drift-spec-alignment.md](11-grammar-drift-spec-alignment.md) | dsl-compiler |
| 12 | [12-query-membrane-unification.md](12-query-membrane-unification.md) | dsl-compiler |
| 13 | [13-checker-validation-strictness.md](13-checker-validation-strictness.md) | dsl-compiler |
| 14 | [14-transpiler-error-diagnostics.md](14-transpiler-error-diagnostics.md) | dsl-compiler · #24 follow-up |
| 15 | [15-cell-build-watch.md](15-cell-build-watch.md) | dsl-compiler · #24 follow-up |
| 16 | [16-transpiler-unsupported-stmts.md](16-transpiler-unsupported-stmts.md) | dsl-compiler · #24 follow-up |
| 17 | [17-transpiler-standalone-docs.md](17-transpiler-standalone-docs.md) | docs · #24 follow-up |
| 18 | [18-transpiler-cell-decorator.md](18-transpiler-cell-decorator.md) | dsl-compiler · #24 follow-up (enhancement) |
| 19 | [19-physical-ai-sim-real-track.md](19-physical-ai-sim-real-track.md) | runtime/docs · Physical AI path review |
| 20 | [20-bridge-daemon-multistream.md](20-bridge-daemon-multistream.md) | bridge-python · daemon / multi-stream |
| 21 | [21-rfc-0001-phase3-tracking.md](21-rfc-0001-phase3-tracking.md) | rfc · RFC-0001 Phase 3 umbrella |

**Maintainer · 메인테이너:** [close-issue-comments.md](../maintainer/close-issue-comments.md) · **Discussion · 토론:** [003-physical-ai-samples-feedback.md](../discussions/003-physical-ai-samples-feedback.md)

## Draft format · 초안 형식

- **Title:** `[good-first-issue] English title · 한국어 제목` (first line `# ...`)
- **Sections:** `Goal · 목표`, `Tasks · 작업`, `Definition of done · 완료 기준`
- **Checklists:** one line per item — `English · 한국어`

## Registration · 등록 방법

### Manual · 수동
1. GitHub → **Issues** → **New issue**
2. Title: remove `# ` from the first line only · 첫 줄에서 `# ` 만 제거
3. Body: paste the full file · 파일 전체 붙여넣기
4. Labels: apply all labels from the `**Labels:**` line · 3번째 줄 라벨 전부 적용

### Script · 스크립트 (GitHub CLI)
```powershell
.\.github\scripts\create-starter-issues.ps1
```

### Actions
**Community bootstrap** workflow — creates issues with parsed labels automatically.

## Maintainer notes · 메모

- After registration, post a **First Contributors** announcement in Discussions
- Create labels first per `ISSUE_LABELS.md` (or run Community bootstrap)
- Already-open issues with old Korean-only titles: edit titles or close and re-run bootstrap
