# [good-first-issue] Strengthen checker validation rules · 체커 검증 규칙 강화

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:low`

---

## Status · 현황 (2026-05 code review)

- ✅ Cell/genome with zero handlers → **error** (was warning)
- ✅ Invalid `priority` / `lifespan` values → error
- ✅ `passthrough` in EBNF and parser (already supported)

## Remaining tasks · 남은 작업

- [ ] Validate handler `on` signal types exist as `signal` declarations · 핸들러 신호 타입 존재 검사
- [ ] Warn on empty `role` strings in genome templates · genome role 검증

## References · 참고

- `typescript/checker.ts`, `language-specification.html` §12

## Definition of done · 완료 기준

Checker enforces spec mandatory rules as errors with tests for each rule.

명세 필수 규칙이 error 로 검증되고 테스트로 보장됨.
