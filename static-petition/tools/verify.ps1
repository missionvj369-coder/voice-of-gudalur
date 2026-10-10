# Voice of Gudalur - the checks that must pass before anything is committed.
#
# Node is used as the parser and as the tiny DOM the support script needs, so
# these are real assertions about the shipped files rather than a grep.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$fail = 0

function Ok($cond, $msg) {
  if ($cond) { Write-Output ("  ok   " + $msg) }
  else { Write-Output ("  FAIL " + $msg); $script:fail++ }
}
function Read($rel) { return [System.IO.File]::ReadAllText((Join-Path $root $rel)) }

Write-Output '== syntax =='
foreach ($f in @('assets\vog-support.js', 'assets\vog-i18n.js', 'assets\grievances.js')) {
  & node --check (Join-Path $root $f) *> $null
  Ok ($LASTEXITCODE -eq 0) ("node --check " + $f)
}

$html0 = Read 'index.html'
$pages = @('index.html', 'grievances\18982473\index.html', 'grievances\19177921\index.html')

Write-Output '== line endings (repo is CRLF; vog-i18n.js and grievances.js are LF) =='
$crlf = @('index.html', 'grievances\18982473\index.html', 'grievances\19177921\index.html',
          'assets\vog.css', 'assets\vog-support.js', '_headers')
foreach ($f in $crlf) {
  $t = Read $f
  $lf = ([regex]::Matches($t, "`n")).Count
  $cr = ([regex]::Matches($t, "`r`n")).Count
  Ok ($lf -eq $cr) ("$f is CRLF end to end ($lf/$cr)")
}

Write-Output '== the inline snippet and its CSP hash =='
$snippet = "(function(){var r=document.querySelectorAll('.rv'),i;function show(){for(i=0;i<r.length;i++)r[i].classList.add('in')}document.documentElement.classList.add('js');if(!('IntersectionObserver' in window)){show();return}setTimeout(show,3000)})();"
$hashes = @{}
foreach ($f in @('index.html', 'grievances\18982473\index.html', 'grievances\19177921\index.html')) {
  $t = Read $f
  $m = [regex]::Match($t, '(?s)<script>(\(function\(\).*?\)\(\);)</script>')
  Ok $m.Success ("$f carries the inline reveal script")
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $h = [Convert]::ToBase64String($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($m.Groups[1].Value)))
  $hashes[$h] = 1
  Ok ($m.Groups[1].Value -eq $snippet) ("$f snippet matches the canonical text")
}
Ok ($hashes.Count -eq 1) 'all three pages hash to the same value'
$hash = ($hashes.Keys | Select-Object -First 1)
Write-Output ("       sha256-$hash")

Write-Output '== _headers =='
$hdrs = Read '_headers'
# Read the directives, not the prose above them: the explanatory comments
# legitimately contain the words these checks look for.
$cspLine = ([regex]::Match($hdrs, '(?m)^\s*Content-Security-Policy:\s*(.+)$')).Groups[1].Value
$permLine = ([regex]::Match($hdrs, '(?m)^\s*Permissions-Policy:\s*(.+)$')).Groups[1].Value
$scriptSrc = ([regex]::Match($cspLine, 'script-src ([^;]+)')).Groups[1].Value
Ok ($scriptSrc.Trim() -eq "'self' 'sha256-$hash'") 'script-src is exactly self + the hash'
Ok ($scriptSrc -notmatch 'unsafe-inline') "script-src carries no 'unsafe-inline'"
Ok ($scriptSrc -match [regex]::Escape($hash)) 'script-src carries the hash computed from the HTML'
Ok ($cspLine -match "object-src 'none'") "object-src 'none'"
Ok ($cspLine -match "base-uri 'self'") "base-uri 'self'"
Ok ($cspLine -match "form-action 'self'") "form-action 'self'"
Ok ($cspLine -match "frame-ancestors 'self'") "frame-ancestors 'self'"
Ok ($cspLine -match "frame-src 'none'") "frame-src 'none'"
Ok ($cspLine -match "default-src 'self'") "default-src 'self'"
Ok ($hdrs -match 'X-Content-Type-Options: nosniff') 'nosniff'
Ok ($hdrs -match 'Strict-Transport-Security') 'HSTS'
Ok ($hdrs -match 'Cross-Origin-Opener-Policy: same-origin') 'COOP'
Ok ($hdrs -match 'Cross-Origin-Resource-Policy: same-origin') 'CORP'
Ok ($hdrs -match 'X-Permitted-Cross-Domain-Policies: none') 'cross-domain policies closed'
Ok ($permLine -match 'geolocation=\(\)') 'Permissions-Policy present and denying'
Ok ($permLine -notmatch 'autoplay') 'Permissions-Policy does not disable autoplay'
Ok ($permLine -notmatch 'microphone=\(\*,') 'no feature is left wide open'
Ok ($hdrs -match '(?m)^/assets/\*\r?\n\s+Cache-Control: public, max-age=\d+, immutable') 'assets are immutable'
Ok ($hdrs -match '(?m)^/index.html\r?\n\s+Cache-Control: public, max-age=0, must-revalidate') 'index.html always revalidates'

