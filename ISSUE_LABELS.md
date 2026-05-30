# 이슈 라벨 운영 가이드

Cell Coding 저장소의 라벨 체계를 정의합니다.  
목표는 “빠른 분류, 명확한 우선순위, 신규 기여자 온보딩”입니다.

## 기본 라벨

- `bug`: 결함/오동작
- `feature`: 기능 제안/개선
- `docs`: 문서 개선
- `question`: 사용/설계 질문
- `rfc`: 설계/정책 변경 제안
- `good first issue`: 첫 기여자 권장 작업
- `help wanted`: 외부 기여 도움 요청

## 우선순위 라벨

- `priority:critical`: 즉시 대응 필요
- `priority:high`: 이번 스프린트 내 처리
- `priority:medium`: 계획된 처리
- `priority:low`: 여유 시 처리

## 영역 라벨

- `area:runtime`
- `area:bridge-python`
- `area:viewer`
- `area:dsl-compiler`
- `area:docs`
- `area:devops`

## 상태 라벨

- `status:needs-triage`: 초기 분류 필요
- `status:needs-repro`: 재현 정보 부족
- `status:blocked`: 외부 의존으로 진행 중단
- `status:in-progress`: 담당자가 작업 중
- `status:needs-review`: 검토 대기

## 이슈 분류 규칙

1. 새 이슈는 기본적으로 `status:needs-triage`를 부여
2. 1차 분류 시 아래 3가지를 최소 지정
   - 유형(`bug`/`feature`/`docs`/`question`/`rfc`)
   - 영역(`area:*`)
   - 우선순위(`priority:*`)
3. 재현 불충분 시 `status:needs-repro`로 전환 후 요청 코멘트 남김

## good first issue 기준

아래 조건을 만족하면 `good first issue`를 부여합니다.

- 작업 범위가 명확하고 작음(대체로 1~3시간)
- 관련 파일/경로가 안내되어 있음
- 완료 기준(DoD)이 문서화되어 있음
- 도메인 배경지식 없이도 시작 가능

## 라벨 조합 예시

- 버그 재현 대기:
  - `bug`, `area:runtime`, `priority:high`, `status:needs-repro`
- 신규 기능 제안:
  - `feature`, `area:viewer`, `priority:medium`, `status:needs-triage`
- 첫 기여 작업:
  - `docs`, `good first issue`, `help wanted`, `area:docs`, `priority:low`

## 운영 팁

- 라벨은 문제를 “정답 분류”하는 용도보다 “빠른 의사결정” 용도로 사용
- 우선순위는 매 스프린트 시작 시 재평가
- 오래된 `status:blocked` 이슈는 월 1회 정리

