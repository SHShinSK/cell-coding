# Contributing to Cell Coding

> English first · [한국어 병렬](CONTRIBUTING.md)

Thank you for contributing. This project values **reproducible execution** over abstract philosophy.  
Cell Coding에 기여해 주셔서 감사합니다. 이 프로젝트는 “철학”보다 **재현 가능한 실행 결과**를 중요하게 생각합니다.

## Principles | 기여 원칙

- Contribute in small, frequent increments · 작은 단위로 자주 기여
- Improve at least one of: behavior, tests, or docs · 동작/테스트/문서 중 최소 1개 이상을 명확히 개선
- Do not make breaking changes without an RFC · 파괴적 변경은 RFC 없이 진행하지 않음

## Getting started | 시작하기

1. Pick an issue labeled `good first issue` or `help wanted`  
   이슈 목록에서 `good first issue` 또는 `help wanted` 선택
2. Comment on the issue to share your intent  
   작업 의도를 이슈 코멘트로 먼저 공유
3. Fork, create a branch, and open a PR  
   포크/브랜치 생성 후 PR 제출

Branch examples · 브랜치 예시:

- `feat/runtime-signal-priority`
- `fix/viewer-node-leak`
- `docs/quickstart-en`

## Issue types | 이슈 유형

- `bug`: reproducible defect · 재현 가능한 결함
- `feature`: feature proposal · 기능 제안
- `rfc`: design or policy change · 설계/정책 변경
- `docs`: documentation improvement · 문서 개선
- `question`: usage or design question · 사용/설계 질문

## Pull request checklist | PR 기준

Include · PR에는 아래 항목을 포함해 주세요:

- Why the change is needed · 변경 배경
- What changed · 변경 내용
- Impact area (runtime / bridge / viewer / DSL / docs) · 영향 범위
- How to verify (tests or manual steps) · 검증 방법
- Risks and rollback plan (if needed) · 위험 요소와 롤백 방법

Use the PR template in `.github/PULL_REQUEST_TEMPLATE.md`.

## When an RFC is required | RFC가 필요한 경우

- DSL syntax changes · DSL 문법 변경
- Runtime semantics changes · Runtime 의미론 변경
- Public API removal or rename · 공용 API 삭제/이름 변경
- Release or versioning policy changes · 릴리즈/버전 정책 변경

See [rfcs/README.md](rfcs/README.md).

## Code of conduct | 행동 강령

Follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Report violations to maintainers privately.  
모든 참여자는 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)를 준수합니다. 위반 사례는 Maintainer에게 비공개로 신고할 수 있습니다.

**Pages (bilingual HTML):** https://shshinsk.github.io/cell-coding/contributing.html
