# [good-first-issue] Lexer: disambiguate generic `<` vs comparison `<` · Lexer: 제네릭 `<` 와 비교 연산자 `<` 구분

**Labels:** `good first issue`, `help wanted`, `bug`, `area:dsl-compiler`, `priority:high`

---

## Problem · 문제

`lexer.ts` does not disambiguate `<` / `>` for generics vs comparison operators.

`lexer.ts`에서 `<` / `>` 가 제네릭과 비교 연산자를 구분하지 못합니다.

## Tasks · 작업

- [ ] Lexical context or lookahead disambiguation · lexical context 또는 lookahead로 disambiguation
- [ ] Test cases: `List<T>` vs `a < b` · 테스트 케이스 추가

## References · 참고

- `typescript/lexer.ts`
- `language-specification.html` §11 Type system · §11 타입 시스템

## Definition of done · 완료 기준

Both patterns tokenize correctly.

두 패턴 모두 올바른 토큰으로 분리됨.
