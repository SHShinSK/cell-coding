# [good-first-issue] transpiler.ts stub — cell → TypeScript class · transpiler.ts 스텁 — cell → TypeScript 클래스

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:high`

---

## Status · 현황 (2026-05 code review)

- ✅ `typescript/compile.ts` — `compile(source)` entry (lexer → parser → checker)
- ✅ `npm test` smoke tests for parser/checker
- ⏳ `transpiler.ts` not yet implemented

## Goal · 목표

Add `transpiler.ts` stub that converts `.cell` AST to minimal TypeScript output.

`.cell` AST를 최소 TypeScript 출력으로 변환하는 `transpiler.ts` 스텁을 추가합니다.

## Expected output · 출력 형태 (예시)

```typescript
@cell({ role: "..." })
export class Validator extends BaseCell { ... }
```

## Tasks · 작업

- [ ] `typescript/transpiler.ts` — handle `CellDecl` only · CellDecl만 처리
- [ ] Wire into `compile()` or CLI · `compile()` 또는 CLI 연동
- [ ] CLI: `examples/validator.cell` → stdout or `generated/` · CLI 출력 옵션

## Definition of done · 완료 기준

Validator example emits a TS class string (handler body may be placeholder).

validator 예제가 TS 클래스 문자열로 출력됨 (handler body는 placeholder 허용).
