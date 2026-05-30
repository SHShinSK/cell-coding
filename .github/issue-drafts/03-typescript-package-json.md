# [good-first-issue] Add typescript/package.json and build scripts · typescript/package.json 및 빌드 스크립트 추가

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:medium`

---

## Goal · 목표

Make the `typescript/` compiler draft runnable as an npm package.

`typescript/` 컴파일러 초안을 실행 가능한 npm 패키지로 정리합니다.

> **Maintainer note · 메모:** `package.json`, `tsconfig.json`, and CI typecheck (`npm run typecheck`) are partially pre-landed. Remaining: `npm run check` CLI stub (lexer+parser+checker).  
> `package.json`, `tsconfig.json`, CI typecheck(`npm run typecheck`)는 일부 선반영됨. 남은 작업: `npm run check` CLI 스텁.

## Tasks · 작업

- [x] `typescript/package.json` (type: module, typescript devDep) — pre-landed · 선반영
- [x] `tsconfig.json` (ESM, strict) — pre-landed · 선반영
- [ ] `npm run check` — lexer+parser+checker CLI stub · CLI 스텁

## Definition of done · 완료 기준

`npm install && npm run check` runs without errors (empty program OK).

`npm install && npm run check` 가 오류 없이 실행 (빈 프로그램이라도 OK).
