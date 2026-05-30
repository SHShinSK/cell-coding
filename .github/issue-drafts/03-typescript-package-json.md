# [good-first-issue] typescript/package.json 및 빌드 스크립트 추가

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:medium`

---

## 한국어

### 목표
`typescript/` 컴파일러 초안을 실행 가능한 npm 패키지로 정리합니다.

### 작업
- [ ] `typescript/package.json` (type: module, typescript devDep)
- [ ] `tsconfig.json` (ESM, strict)
- [ ] `npm run check` — lexer+parser+checker CLI 스텁

### 완료 기준
- `npm install && npm run check` 가 오류 없이 실행 (빈 프로그램이라도 OK)

---

## English

### Goal
Make the `typescript/` compiler draft runnable as an npm package.

### Tasks
- [ ] Add `typescript/package.json`
- [ ] Add `tsconfig.json`
- [ ] Add `npm run check` CLI stub (lexer+parser+checker)

### Done when
`npm install && npm run check` runs without errors.
