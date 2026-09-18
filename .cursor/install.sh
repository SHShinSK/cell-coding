#!/usr/bin/env bash
# Cell Coding 개발 환경 부트스트랩 스크립트
# 체크아웃 이후 실행되며 여러 번 실행해도 안전(idempotent)하도록 작성.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[install] TypeScript CLI 의존성 설치 (typescript/)"
cd "$REPO_ROOT/typescript"
npm ci

echo "[install] React Viewer 의존성 설치 (viewer-react/)"
cd "$REPO_ROOT/viewer-react"
npm ci

echo "[install] Viewer 시각화용 trace 데이터 생성 (viewer/traces.json)"
cd "$REPO_ROOT/typescript"
npm run viewer:traces

echo "[install] 완료 — Python 브리지는 표준 라이브러리만 사용하므로 별도 설치 불필요"
