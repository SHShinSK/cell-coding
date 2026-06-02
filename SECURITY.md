# 보안 정책 (Security Policy)

Cell Coding 프로젝트의 보안 취약점 제보 및 대응 원칙을 안내합니다.

## 지원 버전

초기 단계에서는 최신 개발 브랜치와 최신 릴리즈를 우선 지원합니다.

| 버전 범위 | 보안 패치 지원 |
|---|---|
| 최신 릴리즈 (v0.x 최신) | 지원 |
| 직전 마이너 릴리즈 | 제한적 지원 |
| 그 외 구버전 | 미지원 |

## 취약점 제보 방법

취약점은 **공개 이슈로 등록하지 말고** 비공개 채널로 제보해 주세요.

- GitHub Security Advisory(권장)
- 저장소 관리자 보안 연락 채널

제보 시 아래 정보를 포함해 주세요.

- 취약점 요약 및 영향 범위
- 재현 절차(가능하면 최소 PoC)
- 영향을 받는 버전/환경
- 예상 공격 시나리오
- 제안 완화책(선택)

## 응답 SLA (목표)

- 접수 확인: 72시간 이내
- 1차 분류/심각도 판단: 7일 이내
- 수정 일정 공유: 14일 이내 (복잡도에 따라 조정 가능)

## 공개 원칙

- 패치 준비 전 상세 내용은 비공개로 유지합니다.
- 수정 배포 후 책임 있는 공개(responsible disclosure)를 원칙으로 합니다.
- 기여자는 동의 없이 제로데이 상세를 공개하지 않습니다.

## 심각도 분류 (간단 기준)

- **Critical**: 원격 코드 실행, 인증 우회, 대규모 데이터 노출
- **High**: 권한 상승, 서비스 주요 기능 마비
- **Medium**: 제한적 정보 노출, 안정성 저하
- **Low**: 보안 영향이 낮거나 조건이 매우 제한적

## 범위 예시

### 포함

- 런타임 신호 검증 우회
- 브리지 입력 검증 누락으로 인한 임의 실행 위험
- 인증/권한/비밀정보 처리 취약점

### 제외

- 오래된 의존성 경고(실제 exploit 근거 없음)
- 비보안성 코드 스타일 이슈
- 재현 불가능한 가정성 주장

## 보안 권장 사항 (기여자용)

- 비밀 키/토큰/인증정보를 커밋하지 마세요.
- 외부 입력은 항상 검증/정규화하세요.
- 예제 코드에도 최소한의 안전 기본값을 유지하세요.

## English Summary

For security reports, please **do not open a public GitHub issue**. Use a private reporting channel instead:

- GitHub Security Advisories (preferred)
- A maintainer-managed security contact channel for the repository

When you report a vulnerability, include:

- A short summary of the issue and the affected area
- Reproduction steps, ideally with a minimal proof of concept
- The affected versions, environments, or deployment assumptions
- The expected attack scenario or impact
- Suggested mitigations, if you already have them

### Response targets

- Initial acknowledgment: within 72 hours
- First triage and severity assessment: within 7 days
- Shared remediation timeline: within 14 days, adjusted if the issue is complex

### Disclosure policy

- Detailed vulnerability information stays private until a fix is prepared.
- After a fix is released, the project follows responsible disclosure.
- Contributors should not publish zero-day details without maintainer agreement.

### Severity guide

- **Critical**: remote code execution, auth bypass, or broad data exposure
- **High**: privilege escalation or loss of major service capabilities
- **Medium**: limited information exposure or meaningful stability degradation
- **Low**: low-impact issues or cases with very narrow preconditions

### Typical in-scope examples

- Bypassing runtime signal validation
- Arbitrary execution risks caused by missing bridge input validation
- Auth, permission, or secret-handling vulnerabilities

### Typical out-of-scope examples

- Dependency warnings without a realistic exploit path
- Non-security code style issues
- Claims that cannot be reproduced
