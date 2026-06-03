# RFC 프로세스 안내

Cell Coding 프로젝트의 중대한 변경은 RFC(Request for Comments)로 관리합니다.

## RFC가 필요한 변경

- DSL 문법 추가/변경
- Runtime 의미론 변경
- 공용 API 삭제 또는 브레이킹 변경
- 릴리즈/버전 정책 변경

## 절차

1. 이슈에서 `rfc` 라벨로 제안 배경 공유
2. `RFC_TEMPLATE.md`를 복사해 초안 작성
3. PR로 RFC 문서 제출 (`rfcs/RFC-XXXX-제목.md`)
4. 최소 7일 공개 토론
5. Maintainer 승인 후 Accepted 상태로 전환

## 상태 값

- Draft: 작성 중
- Review: 공개 토론 중
- Accepted: 채택됨
- Rejected: 기각됨
- Superseded: 새 RFC로 대체됨

## 파일명 규칙

- `RFC-0001-stream-membrane-physical-sla.md`
- `RFC-0002-membrane-query-semantics.md`

## Active RFCs · 진행 중 RFC

| RFC | 상태 | 주제 |
|-----|------|------|
| [RFC-0001](RFC-0001-stream-membrane-physical-sla.md) | Review | Stream 신호 + Membrane Physical SLA (Phase 2 parser landed) |

