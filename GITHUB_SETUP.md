# GitHub 공개 저장소 올리기

대상: https://github.com/SHShinSK/cell-coding

## 공개가 되나요?

**push만으로는 자동 공개되지 않습니다.** GitHub에서 저장소를 만들 때 **Public** 을 선택해야 전 세계에 공개됩니다.

| 저장소 종류 | 누가 볼 수 있나 | 협업 |
|-------------|-----------------|------|
| **Public** | 누구나 코드·이슈 열람 | 포크 → PR, Issues, Discussions |
| Private | 초대된 사람만 | 동일 (초대 범위 내) |

오픈소스로 함께 발전시키려면 **Public + LICENSE + CONTRIBUTING** 조합을 권장합니다.

## 1) GitHub에서 저장소 생성 (아직 없다면)

1. https://github.com/new 접속
2. Repository name: `cell-coding`
3. **Public** 선택
4. README / .gitignore / license 추가 **체크 해제** (로컬에 이미 있음)
5. Create repository

## 2) 로컬에서 push (PowerShell)

```powershell
cd d:\Claude
git init
git add .
git commit -m "chore: initial open-source launch (KO/EN docs, compiler draft)"
git branch -M main
git remote add origin https://github.com/SHShinSK/cell-coding.git
git push -u origin main
```

이미 remote가 있다면:

```powershell
git remote set-url origin https://github.com/SHShinSK/cell-coding.git
git push -u origin main
```

## 3) 공개 후 바로 할 일

1. **About** 에 설명 추가 (한/영):
   - `Physical AI를 위한 이벤트 기반 세포코딩 패러다임 | Event-driven biological programming for Physical AI`
2. **Topics** 추가: `physical-ai`, `event-driven`, `typescript`, `open-source`
3. **Settings → General → Features**
   - Issues ✅
   - Discussions ✅ (커뮤니티 토론용)
4. **Labels** — `ISSUE_LABELS.md` 기준으로 생성
5. **good first issue** 이슈 5~10개 등록

## 4) 협업 흐름

```text
외부 기여자: Fork → 브랜치 → PR
Maintainer: 리뷰 → merge
설계 변경: RFC 이슈 → rfcs/ 문서 → 합의 후 구현
```

## 5) 한국어 / 영어 문서

| 한국어 | English |
|--------|---------|
| README.md | README.en.md |
| CONTRIBUTING.md | CONTRIBUTING.en.md |
| ROADMAP.md | ROADMAP.en.md |
| OPEN_SOURCE_CHARTER.md | OPEN_SOURCE_CHARTER.en.md |

GitHub 메인 페이지는 `README.md`(한국어)가 기본으로 보입니다. 영어 사용자는 상단 링크로 `README.en.md`로 이동합니다.

## 6) 인증

push 시 GitHub 로그인 또는 Personal Access Token이 필요합니다.  
HTTPS push가 막히면 GitHub Desktop 또는 SSH remote를 사용하세요.
