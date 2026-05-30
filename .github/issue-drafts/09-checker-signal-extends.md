# [good-first-issue] Checker: validate signal extends compatibility · Checker: signal extends 호환성 검증

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:medium`

---

## Goal · 목표

Add signal `extends` chain support to membrane compatibility checks in `checker.ts`.

`checker.ts`에 signal `extends` 관계를 반영한 막 호환 검사를 추가합니다.

## Tasks · 작업

- [ ] Build `extends` chain when collecting `SignalDecl` · SignalDecl 수집 시 `extends` 체인 구축
- [ ] Verify membrane `accepts` accepts supertype signals (spec §11) · membrane accepts 상위 타입 수용 검증

## References · 참고

- `language-specification.html` — signal extends, structural typing

## Definition of done · 완료 기준

Checker recognizes subtype signals for `accepts` validation per spec §11.

하위 신호가 상위를 accepts하는 막에 전달 가능함을 checker가 인지.
