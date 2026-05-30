# Cell Coding Cloud Runtime · 클라우드 런타임

organ 단위 HTTP signal ingress + Redis Streams 버스 + OpenTelemetry trace PoC.

## 빠른 시작

```bash
# repo 루트에서
cd runtime-docker
docker compose up --build

# AuthOrgan — 토큰 검증
curl http://localhost:8081/health
curl -X POST http://localhost:8081/v1/signals \
  -H "Content-Type: application/json" \
  -d '{"type":"AuthRequest","data":{"token":"valid-token"}}'

# SpongeBody — Porifera
curl -X POST http://localhost:8082/v1/signals \
  -H "Content-Type: application/json" \
  -d '{"type":"WaterSample","data":{"turbidity":0.2,"flowRate":10}}'

# MotionAlarm — Physical AI (:8087)
curl -X POST http://localhost:8087/v1/signals \
  -H "Content-Type: application/json" \
  -d '{"type":"MotionDetected","data":{"x":150,"y":220,"confidence":0.98}}'

# Distributed nervous — OrganA → OrganB (routed-organs fixture)
curl -X POST http://localhost:8083/v1/signals \
  -H "Content-Type: application/json" \
  -d '{"type":"Start","data":{"tag":"distributed"}}'
curl http://localhost:8084/v1/nervous

# divide + HPA metrics (WorkerOrgan · :8085)
curl -X POST http://localhost:8085/v1/signals \
  -H "Content-Type: application/json" \
  -d '{"type":"Task","data":{"id":"t1"}}'
curl http://localhost:8085/metrics
curl http://localhost:8085/v1/metrics
```

## 환경 변수

| 변수 | 설명 |
|------|------|
| `CELL_PROGRAM` | `.cell` 파일 경로 |
| `CELL_ORGAN` | organ 이름 (해당 기관 세포만 active) |
| `CELL_PORT` | HTTP 포트 (기본 8080) |
| `CELL_REDIS_URL` | Redis Streams 버스 (선택) |
| `CELL_SIGNAL_STREAM` | Stream 키 (기본 `cell:signals`) |
| `CELL_OTEL` | `true` 시 응답에 OTel span JSON 포함 |
| `CELL_OTEL_EXPORT` | `otlp` 시 Collector로 OTLP/HTTP push |
| `CELL_OTEL_ENDPOINT` | OTLP traces URL (기본 `http://127.0.0.1:4318/v1/traces`) |
| `CELL_REDIS_MOCK` | `1` 시 in-memory Streams (테스트용) |
| `CELL_NERVOUS` | `false` 로 분산 nervous 비활성화 (기본: REDIS 있으면 on) |
| `CELL_NERVOUS_POLL_MS` | ingress poll 주기(ms). `0` 이면 HTTP 요청 시만 poll |
| `CELL_NERVOUS_GROUP` | Consumer Group 이름 (기본 `cell-nervous`) |
| `CELL_CONSUMER_NAME` | Consumer 이름 (기본 `{organ}-{hostname}-{pid}`) |
| `CELL_NERVOUS_CLAIM_MS` | XAUTOCLAIM min idle (ms, 기본 `30000`) |
| `CELL_NERVOUS_AUTOCLAIM` | `0`/`false` 면 XAUTOCLAIM 비활성 (기본 on) |
| `CELL_METRICS` | `0`/`false` 면 `GET /metrics` Prometheus 비활성 (기본 on) |
| `CELL_DIVIDE_SHARED` | `0` 면 Redis divide coordinator 비활성 (기본 on when replica count set) |
| `CELL_REPLICA_INDEX` | 멀티 Pod replica index (0..N-1) |
| `CELL_REPLICA_COUNT` | organ replica 수 (Redis queue depth 집계) |
| `CELL_ROLE` | `gateway` → divide gateway (`CELL_DIVIDE_UPSTREAMS`) |
| `CELL_DIVIDE_UPSTREAMS` | gateway upstream URLs (comma-separated) |

## 분산 nervous 라우팅 (Consumer Group)

