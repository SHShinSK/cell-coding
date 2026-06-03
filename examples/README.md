# Cell Coding Examples

예제 `.cell` 파일과 Physical AI 시나리오 문서가 이 폴더에 있습니다.

| 상태 | 항목 |
|------|------|
| ✅ | `validator.cell` — Phase 1 골든 파일 (role + membrane + on) |
| ✅ | [`porifera-filter/`](porifera-filter/) — Porifera Filter Bot (3 cells, A1 MICROBE) |
| ✅ | [`spiderling/`](spiderling/) — Spiderling Bot (5 cells, A2 PLANKTON) |
| ✅ | [`spiderling-sim/`](spiderling-sim/) — Spiderling Sim (6 cells, A2-S, IMU bridge · [BRIDGE](spiderling-sim/BRIDGE.md)) |
| ✅ | [`spider-robot/`](spider-robot/) — Spider Robot (10 cells, A3 INSECT, nervous) |
| ✅ | [`spider-robot-sim/`](spider-robot-sim/) — Spider Sim (A3-S, stream + SLA + bridge) · [A3-H hardware](spider-robot-sim/A3-H.md) |
| ✅ | [`pet-robot/`](pet-robot/) — PET Companion (11 cells, A4, affect + safety) |
| ✅ | [`pet-robot-sim/`](pet-robot-sim/) — PET Sim (A4-S stream + SLA + bridge) |
| ✅ | [`humanoid-robot/`](humanoid-robot/) — Humanoid (14 cells, A5, 4 organs) |
| ✅ | [`motion-alarm/`](motion-alarm/) — Physical AI PoC (MotionDetected → AlarmPulse) |
| ✅ | [`physical-ai-motion-alarm.md`](physical-ai-motion-alarm.md) — Physical AI E2E 가이드 (센서→세포→액추에이터) |
| ✅ | [`bridge-python/`](../bridge-python/) — Python sensor/actuator bridge |

컴파일 확인:

```bash
cd typescript && npm install && npm test
```

신호 런타임 실행 (Phase 2 · `cell run`):

```bash
# human 출력 (demo와 동일)
cd typescript && npm run cell:run -- ../examples/porifera-filter/sponge-organism.cell WaterSample '{"turbidity":0.2}'

# transpiled TS handler (--transpiled · standalone cache 자동 생성)
npx @cell-coding/cli run --transpiled ../examples/motion-alarm/motion-alarm.cell MotionDetected '{"x":1,"y":2,"confidence":0.9}'
# 또는 저장소 개발: npm run cell:run -- --transpiled ...

# validator + callFn sidecar (validator.functions.json 자동 탐색)
npm run cell:run -- --transpiled ../examples/validator.cell RawInput '{"payload":"hello"}'
npm run cell:run -- --transpiled --functions ../examples/validator.functions.json ../examples/validator.cell RawInput '{"payload":""}'

# Viewer + Jaeger trace 링크 (--jaeger 또는 JAEGER_UI_URL)
npm run cell:run -- --json --jaeger http://127.0.0.1:16686 --out ../viewer/live-run.json ../examples/motion-alarm/motion-alarm.cell MotionDetected '{"x":1,"y":2,"confidence":0.9}'

# cell build 출력 + --generated (명시 generated dir 필요 시)
npm run cell:build -- --out generated ../examples/validator.cell
npm run cell:run -- --transpiled --generated generated ../examples/validator.cell RawInput '{"payload":"ok"}'

# JSON (Viewer / VS Code용)
npm run cell:run -- --json --out ../viewer/live-run.json ../examples/pet-robot/pet-organism.cell OwnerPing '{"rssi":0.01}'

# watch: .cell 저장 시 live-run.json 자동 갱신 (viewer 폴링)
npm run cell:run -- --json --watch --out ../viewer/live-run.json ../examples/porifera-filter/sponge-organism.cell WaterSample '{"turbidity":0.95}'
```

Cell Lab 격리 테스트 (Phase 3 · `cell test`):

```bash
# sidecar: sponge-organism.celltest.json
npm run cell:test -- ../examples/porifera-filter/sponge-organism.cell

# 통합 CLI (typescript/ 에서 npm link 후)
npm run cell:test -- --coverage ../examples/porifera-filter/sponge-organism.cell
```

Physical AI bridge (Python · `bridge-python/`):

```bash
cd bridge-python
python demo.py
python demo.py --confidence 0.3
```

레거시 demo:

```bash
cd typescript && npm run demo
node --import tsx demo.ts ../examples/spider-robot/spider-organism.cell VisionFrame "{\"contrast\":0.6}"
```

