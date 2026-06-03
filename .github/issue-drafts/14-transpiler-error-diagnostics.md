# [good-first-issue] Transpiler: include line/column in diagnostics · Transpiler: 진단 메시지에 line/column 포함

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:medium`

**Related:** Closes follow-up from #24 · #24 후속 작업

---

## Context · 배경

`transpileCellFile()` returns compile/type-check failures as plain strings:

```typescript
const errors = diagnostics.filter(d => d.kind === 'error').map(d => d.message);
```

`TypeCheckError` already has `pos: { line, col }`, but that information is dropped before reaching CLI/JSON output.

`transpileCellFile()`은 컴파일/타입 오류를 문자열만 반환합니다. `TypeCheckError.pos`는 있으나 CLI·JSON까지 전달되지 않습니다.

## Goal · 목표

Surface line/column (and optionally `kind`) in `TranspileResult.errors` and `cell build --json` output.

`TranspileResult.errors`와 `cell build --json` 출력에 줄/열(및 선택적으로 `kind`)을 포함합니다.

## Tasks · 작업

- [ ] Extend `TranspileResult.errors` to structured objects (e.g. `{ message, line, col, kind }`) or formatted strings like `line 12, col 3: ...` · 구조화된 오류 객체 또는 포맷 문자열
- [ ] Update `transpileCellFile()` in `typescript/transpiler.ts` · transpiler 매핑 수정
- [ ] Update `build.ts` JSON/human output if needed · CLI 출력 반영
- [ ] Add test in `typescript/transpiler.test.ts` using `fixtures/broken.cell` · 테스트 추가

## Definition of done · 완료 기준

`npm run cell:build -- --json ../examples/validator.cell` still succeeds; a broken `.cell` file reports errors with line/column. `npm test` passes.

정상 파일은 성공, 깨진 `.cell`은 line/column 포함 오류. `npm test` 통과.

## References · 참고

- `typescript/transpiler.ts` — `transpileCellFile`
- `typescript/checker.ts` — `TypeCheckError`
- `typescript/build.ts`