Write-Output '== asset fingerprints (must all be the same version) =='
$versions = @()
foreach ($f in @('index.html', 'grievances\18982473\index.html', 'grievances\19177921\index.html')) {
  $t = Read $f
  $versions += ([regex]::Matches($t, '/assets/vog[\w-]+\.(?:css|js)\?v=(\d+)') | ForEach-Object { $_.Groups[1].Value })
}
$u = $versions | Sort-Object -Unique
Ok ($u.Count -eq 1) ("every reference is ?v=$u across all three pages")

Write-Output '== the film runs 24 seconds, in CSS and in JS alike =='
$sup = Read 'assets\vog-support.js'
$css = Read 'assets\vog.css'
Ok ($sup -match 'var FILM_MS = 24000;') 'FILM_MS is 24000'
Ok ($css -match 'ibarfill 24s linear forwards') 'the progress bar animation is 24s'
Ok ($sup -match 'var SCENES = \[0, 4000, 8000, 12000, 16000, 20000\];') 'six scene windows inside 24s'
# Every scene animation has to finish inside its own 4s window, or the scene
# would still be moving when the next one cuts in. ibarfill is the progress bar
# and is deliberately the full 24s; `infinite alternate` drifts (the mist) are
# meant to run for the whole scene.
$sceneAnim = @([regex]::Matches($css, '-webkit-animation:([a-z]+) (\d+(?:\.\d+)?)s[^;]*(forwards|infinite alternate)')) |
  Where-Object { $_.Groups[1].Value -ne 'ibarfill' -and $_.Groups[3].Value -eq 'forwards' }
$longest = (@($sceneAnim | ForEach-Object { [double]$_.Groups[2].Value }) | Measure-Object -Maximum).Maximum
Ok ($longest -le 3.7) ("longest scene animation is ${longest}s, inside its 4s window")
# `animation:none` in the reduced-motion block needs no -webkit- twin: there is
# no -webkit-animation on those elements to reset.
$plainAnim = ([regex]::Matches($css, '(?<!-webkit-)animation:(?!none)')).Count
$prefAnim = ([regex]::Matches($css, '-webkit-animation:(?!none)')).Count
Ok ($plainAnim -eq $prefAnim -and $plainAnim -ge 15) ("all $plainAnim animation shorthands carry their -webkit- twin")
$allKf = ([regex]::Matches($css, '(?<!-webkit-)@keyframes')).Count
$prefKf = ([regex]::Matches($css, '-webkit-keyframes')).Count
Ok ($allKf -eq $prefKf) "all $allKf @keyframes carry a @-webkit-keyframes twin"

Write-Output '== old browsers: a plain value before every modern function =='
foreach ($fn in @('clamp(', 'env(', 'min(')) {
  $n = ([regex]::Matches($css, [regex]::Escape($fn))).Count
  Ok ($n -gt 0) "$fn still used ($n) - so the fallbacks above it matter"
}
# every rule that positions with clamp()+env() must have a plain declaration earlier
foreach ($sel in @('.iskip', '.icpn', '.audiobtn')) {
  $fallback = [regex]::Match($css, "(?m)^$([regex]::Escape($sel))\{(?![^}]*clamp)[^}]*\}")
  Ok $fallback.Success "$sel has a plain-value declaration before the clamp one"
}
Ok ($css -match '-webkit-backdrop-filter:blur\(8px\)') '.topbar carries the -webkit- backdrop-filter'

