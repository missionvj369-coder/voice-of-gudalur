# -*- coding: utf-8 -*-
import subprocess, codecs

REPO = r'd:/voice of gudalur'
REL = 'static-petition/assets/vog-support.js'

MARKERS = [
    'LANG_KEY',
    'writeStore',
    'function begin',
    'Scenes auto-loop',
    'startIntro();',
    '})();',
    'endTimer = setTimeout(finishIntro, FILM_MS + 500)',
    'showScene(0)',
]


def decode(data):
    if data[:2] == codecs.BOM_UTF16_LE:
        text = data.decode('utf-16-le')
        if text.startswith('\ufeff'):
            text = text[1:]
        return 'utf-16le', text
    if data[:3] == codecs.BOM_UTF8:
        return 'utf-8-sig', data.decode('utf-8-sig')
    return 'utf-8', data.decode('utf-8', errors='replace')


def describe(name, data):
    print('=== %s ===' % name)
    print('bytes:', len(data))
    print('BOM ff fe:', data[:2] == codecs.BOM_UTF16_LE)
    enc, text = decode(data)
    print('encoding:', enc, 'chars:', len(text))
    print('lines:', text.count('\n') + 1)
    print('head:', repr(text[:50]))
    print('tail:', repr(text[-40:]))
    for m in MARKERS:
        print('  count[%s] = %d' % (m, text.count(m)))
    return text


head = subprocess.check_output(['git', '-C', REPO, 'show', 'HEAD:' + REL])
with open(REPO.replace('\\', '/') + '/' + REL, 'rb') as f:
    work = f.read()

t_head = describe('HEAD', head)
t_work = describe('WORK', work)
print('byte-identical to HEAD:', head == work)
