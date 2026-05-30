# GitHub Issues 일괄 등록 (GitHub CLI 필요)
# 사용: .\create-starter-issues.ps1
# 사전: gh auth login

$ErrorActionPreference = "Stop"
$repo = "SHShinSK/cell-coding"
$draftDir = Join-Path $PSScriptRoot "..\issue-drafts"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "GitHub CLI(gh)가 설치되어 있지 않습니다." -ForegroundColor Yellow
  Write-Host "수동 등록: .github/issue-drafts/README.md 참고" -ForegroundColor Yellow
  exit 1
}

$files = Get-ChildItem -Path $draftDir -Filter "*.md" | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name

foreach ($file in $files) {
  $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
  $titleLine = ($content -split "`n")[0]
  if ($titleLine -match '^#\s*\[([^\]]+)\]\s*(.+)$') {
    $title = "$($matches[1]) $($matches[2])".Trim()
  } else {
    $title = $file.BaseName
  }

  Write-Host "Creating: $title" -ForegroundColor Cyan
  gh issue create `
    --repo $repo `
    --title $title `
    --body-file $file.FullName `
    --label "good first issue" `
    --label "help wanted"

  Start-Sleep -Seconds 2
}

Write-Host "Done. Check: https://github.com/$repo/issues" -ForegroundColor Green
