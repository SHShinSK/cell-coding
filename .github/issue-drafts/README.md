# Starter Issues (good first issue)

GitHub에 등록할 첫 기여용 이슈 초안 10개입니다.  
각 파일은 **한국어 + English** 로 작성되어 있습니다.

| # | 파일 | 영역 |
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

## 등록 방법

### 수동
1. GitHub → **Issues** → **New issue**
2. 제목: 파일 첫 줄 `# [...]` 에서 `[...]` 부분 사용
3. 본문: 파일 전체 붙여넣기
4. Labels: `good first issue`, `help wanted` + 파일 상단 권장 라벨

### 스크립트 (GitHub CLI 필요)
```powershell
.\.github\scripts\create-starter-issues.ps1
```

## Maintainer 메모

- 이슈 등록 후 Discussions **Announcements**에 “First 20 Contributors” 공지 권장
- `ISSUE_LABELS.md` 기준으로 라벨을 먼저 생성하세요
