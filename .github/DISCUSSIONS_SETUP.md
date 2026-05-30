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

## 6) Starter Issues 등록

`.github/issue-drafts/` 폴더의 10개 파일을 GitHub Issues로 등록하세요.

PowerShell (GitHub CLI 설치 시):

```powershell
cd d:\Claude
.\.github\scripts\create-starter-issues.ps1
```

수동: 각 `.md` 파일 내용을 복사해 **New issue** → 붙여넣기 → 라벨 `good first issue`, `help wanted` 추가.