런타임은 `.cell`을 컴파일한 뒤 막(membrane) 계약을 따라 `emit`/`on` 신호 연쇄를 실행하고, **immune** 정책과 **nervous** 기관 간 라우팅을 적용합니다.

| nervous routing | 동작 |
|-----------------|------|
| 기관 내부 | 같은 organ의 세포끼리만 신호 전달 |
| `Organ.Signal -> TargetOrgan` | nervous에 선언된 경로로만 기관 간 전달 |
| `-> when (expr) -> Organ` | 조건부 기관 간 전달 |
| `-> transform (p) { Sig(...) } -> Organ` | 신호 변환 후 기관 간 전달 |
| external / immune | 전 기관 대상 (주입·면역 재시도) |

| immune strategy | 동작 |
|-----------------|------|
| `retry` | fault 신호 발생 시 원래 입력을 재주입 (Porifera `SensorPolicy`) |
| `fallback` | fault 신호 발생 시 대체 신호 방출 (PET `SafetyPolicy` → `ComfortAction`) |
| `quarantine` / `isolate` | fault 세포 apoptosis |
| `deadLetter` | fault 신호를 dead letter 보관소에 저장 |
| `escalate: true` | 정책 소진·격리·dead letter 후 `ImmuneEscalation` 방출 |
| `circuit` | fault 누적 시 retry 차단 (`#trip`, `#reject` trace) |

| signal bus | 동작 |
|------------|------|
| priority | `critical` → `low` 우선순위 큐 |
| immutability | enqueue 시 신호 data `structuredClone` + freeze |
| Redis adapter | `RedisSignalBusAdapter` + `RedisLikeClient` (인메모리 PoC 포함) |

Cell Lab sidecar (`.celltest.json`):

| 예제 | sidecar |
|------|---------|
| sponge | `sponge-organism.celltest.json` |
| spider | `spider-organism.celltest.json` |
| pet | `pet-organism.celltest.json` |
| pet-sim | `pet-organism.celltest.json` (same suites; A4-S uses `pet-sim-organism.cell`) |
| motion-alarm | `motion-alarm.celltest.json` |

Phase 3 CLI (`cell init` · `build` · `inspect`):

```bash
# 프로젝트 스캐폴드
npm run cell:init -- my-bot

# TypeScript 트랜스파일 (generated/*.ts · on/emit/if/let codegen)
npm run cell:build -- ../examples/validator.cell
npm run cell:build -- --stdout ../examples/validator.cell

# transpiled handler → CellRuntime wire-up (AST interpreter 대신 TS handler 실행)
# sidecar: validator.functions.json · cell run --functions 또는 자동 탐색
npm run cell:run -- --transpiled ../examples/validator.cell RawInput '{"payload":"ok"}'

# 수동 wire-up (createTranspiledRuntimeFromFile · 테스트/임베드용)
# typescript/transpiled-runtime.test.ts 참고
```

`cell build` 출력은 `../transpiled-cell.js`의 `BaseCell`을 import합니다. 런타임 연동:

```typescript
import { compile, createTranspiledRuntime } from './compile.js';
import { Validator } from './generated/validator.js';

const { program } = compile(source);
const rt = createTranspiledRuntime(
  program,
  [{ cellName: 'Validator', Cell: Validator }],
  { functions: { valid: (input) => input.payload.length > 0 } },
);
rt.send('RawInput', { payload: 'hello' });
```

standalone 배포(단일 파일)가 필요하면 `transpileProgram(program, { standalone: true })`로 inline `BaseCell` preamble을 포함할 수 있습니다.

**Cell DSL → TypeScript 타입 매핑** (`transpiler.ts`):

| Cell DSL | TypeScript |
|----------|------------|
| `String` | `string` |
| `Number` | `number` |
| `Boolean` / `Bool` | `boolean` |
| `A \| B` | `A \| B` |
| `List<T>` | `T[]` |
| `Map<K, V>` | `Record<K, V>` |
| `Option<T>` | `T \| undefined` |
| `Result<Ok, Err>` | `{ ok: Ok; err: Err }` |
| 기타 식별자 | 그대로 (예: `RawInput`) |

후속 기여 아이디어: `.github/issue-drafts/06-transpiler-stub.md` Follow-up tasks 참고.

```bash
# 세포·조직·organism 정적 분석
npm run cell:inspect -- ../examples/porifera-filter/sponge-organism.cell
npm run cell:inspect -- ../examples/porifera-filter/sponge-organism.cell FilterTissue
```

Phase 4 Registry · install · compose · deploy:

