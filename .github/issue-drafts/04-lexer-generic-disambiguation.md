# [good-first-issue] Lexer: document context-based `<` / `>` handling · Lexer: 문맥 기반 `<` / `>` 처리 문서화

**Labels:** `good first issue`, `help wanted`, `docs`, `area:dsl-compiler`, `priority:low`

---

## Status · 현황 (2026-05 code review)

`<` and `>` are lexed as `LANGLE` / `RANGLE` with values `'<'` / `'>'`.  
Comparison in handler bodies is resolved in `parser.ts` `parseBinary()` by token **value**, not separate `LT`/`GT` enum members.

`<` 와 `>` 는 `LANGLE` / `RANGLE` 로 토큰화되며, 핸들러 본문의 비교 연산은 `parser.ts` `parseBinary()` 가 토큰 **value** 로 처리합니다.

Dead `LT`/`GT` enum entries were removed; comments added in `lexer.ts`.

사용되지 않던 `LT`/`GT` enum 은 제거되었고 `lexer.ts` 에 주석이 추가되었습니다.

## Remaining tasks · 남은 작업

- [ ] Add regression tests for edge cases (`a<<b`, nested generics in expressions) · 엣지 케이스 회귀 테스트
- [ ] Document in `language-specification.html` §12 that angle brackets are context-sensitive at parse time · 명세 §12에 파싱 시 문맥 의존 명시

## References · 참고

- `typescript/lexer.ts`, `typescript/parser.ts`, `typescript/compile.test.ts`

## Definition of done · 완료 기준

Spec and lexer comments describe the context-based model; tests cover generic vs comparison patterns.

명세·렉서 주석에 문맥 기반 모델이 설명되고, 제네릭 vs 비교 패턴 테스트가 포함됨.
