# GitHub Issues bulk registration (requires GitHub CLI)
# Usage: .\.github\scripts\create-starter-issues.ps1
# Prerequisite: gh auth login

$ErrorActionPreference = "Stop"
$repo = "SHShinSK/cell-coding"
$draftDir = Join-Path $PSScriptRoot "..\issue-drafts"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "GitHub CLI (gh) is not installed." -ForegroundColor Yellow
  Write-Host "Manual registration: see .github/issue-drafts/README.md" -ForegroundColor Yellow
  exit 1
}

$files = Get-ChildItem -Path $draftDir -Filter "*.md" |
  Where-Object { $_.Name -match '^\d{2}-' -and $_.Name -ne '01-readme-badges.md' } |
  Sort-Object Name

foreach ($file in $files) {
  $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
  $titleLine = ($content -split "`n")[0]
  if ($titleLine -match '^#\s*(.+)$') {
    $title = $matches[1].Trim()
  } else {
    $title = $file.BaseName
  }

  $labels = @()
  if ($content -match '(?m)^\*\*Labels:\*\*\s*(.+)$') {
    $labelLine = $matches[1]
    $labels = [regex]::Matches($labelLine, '`([^`]+)`') | ForEach-Object { $_.Groups[1].Value }
  }
  if ($labels.Count -eq 0) {
    $labels = @('good first issue', 'help wanted')
  }

  $existing = gh issue list --repo $repo --search "in:title `"$title`"" --state open --json number --jq 'length'
  if ($existing -ne '0') {
    Write-Host "Skip (exists): $title" -ForegroundColor DarkYellow
    continue
  }

  Write-Host "Creating: $title" -ForegroundColor Cyan
  $labelArgs = @()
  foreach ($label in $labels) {
    $labelArgs += '--label'
    $labelArgs += $label
  }

  gh issue create `
    --repo $repo `
    --title $title `
    --body-file $file.FullName `
    @labelArgs

  Start-Sleep -Seconds 2
}

Write-Host "Done. Check: https://github.com/$repo/issues" -ForegroundColor Green
