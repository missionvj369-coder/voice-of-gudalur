# Voice of Gudalur - the one inline <script>, pinned into the CSP by hash.
#
# The snippet is byte-identical on all three pages, so a single SHA-256 covers
# the whole site and script-src can drop 'unsafe-inline'. It is written with
# WriteAllText so the hashed bytes contain no trailing newline, and the three
# HTML files are rewritten to hold exactly <script>SNIPPET</script> - whatever
# whitespace an editor put around the tag is normalised away first.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$pages = @(
  (Join-Path $root 'index.html'),
  (Join-Path $root 'grievances\18982473\index.html'),
  (Join-Path $root 'grievances\19177921\index.html')
)

# Sets .js - which is the only thing that hides .rv - then reveals. The 3s
# timeout is the floor: vog-support.js is never allowed to leave a block
# invisible, and neither is a slow, missing or throwing copy of it.
$snippet = '(function(){var r=document.querySelectorAll(''.rv''),i;function show(){for(i=0;i<r.length;i++)r[i].classList.add(''in'')}document.documentElement.classList.add(''js'');if(!(''IntersectionObserver'' in window)){show();return}setTimeout(show,3000)})();'

function Get-Hash([string]$text) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  return [Convert]::ToBase64String($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($text)))
}

# 1. normalise the tag in every page
foreach ($p in $pages) {
  $html = [System.IO.File]::ReadAllText($p)
  $rx = [regex]'(?s)<script>\s*\(function\(\)\{var r=document\.querySelectorAll.*?\(\);\s*</script>'
  if (-not $rx.IsMatch($html)) { throw "inline reveal script not found in $p" }
  $html = $rx.Replace($html, { '<script>' + $snippet + '</script>' })
  [System.IO.File]::WriteAllText($p, $html)
}

# 2. read it back out and prove every page carries the same bytes
$seen = @{}
foreach ($p in $pages) {
  $html = [System.IO.File]::ReadAllText($p)
  $m = [regex]::Match($html, '(?s)<script>(\(function\(\).*?\)\(\);)</script>')
  if (-not $m.Success) { throw "could not read the snippet back out of $p" }
  $h = Get-Hash $m.Groups[1].Value
  $seen[$h] = 1
  $name = (Split-Path -Leaf (Split-Path -Parent $p)) + '/' + (Split-Path -Leaf $p)
  Write-Output ('{0,-42} sha256-{1}' -f $name, $h)
}
if ($seen.Count -ne 1) { throw "the three pages do not carry the same snippet" }
Write-Output ''
Write-Output ("CSP:  script-src 'self' 'sha256-{0}'" -f ($seen.Keys | Select-Object -First 1))

# 3. no inline event handler anywhere, or the hash would not be the only hole
foreach ($p in $pages) {
  $html = [System.IO.File]::ReadAllText($p)
  if ($html -match '\son(click|load|error|change|submit|mouseover|focus|blur)\s*=') {
    throw "inline event handler found in $p - it would need 'unsafe-inline'"
  }
}
Write-Output 'no inline event handlers: OK'
