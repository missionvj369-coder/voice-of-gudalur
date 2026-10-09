# -*- coding: utf-8 -*-
import subprocess, os
p = r'd:/voice of gudalur/static-petition/assets/vog-support.js'
# Read as bytes
with open(p, 'rb') as f:
    data = f.read()
# Count byte frequencies
counts = {}
for b in data:
    counts[b] = counts.get(b, 0) + 1
# Show top 15 bytes
sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
for b, c in sorted_counts[:15]:
    print(hex(b), c)
