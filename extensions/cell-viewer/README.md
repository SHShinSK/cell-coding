# Cell Coding Viewer — VS Code Extension

VS Code webview with **embedded React SVG viewer** (`viewer-react/dist`).

## Prerequisites · 사전 준비

```bash
cd typescript && npm install
cd ../viewer-react && npm install
```

## Build · 빌드

```bash
cd extensions/cell-viewer
npm install
npm run build:viewer   # viewer-react build + copy → media/viewer/
npm run compile
```

F5 (**Run Cell Viewer Extension**) uses `.vscode/tasks.json` preLaunchTask automatically.

## Commands · 명령

| Command | Description |
|---------|-------------|
| **Cell Coding: Run Active Cell** | `cell run --json` on active `.cell` → webview with SVG graph |
| **Cell Coding: Test Active Cell (Cell Lab)** | `cell test` on active `.cell` + sidecar `.celltest.json` |
| **Cell Coding: Open Signal Viewer** | Load `live-run.json` or `traces.json` into React webview |
| **Cell Coding: Refresh Viewer Traces** | Regenerate `viewer/traces.json` |

## Settings · 설정

| Setting | Default | Description |
|---------|---------|-------------|
| `cellCoding.jaegerUiUrl` | `""` | Jaeger UI base URL → viewer Jaeger link · `JAEGER_UI_URL` also supported |
| `cellCoding.runTranspiled` | `false` | Run active cell with `--transpiled` TS handlers |
| `cellCoding.functionsPath` | `""` | Optional `--functions` sidecar · empty = auto `{stem}.functions.json` |

## Architecture · 구조

```
viewer-react/dist  ──copy──▶  extensions/cell-viewer/media/viewer/
extension host postMessage { loadPayload } → React App (SVG + timeline + lifecycle)
```

## Marketplace · 마켓플레이스

CI release workflow publishes via `VSCE_PAT`. Manual:

```bash
cd extensions/cell-viewer
npm install
npm run publish:marketplace
```

Requires publisher `cell-coding` on [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage).

```bash
cd typescript
npm run cell:run -- --json --jaeger http://127.0.0.1:16686 --out ../viewer/live-run.json \
  ../examples/motion-alarm/motion-alarm.cell MotionDetected '{"x":1,"y":2,"confidence":0.9}'
```

---

# Cell Coding Viewer (English)

Embed flow: `npm run build:viewer` copies React production build into `media/viewer/`.
The extension injects trace JSON via `postMessage` — no fetch required inside webview.
