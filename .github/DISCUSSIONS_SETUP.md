# GitHub Discussions · About · Topics 설정

저장소: https://github.com/SHShinSK/cell-coding

## 1) Discussions 켜기

1. **Settings** → **General** → **Features**
2. **Discussions** 체크 ✅
3. 저장

### 권장 카테고리

| 카테고리 | 용도 |
|----------|------|
| Announcements | 릴리즈, 로드맵 공지 |
| Ideas | 기능·패러다임 아이디어 |
| Q&A | 사용법, 설계 질문 |
| Show and tell | 데모·예제 공유 |

## 2) About (저장소 설명)

### 자동 (Actions)

**Community bootstrap** 워크플로의 `update_about` 옵션은 **복사할 값을 로그에 출력**합니다.

`GITHUB_TOKEN`만으로는 저장소 About/Topics API 수정이 **지원되지 않습니다** (403).  
자동화하려면:

1. GitHub → **Settings** → **Secrets and variables** → **Actions**
2. `REPO_ADMIN_TOKEN` — Personal Access Token (`repo` scope)
3. 워크플로 재실행 → PAT가 있으면 About/Topics API 시도

대부분은 아래 **수동 설정**이 더 빠릅니다.

### 수동 (권장 백업)

저장소 메인 페이지 **About** 톱니 → Edit:

**Description (한/영):**
```
Physical AI를 위한 이벤트 기반 세포코딩 | Event-driven biological programming for Physical AI
```

**Website:**
```
https://shshinsk.github.io/cell-coding/
```
(Pages 배포 후 실제 URL 확인 — 사용자명은 소문자)

## 3) Topics

```
physical-ai
event-driven-architecture
typescript
python
open-source
dsl
robotics
iot
```

## 4) GitHub Pages

1. **Settings** → **Pages**
2. **Build and deployment** → Source: **GitHub Actions**
3. `main` 브랜치 push 시 `.github/workflows/pages.yml` 자동 배포
4. 배포 완료 후 URL: `https://<username>.github.io/cell-coding/`

## 5) Labels 생성

`ISSUE_LABELS.md` 참고. 최소 세트:

- `good first issue`, `help wanted`, `bug`, `feature`, `docs`, `rfc`, `question`
- `area:runtime`, `area:dsl-compiler`, `area:docs`
- `priority:low`, `priority:medium`, `priority:high`

## 7) Welcome 공지 동기화 (Actions)

`.github/discussions/001-welcome-announcement.md` 수정 후 push하면 **Sync community discussions** 워크플로가:

1. Discussion **#1** 본문 업데이트 + **Pin**
2. **Q&A** 시드 스레드 생성 (`.github/discussions/002-qa-welcome.md`)

`GITHUB_TOKEN`만으로 GraphQL이 거부되면(403) Actions secrets에 **`REPO_ADMIN_TOKEN`** (PAT, `repo` scope)을 추가한 뒤 워크플로를 재실행하세요.  
실패 시 Actions Summary에 수동 붙여넣기 안내가 표시됩니다.

## 8) Starter Issues 등록

`.github/issue-drafts/` 폴더의 10개 파일을 GitHub Issues로 등록하세요.  
초안은 **English first · Korean parallel** 형식입니다 (제목: `English · 한국어`).

PowerShell (GitHub CLI 설치 시):

```powershell
cd d:\Claude
.\.github\scripts\create-starter-issues.ps1
```

또는 **Actions → Community bootstrap → Run workflow** (`create_issues: true`).

수동: 각 `.md` 파일 내용을 복사해 **New issue** → 첫 줄 `# ` 제거 후 제목으로 사용 → `**Labels:**` 줄의 라벨 전부 적용.
