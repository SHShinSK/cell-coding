# [good-first-issue] Checker: signal extends 호환성 검증

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:medium`

---

## 한국어

### 목표
`checker.ts`에 signal `extends` 관계를 반영한 막 호환 검사를 추가합니다.

### 작업
- [ ] SignalDecl 수집 시 `extends` 체인 구축
- [ ] membrane accepts가 상위 신호 타입도 수용하는지 검증 (명세 §11)

### 참고
- `language-specification.html` — signal extends, structural typing

### 완료 기준
- 하위 신호가 상위를 accepts하는 막에 전달 가능함을 checker가 인지

---

## English

### Goal
Add signal `extends` chain to membrane compatibility checks in `checker.ts`.

### Done when
Checker recognizes subtype signals for accepts validation per spec §11.
