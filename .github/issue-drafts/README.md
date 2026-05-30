# Starter Issues (good first issue)

GitHub에 등록할 첫 기여용 이슈 초안 10개입니다.  
Each draft uses **English first · Korean parallel** (same structure as site docs).

| # | File | Area |
|---|------|------|
| 1 | [01-readme-badges.md](01-readme-badges.md) | docs |
| 2 | [02-validator-cell-example.md](02-validator-cell-example.md) | dsl-compiler |
| 3 | [03-typescript-package-json.md](03-typescript-package-json.md) | dsl-compiler |
| 4 | [04-lexer-generic-disambiguation.md](04-lexer-generic-disambiguation.md) | dsl-compiler |
| 5 | [05-parser-list-map-types.md](05-parser-list-map-types.md) | dsl-compiler |
| 6 | [06-transpiler-stub.md](06-transpiler-stub.md) | dsl-compiler |
| 7 | [07-security-en-summary.md](07-security-en-summary.md) | docs |
| 8 | [08-paradigm-page-cta.md](08-paradigm-page-cta.md) | docs |
| 9 | [09-checker-signal-extends.md](09-checker-signal-extends.md) | dsl-compiler |
| 10 | [10-physical-ai-example-doc.md](10-physical-ai-example-doc.md) | runtime/docs |

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
