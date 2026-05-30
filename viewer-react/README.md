# Cell Viewer React

React viewer with **SVG signal graph** (ported from `viewer/index.html`).

## Setup · 설정

```bash
# Generate traces first · trace 먼저 생성
cd ../typescript && npm run viewer:traces

# Install & run · 설치 및 실행
cd ../viewer-react && npm install && npm run dev
# → http://localhost:5174
```

### Live run · 실시간 실행

```bash
cd ../typescript
node --import tsx run.ts --json --out ../viewer/live-run.json \
  ../examples/porifera-filter/sponge-organism.cell WaterSample @fixtures/water-sample-fault.json

# watch: save .cell → auto-refresh JSON · .cell 저장 시 JSON 자동 갱신
node --import tsx run.ts --json --watch --out ../viewer/live-run.json \
  ../examples/porifera-filter/sponge-organism.cell WaterSample @fixtures/water-sample-fault.json

cd ../viewer-react && npm run dev
# → http://localhost:5174?live=live-run.json  (polls every 1s · 1초 폴링)

# Jaeger trace 링크 (--jaeger 또는 JAEGER_UI_URL)
npm run cell:run -- --json --jaeger http://127.0.0.1:16686 --out ../viewer/live-run.json \
  ../examples/motion-alarm/motion-alarm.cell MotionDetected '{"x":1,"y":2,"confidence":0.9}'
# → http://localhost:5174?live=live-run.json  (상단 Jaeger 링크 표시)
```

Uses `../viewer/` as Vite `publicDir` (`traces.json`, `live-run.json`).

## Features · 기능

| Feature | Description |
|---------|-------------|
| SVG graph | Tissue flow + active signal edges + lifecycle phase colors |
| Timeline | Step scrubber, filter, click-to-select |
| Playback | ▶ auto-advance (700ms) |
| Lifecycle | Final states + recent transitions |
| Live URL | `?live=live-run.json` (auto-poll when watch active) |
| Observability | `observability.jaegerUrl` from `--jaeger` · header Jaeger link |
| VS Code | `extensions/cell-viewer` embeds `dist/` via `postMessage` |

## Build · 빌드

```bash
npm run build   # dist/ — VS Code webview embed (see extensions/cell-viewer)
npm run build:viewer  # from extensions/cell-viewer — copies dist to media/viewer
```

VS Code extension loads this build via `postMessage` (no fetch in webview).

## Structure · 구조

```
src/
  graphLayout.ts      # layout logic (shared with static viewer concept)
  components/
    SignalGraph.tsx   # SVG graph
    Timeline.tsx
    LifecyclePanel.tsx
    ObservabilityBar.tsx  # Jaeger link from --jaeger
```

---

# Cell Viewer React (English)

```bash
cd ../typescript && npm run viewer:traces
cd ../viewer-react && npm install && npm run dev
```

Live: `http://localhost:5174?live=live-run.json`
