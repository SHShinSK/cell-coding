# [good-first-issue] Docs: transpiler standalone vs import mode · Docs: transpiler standalone vs import 모드

**Labels:** `good first issue`, `help wanted`, `documentation`, `area:dsl-compiler`, `priority:low`

**Related:** Follow-up from #24 · #24 후속 작업

---

## Context · 배경

`transpileProgram(program, { standalone: true })` inlines `BaseCell`; default output imports `../transpiled-cell.js`. A type-mapping table was added to `examples/README.md`; standalone vs import trade-offs are not yet documented in one place.

타입 매핑 표는 README에 있으나, standalone/import 선택 가이드는 아직 없습니다.

## Goal · 목표

Document when to use default import mode vs `standalone: true`, with copy-paste examples for monorepo vs single-file deploy.

기본 import 모드와 `standalone: true` 사용 시점을 예제와 함께 문서화합니다.

## Tasks · 작업

- [ ] Expand Phase 3 section in `examples/README.md` (or link from root `README.md`) · README 보강
- [ ] Show side-by-side snippet: default `cell build` output vs `standalone` preamble · 출력 비교 예시
- [ ] Mention `cell run --transpiled` + `--generated` dir workflow · 런타임 연동 워크플로
- [ ] Optional: one-line note in `typescript/transpiler.ts` JSDoc pointing to docs · JSDoc 링크

## Definition of done · 완료 기준

A contributor can choose import vs standalone without reading source. No code behavior change required (docs-only PR is fine).

소스 코드 없이도 모드를 선택할 수 있음. 문서만 변경해도 됨.

## References · 참고

- `examples/README.md` — Phase 3 CLI, type mapping table
- `typescript/transpiler.ts` — `TranspileOptions.standalone`
- `typescript/transpiled-cell.ts` — `transpiledImportLine`, `inlineTranspiledPreamble`
