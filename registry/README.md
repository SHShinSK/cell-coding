# Cell Registry · 세포 레지스트리

로컬 registry PoC (Phase 4). npm 유사 패키지 허브의 최소 구현입니다.

## 패키지 목록

```bash
cd typescript
npm run cell:install -- --list
```

| 패키지 | organ | exports |
|--------|-------|---------|
| `@community/auth-organ` | AuthOrgan | AuthGranted, AuthDenied |

## Signal packages · 신호 패키지

Physical AI 표준 신호 타입 (organ이 아닌 `signal` 정의 묶음). RFC-0001 참고.

| 패키지 | file | exports |
|--------|------|---------|
| `@signals/robotics-base` | `signals/robotics/base.cell` | ImuSample, JointState, BatteryLevel, EstopPulse, … |

`cell.sig.json` manifest · ROS2 매핑 힌트는 `signals/robotics/cell.sig.json` 참고.

PoC 사용 예: [`examples/spiderling-sim/`](../examples/spiderling-sim/SCENARIO.md)

## 워크플로 (checkpoint)

```bash
# 1. 프로젝트 생성
npm run cell:init -- my-app

# 2. 커뮤니티 organ 설치 → vendor/
cd typescript
npm run cell:install -- @community/auth-organ ../my-app

# 3. host organism에 organ 병합
npm run cell:compose -- --organ @community/auth-organ --project ../my-app

# 4. K8s manifest 생성 (organ당 Deployment)
npm run cell:deploy -- ../my-app/cells/main.composed.cell
kubectl apply -f ../my-app/deploy/k8s/
```

## 패키지 구조

```
registry/
  index.json
  packages/community/auth-organ/
    cell.pkg.json    # manifest · 막 exports/requires
    auth-organ.cell  # organ 정의
```

## cell.pkg.json

- `exports` — nervous 연동 가능 신호
- `membrane.accepts` / `membrane.emits` — install 시 host와 호환성 검사

환경 변수 `CELL_REGISTRY`로 registry 경로를 오버라이드할 수 있습니다.

## 원격 registry (HTTP)

```bash
export CELL_REGISTRY_URL=https://your-host/cell-registry/v1
npm run cell:install -- --sync-remote @community/auth-organ ./my-app
```

- `index.json` + `packages/...` 레이아웃은 로컬 `registry/`와 동일해야 합니다.
- semver 범위: `npm run cell:install -- --range ^0.1.0 @community/auth-organ .`
- 캐시 경로: `~/.cell/registry-cache` (`CELL_REGISTRY_CACHE`로 변경 가능)
