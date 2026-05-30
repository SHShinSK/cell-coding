# [good-first-issue] Unify query keyword placement (membrane accepts) · query 키워드 위치 통일 (막 accepts)

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:low`

---

## Status · 현황 (2026-05 code review)

- ✅ Parser: `accepts: FindUser query` → `MembraneDecl.acceptsIsQuery`
- ✅ EBNF: `"accepts" ":" signalType ["query"]`
- ✅ Checker warns if redundant `query` on handler `on(Type query ...)`

## Remaining tasks · 남은 작업

- [ ] Remove handler-level `query` parsing or document as deprecated · 핸들러 query 파싱 제거 또는 deprecated 표시
- [ ] Runtime semantics for query accepts (await response signal) · query accepts 런타임 의미 구현

## References · 참고

- `language-specification.html` §5, `typescript/parser.ts`, `typescript/ast.ts`

## Definition of done · 완료 기준

Spec, parser, and checker agree on membrane-only `query`; no conflicting handler syntax in docs.

명세·파서·체커가 막 accepts 의 query 만 사용하고 문서에 충돌 문법이 없음.
