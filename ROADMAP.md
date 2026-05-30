# Cell Coding 로드맵 (90일)

> [English first · ROADMAP.en.md](ROADMAP.en.md) · 한국어 병렬

## Goal | 목표

Turn Cell Coding from a concept presentation into an open-source project that external developers can install, run, and contribute to.  
Cell Coding을 개념 발표에서 끝내지 않고, 외부 개발자가 설치·실행·기여할 수 있는 오픈소스 프로젝트로 전환한다.

## Strategy | 전략

1. **Runtime / bridge / viewer** first — something that works  
   **런타임 / 브리지 / 뷰어** 우선 — 동작하는 것부터
2. **`.cell` DSL** as an optional layer  
   **`.cell` DSL**은 선택적 레이어로
3. Reference examples and community contribution loop  
   레퍼런스 예제와 커뮤니티 기여 루프

---

## Day 0–30: MVP foundation | 0~30일: MVP 기반

**Deliverables | 산출물**

- `cell-runtime` core: emit/subscribe, membrane checks, basic error hooks  
  `cell-runtime` 코어: emit/subscribe, 막 검증, 기본 오류 훅
- `cell-bridge-python`: camera/mic → standard signals; alarm/motor commands  
  `cell-bridge-python`: 카메라/마이크 → 표준 신호; 알람/모터 명령
- Example: `MotionDetected → AlarmActuator`  
  예제: `MotionDetected → AlarmActuator`

**Ops | 운영**

- Publish README, charter, contributing guide, code of conduct  
  README, 헌장, 기여 가이드, 행동 강령 공개
- Label setup: `good first issue`, `help wanted`, `rfc`  
  라벨 설정: `good first issue`, `help wanted`, `rfc`
- At least 10 starter issues for first-time contributors  
  첫 기여자용 starter issue 10개 이상

**Done when | 완료 기준**

- New user runs demo in ~30 minutes  
  신규 사용자가 약 30분 내 데모 실행
- External contributor can open a first PR from labeled issues  
  외부 기여자가 라벨 이슈에서 첫 PR 오픈 가능

---

## Day 31–60: Observability & quality | 31~60일: 관측·품질

**Deliverables | 산출물**

- `cell-viewer` MVP: live signal graph, cell timeline, filters  
  `cell-viewer` MVP: 실시간 신호 그래프, 세포 타임라인, 필터
- E2E tests for core scenarios and contract violations  
  핵심 시나리오 및 계약 위반 E2E 테스트

**Done when | 완료 기준**

- Bug reports reproducible ≥80%  
  버그 리포트 재현률 80% 이상
- At least one scenario traceable live in Viewer  
  Viewer에서 최소 1개 시나리오 실시간 추적

---

## Day 61–90: Public launch & ecosystem | 61~90일: 공개 런칭·생태계

**Deliverables | 산출물**

- Minimal `.cell` DSL subset (experimental): `cell`, `signal`, `membrane`, `on`, `emit`  
  최소 `.cell` DSL 부분집합(실험): `cell`, `signal`, `membrane`, `on`, `emit`
- Transpile PoC: `.cell` → TypeScript  
  트랜스파일 PoC: `.cell` → TypeScript
- 3+ reference examples (smart home, robot monitoring, ops alerts)  
  레퍼런스 예제 3개 이상(스마트홈, 로봇 모니터링, 운영 알림)

**Done when | 완료 기준**

- 10+ external contributors  
  외부 기여자 10명 이상
- 30+ external PRs  
  외부 PR 30건 이상
- Stable monthly release cadence  
  안정적 월간 릴리즈 주기

---

## KPIs | 핵심 지표

- Install success rate · 설치 성공률
- Demo reproduction time · 데모 재현 시간
- External PR merge rate · 외부 PR 머지율
- Issue response time · 이슈 응답 시간
- Release cadence adherence · 릴리즈 주기 준수

**Pages (bilingual HTML):** https://shshinsk.github.io/cell-coding/roadmap.html
