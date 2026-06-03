# [good-first-issue] CLI: cell build --watch · CLI: cell build --watch

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:medium`

**Related:** Follow-up from #24 · #24 후속 작업

---

## Context · 배경

`cell run --watch` already re-runs on `.cell` save (`run-watch.ts`). There is no equivalent for `cell build`, so developers must manually re-run build to refresh `generated/*.ts`.

`cell run --watch`는 `.cell` 저장 시 재실행되지만, `cell build --watch`는 없어 `generated/*.ts`를 수동으로 다시 빌드해야 합니다.

## Goal · 목표

Add `--watch` to `cell build` that re-transpiles when the source `.cell` file changes.

`.cell` 파일 변경 시 자동으로 다시 transpile하는 `cell build --watch`를 추가합니다.

## Tasks · 작업

- [ ] Parse `--watch` in `typescript/build.ts` (reuse debounce pattern from `run-watch.ts` if practical) · `build.ts`에 `--watch` 파싱
- [ ] On save: call `transpileCellFile()` and write to `--out` / `defaultBuildOutPath` · 저장 시 출력 갱신
- [ ] Log concise human message on each rebuild (path + ok/errors) · 재빌드 로그
- [ ] Add test or smoke script (optional: short integration test with temp file) · 테스트 또는 스모크
- [ ] Document in `examples/README.md` Phase 3 section · README 문서화

## Definition of done · 완료 기준

```bash
npm run cell:build -- --watch --out generated ../examples/validator.cell
```

Keeps running; editing and saving `validator.cell` updates `generated/validator.ts`. `npm test` passes.

위 명령이 동작하고, 파일 저장 시 `generated/validator.ts`가 갱신됨. `npm test` 통과.

## References · 참고

- `typescript/build.ts`
- `typescript/run-watch.ts` — watch/debounce reference
- `typescript/transpiler.ts` — `transpileCellFile`, `defaultBuildOutPath`