Write-Output '== contrast: small text on a dark band needs 4.5:1 =='
Ok ($css -match '\.fine\{[^}]*rgba\(255,255,255,\.62\)') '.fine is 62% white (4.09:1 -> 7.6:1)'
Ok ($css -match '\.btn-red\{background:var\(--terracotta-deep\)') '.btn-red uses the deep terracotta (4.28 -> 6.53)'
Ok ($css -match '\--terracotta-press:#7E3517;') 'the press state is darker still'
# --terracotta at #C65A2E is 3.75:1 on the crust: fine for a 2rem figure, short of
# AA for a 12px label. Every small-text use of it has to be the deep value.
# [^}] crosses newlines in .NET, so one pattern covers a rule written over
# several lines - and a selector that appears more than once is checked properly.
foreach ($sel in @(@('.seclab{','.seclab'), @('.step .who{','.step .who'), @('.kv dd.nostatus{','.kv dd.nostatus'), @('.crumbs a:hover{','.crumbs a:hover'))) {
  Ok ($css -match "$([regex]::Escape($sel[0]))[^}]*terracotta-deep") "$($sel[1]) uses the AA-passing terracotta"
}
# The one place bright --terracotta is still allowed: .fig .n is 1.55rem/24.8px
# at weight 900, which is WCAG "large text", where 3:1 is the bar and 3.75:1
# clears it. Every 12-13px use of the colour has been moved to the deep value.
Ok ($css -match '\.fig \.n\{[^}]*font-size:clamp\(1\.55rem[^}]*color:var\(--terracotta\)') '.fig .n is large text, so the bright terracotta is allowed there'

Write-Output '== tap targets are at least 44px =='
foreach ($pair in @(@('.iskip','min-height:44px'), @('.social a','height:44px'), @('.newsmore','min-height:44px'))) {
  Ok ($css -match ("$([regex]::Escape($pair[0]))\{[^}]*(?:\r?\n[^}]*)?$([regex]::Escape($pair[1]))")) "$($pair[0]) is at least 44px"
}

Write-Output '== sound is on by default, and the corner button is the only control =='
# There is deliberately no second "play with sound" button. A browser that
# refuses autoplay has to be handed a real gesture by definition, and more
# on-screen chrome cannot supply one; the fixed corner button is the manual
# control, and the first touch anywhere else is the gesture.
Ok (-not ($css -match '\.iscta')) '.iscta is gone from the stylesheet'
Ok (-not ($html0 -match 'id="vogSoundCta"')) '#vogSoundCta is gone from the markup'
Ok ($html0 -match 'id="vogSongBtn"') 'the corner sound button is the one control'
Ok ($sup -match 'var firstPlay = tryPlay\(\);') 'play() is asked for at page open, unmuted'
$i18n = Read 'assets\vog-i18n.js'
Ok (-not ($i18n -match 'audCta')) 'the audCta copy keys are gone from the table'

Write-Output '== the song still starts unmuted, and a gesture unlocks it where refused =='
Ok ($sup -match 'song\.muted = false;') 'the element is unmuted before the first play()'
Ok ($sup -match 'function setSound\(on\)') 'one function owns what "the sound is on" means'
Ok ($sup -match 'songBtn\.setAttribute\(''aria-pressed'', soundOn \? ''true'' : ''false''\)') 'the icon follows that one state'
Ok ($sup -match 'function unlockOnGesture') 'the first-touch unmute is armed before play() is attempted'
Ok ($sup -match 'attachGesture\(\);') 'the gesture listeners are attached before the play attempt'
Ok (($sup -split "addEventListener\('pointerdown'").Count - 1 -eq 1) 'pointerdown is one of the unlock gestures'
Ok ($sup -match 'function leaveFilm') 'a scroll or swipe ends the film early'
Ok ($sup -match 'if \(k < 32 \|\| k > 40\) return;') 'Tab and Enter do not end the film'

Write-Output ''
if ($fail -gt 0) { Write-Output ("FAILED: $fail check(s)"); exit 1 }
Write-Output 'all checks passed'
