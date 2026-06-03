# [good-first-issue] transpiler.ts — cell → TypeScript class · transpiler.ts — cell → TypeScript 클래스

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:medium`

---

## Status · 현황 (2026-05-31)

- ✅ `typescript/transpiler.ts` — `transpileProgram`, `transpileCellFile`, `defaultBuildOutPath`
- ✅ `typescript/transpile-handler.ts` — handler body / expression codegen
- ✅ `typescript/compile.ts` — re-exports transpiler API
- ✅ CLI — `cell build`, `cell run --transpiled`
- ✅ Tests — `phase3.test.ts`, `transpile-handler.test.ts`, `transpiled-parity.test.ts`, `transpiler.test.ts`

> **Note:** Issue #24 / PR #30의 초기 stub 목표는 main에 이미 반영되어 있습니다.  
> 새 기여는 아래 **Follow-up tasks**에서 선택해 주세요.

## Goal (original) · 원래 목표

`.cell` AST를 TypeScript 클래스·인터페이스로 변환한다.

## Expected output · 출력 형태 (예시)

```typescript
/** Input validation · 입력값 유효성 검사 */
export class Validator extends BaseCell {
  static readonly role = "Input validation · 입력값 유효성 검사";
  static readonly accepts = ["RawInput"] as const;
  static readonly emits = ["ValidSignal", "ErrorSignal"] as const;

  onRawInput(input: RawInput): void {
    if (this.callFn("valid", input)) {
      this.emit("ValidSignal");
    } else {
      this.emit("ErrorSignal");
    }
  }
}
```

## Follow-up tasks · 후속 작업 (good first issue)

- [ ] **Docs** — standalone vs import: see [17-transpiler-standalone-docs.md](17-transpiler-standalone-docs.md) (type mapping table ✅ in `examples/README.md`)
- [ ] **Tests** — unsupported handler stmts: see [16-transpiler-unsupported-stmts.md](16-transpiler-unsupported-stmts.md)
- [ ] **Error UX** — see [14-transpiler-error-diagnostics.md](14-transpiler-error-diagnostics.md)
- [ ] **CLI** — see [15-cell-build-watch.md](15-cell-build-watch.md)
- [ ] **Decorators** — see [18-transpiler-cell-decorator.md](18-transpiler-cell-decorator.md)

## Definition of done (follow-up) · 후속 완료 기준

선택한 작업에 대해 `npm test` 통과 + README 또는 테스트로 동작이 문서화됨.

## References · 참고

- `typescript/transpiler.ts`
- `typescript/transpile-handler.ts`
- `examples/README.md` — Phase 3 CLI 섹션
