# -*- coding: utf-8 -*-
import subprocess, re
t = subprocess.run(['git','show','HEAD:static-petition/assets/vog-support.js'], capture_output=True, check=True).stdout
s = t.decode('utf-16-le')
hits = [m.start() for m in re.finditer(r'writeStore|LANG_KEY', s)]
print('count:', len(hits))
for h in hits[:3]:
    print(repr(s[max(0,h-40):h+40]))
