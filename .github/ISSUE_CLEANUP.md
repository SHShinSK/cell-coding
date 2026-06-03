# 이슈 중복 정리안 · Issue cleanup plan

> **대상:** [SHShinSK/cell-coding](https://github.com/SHShinSK/cell-coding) 오픈 이슈 25개 (2026-06-03 기준)  
> **목표:** 기여자가 `good first issue` 하나만 골라도 바로 작업할 수 있게 정리  
> **예상 소요:** 메인테이너 30~45분

관련 문서:

- 종료 코멘트 초안: [maintainer/close-issue-comments.md](maintainer/close-issue-comments.md)
- starter 이슈 초안: [issue-drafts/README.md](issue-drafts/README.md)
- 런칭 체크리스트: [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)

---

## 1. 현황 요약

| 구분 | 개수 | 설명 |
|------|------|------|
| 중복 쌍 (구 #2–#10 ↔ bootstrap #11–#28) | 9쌍 | Community bootstrap 워크플로가 이슈를 두 번 만듦 |
| **이미 main에 완료** | 6개 | 닫아야 함 (#20–#23, #26, #28) |
| **부분 완료 · 범위 유지** | 1개 | #27 — 열어두고 설명 업데이트 |
| **미완 · 유효** | 1개 | #25 — SECURITY.md 영어 요약 |
| **transpiler 스텁 (#24)** | 1개 | main에 스텁 존재 → **completed** 또는 follow-up 이슈로 분리 |
| **구 중복만 남은 것** | #2–#10 | canonical 이슈로 redirect 후 duplicate close |

정리 후 **열린 `good first issue` 목표: 3~5개** (실제 30분~2시간 작업 가능한 것만).

---

## 2. 중복 매핑표

### 2-A. 구 이슈 → canonical (bootstrap) 이슈

| 닫을 이슈 (구) | 유지할 이슈 (canonical) | 조치 |
|----------------|-------------------------|------|
| #2 | #20 | duplicate → #20은 **completed** |
| #3 | #21 | duplicate → #21은 **completed** |
| #6 | #24 | duplicate |
| #7 | #25 | duplicate |
| #8 | #26 | duplicate → #26은 **completed** |
| #9 | #27 | duplicate → #27은 **open** (범위 업데이트) |
| #10 | #28 | duplicate → #28은 **completed** |
| #11 | #20 | duplicate (bootstrap 중복) |
| #12 | #21 | duplicate |
| #13 | #22 | duplicate → #22는 **completed** |
| #14 | #23 | duplicate → #23은 **completed** |
| #15 | #24 | duplicate |
| #16 | #25 | duplicate |
| #17 | #26 | duplicate |
| #18 | #27 | duplicate |
| #19 | #28 | duplicate |

### 2-B. canonical 이슈별 최종 상태

| 이슈 | 제목 (요약) | main 상태 | 최종 조치 |
|------|-------------|-----------|-----------|
| **#20** | validator.cell 골든 파일 | ✅ `examples/validator.cell` 존재 | **Close completed** |
| **#21** | typescript/package.json | ✅ `typescript/package.json` 존재 | **Close completed** |
| **#22** | Lexer `<` 구분 | ✅ `compile.test.ts` 테스트 있음 | **Close completed** |
| **#23** | Parser List/Map | ✅ parser 구현됨 | **Close completed** |
| **#24** | transpiler.ts 스텁 | ✅ `transpiler.ts` 스텁 존재 | **Close completed** — follow-up은 draft 14–18 |
| **#25** | SECURITY.md 영어 요약 | ❌ 한국어만 | **Keep open** — `good first issue` |
| **#26** | cell-coding.html CTA | ✅ CTA 섹션 있음 | **Close completed** |
| **#27** | Checker signal extends | ⚠️ 부분 완료 | **Keep open** — 범위 코멘트 추가 |
| **#28** | MotionDetected 문서 | ✅ `physical-ai-motion-alarm.md` | **Close completed** |

---

## 3. 실행 순서 (메인테이너)

### Step 1 — completed 이슈 종료 (6~7개)

GitHub에서 각 이슈에 [close-issue-comments.md](maintainer/close-issue-comments.md)의 코멘트를 붙인 뒤 **Close as completed**:

1. #20, #21, #22, #23, #26, #28
2. #24 (transpiler 스텁 — follow-up은 새 이슈로)

### Step 2 — #27 상태 코멘트 (닫지 않음)

[maintainer/close-issue-comments.md § #27](maintainer/close-issue-comments.md) 블록을 그대로 코멘트로 게시.

### Step 3 — 구·중복 이슈 일괄 duplicate close

#2–#19 중 아직 열려 있는 것 → canonical로 redirect:

```markdown
Closing as **duplicate** of #XX (bootstrap bilingual issue).

Please use #XX for comments and PRs linking to this task. Thanks!
```

| Old | Duplicate of |
|-----|--------------|
| #2, #11 | #20 (closed) |
| #3, #12 | #21 (closed) |
| #6, #15 | #24 (closed) |
| #7, #16 | #25 |
| #8, #17 | #26 (closed) |
| #9, #18 | #27 |
| #10, #19 | #28 (closed) |
| #13 | #22 (closed) |
| #14 | #23 (closed) |

이미 canonical이 **closed**인 경우 duplicate 코멘트에 “작업 완료됨, 새 기여는 Discussion 또는 draft 14–21 참고” 한 줄 추가.

### Step 4 — 새 starter 이슈 등록 (선택)

닫힌 티켓 대신 **실제로 남은 작업**을 올립니다. 초안 위치: [issue-drafts/](issue-drafts/)

| 우선 등록 | 파일 | 난이도 |
|-----------|------|--------|
| 권장 | `07-security-en-summary.md` → #25와 동일 주제면 중복 금지 | 쉬움 |
| 권장 | `14-transpiler-error-diagnostics.md` | 중 |
| 권장 | `19-physical-ai-sim-real-track.md` | 중 (docs) |
| 선택 | `15-cell-build-watch.md` | 중 |

```powershell
# GitHub CLI (저장소 루트)
gh issue list --state open --limit 30
# 수동 등록: issue-drafts/README.md § Registration 참고
```

### Step 5 — Discussions #003 게시

Physical AI 샘플 피드백: [discussions/003-physical-ai-samples-feedback.md](discussions/003-physical-ai-samples-feedback.md)

---

## 4. 정리 후 기대 상태

```
Open issues (good first issue):  ~3–5
  #25  SECURITY.md EN summary
  #27  Checker extends (partial — read comment first)
  + newly registered drafts (14, 19, …)

Closed (recent):               ~20+
  completed work visible → "살아 있는 프로젝트" 신호
```

README / Welcome Discussion의 **good first issue** 링크는 그대로 사용 가능합니다. 필터:

https://github.com/SHShinSK/cell-coding/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22

---

## 5. GitHub CLI 일괄 처리 (선택)

`gh` 로그인 후, **코멘트는 웹에서 붙이는 것을 권장** (템플릿이 김). duplicate만 CLI로:

```powershell
# 예: #2를 #20 duplicate로 종료 (이미 #20 closed인 경우)
gh issue close 2 --comment "Closing as duplicate of #20 (completed on main). See issue-drafts/ for new starter tasks."

gh issue close 3 --comment "Closing as duplicate of #21 (completed on main)."
gh issue close 11 --comment "Closing as duplicate of #20."
gh issue close 12 --comment "Closing as duplicate of #21."
# … 위 매핑표 참고하여 #6–#19 반복
```

completed 종료:

```powershell
gh issue close 20 --reason completed --comment "Closing as completed — examples/validator.cell already on main."
gh issue close 21 --reason completed --comment "Closing as completed — typescript/package.json already on main."
gh issue close 22 --reason completed --comment "Closing as completed — lexer/parser tests on main."
gh issue close 23 --reason completed --comment "Closing as completed — List/Map parsing on main."
gh issue close 24 --reason completed --comment "Closing as completed — transpiler stub on main. Follow-ups: issue-drafts 14-18."
gh issue close 26 --reason completed --comment "Closing as completed — CTA in cell-coding.html."
gh issue close 28 --reason completed --comment "Closing as completed — examples/physical-ai-motion-alarm.md."
```

---

## 6. 검증 체크리스트

- [ ] 열린 이슈에 **같은 제목이 2개 이상** 없음
- [ ] `good first issue`마다 **Definition of done**이 명확함
- [ ] 완료된 작업 이슈는 **Close as completed** (방치된 open 없음)
- [ ] Welcome Discussion / README 링크로 **3개 이상** 열린 starter 확인 가능
- [ ] #27, #25에 **최신 상태 코멘트** 있음

---

## 7. 재발 방지

1. **Community bootstrap** 워크플로 재실행 시 `create_issues: false` (이미 있으면)
2. 새 starter는 **issue-drafts/** 에 초안 → 한 번만 등록
3. main 머지 시 **해당 이슈 즉시 close** (72시간 이내 목표)
4. 분기별 `python .github/scripts/list-issues.py` 또는 `_issues_audit.txt` 갱신
