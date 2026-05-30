# [good-first-issue] Lexer: 제네릭 `<` 와 비교 연산자 `<` 구분

**Labels:** `good first issue`, `help wanted`, `bug`, `area:dsl-compiler`, `priority:high`

---

## 한국어

### 문제
`lexer.ts`에서 `<` / `>` 가 제네릭과 비교 연산자를 구분하지 못합니다.

### 작업
- [ ] lexical context 또는 lookahead로 disambiguation
- [ ] 테스트 케이스: `List<T>` vs `a < b`

### 참고 파일
- `typescript/lexer.ts`
- `개발명세서.html` §11 타입 시스템

### 완료 기준
- 두 패턴 모두 올바른 토큰으로 분리됨

---

## English

### Problem
`lexer.ts` does not disambiguate `<`/`>` for generics vs comparison operators.

### Tasks
- [ ] Implement context or lookahead disambiguation
- [ ] Test cases: `List<T>` vs `a < b`

### Done when
Both patterns tokenize correctly.
