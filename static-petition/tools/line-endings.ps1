# Voice of Gudalur - keep every text file on the line ending git already has.
#
# The repository is CRLF end to end. Editors and the PowerShell here-strings
# used to splice large blocks happily write bare LF, which turns one hunk of a
# diff into the whole file. This normalises each path back to CRLF, and reports
# anything it had to change so a stray LF never slips through quietly.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

$paths = @(
  'index.html',
  'grievances\18982473\index.html',
  'grievances\19177921\index.html',
  'assets\vog.css',
  'assets\vog-support.js',
  '_headers'
) | ForEach-Object { Join-Path $root $_ }

$fixed = 0
foreach ($p in $paths) {
  if (-not (Test-Path $p)) { throw "missing $p" }
  $t = [System.IO.File]::ReadAllText($p)
  $n = $t -replace "(?<!`r)`n", "`r`n"
  if ($n -ne $t) {
    [System.IO.File]::WriteAllText($p, $n)
    $bare = ([regex]::Matches($t, "(?<!`r)`n")).Count
    Write-Output ('fixed {0} bare LF -> {1}' -f $bare, (Split-Path -Leaf $p))
    $fixed++
  }
}
if ($fixed -eq 0) { Write-Output 'all files already CRLF' }
