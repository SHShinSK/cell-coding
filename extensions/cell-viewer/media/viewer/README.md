# Cell Viewer · 신호 흐름 뷰어

런타임 trace를 **타임라인**과 **신호 그래프**로 보여주는 MVP입니다.

## 사용법

### 일괄 trace (레퍼런스 5종)

```bash
cd typescript && npm run viewer:traces
cd .. && npx --yes serve viewer -p 5173
# → http://localhost:5173
```

### Live run (`cell run`)

```bash
cd typescript
npm run cell:run -- --json --out ../viewer/live-run.json \
  ../examples/porifera-filter/sponge-organism.cell WaterSample '{"turbidity":0.95}'

# 실시간 watch: .cell 저장 시 live-run.json 자동 갱신 · viewer 폴링
npm run cell:run -- --json --watch --out ../viewer/live-run.json \
  ../examples/porifera-filter/sponge-organism.cell WaterSample '{"turbidity":0.95}'

# Windows PowerShell: JSON 파일 사용
npm run cell:run -- --json --out ../viewer/live-run.json \
  ../examples/porifera-filter/sponge-organism.cell WaterSample @fixtures/water-sample-fault.json

cd .. && npx --yes serve viewer -p 5173
# → http://localhost:5173?live=live-run.json
```

`--jaeger http://127.0.0.1:16686`(또는 `JAEGER_UI_URL`)를 주면 JSON에 `observability.jaegerUrl`이 포함되고, viewer 상단에 Jaeger 검색 링크가 표시됩니다. OTel collector + Jaeger는 `runtime-docker/docker-compose.yml --profile observability` 참고.

터미널 1: `cell run --watch` · 터미널 2: `serve viewer` — `.cell` 수정 시 그래프가 자동 갱신됩니다.

브라우저에서 `viewer/index.html`을 직접 열면 fetch가 차단될 수 있습니다. HTTP 서버를 사용하세요.

## VS Code

`extensions/cell-viewer/` — F5로 Extension Host 실행 후:

| 명령 | 설명 |
|------|------|
| **Cell Coding: Run Active Cell** | 열린 `.cell` + 신호 입력 → `viewer/live-run.json` + webview |
| **Cell Coding: Inspect Active Cell** | `cell inspect` + organism 계층·막 계약 Viewer |
| **Cell Coding: Open Signal Viewer** | `live-run.json` 또는 `traces.json` 표시 |
| **Cell Coding: Refresh Viewer Traces** | `npm run viewer:traces` |

## 기능 (MVP)

| 기능 | 설명 |
|------|------|
| 시나리오 선택 | Porifera / PET / Spider 레퍼런스 5종 또는 live 1건 |
| 타임라인 | trace 단계별 from → signal → consumer |
| 그래프 | tissue flow + 단계별 활성 edge |
| 재생 | ▶ 단계 자동 재생, 필터로 세포·신호 검색 |
| Lifecycle | 세포별 genesis→dormant→active→emitting→apoptosis |
| Organism | organism→organ→tissue→cell 계층 + nervous/immune 라우트 |
| Membrane | checker 오류·경고 (막 계약 위반) |

## React (SVG graph · static viewer와 동일)

```bash
cd viewer-react && npm install && npm run dev
# → http://localhost:5174  ·  ?live=live-run.json
# --jaeger 로 생성한 live-run.json 은 React viewer 상단 Jaeger 링크 표시
```

[`viewer-react/README.md`](../viewer-react/README.md)

## 데이터 갱신

```bash
cd typescript && npm run viewer:traces && npm test
```

---

# Cell Viewer (English)

```bash
cd typescript && npm run viewer:traces
cd .. && npx --yes serve viewer -p 5173

# live single run
npm run cell:run -- --json --out ../viewer/live-run.json <file.cell> <Type> '<json>'
# live watch (rewrite on save · 저장 시 자동 갱신)
npm run cell:run -- --json --watch --out ../viewer/live-run.json <file.cell> <Type> '<json>'
# → http://localhost:5173?live=live-run.json
```

VS Code: **Run Active Cell** / **Open Signal Viewer** in `extensions/cell-viewer/`.
