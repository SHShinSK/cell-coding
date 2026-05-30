# [good-first-issue] Checker: validate signal extends compatibility · Checker: signal extends 호환성 검증

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:medium`

---

## Status · 현황 (2026-05 code review)

Implemented in `checker.ts`:

- `finalizeSignals()` — merge parent fields, detect unknown/cyclic `extends`
- `signalsCompatible()` / `isSubtypeOf()` — tissue flow, membrane emits, handler matching (spec §11)
- `extractSignalNames()` — Generic/List/Map/Option/Result recursive extraction

`checker.ts` 에 extends 체인·subtype 호환·타입 이름 추출이 구현되었습니다.

See `typescript/compile.test.ts` — "validates signal extends for membrane compatibility".

## Remaining tasks · 남은 작업

- [ ] Structural field compatibility (not just signal name subtyping) · 필드 구조 호환 검사
- [ ] `priority` inheritance from parent signals · 부모 signal priority 상속

## References · 참고

- `typescript/checker.ts`, `language-specification.html` §11 signal extends

## Definition of done · 완료 기준

Checker recognizes subtype signals for accepts/emits/flow validation per spec §11 with full test coverage.

하위 신호가 accepts/emits/flow 검증에서 인식되며 테스트로 보장됨.