organ Pod마다 동일 `.cell` program + `CELL_ORGAN` 만 다르게 실행합니다.
emit 시 nervous 경로 대상 organ은 Redis Stream `cell:nervous:{OrganName}` 으로 **XADD** 되고,
대상 organ runtime이 **XREADGROUP** (`GROUP cell-nervous`) 으로 ingress를 수신한 뒤 **XACK** 합니다.
handler 실패·Pod crash 등으로 PEL에 오래 남은 메시지는 **XAUTOCLAIM** (`CELL_NERVOUS_CLAIM_MS`) 으로 다른 consumer가 재처리합니다.

| Redis 명령 | 용도 |
|------------|------|
| `XGROUP CREATE ... MKSTREAM` | organ ingress stream + group 초기화 |
| `XREADGROUP GROUP cell-nervous >` | 새 nervous 메시지 수신 |
| `XAUTOCLAIM` | idle 초과 PEL 메시지 재claim (stuck 복구) |
| `XACK` | handler 성공 후 at-least-once 완료 |

| Stream | 용도 |
|--------|------|
| `cell:signals` | organ 내부 priority bus mirror |
| `cell:nervous:{Organ}` | organ ingress (Consumer Group) |

## API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 (+ queueDepth) |
| GET | `/v1/organ` | inspect 스냅샷 |
| GET | `/metrics` | Prometheus text (`cell_signal_queue_depth` — HPA용) |
| GET | `/v1/metrics` | queueDepth + divide replica 권장 (JSON) |
| GET | `/v1/nervous` | nervous ingress stats + 마지막 trace |
| POST | `/v1/signals` | `{ type, data }` 주입 → trace JSON |

## K8s 연동

`cell deploy`로 생성한 manifest의 image를 로컬 빌드로 교체:

```bash
docker build -f runtime-docker/Dockerfile -t cell-coding/runtime:0.1.0 ..
kubectl apply -f deploy/k8s/ -n cell-coding
```

## 원격 Registry

```bash
export CELL_REGISTRY_URL=https://your-host/cell-registry/v1
cd typescript && npm run cell:install -- @community/auth-organ ./my-app
```

원격 URL은 `index.json` + `packages/...` 레이아웃을 따라야 합니다 (로컬 `registry/`와 동일).

## HPA · Prometheus · divide-scale

`cell deploy` 가 생성한 HPA는 external metric `cell_signal_queue_depth` 를 참조합니다.

### Profiles · 프로필

```bash
# 기본 스택
docker compose up --build

# Prometheus scrape (:9090) + worker-organ metrics
docker compose --profile observability up worker-organ prometheus redis

# 멀티 replica divide gateway (:8086) + 3 replicas
docker compose --profile divide-scale up worker-gateway worker-replica-0 worker-replica-1 worker-replica-2 redis

# Prometheus 검증 (observability 프로필 실행 후)
node verify-prometheus.mjs

# OTel Collector + Jaeger trace 검증
docker compose --profile observability up worker-organ prometheus otel-collector jaeger redis
node verify-otel.mjs
# Jaeger UI: http://localhost:16686
```

| 포트 | 서비스 |
|------|--------|
| `:8085` | worker-organ (단일 divide demo) |
| `:8086` | worker-gateway (divide-scale profile) |
| `:8087` | motion-alarm (Physical AI PoC) |
| `:9090` | Prometheus (observability profile) |
| `:16686` | Jaeger UI (observability profile) |
| `:4318` | OTel Collector OTLP/HTTP (observability profile) |

### K8s prometheus-adapter E2E

```bash
cd runtime-docker/k8s-e2e
node run-e2e.mjs       # kind + adapter + HPA (docker/kind/kubectl 필요)
node verify-hpa.mjs    # custom.metrics.k8s.io 검증
```

예시 rule: [`prometheus-adapter-rules.yaml`](prometheus-adapter-rules.yaml)

### CI E2E (GitHub Actions)

| Workflow | Job | 내용 |
|----------|-----|------|
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | `integration` | Redis testcontainers (`CELL_INTEGRATION=1`) |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | `observability-e2e` | compose + `verify-prometheus.mjs` + `verify-otel.mjs` |
| [`.github/workflows/e2e-nightly.yml`](../.github/workflows/e2e-nightly.yml) | `k8s-hpa-e2e` | kind + prometheus-adapter (`run-e2e.mjs`, nightly) |
