# [good-first-issue] Align concept page pseudocode with spec EBNF · 개념 페이지 의사코드를 명세 EBNF에 맞춤

**Labels:** `good first issue`, `help wanted`, `docs`, `area:docs`, `priority:low`

---

## Status · 현황 (2026-05 code review)

- ✅ `cell-coding.html` organism.cell example updated to block syntax (`membrane { }`, `flow linear { A -> B }`, `tissues { }`, `organs { }`)
- ✅ `language-specification.html` §6 immune example aligned to block form (canonical EBNF)
- ✅ EBNF `membraneDecl` includes `passthrough` and `accepts ... query`

## Remaining tasks · 남은 작업

- [ ] Audit other HTML spec pages for legacy `cells:[...]` / arrow-only immune syntax · 다른 HTML 페이지 잔여 문법 점검

## Definition of done · 완료 기준

All public `.cell` examples in Pages docs match `language-specification.html` §12 EBNF.

Pages 문서의 `.cell` 예제가 명세 §12 EBNF 와 일치함.
