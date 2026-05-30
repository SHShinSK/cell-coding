# [good-first-issue] transpiler.ts 스텁 — cell → TypeScript 클래스

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:high`

---

## 한국어

### 목표
`.cell` AST를 최소 TypeScript 출력으로 변환하는 `transpiler.ts` 스텁을 추가합니다.

### 출력 형태 (예시)
```typescript
@cell({ role: "..." })
export class Validator extends BaseCell { ... }
```

### 작업
- [ ] `typescript/transpiler.ts` — CellDecl만 처리
- [ ] `examples/validator.cell` → stdout 또는 `generated/` 출력 CLI 옵션

### 완료 기준
- validator 예제가 TS 클래스 문자열로 출력됨 (handler body는 placeholder 허용)

---

## English

### Goal
Add `transpiler.ts` stub: `.cell` AST → minimal TypeScript class.

### Done when
Validator example emits a TS class string (handler body may be placeholder).
