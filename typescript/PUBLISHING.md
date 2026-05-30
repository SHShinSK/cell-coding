# Publishing @cell-coding/cli

> **Automated release · 자동 배포:** [`.github/RELEASE.md`](../.github/RELEASE.md) — tag `v*` push → GitHub Release + npm + PyPI + VS Code.

## GitHub Release (recommended · 권장)

1. Repository secrets: `NPM_TOKEN`, `PYPI_TOKEN`, `VSCE_PAT`
2. Create npm org `@cell-coding`, PyPI `cell-coding-bridge`, VS Code publisher `cell-coding`
3. Push tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Workflow [`.github/workflows/release.yml`](../.github/workflows/release.yml) runs:

| Job | Output |
|-----|--------|
| validate | tests + npm pack + extension build + Python sdist |
| github-release | auto release notes |
| publish-npm | `@cell-coding/cli` |
| publish-pypi | `cell-coding-bridge` |
| publish-vscode | `cell-coding-viewer` extension |

Dry-run (no publish): Actions → **Release** → Run workflow (tag push 없이 validate만).

## Manual npm publish

```bash
cd typescript
npm login
npm publish --access public
```

`prepublishOnly` bundles `../registry` → `typescript/registry` and runs tests.

## End users

```bash
npx @cell-coding/cli run path/to/program.cell SignalType '{"key":"value"}'
npm install -g @cell-coding/cli
pip install cell-coding-bridge
```

Environment variables:

| Variable | Description |
|----------|-------------|
| `CELL_REGISTRY` | Override local registry path |
| `CELL_REGISTRY_URL` | Remote registry sync URL |
| `JAEGER_UI_URL` | Jaeger UI base for `--jaeger` default |
| `CELL_CLI` | Custom `cell` binary path (Python bridge / VS Code) |

## Package contents

- TypeScript sources + `tsx` runtime
- `bin/cell.mjs` unified CLI
- Bundled `registry/` for `cell install`
