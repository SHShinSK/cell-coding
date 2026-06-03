# [good-first-issue] Transpiler: document and test unsupported handler stmts · Transpiler: 미지원 handler 문장 문서화·테스트

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:low`

**Related:** Follow-up from #24 · #24 후속 작업

---

## Context · 배경

`transpile-handler.ts` codegen covers `emit`, `if/else`, `let`, expressions, and marks `return`/`absorb` as AST-parity no-ops. Unknown statement kinds fall through to:

```typescript
default:
  return [`${indent}// unsupported stmt · 미지원 문장`];
```

There is no central list of supported vs unsupported constructs for contributors or users.

지원/미지원 handler 구문 목록이 문서·테스트로 정리되어 있지 않습니다.

## Goal · 목표

Add explicit tests and a short doc section listing transpiler handler coverage and intentional no-ops.

handler codegen 지원 범위와 의도적 no-op을 테스트·문서로 명시합니다.

## Tasks · 작업

- [ ] Add `typescript/transpile-handler.test.ts` cases (or extend `transpiler.test.ts`) for: unsupported stmt comment, `return`, `absorb`, `TernaryExpr` · 테스트 케이스 추가
- [ ] Add a **Handler codegen coverage** subsection to `examples/README.md` or comment block in `transpile-handler.ts` · README 또는 파일 주석
- [ ] If a construct should codegen instead of no-op, implement minimal support in scope; otherwise document as future work · 필요 시 최소 구현, 아니면 future work로 명시

## Supported today (reference) · 현재 지원 (참고)

| Construct | Output |
|-----------|--------|
| `emit S` / `emit S { field: expr }` | `this.emit(...)` |
| `if (cond) { ... } else { ... }` | TS if/else |
| `let x = expr` | `const x = ...` |
| `return` / `absorb` | no-op comment (AST parity) |
| expressions | literals, ident, member, call, binary, unary, ternary |
| unknown stmt | `// unsupported stmt` |

## Definition of done · 완료 기준

Coverage table exists in docs; tests assert expected strings for at least unsupported stmt + no-op stmts. `npm test` passes.

문서에 표 추가, 미지원/no-op 테스트 통과. `npm test` 통과.

## References · 참고

- `typescript/transpile-handler.ts`
- `typescript/transpile-handler.test.ts`