```bash
npm run cell:install -- --list
npm run cell:init -- my-app
npm run cell:install -- @community/auth-organ ../my-app
npm run cell:compose -- --organ @community/auth-organ --project ../my-app
npm run cell:deploy -- ../my-app/cells/main.composed.cell
```

[`registry/README.md`](../registry/README.md)

Phase 4 Cloud runtime · Docker · 원격 registry:

```bash
# organ HTTP 서버 (로컬)
CELL_PROGRAM=../registry/packages/community/auth-organ/auth-organ.cell \
CELL_ORGAN=AuthOrgan npm run cell:serve

# Docker Compose (redis + auth-organ + sponge)
cd ../runtime-docker && docker compose up --build

# 원격 registry 동기화 후 install
CELL_REGISTRY_URL=https://your-host/cell-registry/v1 \
npm run cell:install -- --sync-remote @community/auth-organ ./my-app
```

[`runtime-docker/README.md`](../runtime-docker/README.md)

Phase 4+ divide · HPA · metrics:

```bash
# divide 정책이 있는 program deploy → HPA manifest 포함
npm run cell:deploy -- typescript/fixtures/divide-scale.cell

# Docker divide demo · worker-organ :8085 (round-robin strategy)
docker compose -f runtime-docker/docker-compose.yml up worker-organ redis

# divide-scale · 3 replicas + gateway :8086
docker compose -f runtime-docker/docker-compose.yml --profile divide-scale up worker-gateway redis

# Prometheus E2E · observability profile
docker compose -f runtime-docker/docker-compose.yml --profile observability up worker-organ prometheus otel-collector jaeger redis
node runtime-docker/verify-prometheus.mjs
node runtime-docker/verify-otel.mjs   # Jaeger UI http://localhost:16686

# K8s prometheus-adapter + HPA E2E (kind/kubectl/docker 필요)
cd runtime-docker/k8s-e2e && node run-e2e.mjs

# Redis Streams integration (Docker 필요 · CI integration job)
cd typescript && set CELL_INTEGRATION=1&& npm run test:integration

# bridge-python → cloud runtime (motion-alarm organ :8087)
docker compose -f runtime-docker/docker-compose.yml up -d motion-alarm redis
cd bridge-python && python demo_cloud.py

# 전체 Physical AI 가이드
# see examples/physical-ai-motion-alarm.md
```

GitHub Actions: `ci.yml` → `integration` / `observability-e2e`, `e2e-nightly.yml` → kind HPA E2E.

```bash
# cloud runtime metrics (queueDepth + replica 권장)
curl http://localhost:8085/v1/metrics
curl http://localhost:8085/metrics   # Prometheus · HPA cell_signal_queue_depth

# semver 범위 install
npm run cell:install -- --range ^0.1.0 @community/auth-organ ./my-app
```

Phase 4+ distributed nervous · organ 간 라우팅:

```bash
# OrganA → OrganB (Redis Streams cell:nervous:OrganB)
# Docker: organ-a :8083, organ-b :8084 (Consumer Group `cell-nervous`, XAUTOCLAIM 기본 30s)
curl -X POST http://localhost:8083/v1/signals \
  -H "Content-Type: application/json" \
  -d '{"type":"Start","data":{"tag":"hi"}}'
curl http://localhost:8084/v1/nervous

# 로컬 테스트 (typescript/)
npm test -- phase4-nervous-distributed.test.ts
```

신호 흐름 시각화 (Cell Viewer MVP):

```bash
cd typescript && npm run viewer:traces && npm run viewer:serve
# → http://localhost:5173 — 타임라인 + 그래프 + lifecycle
# live run: npm run cell:run -- --json --out ../viewer/live-run.json ... 후
# watch: npm run cell:run -- --json --watch --out ../viewer/live-run.json ... (터미널 유지)
# → http://localhost:5173?live=live-run.json
```

> `typescript/` 안에서 `npx serve viewer`만 실행하면 **404** — 반드시 `npm run viewer:serve` 또는 저장소 루트에서 `npx serve viewer` 사용.

React viewer (**SVG graph** · static viewer와 동일 수준):

```bash
cd viewer-react && npm install && npm run dev
# → http://localhost:5174  ·  ?live=live-run.json

# Jaeger 링크 포함 live-run
cd ../typescript
npm run cell:run -- --json --jaeger http://127.0.0.1:16686 --out ../viewer/live-run.json \
  ../examples/motion-alarm/motion-alarm.cell MotionDetected '{"x":1,"y":2,"confidence":0.9}'
```  
VS Code: **Cell Coding: Run Active Cell** / **Open Signal Viewer** — React SVG webview (`extensions/cell-viewer/`, `npm run build:viewer`)

