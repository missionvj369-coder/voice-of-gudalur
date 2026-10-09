# -*- coding: utf-8 -*-
import subprocess

REPO = r'd:/voice of gudalur'
REL = 'static-petition/assets/vog-support.js'

head = subprocess.check_output(['git', '-C', REPO, 'show', 'HEAD:' + REL])
with open(REPO.replace('\\', '/') + '/_head_vog.js', 'wb') as f:
    f.write(head)
print('wrote', len(head), 'bytes')
