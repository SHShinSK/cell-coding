# Release · 릴리즈 가이드

Cell Coding **v0.x** 공개 배포는 GitHub 태그 `v*` push 한 번으로 npm · PyPI · VS Code Marketplace · GitHub Release가 실행됩니다.

## 1. GitHub Secrets 설정 (최초 1회)

Repository → **Settings → Secrets and variables → Actions**

| Secret | 용도 |
|--------|------|
| `NPM_TOKEN` | [npmjs.com](https://www.npmjs.com) Automation token (`@cell-coding` publish) |
| `PYPI_TOKEN` | [PyPI](https://pypi.org) API token (`cell-coding-bridge`) |
| `VSCE_PAT` | [Azure DevOps PAT](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token) (Marketplace publish) |

npm org `@cell-coding` · VS Code publisher `cell-coding` · PyPI project `cell-coding-bridge`를 미리 생성해 두세요.

## 2. 버전 올리기 (선택 — CI가 태그에서 sync)

태그 push 시 workflow가 아래 버전을 **자동 sync**합니다:

- `typescript/package.json` → `@cell-coding/cli`
- `bridge-python/pyproject.toml` → `cell-coding-bridge`
- `extensions/cell-viewer/package.json` → VS Code extension

로컬에서 미리 맞추려면 세 파일의 `version`/`0.1.0`을 동일하게 수정합니다.

## 3. 릴리즈 실행

```bash
git tag v0.1.0
git push origin v0.1.0
```

또는 GitHub UI: **Releases → Draft a new release → tag `v0.1.0` → Publish**.

### CI만 검증 (배포 없음)

Actions → **Release** → **Run workflow** (태그 없이 validate job만 실행; publish job은 tag push 시에만 동작)

선택: [release-template-v0.1.0.md](release-template-v0.1.0.md) 본문을 Release 설명에 붙여넣기.

## 4. 배포 결과 확인

| Artifact | 확인 |
|----------|------|
| npm | `npm view @cell-coding/cli` |
| PyPI | `pip install cell-coding-bridge` |
| VS Code | Marketplace에서 `Cell Coding Viewer` |
| GitHub | Releases 탭 릴리즈 노트 |

## 5. 사용자 Quick start (릴리즈 노트용)

```bash
npx @cell-coding/cli run ./examples/motion-alarm/motion-alarm.cell MotionDetected '{"x":150,"y":220,"confidence":0.98}'
pip install cell-coding-bridge
npm install -g @cell-coding/cli
```

자세한 npm 수동 publish: [`typescript/PUBLISHING.md`](../typescript/PUBLISHING.md)
