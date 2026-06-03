# Transpiler: optional @cell decorator emit · Transpiler: @cell decorator 출력 옵션

**Labels:** `help wanted`, `enhancement`, `area:dsl-compiler`, `priority:low`

**Related:** Follow-up from #24 · #24 후속 작업

---

## Context · 배경

Issue #24’s original example used a `@cell({ role: "..." })` decorator. Current output uses static fields on the class:

```typescript
export class Validator extends BaseCell {
  static readonly role = "...";
  static readonly accepts = [...] as const;
  static readonly emits = [...] as const;
}
```

Both shapes are valid; some tooling may prefer decorators for metadata reflection.

#24 예시는 `@cell` decorator였으나, 현재는 `static readonly` 필드를 사용합니다.

## Goal · 목표

Add an opt-in transpiler flag (e.g. `decorators: true` on `TranspileOptions`) that emits `@cell({ role, tags, lifespan })` when cell metadata is available in AST.

AST 메타데이터가 있을 때 `@cell({ ... })` decorator를 emit하는 옵션을 추가합니다.

## Tasks · 작업

- [ ] Define decorator helper or code string in `transpiled-cell.ts` or new module · decorator 헬퍼 정의
- [ ] Extend `TranspileOptions` and `transpileCell()` in `transpiler.ts` · 옵션·출력 분기
- [ ] Wire optional CLI flag on `cell build` (e.g. `--decorators`) · CLI 플래그
- [ ] Tests: default unchanged; with flag, output includes `@cell` and still typechecks · 테스트
- [ ] Document in README · 문서

## Definition of done · 완료 기준

Default behavior unchanged. With `decorators: true`, generated TS includes `@cell(...)` above exported classes. `npm test` passes.

기본 동작 유지. 옵션 켜면 `@cell` 포함. `npm test` 통과.

## References · 참고

- `typescript/transpiler.ts`
- Issue #24 expected output example
