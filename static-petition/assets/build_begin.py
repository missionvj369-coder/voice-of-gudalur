p = 'static-petition/assets/vog-support.js'
data = open(p, 'rb').read()
text = data.decode('utf-16-le')
lines = text.split('\n')

# Find the film section comment and the line we insert before it
target = None
for i, L in enumerate(lines):
    if '--- the film itself' in L:
        target = i
        break

assert target is not None, 'film section not found'

begin_block = [
    '    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();',
    '    function begin(fromTap) {',
    '      if (introDone || !begun) return;',
    '      begun = true;',
    '      /* Unlock gesture: a tap is the one moment Safari/iOS may not refuse. */',
    '      songDisarm();',
    '      if (fromTap) songArm();',
    "      song.muted = false;",
    '      song.currentTime = 0;',
    "      songBtn.setAttribute('aria-pressed', fromTap ? 'true' : 'false');",
    '      songPaint();',
    '      songPlay();',
    '      songBtn.hidden = false;',
    '      startStamp = nowMs();',
    '      showScene(0);',
    "      intro.classList.add('run');",
    '      if (useRaf) rafId = window.requestAnimationFrame(tick);',
    '      else tickTimer = setInterval(tick, 250);',
    '      endTimer = setTimeout(finishIntro, FILM_MS + 500);',
    '      /* Scenes auto-loop while the film runs: after a window closes the',
    '         clock hands the next scene on, so the film loops smoothly on its',
    '         own - on Safari, iOS and desktop alike, where a tap prompt or a',
    '         throttled tab would otherwise stall it. */',
    '    }',
    '',
]

# Insert the block before the film section comment line
result = lines[:target] + begin_block + lines[target:]

open(p, 'wb').write('\xff\xfe'.encode('utf-16-le') + '\n'.join(result).encode('utf-16-le'))
print('inserted begin()/unlock block before line', target)