[`viewer/README.md`](../viewer/README.md)

---

# Cell Coding Examples (English)

Example `.cell` files and Physical AI scenario docs live here.

| Status | Item |
|--------|------|
| Done | `validator.cell` — Phase 1 golden file (role + membrane + on) |
| Done | [`porifera-filter/`](porifera-filter/) — Porifera Filter Bot (3 cells, A1 MICROBE) |
| Done | [`spiderling/`](spiderling/) — Spiderling Bot (5 cells, A2 PLANKTON) |
| Done | [`spiderling-sim/`](spiderling-sim/) — Spiderling Sim (6 cells, A2-S, IMU bridge) |
| Done | [`spider-robot/`](spider-robot/) — Spider Robot (10 cells, A3 INSECT, nervous) |
| Done | [`spider-robot-sim/`](spider-robot-sim/) — Spider Sim (A3-S) · [A3-H hardware](spider-robot-sim/A3-H.md) |
| Done | [`pet-robot/`](pet-robot/) — PET Companion (11 cells, A4, affect + safety) |
| Done | [`pet-robot-sim/`](pet-robot-sim/) — PET Sim (A4-S) · [A4-H hardware](pet-robot-sim/A4-H.md) |
| Done | [`humanoid-robot/`](humanoid-robot/) — Humanoid (14 cells, A5, 4 organs) |
| Done | [`motion-alarm/`](motion-alarm/) — Physical AI PoC (MotionDetected → AlarmPulse) |
| Done | [`physical-ai-motion-alarm.md`](physical-ai-motion-alarm.md) — Physical AI E2E guide |

Verify compilation:

```bash
cd typescript && npm install && npm test
```

Run the signal runtime (Phase 2 · `cell run`):

```bash
# human output
cd typescript && npm run cell:run -- ../examples/porifera-filter/sponge-organism.cell WaterSample '{"turbidity":0.2}'

# JSON for Viewer / VS Code
npm run cell:run -- --json --out ../viewer/live-run.json ../examples/pet-robot/pet-organism.cell OwnerPing '{"rssi":0.01}'

# watch mode: rewrite JSON on .cell save
npm run cell:run -- --json --watch --out ../viewer/live-run.json ../examples/porifera-filter/sponge-organism.cell WaterSample '{"turbidity":0.95}'
```

Cell Lab isolated tests (`cell test` · sidecar `.celltest.json`):

```bash
npm run cell:test -- ../examples/porifera-filter/sponge-organism.cell
npm run cell:test -- ../examples/spider-robot/spider-organism.cell
npm run cell:test -- ../examples/pet-robot/pet-organism.cell
npm run cell:test -- ../examples/pet-robot-sim/pet-sim-organism.cell
npm run cell:test -- ../examples/porifera-filter/sponge-organism.cell FilterDecideCell
```

Legacy demo:

```bash
cd typescript && npm run demo
```

The runtime compiles a `.cell` file, executes the `emit`/`on` cascade, applies **immune** policies (retry, fallback, quarantine, deadLetter, escalate, circuit breaker), **nervous** routing (organ scope, `when`, `transform`), and a **priority signal bus** with optional Redis adapter.

| Strategy | Behavior |
|----------|----------|
| `retry` | Re-injects the original input on fault (Porifera `SensorPolicy`) |
| `fallback` | Emits a substitute signal on fault (PET `SafetyPolicy` → `ComfortAction`) |
| `deadLetter` | Stores fault signals in `getDeadLetters()` |
| `escalate: true` | Emits `ImmuneEscalation` after policy exhaustion |

Signal flow visualization (Cell Viewer MVP):

```bash
cd typescript && npm run viewer:traces && npm run viewer:serve
# → http://localhost:5173 — timeline + graph + lifecycle
# after live run: http://localhost:5173?live=live-run.json
```

React viewer (**SVG graph** · static viewer와 동일 수준):

```bash
cd viewer-react && npm install && npm run dev
# → http://localhost:5174  ·  ?live=live-run.json

# Jaeger 링크 포함 live-run
cd ../typescript
npm run cell:run -- --json --jaeger http://127.0.0.1:16686 --out ../viewer/live-run.json \
  ../examples/motion-alarm/motion-alarm.cell MotionDetected '{"x":1,"y":2,"confidence":0.9}'
```  
VS Code: **Cell Coding: Run Active Cell** / **Open Signal Viewer** — React SVG webview (`extensions/cell-viewer/`, `npm run build:viewer`)

See [`viewer/README.md`](../viewer/README.md).
