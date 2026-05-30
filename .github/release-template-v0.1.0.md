## Cell Coding v0.1.0 — Public launch · 공개 런칭

### Install · 설치

```bash
npx @cell-coding/cli run ./examples/motion-alarm/motion-alarm.cell MotionDetected '{"x":150,"y":220,"confidence":0.98}'
pip install cell-coding-bridge
npm install -g @cell-coding/cli
```

### Highlights · 주요 기능

- **@cell-coding/cli** — `cell run` / `build` / `test` / `deploy` unified CLI
- **Transpiled handlers** — `--transpiled` AST parity across reference examples
- **Physical AI** — motion-alarm, Python bridge, docker compose E2E
- **Viewer** — static + React SVG + VS Code extension (Jaeger links)
- **Observability** — Prometheus, OTel, Jaeger, K8s HPA E2E

### Docs · 문서

- [Quick start](https://github.com/SHShinSK/cell-coding#quick-start--빠른-시작)
- [Physical AI guide](https://github.com/SHShinSK/cell-coding/blob/main/examples/physical-ai-motion-alarm.md)
- [Release guide](https://github.com/SHShinSK/cell-coding/blob/main/.github/RELEASE.md)
