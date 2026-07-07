# Cell Coding 공개 런칭 체크리스트

> **목표:** 첫 방문자가 5분 안에 실행하고, 기여자가 30분 안에 첫 PR을 열 수 있는 상태  
> **저장소:** https://github.com/SHShinSK/cell-coding  
> **문서 사이트:** https://shshinsk.github.io/cell-coding/

관련 문서: [EXECUTION_PLAN.md](../EXECUTION_PLAN.md) · [RELEASE.md](RELEASE.md) · [ISSUE_CLEANUP.md](ISSUE_CLEANUP.md) · [SHOW_HN.md](SHOW_HN.md) · [DISCUSSIONS_SETUP.md](DISCUSSIONS_SETUP.md)

---

## Phase 0 — 저장소 정리 (런칭 전 필수)

| # | 작업 | 담당 | 완료 |
|---|------|------|------|
| 0.1 | [ISSUE_CLEANUP.md](ISSUE_CLEANUP.md) 따라 중복·완료 이슈 정리 | Maintainer | ☐ |
| 0.2 | GitHub **About** · Description · Website · Topics 설정 ([DISCUSSIONS_SETUP.md §2–3](DISCUSSIONS_SETUP.md)) | Maintainer | ☐ |
| 0.3 | **Discussions** 활성화 + 카테고리 4개 (Announcements, Ideas, Q&A, Show and tell) | Maintainer | ☐ |
| 0.4 | Welcome 공지 게시 + **Pin** ([discussions/001-welcome-announcement.md](discussions/001-welcome-announcement.md)) | Maintainer | ☐ |
| 0.5 | Physical AI 피드백 Discussion 게시 ([003-physical-ai-samples-feedback.md](discussions/003-physical-ai-samples-feedback.md)) | Maintainer | ☐ |
| 0.6 | CI green 확인 (`main` push → Actions 통과) | Maintainer | ☐ |

**Topics (복사용):** `physical-ai`, `event-driven-architecture`, `typescript`, `python`, `open-source`, `dsl`, `robotics`, `iot`

**About Description (복사용):**
```
Physical AI를 위한 이벤트 기반 세포코딩 | Event-driven biological programming for Physical AI
```

---

## Phase 1 — 첫 실행 경로 (Critical path)

방문자가 README Quick start를 따라 **막히지 않게** 합니다.

| # | 작업 | 확인 방법 | 완료 |
|---|------|-----------|------|
| 1.1 | GitHub Secrets: `NPM_TOKEN`, `PYPI_TOKEN`, `VSCE_PAT` ([RELEASE.md §1](RELEASE.md)) | Settings → Secrets | ☐ |
| 1.2 | npm org `@cell-coding` · PyPI `cell-coding-bridge` · VS Code publisher 생성 | 각 플랫폼 대시보드 | ☐ |
| 1.3 | `git tag v0.1.0 && git push origin v0.1.0` | Release workflow green | ☐ |
| 1.4 | GitHub **Releases** 탭에 v0.1.0 노트 ([release-template-v0.1.0.md](release-template-v0.1.0.md)) | Releases 페이지 | ☐ |
| 1.5 | `npm view @cell-coding/cli` 성공 | 터미널 | ☐ |
| 1.6 | **클린 머신**에서 검증: | | ☐ |
| | `npx @cell-coding/cli run ...` (motion-alarm 예제) | stdout에 trace/ok | ☐ |
| 1.7 | Secrets 없이 당장 릴리즈 불가 시 → README 상단에 **clone 경로** 임시 강조 | README diff | ☐ |

**클린 머신 검증 명령 (복사용):**

```bash
npx @cell-coding/cli run ./examples/motion-alarm/motion-alarm.cell MotionDetected '{"x":150,"y":220,"confidence":0.98}'
```

(저장소 clone 후 `examples/` 경로 사용)

---

## Phase 2 — 첫인상 (README · Pages)

