#!/usr/bin/env python3
"""Ajoute ?v=<version> aux CSS/JS locaux de toutes les pages pour forcer la mise à jour des caches.
Usage : python3 tools/stamp.py   (après tools/build.py)"""
import re, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
v = time.strftime('%Y%m%d%H%M')
for f in list(ROOT.glob('*.html')) + list((ROOT / 'admin').glob('*.html')):
    s = f.read_text(encoding='utf-8')
    s2 = re.sub(r'((?:href|src)="(?!https?:)[^"]+\.(?:css|js))(?:\?v=\d+)?"', rf'\1?v={v}"', s)
    if s2 != s:
        f.write_text(s2, encoding='utf-8'); print('version', v, '→', f.name)
