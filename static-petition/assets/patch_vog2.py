# -*- coding: utf-8 -*-
import subprocess, os
p = r'd:/voice of gudalur/static-petition/assets/vog-support.js'
# Read as bytes, decode UTF-16LE
with open(p, 'rb') as f:
    data = f.read()
t = data.decode('utf-16-le')
lines = t.split('\n')

# Find startIntro line
target = None
for i, L in enumerate(lines):
    if L.strip() == 'startIntro();':
        target = i
        break
print('startIntro at line', target)

# Build begin() block
block = []
block.append('    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();')
block.append('    var startStamp = 0;')
block.append('    var rafId = 0;')
block.append('    var tickTimer = 0;')
block.append('    var endTimer = 0;')
block.append('    var introDone = false;')
block.append('    var begun = false;')
block.append('    function begin(fromTap) {')
block.append('      if (introDone || !begun) return;')
block.append('      begun = true;')
block.append('      /* Unlock gesture: a tap is the one moment Safari/iOS may not refuse. */')
block.append('      songDisarm();')
block.append('      if (fromTap) songArm();')
block.append("      song.muted = false;")
block.append("      song.currentTime = 0;")
block.append("      songBtn.setAttribute('aria-pressed', fromTap ? 'true' : 'false');")
block.append('      songPaint();')
block.append('      songPlay();')
block.append('      songBtn.hidden = false;')
block.append('      startStamp = nowMs();')
block.append('      showScene(0);')
block.append("      intro.classList.add('run');")
block.append('      if (useRaf) rafId = window.requestAnimationFrame(tick);')
block.append('      else tickTimer = setInterval(tick, 250);')
block.append('      endTimer = setTimeout(finishIntro, FILM_MS + 500);')
block.append('      /* Scenes auto-loop while the film runs: after a window closes the')
block.append('         clock hands the next scene on, so the film loops smoothly on its')
block.append('         own - on Safari, iOS and desktop alike, where a tap prompt or a')
block.append('         throttled tab would otherwise stall it. */')
block.append('    }')
block.append('')

# Rebuild: lines[:target] + block + lines[target:]
result = lines[:target] + block + lines[target:]
text = '\n'.join(result)
# Preserve UTF-16LE encoding
bom = b'\xff\x00\xfe\x00'
with open(p, 'wb') as f:
    f.write(bom + text.encode('utf-16-le'))
print('total lines now', len(result))
