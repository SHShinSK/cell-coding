# [good-first-issue] typescript/package.json 및 빌드 스크립트 추가

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:medium`

---

## 한국어

### 목표
`typescript/` 컴파일러 초안을 실행 가능한 npm 패키지로 정리합니다.

> **Maintainer note:** `package.json`, `tsconfig.json`, and CI typecheck (`npm run typecheck`) are partially pre-landed in the repo. Remaining work: `npm run check` CLI stub (lexer+parser+checker).

### 작업
- [x] `typescript/package.json` (type: module, typescript devDep) — pre-landed
- [x] `tsconfig.json` (ESM, strict) — pre-landed
- [ ] `npm run check` — lexer+parser+checker CLI 스텁

### 완료 기준
- `npm install && npm run check` 가 오류 없이 실행 (빈 프로그램이라도 OK)

---

## English

### Goal
Make the `typescript/` compiler draft runnable as an npm package.

> **Maintainer note:** `package.json`, `tsconfig.json`, and CI typecheck (`npm run typecheck`) are partially pre-landed. Remaining: `npm run check` CLI stub.

### Tasks
- [x] Add `typescript/package.json` — pre-landed
- [x] Add `tsconfig.json` — pre-landed
- [ ] Add `npm run check` CLI stub (lexer+parser+checker)

### Done when
`npm install && npm run check` runs without errors.
