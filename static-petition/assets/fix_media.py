p = 'static-petition/assets/vog-support.js'
data = open(p, encoding='latin-1').read()
lines = data.split('\n')

out = []
for L in lines:
    out.append(L)
    if L.strip() == 'begun = true;':
        out.append('      /* One auto-advance: the clock hands each scene to on as its window')
        out.append('       closes, so the film loops continuously on Safari, iOS and desktop. */')

open(p, 'w', encoding='latin-1').write('\n'.join(out))
print('patched media JS scene loop')
