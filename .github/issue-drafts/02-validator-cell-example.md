# [good-first-issue] Add examples/validator.cell golden file · examples/validator.cell 골든 파일 추가

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:medium`

---

## Status · 현황 (2026-05 code review)

- ✅ `examples/validator.cell` — role, membrane block, `on` handler with `if`/`else`/`emit`
- ✅ `examples/README.md` updated
- ✅ Covered by `typescript/compile.test.ts` smoke test via `compile()`

## Remaining tasks · 남은 작업

- [ ] Add second example (tissue flow or Physical AI scenario) · tissue/Physical AI 예제 추가
- [ ] Link from `language-specification.html` §2 to live example · 명세 §2에서 예제 링크

## References · 참고

- `examples/validator.cell`, `typescript/compile.ts`, `language-specification.html` §2

## Definition of done · 완료 기준

Example matches spec block syntax and passes `npm test` in `typescript/`.

명세 블록 문법과 일치하고 `typescript/` 의 `npm test` 를 통과함.