| # | 작업 | 완료 |
|---|------|------|
| 2.1 | README 상단에 **Viewer 또는 signal flow 스크린샷/GIF** 1장 (`viewer-react` 또는 Jaeger) | ☐ |
| 2.2 | [index.html](https://shshinsk.github.io/cell-coding/) → GitHub · Issues · Discussions 링크 동작 확인 | ☐ |
| 2.3 | `contributing.html` ↔ CONTRIBUTING.md 내용 일치 확인 | ☐ |
| 2.4 | Social preview: repo **Settings → General → Social preview** 이미지 (선택, 1280×640) | ☐ |

---

## Phase 3 — 커뮤니티 신호 (활동이 보이게)

| # | 작업 | 완료 |
|---|------|------|
| 3.1 | 메인테이너 **첫 PR 또는 직접 커밋** 1개 (예: README GIF, #25 SECURITY EN) | ☐ |
| 3.2 | Welcome Discussion에 “첫 기여자 환영 · 관심 분야 댓글 달아 주세요” 고정 답글 | ☐ |
| 3.3 | `good first issue` **3개 이상** 열린 상태 유지 | ☐ |
| 3.4 | 외부 PR 72시간 내 1차 리뷰 ([CONTRIBUTING.md](../CONTRIBUTING.md)) | ☐ |
| 3.5 | Star 0 → **지인·동료 5~10명**에게 직접 공유 (cold start) | ☐ |

---

## Phase 4 — 외부 홍보 (런칭 주)

Phase 0–1 완료 **후** 진행. [SHOW_HN.md](SHOW_HN.md) 초안 사용.

| # | 채널 | 타이밍 | 완료 |
|---|------|--------|------|
| 4.1 | **Show HN** | 화~목 09:00–12:00 PT (한국 밤~새벽) | ☐ |
| 4.2 | GitHub Discussions **Announcements** — v0.1.0 릴리즈 | Release 직후 | ☐ |
| 4.3 | Reddit r/opensource, r/robotics (규칙 확인 후) | HN 다음날 | ☐ |
| 4.4 | 발표 / 밋업 ([PRESENTATION_OUTLINE.md](../PRESENTATION_OUTLINE.md)) | 2~4주 내 | ☐ |
| 4.5 | LinkedIn / X — 한 줄 정의 + 데모 링크 | 릴리즈 당일 | ☐ |
| 4.6 | 한국 오픈소스·로봇 커뮤니티 (슬랙/디스코드/카카오) | 관계 있는 곳만 | ☐ |

**홍보 시 핵심 메시지 (복사용):**

- TypeScript/Python/React를 **대체하지 않음** — Physical AI용 **확장 아키텍처**
- **Role · Membrane · Signal** — 세포 네트워크로 embodied 시스템 모델링
- `npx @cell-coding/cli run ...` — 1분 데모
- `good first issue` — 작은 PR 환영

---

## Phase 5 — 런칭 후 2주 (유지)

| # | 작업 | 주기 | 완료 |
|---|------|------|------|
| 5.1 | Issues / Discussions / HN 댓글 응답 | 매일 15분 | ☐ |
| 5.2 | Show and tell 카테고리에 **데모 1개** (자체 motion-alarm trace) | 1주 내 | ☐ |
| 5.3 | 외부 기여 PR 1개 이상 merge 또는 constructive review | 2주 내 | ☐ |
| 5.4 | 로드맵 [ROADMAP.md](../ROADMAP.md) Day 61–90 항목 점검 | 2주 말 | ☐ |
| 5.5 | 이슈 감사 재실행 — 중복 재발 없음 | 2주 말 | ☐ |

---

## Go / No-Go 기준

**Go (홍보 시작 가능):**

- [ ] `npx @cell-coding/cli` 또는 README clone 경로가 **검증됨**
- [ ] GitHub About + Topics + Website 설정됨
- [ ] 중복 `good first issue` 정리됨
- [ ] Welcome Discussion Pin됨
- [ ] CI green

**No-Go (홍보 보류):**

- Quick start가 실패함
- 열린 이슈 20개+ 중복· stale
- Discussions/Issues에 질문이 있는데 1주 이상 무응답

---

## 한 페이지 타임라인

```
Day -2   Phase 0 (이슈·About·Discussions)
Day -1   Phase 1 (v0.1.0 Release + npm 검증)
Day 0    Phase 2–3 (README GIF, Welcome 댓글) + Phase 4 (Show HN)
Day 1–3  HN/Reddit 댓글, Announcements
Week 2   Phase 5 (첫 외부 PR, Show and tell)
```

---

## 빠른 링크

| 리소스 | URL |
|--------|-----|
| Repo | https://github.com/SHShinSK/cell-coding |
| Docs | https://shshinsk.github.io/cell-coding/ |
| Good first issues | https://github.com/SHShinSK/cell-coding/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22 |
| Discussions | https://github.com/SHShinSK/cell-coding/discussions |
| Release guide | [.github/RELEASE.md](RELEASE.md) |
| Show HN 초안 | [.github/SHOW_HN.md](SHOW_HN.md) |
